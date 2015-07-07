// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
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
    "../_Accents",
    './_LegacyAppBar',
    './NavBar/_Command',
    './NavBar/_Container',
    'require-style!less/styles-navbar',
    'require-style!less/colors-navbar'
], function NavBarInit(_Global,_WinRT, _Base, _BaseUtils, _Events, _WriteProfilerMark, Promise, Scheduler, _ElementUtilities, _Hoverable, _Accents, _LegacyAppBar, _Command, _Container) {
    "use strict";

    _Accents.createAccentRule("html.win-hoverable .win-navbarcommand-splitbutton.win-navbarcommand-splitbutton-opened:hover", [{ name: "background-color", value: _Accents.ColorTypes.listSelectHover }]);
    _Accents.createAccentRule("html.win-hoverable .win-navbarcommand-splitbutton.win-navbarcommand-splitbutton-opened:hover.win-pressed", [{ name: "background-color", value: _Accents.ColorTypes.listSelectPress }]);
    _Accents.createAccentRule(".win-navbarcommand-splitbutton.win-navbarcommand-splitbutton-opened", [{ name: "background-color", value: _Accents.ColorTypes.listSelectRest }]);
    _Accents.createAccentRule(".win-navbarcommand-splitbutton.win-navbarcommand-splitbutton-opened.win-pressed", [{ name: "background-color", value: _Accents.ColorTypes.listSelectPress }]);

    var customLayout = "custom";

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.NavBar">
        /// Displays navigation commands in a toolbar that the user can open or close.
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
        /// <event name="beforeopen" locid="WinJS.UI.NavBar_e:beforeopen">Raised just before opening the NavBar.</event>
        /// <event name="afteropen" locid="WinJS.UI.NavBar_e:afteropen">Raised immediately after an NavBar is fully opened.</event>
        /// <event name="beforeclose" locid="WinJS.UI.NavBar_e:beforeclose">Raised just before closing the  NavBar.</event>
        /// <event name="afterclose" locid="WinJS.UI.NavBar_e:afterclose">Raised immediately after the NavBar is fully closed.</event>
        /// <event name="childrenprocessed" locid="WinJS.UI.NavBar_e:childrenprocessed">Fired when children of NavBar control have been processed from a WinJS.UI.processAll call.</event>
        /// <part name="navbar" class="win-navbar" locid="WinJS.UI.NavBar_part:navbar">Styles the entire NavBar.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        NavBar: _Base.Namespace._lazy(function () {
            var childrenProcessedEventName = "childrenprocessed";
            var createEvent = _Events._createEventProperty;

            var NavBar = _Base.Class.derive(_LegacyAppBar._LegacyAppBar, function NavBar_ctor(element, options) {
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
                /// <deprecated type="deprecate">
                /// NavBar is deprecated and may not be available in future releases. 
                /// Instead, use a WinJS SplitView to display navigation targets within the app.
                /// </deprecated>
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </signature>

                _ElementUtilities._deprecated(strings.navBarIsDeprecated);

                options = options || {};

                // Shallow copy object so we can modify it.
                options = _BaseUtils._shallowCopy(options);

                // Default to Placement = Top and Layout = Custom
                options.placement = options.placement || "top";
                options.layout = customLayout;
                options.closedDisplayMode = options.closedDisplayMode || "minimal";

                _LegacyAppBar._LegacyAppBar.call(this, element, options);

                this._element.addEventListener("beforeopen", this._handleBeforeShow.bind(this));

                _ElementUtilities.addClass(this.element, NavBar._ClassName.navbar);

                if (_WinRT.Windows.ApplicationModel.DesignMode.designModeEnabled) {
                    this._processChildren();
                } else {
                    Scheduler.schedule(this._processChildren.bind(this), Scheduler.Priority.idle, null, "WinJS.UI.NavBar.processChildren");
                }
            }, {

                // Restrict values of closedDisplayMode to 'none' or 'minimal'

                /// <field type="String" defaultValue="minimal" locid="WinJS.UI.NavBar.closedDisplayMode" helpKeyword="WinJS.UI.NavBar.closedDisplayMode" isAdvanced="true">
                /// Gets/Sets how NavBar will display itself while hidden. Values are "none" and "minimal".
                /// </field>
                closedDisplayMode: {
                    get: function () {
                        return this._closedDisplayMode;
                    },
                    set: function (value) {
                        var newValue = (value  === "none" ? "none" : "minimal");
                        Object.getOwnPropertyDescriptor(_LegacyAppBar._LegacyAppBar.prototype, "closedDisplayMode").set.call(this, newValue);
                        this._closedDisplayMode = newValue;
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
                        _LegacyAppBar._LegacyAppBar.prototype._show.call(that);
                    });
                },

                _handleBeforeShow: function NavBar_handleBeforeShow() {
                    // Navbar needs to ensure its elements to have their correct height and width after _LegacyAppBar changes display="none"
                    // to  display="" and _LegacyAppBar needs the elements to have their final height before it measures its own element height
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

            var strings = {
                get navBarIsDeprecated() { return "NavBar is deprecated and may not be available in future releases. Instead, use a WinJS SplitView to display navigation targets within the app."; }
            };

            return NavBar;
        })
    });

});