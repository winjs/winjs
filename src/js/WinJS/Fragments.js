// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    './Core/_Global',
    './Core/_WinRT',
    './Core/_Base',
    './Core/_BaseUtils',
    './Core/_ErrorFromName',
    './Core/_Resources',
    './Core/_WriteProfilerMark',
    './Promise',
    './Utilities/_ElementUtilities',
    './Utilities/_SafeHtml',
    './Utilities/_Xhr'
], function fragmentLoaderInit(exports, _Global, _WinRT, _Base, _BaseUtils, _ErrorFromName, _Resources, _WriteProfilerMark, Promise, _ElementUtilities, _SafeHtml, _Xhr) {
    "use strict";

    var strings = {
        get invalidFragmentUri() { return "Unsupported uri for fragment loading. Fragments in the local context can only load from package content or local sources. To load fragments from other sources, use a web context."; },
    };

    // not supported in WebWorker
    if (!_Global.document) {
        return;
    }

    var forEach = function (arrayLikeValue, action) {
        for (var i = 0, l = arrayLikeValue.length; i < l; i++) {
            action(arrayLikeValue[i], i);
        }
    };
    var head = _Global.document.head || _Global.document.getElementsByTagName("head")[0];
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
            var n = _Global.document.createElement("script");
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
            } else {
                promise = new Promise(function (c) {
                    n.onload = n.onerror = function () {
                        c();
                    };

                    // Using scriptTag.src to maintain the original casing
                    n.setAttribute("src", scriptTag.src);
                });
            }
            head.appendChild(n);

            return {
                promise: promise,
                inline: inline,
            };
        }
    }

    function addStyle(styleTag, fragmentHref, position) {
        var src = (fragmentHref + "script[" + position + "]").toLowerCase();
        if (!(src in styles)) {
            styles[src] = true;
            head.appendChild(styleTag.cloneNode(true));
        }
    }

    function addLink(styleTag) {
        var src = styleTag.href.toLowerCase();
        if (!(src in links)) {
            links[src] = true;
            var n = styleTag.cloneNode(false);

            // Using scriptTag.href  to maintain the original casing
            n.href = styleTag.href;
            head.appendChild(n);
        }
    }

    function getStateRecord(href, removeFromCache) {
        if (typeof href === "string") {
            return loadFromCache(href, removeFromCache);
        } else {
            var state = {
                docfrag: _ElementUtilities.data(href).docFragment
            };
            if (!state.docfrag) {
                var fragment = _Global.document.createDocumentFragment();
                while (href.childNodes.length > 0) {
                    fragment.appendChild(href.childNodes[0]);
                }
                state.docfrag = _ElementUtilities.data(href).docFragment = fragment;
                href.setAttribute("data-win-hasfragment", "");
            }
            if (removeFromCache) {
                clearCache(href);
            }
            return Promise.as(state);
        }
    }
    function createEntry(state, href) {
        return populateDocument(state, href).
            then(function () {
                if (state.document) {
                    return processDocument(href, state);
                } else {
                    return state;
                }
            }).
            then(function () {
                if (state.document) {
                    delete state.document;
                }
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
            } else {
                return Promise.as(state);
            }
        } else {
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
        var lastNonInlineScriptPromise = Promise.as();
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
                if (href && href[0] !== "#") {
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

        return Promise.join(sp).then(function () {
            // Create the docfrag which is just the body children
            //
            var fragment = _Global.document.createDocumentFragment();
            var imported = _Global.document.importNode(cd.body, true);
            while (imported.childNodes.length > 0) {
                fragment.appendChild(imported.childNodes[0]);
            }
            state.docfrag = fragment;

            return state;
        });
    }

    function initialize() {
        if (initialized) { return; }

        initialized = true;

        forEach(head.querySelectorAll("script"), function (e) {
            scripts[e.src.toLowerCase()] = true;
        });


        forEach(head.querySelectorAll('link[rel="stylesheet"], link[type="text/css"]'), function (e) {
            links[e.href.toLowerCase()] = true;
        });
    }

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
    }

    function renderImpl(href, target, copy) {
        var profilerMarkIdentifier = (href instanceof _Global.HTMLElement ? _BaseUtils._getProfilerMarkIdentifier(href) : " href='" + href + "'") + "[" + (++uniqueId) + "]";
        writeProfilerMark("WinJS.UI.Fragments:render" + profilerMarkIdentifier + ",StartTM");

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
            } else {
                retVal = frag;
            }
            writeProfilerMark("WinJS.UI.Fragments:render" + profilerMarkIdentifier + ",StopTM");
            return retVal;
        });
    }

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
    }

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
    }

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
        } else if (typeof (href) === "string") {
            delete cacheStore[href.toLowerCase()];
        } else {
            delete _ElementUtilities.data(href).docFragment;
            href.removeAttribute("data-win-hasfragment");
        }
    }

    function _forceLocal(uri) {
        if (_BaseUtils.hasWinRT) {
            // we force the URI to be cannonicalized and made absolute by IE
            //
            var a = _Global.document.createElement("a");
            a.href = uri;

            var absolute = a.href;

            // WinRT Uri class doesn't provide URI construction, but can crack the URI
            // appart to let us reliably discover the scheme.
            //
            var wuri = new _WinRT.Windows.Foundation.Uri(absolute);

            // Only "ms-appx" (local package content) are allowed when running in the local
            // context. Both strings are known to be safe to compare in any culture (including Turkish).
            //
            var scheme = wuri.schemeName;
            if (scheme !== "ms-appx") {

                throw new _ErrorFromName("WinJS.UI.Fragments.InvalidUri", strings.invalidFragmentUri);
            }

            return absolute;
        }
        return uri;
    }

    function populateDocument(state, href) {
        // Because we later use "setInnerHTMLUnsafe" ("Unsafe" is the magic word here), we
        // want to force the href to only support local package content when running
        // in the local context. When running in the web context, this will be a no-op.
        //
        href = forceLocal(href);

        var htmlDoc = _Global.document.implementation.createHTMLDocument("frag");
        var base = htmlDoc.createElement("base");
        htmlDoc.head.appendChild(base);
        var anchor = htmlDoc.createElement("a");
        htmlDoc.body.appendChild(anchor);
        base.href = _Global.document.location.href; // Initialize base URL to primary document URL
        anchor.setAttribute("href", href); // Resolve the relative path to an absolute path
        base.href = anchor.href; // Update the base URL to be the resolved absolute path
        // 'anchor' is no longer needed at this point and will be removed by the innerHTML call
        state.document = htmlDoc;
        return getFragmentContents(href).then(function (text) {
            _SafeHtml.setInnerHTMLUnsafe(htmlDoc.documentElement, text);
            htmlDoc.head.appendChild(base);
        });
    }

    var writeProfilerMark = _WriteProfilerMark;
    var forceLocal = _forceLocal;

    var getFragmentContents = getFragmentContentsXHR;
    function getFragmentContentsXHR(href) {
        return _Xhr({ url: href }).then(function (req) {
            return req.responseText;
        });
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI.Fragments", {
        renderCopy: renderCopy,
        render: render,
        cache: cache,
        clearCache: clearCache,
        _cacheStore: { get: function () { return cacheStore; } },
        _forceLocal: {
            get: function () {
                return forceLocal;
            },
            set: function (value) {
                forceLocal = value;
            }
        },
        _getFragmentContents: {
            get: function () {
                return getFragmentContents;
            },
            set: function (value) {
                getFragmentContents = value;
            }
        },
        _writeProfilerMark: {
            get: function () {
                return writeProfilerMark;
            },
            set: function (value) {
                writeProfilerMark = value;
            }
        }
    });
});