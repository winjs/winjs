// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    './Core/_Global',
    './Core/_Base',
    './Core/_BaseUtils',
    './ControlProcessor',
    './Fragments',
    './Pages/_BasePage',
    './Promise',
    ], function pagesInit(exports, _Global, _Base, _BaseUtils, ControlProcessor, Fragments, _BasePage, Promise) {
    "use strict";

    // not supported in WebWorker
    if (!_Global.document) {
        return;
    }

    var _mixin = {
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
                return Fragments.renderCopy(_BasePage.abs(uri));
            }
        },
        process: function(element, options) {
            /// <signature helpKeyword="WinJS.UI.Pages._mixin.process">
            /// <summary locid="WinJS.UI.Pages._mixin.process">
            /// Processes the unparented DOM elements returned by load.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Pages._mixin.process_p:element">
            /// The DOM element that will contain all the content for the page.
            /// </param>
            /// <param name="options" locid="WinJS.UI.Pages._mixin.process_p:options">
            /// The options that are to be passed to the constructor of the page.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Pages._mixin.process_returnValue">
            /// A promise that is fulfilled when processing is complete.
            /// </returns>
            /// </signature>
            return ControlProcessor.processAll(element);
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

        var Page = _BasePage.get(uri);

        if(!Page) {
            Page = _BasePage.define(uri, _mixin);
        }

        if (members) {
            Page = _Base.Class.mix(Page, members);
        }

        if(Page.selfhost) {
            _BaseUtils.ready(function () {
                render(_BasePage.abs(uri), _Global.document.body);
            }, true);
        }

        return Page;
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

        var ctor = _BasePage.get(uri);
        if (!ctor) {
            ctor = Pages_define(uri);
        }
        return ctor;
    }

    function _remove(uri) {
        Fragments.clearCache(_BasePage.abs(uri));
        _BasePage.remove(uri);
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