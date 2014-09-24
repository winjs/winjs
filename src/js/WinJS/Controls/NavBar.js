// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    '../Core/_Global',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_Events',
    '../Core/_WriteProfilerMark',
    '../Promise',
    '../Scheduler',
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    './AppBar',
    './NavBar/_Command',
    './NavBar/_Container',
    'require-style!less/desktop/controls'
], function NavBarInit(_Global,_WinRT, _Base, _BaseUtils, _Events, _WriteProfilerMark, Promise, Scheduler, _ElementUtilities, _Hoverable, AppBar, _Command, _Container) {
    "use strict";

    var customLayout = "custom";

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.NavBar">
        /// Displays navigation commands in a toolbar that the user can show or hide.
        /// </summary>
        /// <compatibleWith platform="Windows" minVersion="8.1"/>
        /// </field>
        /// <icon src="ui_winjs.ui.navbar.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.navbar.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.NavBar">
        /// <div data-win-control="WinJS.UI.NavBarContainer">
        /// <div data-win-control="WinJS.UI.NavBarCommand" data-win-options="{location:'/pages/home/home.html',label:'Home',icon:WinJS.UI.AppBarIcon.home}"></div>
        /// </div>
        /// </div>]]></htmlSnippet>
        /// <event name="beforeshow" locid="WinJS.UI.NavBar_e:beforeshow">Raised just before showing the NavBar.</event>
        /// <event name="aftershow" locid="WinJS.UI.NavBar_e:aftershow">Raised immediately after an NavBar is fully shown.</event>
        /// <event name="beforehide" locid="WinJS.UI.NavBar_e:beforehide">Raised just before hiding the  NavBar.</event>
        /// <event name="afterhide" locid="WinJS.UI.NavBar_e:afterhide">Raised immediately after the NavBar is fully hidden.</event>
        /// <event name="childrenprocessed" locid="WinJS.UI.NavBar_e:childrenprocessed">Fired when children of NavBar control have been processed from a WinJS.UI.processAll call.</event>
        /// <part name="navbar" class="win-navbar" locid="WinJS.UI.NavBar_part:navbar">Styles the entire NavBar.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        NavBar: _Base.Namespace._lazy(function () {
            var childrenProcessedEventName = "childrenprocessed";
            var createEvent = _Events._createEventProperty;

            var NavBar = _Base.Class.derive(AppBar.AppBar, function NavBar_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.NavBar.NavBar">
                /// <summary locid="WinJS.UI.NavBar.constructor">
                /// Creates a new NavBar.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.NavBar.constructor_p:element">
                /// The DOM element that will host the new NavBar control.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.NavBar.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control. Each property of the options object corresponds to one of the control's
                /// properties or events.
                /// </param>
                /// <returns type="WinJS.UI.NavBar" locid="WinJS.UI.NavBar.constructor_returnValue">
                /// The new NavBar control.
                /// </returns>
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </signature>

                options = options || {};

                // Shallow copy object so we can modify it.
                options = _BaseUtils._shallowCopy(options);

                // Default to Placement = Top and Layout = Custom
                options.placement = options.placement || "top";
                options.layout = customLayout;

                AppBar.AppBar.call(this, element, options);

                this._element.addEventListener("beforeshow", this._handleBeforeShow.bind(this));

                _ElementUtilities.addClass(this.element, NavBar._ClassName.navbar);

                if (_WinRT.Windows.ApplicationModel.DesignMode.designModeEnabled) {
                    this._processChildren();
                } else {
                    Scheduler.schedule(this._processChildren.bind(this), Scheduler.Priority.idle, null, "WinJS.UI.NavBar.processChildren");
                }
            }, {
                // Block others from setting the layout property.

                /// <field type="String" defaultValue="commands" oamOptionsDatatype="WinJS.UI.NavBar.layout" locid="WinJS.UI.NavBar.layout" helpKeyword="WinJS.UI.NavBar.layout">
                /// The layout of the NavBar contents.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                layout: {
                    get: function () {
                        return customLayout;
                    },
                    set: function () {
                        Object.getOwnPropertyDescriptor(AppBar.AppBar.prototype, "layout").set.call(this, customLayout);
                    },
                },

                /// <field type="Function" locid="WinJS.UI.NavBar.onchildrenprocessed" helpKeyword="WinJS.UI.NavBar.onchildrenprocessed">
                /// Raised when children of NavBar control have been processed by a WinJS.UI.processAll call.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                onchildrenprocessed: createEvent(childrenProcessedEventName),

                _processChildren: function NavBar_processChildren() {
                    // The NavBar control schedules processAll on its children at idle priority to avoid hurting startup
                    // performance. If the NavBar is shown before the scheduler gets to the idle job, the NavBar will
                    // immediately call processAll on its children. If your app needs the children to be processed before
                    // the scheduled job executes, you may call processChildren to force the processAll call.
                    if (!this._processed) {
                        this._processed = true;

                        this._writeProfilerMark("processChildren,StartTM");
                        var that = this;
                        var processed = Promise.as();
                        if (this._processors) {
                            this._processors.forEach(function (processAll) {
                                for (var i = 0, len = that.element.children.length; i < len; i++) {
                                    (function (child) {
                                        processed = processed.then(function () {
                                            processAll(child);
                                        });
                                    }(that.element.children[i]));
                                }
                            });
                        }
                        return processed.then(
                            function () {
                                that._writeProfilerMark("processChildren,StopTM");
                                that._fireEvent(NavBar._EventName.childrenProcessed);
                            },
                            function () {
                                that._writeProfilerMark("processChildren,StopTM");
                                that._fireEvent(NavBar._EventName.childrenProcessed);
                            }
                        );
                    }
                    return Promise.wrap();
                },

                _show: function NavBar_show() {
                    // Override _show to call processChildren first.
                    //
                    if (this.disabled) {
                        return;
                    }
                    var that = this;
                    this._processChildren().then(function () {
                        AppBar.AppBar.prototype._show.call(that);
                    });
                },

                _handleBeforeShow: function NavBar_handleBeforeShow() {
                    // Navbar needs to ensure its elements to have their correct height and width after AppBar changes display="none"
                    // to  display="" and AppBar needs the elements to have their final height before it measures its own element height
                    // to do the slide in animation over the correct amount of pixels.
                    if (this._disposed) {
                        return;
                    }

                    var navbarcontainerEls = this.element.querySelectorAll('.win-navbarcontainer');
                    for (var i = 0; i < navbarcontainerEls.length; i++) {
                        navbarcontainerEls[i].winControl.forceLayout();
                    }
                },

                _fireEvent: function NavBar_fireEvent(type, detail) {
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent(type, true, false, detail || {});
                    this.element.dispatchEvent(event);
                },

                _writeProfilerMark: function NavBar_writeProfilerMark(text) {
                    _WriteProfilerMark("WinJS.UI.NavBar:" + this._id + ":" + text);
                }
            }, {
                _ClassName: {
                    navbar: "win-navbar"
                },
                _EventName: {
                    childrenProcessed: childrenProcessedEventName
                },
                isDeclarativeControlContainer: _BaseUtils.markSupportedForProcessing(function (navbar, callback) {
                    if (navbar._processed) {
                        for (var i = 0, len = navbar.element.children.length; i < len; i++) {
                            callback(navbar.element.children[i]);
                        }
                    } else {
                        navbar._processors = navbar._processors || [];
                        navbar._processors.push(callback);
                    }
                })
            });

            return NavBar;
        })
    });

});