// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    './Core/_Global',
    './Core/_Base',
    './Core/_BaseUtils',
    './Core/_WriteProfilerMark',
    './ControlProcessor',
    './Fragments',
    './Promise',
    './Utilities/_Control',
    './Utilities/_Dispose',
    './Utilities/_ElementUtilities'
    ], function pagesInit(exports, _Global, _Base, _BaseUtils, _WriteProfilerMark, ControlProcessor, Fragments, Promise, _Control, _Dispose, _ElementUtilities) {
    "use strict";

    // not supported in WebWorker
    if (!_Global.document) {
        return;
    }

    function abs(uri) {
        var a = document.createElement("a");
        a.href = uri;
        return a.href;
    }
    var viewMap = {};

    function selfhost(uri) {
        return document.location.href.toLowerCase() === uri.toLowerCase();
    }

    var _mixin = {
        dispose: function () {
            /// <signature helpKeyword="WinJS.UI.Pages.dispose">
            /// <summary locid="WinJS.UI.Pages.dispose">
            /// Disposes this Page.
            /// </summary>
            /// </signature>
            if (this._disposed) {
                return;
            }

            this._disposed = true;
            _Dispose.disposeSubTree(this.element);
            this.element = null;
        },
        load: function (uri) {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.load">
            /// <summary locid="WinJS.UI.Pages._mixin.load">
            /// Creates a copy of the DOM elements from the specified URI.  In order for this override
            /// to be used, the page that contains the load override needs to be defined by calling
            /// WinJS.UI.Pages.define() before WinJS.UI.Pages.render() is called.
            /// </summary>
            /// <param name="uri" locid="WinJS.UI.Pages._mixin.load_p:uri">
            /// The URI from which to copy the DOM elements.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.load_returnValue">
            /// A promise whose fulfilled value is the set of unparented DOM elements, if asynchronous processing is necessary. If not, returns nothing.
            /// </returns>
            /// </signature>
            if (!this.selfhost) {
                return Fragments.renderCopy(abs(uri));
            }
        },
        init: function () {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.init">
            /// <summary locid="WinJS.UI.Pages._mixin.init">
            /// Initializes the control before the content of the control is set.
            /// Use the processed method for any initialization that should be done after the content
            /// of the control has been set.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Pages._mixin.init_p:element">
            /// The DOM element that will contain all the content for the page.
            /// </param>
            /// <param name="options" locid="WinJS.UI.Pages._mixin.init_p:options">
            /// The options passed to the constructor of the page.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.init_returnValue">
            /// A promise that is fulfilled when initialization is complete, if asynchronous processing is necessary. If not, returns nothing.
            /// </returns>
            /// </signature>
        },
        processed: function () {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.processed">
            /// <summary locid="WinJS.UI.Pages._mixin.processed">
            /// Initializes the control after the content of the control is set.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Pages._mixin.processed_p:element">
            /// The DOM element that will contain all the content for the page.
            /// </param>
            /// <param name="options" locid="WinJS.UI.Pages._mixin.processed_p:options">
            /// The options that are to be passed to the constructor of the page.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.processed_returnValue">
            /// A promise that is fulfilled when initialization is complete, if asynchronous processing is necessary. If not, returns nothing.
            /// </returns>
            /// </signature>
        },
        render: function (element, options, loadResult) {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.render">
            /// <summary locid="WinJS.UI.Pages._mixin.render">
            /// Renders the control, typically by adding the elements specified in the loadResult parameter to the specified element.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Pages._mixin.render_p:element">
            /// The DOM element that will contain all the content for the page.
            /// </param>
            /// <param name="options" locid="WinJS.UI.Pages._mixin.render_p:options">
            /// The options passed into the constructor of the page.
            /// </param>
            /// <param name="loadResult" locid="WinJS.UI.Pages._mixin.render_p:loadResult">
            /// The elements returned from the load method.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.render_returnValue">
            /// A promise that is fulfilled when rendering is complete, if asynchronous processing is necessary. If not, returns nothing.
            /// </returns>
            /// </signature>
            if (!this.selfhost) {
                element.appendChild(loadResult);
            }
            return element;
        },
        ready: function () {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.ready">
            /// <summary locid="WinJS.UI.Pages._mixin.ready">
            /// Called after all initialization and rendering is complete. At this
            /// time the element is ready for use.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Pages._mixin.ready_p:element">
            /// The DOM element that contains all the content for the page.
            /// </param>
            /// <param name="options" locid="WinJS.UI.Pages._mixin.ready_p:options">
            /// The options passed into the constructor of the page
            /// </param>
            /// </signature>
        },
        error: function (err) {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.error">
            /// <summary locid="WinJS.UI.Pages._mixin.error">
            /// Called if any error occurs during the processing of the page.
            /// </summary>
            /// <param name="err" locid="WinJS.UI.Pages._mixin.error_p:err">
            /// The error that occurred.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.error_returnValue">
            /// Nothing if the error was handled, or an error promise if the error was not handled.
            /// </returns>
            /// </signature>
            return Promise.wrapError(err);
        }
    };

    function Pages_define(uri, members) {
        /// <signature helpKeyword="WinJS.UI.Pages.define">
        /// <summary locid="WinJS.UI.Pages.define">
        /// Creates a new page control from the specified URI that contains the specified members.
        /// Multiple calls to this method for the same URI are allowed, and all members will be
        /// merged.
        /// </summary>
        /// <param name="uri" locid="WinJS.UI.Pages.define_p:uri">
        /// The URI for the content that defines the page.
        /// </param>
        /// <param name="members" locid="WinJS.UI.Pages.define_p:members">
        /// Additional members that the control will have.
        /// </param>
        /// <returns type="Function" locid="WinJS.UI.Pages.define_returnValue">
        /// A constructor function that creates the page.
        /// </returns>
        /// </signature>
        uri = abs(uri);

        var base = viewMap[uri.toLowerCase()];
        if (!base) {
            base = _Base.Class.define(
                // This needs to follow the WinJS.UI.processAll "async constructor"
                // pattern to interop nicely in the "Views.Control" use case.
                //
                function PageControl_ctor(element, options, complete, parentedPromise) {
                    var that = this;
                    this._disposed = false;
                    this.element = element = element || document.createElement("div");
                    _ElementUtilities.addClass(element, "win-disposable");
                    element.msSourceLocation = uri;
                    this.uri = uri;
                    this.selfhost = selfhost(uri);
                    element.winControl = this;
                    _ElementUtilities.addClass(element, "pagecontrol");
                    
                    var profilerMarkIdentifier = " uri='" + uri + "'" + _BaseUtils._getProfilerMarkIdentifier(this.element);
                    
                    _WriteProfilerMark("WinJS.UI.Pages:createPage" + profilerMarkIdentifier + ",StartTM");

                    var load = Promise.wrap().
                        then(function Pages_load() { return that.load(uri); });

                    var renderCalled = load.then(function Pages_init(loadResult) {
                        return Promise.join({
                            loadResult: loadResult,
                            initResult: that.init(element, options)
                        });
                    }).then(function Pages_render(result) {
                        return that.render(element, options, result.loadResult);
                    });

                    this.elementReady = renderCalled.then(function () { return element; });

                    this.renderComplete = renderCalled.
                        then(function Pages_processAll(f) {
                            return ControlProcessor.processAll(f).then(function () { return f; });
                        }).then(function Pages_processed() {
                            return that.processed(element, options);
                        }).then(function () {
                            return that;
                        });

                    var callComplete = function () {
                        complete && complete(that);
                        _WriteProfilerMark("WinJS.UI.Pages:createPage" + profilerMarkIdentifier + ",StopTM");
                    };

                    // promises guarantee order, so this will be called prior to ready path below
                    //
                    this.renderComplete.then(callComplete, callComplete);

                    this.renderComplete.then(function () {
                        return parentedPromise;
                    }).then(function Pages_ready() {
                        that.ready(element, options);
                    }).then(
                        null,
                        function Pages_error(err) {
                            return that.error(err);
                        }
                    );
                },
                _mixin
            );
            base = _Base.Class.mix(base, _Control.DOMEventMixin);
            viewMap[uri.toLowerCase()] = base;
        }

        // Lazily mix in the members, allowing for multiple definitions of "define" to augment
        // the shared definition of the member.
        //
        if (members) {
            base = _Base.Class.mix(base, members);
        }

        if (selfhost(uri)) {
            _BaseUtils.ready(function () {
                render(uri, document.body);
            });
        }

        return base;
    }

    function get(uri) {
        /// <signature helpKeyword="WinJS.UI.Pages.get">
        /// <summary locid="WinJS.UI.Pages.get">
        /// Gets an already-defined page control for the specified URI, or creates a new one.
        /// </summary>
        /// <param name="uri" locid="WinJS.UI.Pages.get_p:uri">
        /// The URI for the content that defines the page.
        /// </param>
        /// <returns type="Function" locid="WinJS.UI.Pages.get_returnValue">
        /// A constructor function that creates the page.
        /// </returns>
        /// </signature>
        uri = abs(uri);
        var ctor = viewMap[uri.toLowerCase()];
        if (!ctor) {
            ctor = Pages_define(uri);
        }
        return ctor;
    }

    function _remove(uri) {
        uri = abs(uri);
        Fragments.clearCache(uri);
        delete viewMap[uri.toLowerCase()];
    }

    function render(uri, element, options, parentedPromise) {
        /// <signature helpKeyword="WinJS.UI.Pages.render">
        /// <summary locid="WinJS.UI.Pages.render">
        /// Creates a page control from the specified URI inside
        /// the specified element with the specified options.
        /// </summary>
        /// <param name="uri" locid="WinJS.UI.Pages.render_p:uri">
        /// The URI for the content that defines the page.
        /// </param>
        /// <param name="element" isOptional="true" locid="WinJS.UI.Pages.render_p:element">
        /// The element to populate with the page.
        /// </param>
        /// <param name="options" isOptional="true" locid="WinJS.UI.Pages.render_p:options">
        /// The options for configuring the page.
        /// </param>
        /// <param name="parentedPromise" isOptional="true" locid="WinJS.UI.Pages.render_p:parentedPromise">
        /// A promise that is fulfilled when the specified element is parented to the final document.
        /// </param>
        /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages.render_returnValue">
        /// A promise that is fulfilled when the page is done rendering
        /// </returns>
        /// </signature>
        var Ctor = get(uri);
        var control = new Ctor(element, options, null, parentedPromise);
        return control.renderComplete;
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI.Pages", {
        define: Pages_define,
        get: get,
        _remove: _remove,
        render: render
    });

});