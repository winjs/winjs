// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function fragmentLoaderInit(global, WinJS) {
    "use strict";

    var strings = {
        get invalidFragmentUri() { return WinJS.Resources._getWinJSString("base/invalidFragmentUri").value; },
    };

    // not supported in WebWorker
    if (!global.document) {
        return;
    }

    var forEach = function (arrayLikeValue, action) {
        for (var i = 0, l = arrayLikeValue.length; i < l; i++) {
            action(arrayLikeValue[i], i);
        }
    };
    var head = document.head || document.getElementsByTagName("head")[0];
    var scripts = {};
    var styles = {};
    var links = {};
    var initialized = false;
    var cacheStore = {};
    var uniqueId = 1;

    function addScript(scriptTag, fragmentHref, position, lastNonInlineScriptPromise) {
        // We synthesize a name for inline scripts because today we put the
        // inline scripts in the same processing pipeline as src scripts. If
        // we seperated inline scripts into their own logic, we could simplify
        // this somewhat.
        //
        var src = scriptTag.src;
        var inline = !src;
        if (inline) {
            src = fragmentHref + "script[" + position + "]";
        }
        src = src.toLowerCase();

        if (!(src in scripts)) {
            var promise = null;

            scripts[src] = true;
            var n = document.createElement("script");
            if (scriptTag.language) {
                n.setAttribute("language", "javascript");
            }
            n.setAttribute("type", scriptTag.type);
            n.setAttribute("async", "false");
            if (scriptTag.id) {
                n.setAttribute("id", scriptTag.id);
            }
            if (inline) {
                var text = scriptTag.text;
                promise = lastNonInlineScriptPromise.then(function () {
                    n.text = text;
                }).then(null, function () {
                    // eat error
                });
            }
            else {
                promise = new WinJS.Promise(function (c) {
                    n.onload = n.onerror = function () {
                        c();
                    };
                    n.setAttribute("src", scriptTag.src);
                });
            }
            head.appendChild(n);

            return {
                promise: promise,
                inline: inline,
            };
        }
    };

    function addStyle(styleTag, fragmentHref, position) {
        var src = (fragmentHref + "script[" + position + "]").toLowerCase();
        if (!(src in styles)) {
            styles[src] = true;
            head.appendChild(styleTag.cloneNode(true));
        }
    };

    function addLink(styleTag) {
        var src = styleTag.href.toLowerCase();
        if (!(src in links)) {
            links[src] = true;
            var n = styleTag.cloneNode(false);
            n.href = styleTag.href;
            head.appendChild(n);
        }
    };

    function getStateRecord(href, removeFromCache?) {
        if (typeof href === "string") {
            return loadFromCache(href, removeFromCache);
        }
        else {
            var state = {
                docfrag: WinJS.Utilities.data(href).docFragment
            };
            if (!state.docfrag) {
                var fragment = document.createDocumentFragment();
                while (href.childNodes.length > 0) {
                    fragment.appendChild(href.childNodes[0]);
                };
                state.docfrag = WinJS.Utilities.data(href).docFragment = fragment;
                href.setAttribute("data-win-hasfragment", "");
            }
            if (removeFromCache) {
                clearCache(href);
            }
            return WinJS.Promise.as(state);
        }
    }
    function createEntry(state, href) {
        return WinJS.UI.Fragments._populateDocument(state, href).
            then(function () {
                if (state.document) {
                    return processDocument(href, state);
                }
                else {
                    return state;
                }
            }).
            then(WinJS.UI.Fragments._cleanupDocument).
            then(function () {
                return state;
            });
    }

    function loadFromCache(href, removeFromCache) {
        var fragmentId = href.toLowerCase();
        var state = cacheStore[fragmentId];

        if (state) {
            if (removeFromCache) {
                delete cacheStore[fragmentId];
            }
            if (state.promise) {
                return state.promise;
            }
            else {
                return WinJS.Promise.as(state);
            }
        }
        else {
            state = {};
            if (!removeFromCache) {
                cacheStore[fragmentId] = state;
            }
            var result = state.promise = createEntry(state, href);
            state.promise.then(function () { delete state.promise; });
            return result;
        }
    }

    function processDocument(href, state) {
        // Once the control's static state has been loaded in the temporary iframe,
        // this method spelunks the iframe's document to retrieve all relevant information. Also,
        // this performs any needed fixups on the DOM (like adjusting relative URLs).

        var cd = state.document;
        var b = cd.body;
        var sp = [];

        forEach(cd.querySelectorAll('link[rel="stylesheet"], link[type="text/css"]'), addLink);
        forEach(cd.getElementsByTagName('style'), function (e, i) { addStyle(e, href, i); });

        // In DOCMODE 11 IE moved to the standards based script loading behavior of
        // having out-of-line script elements which are dynamically added to the DOM 
        // asynchronously load. This raises two problems for our fragment loader,
        // 
        //  1) out-of-line scripts need to execute in order
        //
        //  2) so do in-line scripts.
        //
        // In order to mitigate this behavior we do two things:
        //
        //  A) We mark all scripts with the attribute async='false' which makes
        //     out-of-line scripts respect DOM append order for execution when they
        //     are eventually retrieved
        //
        //  B) We chain the setting of in-line script element's 'text' property
        //     on the completion of the previous out-of-line script's execution.
        //     This relies on the fact that the out-of-line script elements will
        //     synchronously run their onload handler immediately after executing
        //     thus assuring that the in-line script will run before the next
        //     trailing out-of-line script.
        //
        var lastNonInlineScriptPromise = WinJS.Promise.as();
        forEach(cd.getElementsByTagName('script'), function (e, i) {
            var result = addScript(e, href, i, lastNonInlineScriptPromise);
            if (result) {
                if (!result.inline) {
                    lastNonInlineScriptPromise = result.promise;
                }
                sp.push(result.promise);
            }
        });

        forEach(b.getElementsByTagName('img'), function (e) { e.src = e.src; });
        forEach(b.getElementsByTagName('a'), function (e) {
            // for # only anchor tags, we don't update the href
            //
            if (e.href !== "") {
                var href = e.getAttribute("href");
                if (href && href[0] != "#") {
                    e.href = e.href;
                }
            }
        });

        // strip inline scripts from the body, they got copied to the
        // host document with the rest of the scripts above...
        //
        var localScripts = b.getElementsByTagName("script");
        while (localScripts.length > 0) {
            var s = localScripts[0];
            s.parentNode.removeChild(s);
        }

        return WinJS.Promise.join(sp).then(function () {
            // Create the docfrag which is just the body children
            //
            var fragment = document.createDocumentFragment();
            var imported = document.importNode(cd.body, true);
            while (imported.childNodes.length > 0) {
                fragment.appendChild(imported.childNodes[0]);
            }
            state.docfrag = fragment;

            return state;
        });
    };

    function initialize() {
        if (initialized) { return; }

        initialized = true;

        forEach(head.querySelectorAll("script"), function (e) {
            scripts[e.src.toLowerCase()] = true;
        });


        forEach(head.querySelectorAll('link[rel="stylesheet"], link[type="text/css"]'), function (e) {
            links[e.href.toLowerCase()] = true;
        });
    };

    function renderCopy(href, target) {
        /// <signature helpKeyword="WinJS.UI.Fragments.renderCopy">
        /// <summary locid="WinJS.UI.Fragments.renderCopy">
        /// Copies the contents of the specified URI into the specified element.
        /// </summary>
        /// <param name="href" type="String" locid="WinJS.UI.Fragments.renderCopy_p:href">
        /// The URI that contains the fragment to copy.
        /// </param>
        /// <param name="target" type="HTMLElement" optional="true" locid="WinJS.UI.Fragments.renderCopy_p:target">
        /// The element to which the fragment is appended.
        /// </param>
        /// <returns type="WinJS.Promise" locid="WinJS.UI.Fragments.renderCopy_returnValue">
        /// A promise that is fulfilled when the fragment has been loaded.
        /// If a target element is not specified, the copied fragment is the
        /// completed value.
        /// </returns>
        /// </signature>

        return renderImpl(href, target, true);
    };

    function renderImpl(href, target, copy) {
        var profilerMarkIdentifier = (href instanceof HTMLElement ? WinJS.Utilities._getProfilerMarkIdentifier(href) : " href='" + href + "'") + "[" + (++uniqueId) + "]";
        WinJS.Utilities._writeProfilerMark("WinJS.UI.Fragments:render" + profilerMarkIdentifier + ",StartTM");
    
        initialize();
        return getStateRecord(href, !copy).then(function (state) {
            var frag = state.docfrag;
            if (copy) {
                frag = frag.cloneNode(true);
            }

            var child = frag.firstChild;
            while (child) {
                if (child.nodeType === 1 /*Element node*/) {
                    child.msParentSelectorScope = true;
                }
                child = child.nextSibling;
            }

            var retVal;
            if (target) {
                target.appendChild(frag);
                retVal = target;
            }
            else {
                retVal = frag;
            }
            WinJS.Utilities._writeProfilerMark("WinJS.UI.Fragments:render" + profilerMarkIdentifier + ",StopTM");
            return retVal;
        });
    };

    function render(href, target) {
        /// <signature helpKeyword="WinJS.UI.Fragments.render">
        /// <summary locid="WinJS.UI.Fragments.render">
        /// Copies the contents of the specified URI into the specified element.
        /// </summary>
        /// <param name='href' type='String' locid="WinJS.UI.Fragments.render_p:href">
        /// The URI that contains the fragment to copy.
        /// </param>
        /// <param name='target' type='HTMLElement' optional='true' locid="WinJS.UI.Fragments.render_p:target">
        /// The element to which the fragment is appended.
        /// </param>
        /// <returns type="WinJS.Promise" locid="WinJS.UI.Fragments.render_returnValue">
        /// A promise that is fulfilled when the fragment has been loaded.
        /// If a target element is not specified, the copied fragment is the
        /// completed value.
        /// </returns>
        /// </signature>

        return renderImpl(href, target, false);
    };

    function cache(href) {
        /// <signature helpKeyword="WinJS.UI.Fragments.cache">
        /// <summary locid="WinJS.UI.Fragments.cache">
        /// Starts loading the fragment at the specified location. The returned promise completes
        /// when the fragment is ready to be copied.
        /// </summary>
        /// <param name="href" type="String or DOMElement" locid="WinJS.UI.Fragments.cache_p:href">
        /// The URI that contains the fragment to be copied.
        /// </param>
        /// <returns type="WinJS.Promise" locid="WinJS.UI.Fragments.cache_returnValue">
        /// A promise that is fulfilled when the fragment has been prepared for copying.
        /// </returns>
        /// </signature>
        initialize();
        return getStateRecord(href).then(function (state) { return state.docfrag; });
    };

    function clearCache(href) {
        /// <signature helpKeyword="WinJS.UI.Fragments.clearCache">
        /// <summary locid="WinJS.UI.Fragments.clearCache">
        /// Removes any cached information about the specified fragment. This method does not unload any scripts
        /// or styles that are referenced by the fragment.
        /// </summary>
        /// <param name="href" type="String or DOMElement" locid="WinJS.UI.Fragments.clearCache_p:href">
        /// The URI that contains the fragment to be cleared. If no URI is provided, the entire contents of the cache are cleared.
        /// </param>
        /// </signature>

        if (!href) {
            cacheStore = {};
        }
        else if (typeof (href) == "string") {
            delete cacheStore[href.toLowerCase()];
        }
        else {
            delete WinJS.Utilities.data(href).docFragment;
            href.removeAttribute("data-win-hasfragment");
        }
    };

    function forceLocal(uri) {
        if (WinJS.Utilities.hasWinRT) {
            // we force the URI to be cannonicalized and made absolute by IE
            //
            var a = document.createElement("a");
            a.href = uri;
            
            var absolute = a.href;

            // WinRT Uri class doesn't provide URI construction, but can crack the URI
            // appart to let us reliably discover the scheme.
            //
            var wuri = new Windows.Foundation.Uri(absolute);
            
            // Only "ms-appx" (local package content) are allowed when running in the local 
            // context. Both strings are known to be safe to compare in any culture (including Turkish).
            //
            var scheme = wuri.schemeName;
            if (scheme !== "ms-appx") {

                throw new WinJS.ErrorFromName("WinJS.UI.Fragments.InvalidUri", strings.invalidFragmentUri);
            }

            return absolute;
        }
        return uri;
    }

    WinJS.Namespace.define("WinJS.UI.Fragments", {
        renderCopy: renderCopy,
        render: render,
        cache: cache,
        clearCache: clearCache,
        _cacheStore: { get: function () { return cacheStore; } },
        _forceLocal: forceLocal
    });
})(this, WinJS);

(function fragmentLoader2Init(global) {
    "use strict";

    // not supported in WebWorker
    if (!global.document) {
        return;
    }

    function cleanupDocumentIFrame(state) {
        // This is to work around a weird bug where removing the
        // IFrame from the DOM triggers DOMContentLoaded a second time.
        var temp = state.iframe;
        if (temp) {
            temp.contentDocument.removeEventListener("DOMContentLoaded", state.domContentLoaded, false);
            temp.parentNode.removeChild(temp);
            delete state.document;
            delete state.iframe;
            delete state.domContentLoaded;
        }
    };

    function populateDocumentIFrame(state, href) {
        return new WinJS.Promise(function (c, e, p) {
            var temp = document.createElement('iframe');
            temp.src = href;
            temp.style.display = 'none';

            state.domContentLoaded = function () {
                state.document = temp.contentDocument;
                state.iframe = temp;
                c();
            };

            document.body.appendChild(temp);
            temp.contentWindow.onerror = function (e) {
                // It's OK to swallow these as they will occur in the main document
                //
                return true;
            };
            temp.contentDocument.addEventListener("DOMContentLoaded", state.domContentLoaded, false);
        });
    };

    function cleanupDocumentXHR(state) {
        if (state.document) {
            delete state.document;
        }
        return WinJS.Promise.as();
    };

    function populateDocumentXHR(state, href) {
        // Because we later use "setInnerHTMLUnsafe" ("Unsafe" is the magic word here), we 
        // want to force the href to only support local package content when running
        // in the local context. When running in the web context, this will be a no-op.
        //
        href = WinJS.UI.Fragments._forceLocal(href);
    
        var htmlDoc = document.implementation.createHTMLDocument("frag");
        var base = htmlDoc.createElement("base");
        htmlDoc.head.appendChild(base);
        var anchor = htmlDoc.createElement("a");
        htmlDoc.body.appendChild(anchor);
        base.href = document.location.href; // Initialize base URL to primary document URL
        anchor.setAttribute("href", href); // Resolve the relative path to an absolute path
        base.href = anchor.href; // Update the base URL to be the resolved absolute path
        // 'anchor' is no longer needed at this point and will be removed by the innerHTML call
        state.document = htmlDoc;
        return WinJS.xhr({ url: href }).then(function (req) {
            WinJS.Utilities.setInnerHTMLUnsafe(htmlDoc.documentElement, req.responseText);
            htmlDoc.head.appendChild(base);
        });
    };
        
    if (global.document && document.implementation.createHTMLDocument && document.location.protocol !== "file:") {
        WinJS.Namespace.define("WinJS.UI.Fragments", {
            _populateDocument: populateDocumentXHR,
            _cleanupDocument: cleanupDocumentXHR
        });
    }
    else {
        WinJS.Namespace.define("WinJS.UI.Fragments", {
            _populateDocument: populateDocumentIFrame,
            _cleanupDocument: cleanupDocumentIFrame
        });
    }
})(this);
