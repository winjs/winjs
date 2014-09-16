// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <dictionary>appbar,Flyout,Flyouts,registeredforsettings,SettingsFlyout,Statics,Syriac</dictionary>
define([
    '../Core/_Global',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Animations',
    '../Pages',
    '../Promise',
    '../Utilities/_Dispose',
    '../Utilities/_ElementUtilities',
    '../Utilities/_ElementListUtilities',
    '../Utilities/_Hoverable',
    './AppBar/_Constants',
    './Flyout/_Overlay',
    'require-style!less/desktop/controls',
    'require-style!less/phone/controls'
    ], function settingsFlyoutInit(_Global,_WinRT, _Base, _BaseUtils, _ErrorFromName, _Resources, _WriteProfilerMark, Animations, Pages, Promise, _Dispose, _ElementUtilities, _ElementListUtilities, _Hoverable, _Constants, _Overlay) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.SettingsFlyout">Provides users with fast, in-context access to settings that affect the current app.</summary>
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        /// <name locid="WinJS.UI.SettingsFlyout_name">Settings Flyout</name>
        /// <icon src="ui_winjs.ui.settingsflyout.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.settingsflyout.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.SettingsFlyout">
        /// <div class="win-header">
        /// <button type="button" onclick="WinJS.UI.SettingsFlyout.show()" class="win-backbutton"></button>
        /// <div class="win-label">Custom Settings</div>
        /// </div>
        /// <div class="win-content">
        /// {Your Content Here}
        /// </div>
        /// </div>]]></htmlSnippet>
        /// <event name="beforeshow" locid="WinJS.UI.SettingsFlyout_e:beforeshow">Raised just before showing a SettingsFlyout.</event>
        /// <event name="aftershow" locid="WinJS.UI.SettingsFlyout_e:aftershow">Raised immediately after a SettingsFlyout is fully shown.</event>
        /// <event name="beforehide" locid="WinJS.UI.SettingsFlyout_e:beforehide">Raised just before hiding a SettingsFlyout.</event>
        /// <event name="afterhide" locid="WinJS.UI.SettingsFlyout_e:afterhide">Raised immediately after a SettingsFlyout is fully hidden.</event>
        /// <part name="settings" class="win-settingsflyout" locid="WinJS.UI.SettingsFlyout_part:settings">The SettingsFlyout control itself.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        SettingsFlyout: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            var settingsPageIsFocusedOnce;

            // Constants for width
            var settingsNarrow = "narrow",
                settingsWide = "wide";

            // Determine if the settings pane (system language) is RTL or not.
            function _shouldAnimateFromLeft() {
                if (_WinRT.Windows.UI.ApplicationSettings.SettingsEdgeLocation) {
                    var appSettings = _WinRT.Windows.UI.ApplicationSettings;
                    return (appSettings.SettingsPane.edge === appSettings.SettingsEdgeLocation.left);
                } else {
                    return false;
                }
            }

            // Get the settings control by matching the settingsCommandId
            // if no match we'll try to match element id
            function _getChildSettingsControl(parentElement, id) {
                var settingElements = parentElement.querySelectorAll("." + _Constants.settingsFlyoutClass);
                var retValue,
                    control;
                for (var i = 0; i < settingElements.length; i++) {
                    control = settingElements[i].winControl;
                    if (control) {
                        if (control.settingsCommandId === id) {
                            retValue = control;
                            break;
                        }
                        if (settingElements[i].id === id) {
                            retValue = retValue || control;
                        }
                    }
                }

                return retValue;
            }

            var SettingsFlyout = _Base.Class.derive(_Overlay._Overlay, function SettingsFlyout_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.SettingsFlyout.SettingsFlyout">
                /// <summary locid="WinJS.UI.SettingsFlyout.constructor">Creates a new SettingsFlyout control.</summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.SettingsFlyout.constructor_p:element">
                /// The DOM element that will host the control.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.SettingsFlyout.constructor_p:options">
                /// The set of properties and values to apply to the new SettingsFlyout.
                /// </param>
                /// <returns type="WinJS.UI.SettingsFlyout" locid="WinJS.UI.SettingsFlyout.constructor_returnValue">The new SettingsFlyout control.</returns>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </signature>

                // Make sure there's an input element
                this._element = element || _Global.document.createElement("div");
                this._id = this._element.id || _ElementUtilities._uniqueID(this._element);
                this._writeProfilerMark("constructor,StartTM");

                // Call the base overlay constructor helper
                this._baseOverlayConstructor(this._element, options);

                this._addFirstDiv();
                this._addFinalDiv();

                // Handle "esc" & "tab" key presses
                this._element.addEventListener("keydown", this._handleKeyDown, true);

                // Make a click eating div
                _Overlay._Overlay._createClickEatingDivAppBar();

                // Start settings hidden
                this._element.style.visibilty = "hidden";
                this._element.style.display = "none";

                // Attach our css class
                _ElementUtilities.addClass(this._element, _Constants.settingsFlyoutClass);

                // apply the light theme styling to the win-content elements inside the SettingsFlyout
                _ElementListUtilities.query("div.win-content", this._element).
                    forEach(function (e) {
                        if (!_ElementUtilities._matchesSelector(e, '.win-ui-dark, .win-ui-dark *')){
                            _ElementUtilities.addClass(e, _Constants.flyoutLightClass);
                        }
                    });

                // Make sure we have an ARIA role
                var role = this._element.getAttribute("role");
                if (role === null || role === "" || role === undefined) {
                    this._element.setAttribute("role", "dialog");
                }
                var label = this._element.getAttribute("aria-label");
                if (label === null || label === "" || label === undefined) {
                    this._element.setAttribute("aria-label", strings.ariaLabel);
                }

                // Make sure additional _Overlay event handlers are hooked up.
                this._handleOverlayEventsForFlyoutOrSettingsFlyout();

                // Make sure animations are hooked up
                this._currentAnimateIn = this._animateSlideIn;
                this._currentAnimateOut = this._animateSlideOut;
                this._writeProfilerMark("constructor,StopTM");
            }, {
                // Public Properties

                /// <field type="String" defaultValue="narrow" oamOptionsDatatype="WinJS.UI.SettingsFlyout.width" locid="WinJS.UI.SettingsFlyout.width" helpKeyword="WinJS.UI.SettingsFlyout.width">
                /// Width of the SettingsFlyout, "narrow", or "wide".
                /// <deprecated type="deprecate">
                /// SettingsFlyout.width may be altered or unavailable in future versions. Instead, style the CSS width property on elements with the .win-settingsflyout class.
                /// </deprecated>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                width: {
                    get: function () {
                        return this._width;
                    },

                    set: function (value) {
                        _ElementUtilities._deprecated(strings.widthDeprecationMessage);
                        if (value === this._width) {
                            return;
                        }
                        // Get rid of old class
                        if (this._width === settingsNarrow) {
                            _ElementUtilities.removeClass(this._element, _Constants.narrowClass);
                        } else if (this._width === settingsWide) {
                            _ElementUtilities.removeClass(this._element, _Constants.wideClass);
                        }
                        this._width = value;

                        // Attach our new css class
                        if (this._width === settingsNarrow) {
                            _ElementUtilities.addClass(this._element, _Constants.narrowClass);
                        } else if (this._width === settingsWide) {
                            _ElementUtilities.addClass(this._element, _Constants.wideClass);
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.SettingsFlyout.settingsCommandId" helpKeyword="WinJS.UI.SettingsFlyout.settingsCommandId">
                /// Define the settings command Id for the SettingsFlyout control.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                settingsCommandId: {
                    get: function () {
                        return this._settingsCommandId;
                    },

                    set: function (value) {
                        this._settingsCommandId = value;
                    }
                },

                show: function () {
                    /// <signature helpKeyword="WinJS.UI.SettingsFlyout.show">
                    /// <summary locid="WinJS.UI.SettingsFlyout.show">
                    /// Shows the SettingsFlyout, if hidden.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    // Just call private version to make appbar flags happy

                    // Don't do anything if disabled
                    if (this.disabled) {
                        return;
                    }
                    this._writeProfilerMark("show,StartTM"); // The corresponding "stop" profiler mark is handled in _Overlay._baseEndShow().
                    this._show();
                },

                _dispose: function SettingsFlyout_dispose() {
                    _Dispose.disposeSubTree(this.element);
                    this._dismiss();
                },

                _show: function SettingsFlyout_show() {
                    // We call our base "_baseShow" because SettingsFlyout overrides show
                    this._baseShow();
                    // Need click-eating div to be visible,
                    // (even if now hiding, we'll show and need click eater)
                    _Overlay._Overlay._showClickEatingDivAppBar();
                },

                _endShow: function SettingsFlyout_endShow() {
                    // Clean up after showing
                    this._initAfterAnimation();
                },

                _initAfterAnimation: function SettingsFlyout_initAfterAnimation() {
                    settingsPageIsFocusedOnce = 0;

                    // Verify that the firstDiv and finalDiv are in the correct location.
                    // Move them to the correct location or add them if they are not.
                    if (!_ElementUtilities.hasClass(this.element.children[0], _Constants.firstDivClass)) {
                        var firstDiv = this.element.querySelectorAll(".win-first");
                        if (firstDiv && firstDiv.length > 0) {
                            firstDiv.item(0).parentNode.removeChild(firstDiv.item(0));
                        }

                        this._addFirstDiv();
                    }

                    // Set focus to the firstDiv
                    if (this.element.children[0]) {
                        _ElementUtilities._addEventListener(this.element.children[0], "focusout", function () { settingsPageIsFocusedOnce = 1; }, false);
                        this.element.children[0].focus();
                    }

                    if (!_ElementUtilities.hasClass(this.element.children[this.element.children.length - 1], _Constants.finalDivClass)) {
                        var finalDiv = this.element.querySelectorAll(".win-final");
                        if (finalDiv && finalDiv.length > 0) {
                            finalDiv.item(0).parentNode.removeChild(finalDiv.item(0));
                        }

                        this._addFinalDiv();
                    }

                    this._setBackButtonsAriaLabel();
                },

                _setBackButtonsAriaLabel: function SettingsFlyout_setBackButtonsAriaLabel() {
                    var backbuttons = this.element.querySelectorAll(".win-backbutton");
                    var label;
                    for (var i = 0; i < backbuttons.length; i++) {
                        label = backbuttons[i].getAttribute("aria-label");
                        if (label === null || label === "" || label === undefined) {
                            backbuttons[i].setAttribute("aria-label", strings.backbuttonAriaLabel);
                        }
                    }
                },

                hide: function () {
                    /// <signature helpKeyword="WinJS.UI.SettingsFlyout.hide">
                    /// <summary locid="WinJS.UI.SettingsFlyout.hide">
                    /// Hides the SettingsFlyout, if visible, regardless of other state.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    // Just call private version to make appbar flags happy
                    this._writeProfilerMark("hide,StartTM"); // The corresponding "stop" profiler mark is handled in _Overlay._baseEndHide().
                    this._hide();
                },

                _hide: function SettingsFlyout_hide() {
                    if (this._baseHide()) {
                        // Need click-eating div to be hidden
                        _Overlay._Overlay._hideClickEatingDivAppBar();
                    }
                },

                // SettingsFlyout animations
                _animateSlideIn: function SettingsFlyout_animateSlideIn() {
                    var animateFromLeft = _shouldAnimateFromLeft();
                    var offset = animateFromLeft ? "-100px" : "100px";
                    _ElementListUtilities.query("div.win-content", this._element).
                        forEach(function (e) { Animations.enterPage(e, { left: offset }); });

                    var where,
                        width = this._element.offsetWidth;
                    // Slide in from right side or left side?
                    if (animateFromLeft) {
                        // RTL
                        where = { top: "0px", left: "-" + width + "px" };
                        this._element.style.right = "auto";
                        this._element.style.left = "0px";
                    } else {
                        // From right side
                        where = { top: "0px", left: width + "px" };
                        this._element.style.right = "0px";
                        this._element.style.left = "auto";
                    }

                    this._element.style.opacity = 1;
                    this._element.style.visibility = "visible";

                    return Animations.showPanel(this._element, where);
                },

                _animateSlideOut: function SettingsFlyout_animateSlideOut() {
                    var where,
                        width = this._element.offsetWidth;
                    if (_shouldAnimateFromLeft()) {
                        // RTL
                        where = { top: "0px", left: width + "px" };
                        this._element.style.right = "auto";
                        this._element.style.left = "-" + width + "px";
                    } else {
                        // From right side
                        where = { top: "0px", left: "-" + width + "px" };
                        this._element.style.right = "-" + width + "px";
                        this._element.style.left = "auto";
                    }

                    return Animations.showPanel(this._element, where);
                },

                _fragmentDiv: {
                    get: function SettingsFlyout_fragmentDiv_get() {
                        return this._fragDiv;
                    },

                    set: function SettingsFlyout_fragmentDiv_set(value) {
                        this._fragDiv = value;
                    }
                },

                _unloadPage: function SettingsFlyout_unloadPage(event) {
                    var settingsControl = event.currentTarget.winControl;
                    settingsControl.removeEventListener(_Overlay._Overlay.afterHide, this._unloadPage, false);

                    Promise.as().then(function () {
                        if (settingsControl._fragmentDiv) {
                            _Global.document.body.removeChild(settingsControl._fragmentDiv);
                            settingsControl._fragmentDiv = null;
                        }
                    });
                },

                _dismiss: function SettingsFlyout_dismiss() {
                    this.addEventListener(_Overlay._Overlay.afterHide, this._unloadPage, false);
                    this._hide();
                },

                _handleKeyDown: function SettingsFlyout_handleKeyDown(event) {
                    if (event.keyCode === Key.escape) {
                        event.preventDefault();
                        event.stopPropagation();
                        this.winControl._dismiss();
                    } else if ((event.keyCode === Key.space || event.keyCode === Key.enter)
                           && (this.children[0] === _Global.document.activeElement)) {
                        event.preventDefault();
                        event.stopPropagation();
                        this.winControl._dismiss();
                    } else if (event.shiftKey && event.keyCode === Key.tab
                    && this.children[0] === _Global.document.activeElement) {
                        event.preventDefault();
                        event.stopPropagation();
                        var _elms = this.getElementsByTagName("*");

                        for (var i = _elms.length - 2; i >= 0; i--) {
                            _elms[i].focus();

                            if (_elms[i] === _Global.document.activeElement) {
                                break;
                            }
                        }
                    }
                },

                _focusOnLastFocusableElementFromParent: function SettingsFlyout_focusOnLastFocusableElementFromParent() {
                    var active = _Global.document.activeElement;
                    if (!settingsPageIsFocusedOnce || !active || !_ElementUtilities.hasClass(active, _Constants.firstDivClass)) {
                        return;
                    }

                    var _elms = this.parentElement.getElementsByTagName("*");

                    // There should be at least 1 element in addition to the firstDiv & finalDiv
                    if (_elms.length <= 2) {
                        return;
                    }

                    // Get the tabIndex set to the finalDiv (which is the highest)
                    var _highestTabIndex = _elms[_elms.length - 1].tabIndex;

                    // If there are positive tabIndices, set focus to the element with the highest tabIndex.
                    // Otherwise set focus to the last focusable element in DOM order.
                    var i;
                    if (_highestTabIndex) {
                        for (i = _elms.length - 2; i > 0; i--) {
                            if (_elms[i].tabIndex === _highestTabIndex) {
                                _elms[i].focus();
                                break;
                            }
                        }
                    } else {
                        for (i = _elms.length - 2; i > 0; i--) {
                            // Skip <div> with undefined tabIndex (To work around Win8 bug #622245)
                            if ((_elms[i].tagName !== "DIV") || (_elms[i].getAttribute("tabIndex") !== null)) {
                                _elms[i].focus();

                                if (_elms[i] === _Global.document.activeElement) {
                                    break;
                                }
                            }
                        }
                    }
                },

                _focusOnFirstFocusableElementFromParent: function SettingsFlyout_focusOnFirstFocusableElementFromParent() {
                    var active = _Global.document.activeElement;
                    if (!active || !_ElementUtilities.hasClass(active, _Constants.finalDivClass)) {
                        return;
                    }
                    var _elms = this.parentElement.getElementsByTagName("*");

                    // There should be at least 1 element in addition to the firstDiv & finalDiv
                    if (_elms.length <= 2) {
                        return;
                    }

                    // Get the tabIndex set to the firstDiv (which is the lowest)
                    var _lowestTabIndex = _elms[0].tabIndex;

                    // If there are positive tabIndices, set focus to the element with the lowest tabIndex.
                    // Otherwise set focus to the first focusable element in DOM order.
                    var i;
                    if (_lowestTabIndex) {
                        for (i = 1; i < _elms.length - 1; i++) {
                            if (_elms[i].tabIndex === _lowestTabIndex) {
                                _elms[i].focus();
                                break;
                            }
                        }
                    } else {
                        for (i = 1; i < _elms.length - 1; i++) {
                            // Skip <div> with undefined tabIndex (To work around Win8 bug #622245)
                            if ((_elms[i].tagName !== "DIV") || (_elms[i].getAttribute("tabIndex") !== null)) {
                                _elms[i].focus();

                                if (_elms[i] === _Global.document.activeElement) {
                                    break;
                                }
                            }
                        }
                    }
                },

                // Create and add a new first div to the beginning of the list
                _addFirstDiv: function SettingsFlyout_addFirstDiv() {
                    var _elms = this._element.getElementsByTagName("*");
                    var _minTab = 0;
                    for (var i = 0; i < _elms.length; i++) {
                        if ((0 < _elms[i].tabIndex) && (_minTab === 0 || _elms[i].tabIndex < _minTab)) {
                            _minTab = _elms[i].tabIndex;
                        }
                    }
                    var firstDiv = _Global.document.createElement("div");
                    firstDiv.className = _Constants.firstDivClass;
                    firstDiv.style.display = "inline";
                    firstDiv.setAttribute("role", "menuitem");
                    firstDiv.setAttribute("aria-hidden", "true");
                    firstDiv.tabIndex = _minTab;
                    _ElementUtilities._addEventListener(firstDiv, "focusin", this._focusOnLastFocusableElementFromParent, false);

                    // add to beginning
                    if (this._element.children[0]) {
                        this._element.insertBefore(firstDiv, this._element.children[0]);
                    } else {
                        this._element.appendChild(firstDiv);
                    }
                },

                // Create and add a new final div to the end of the list
                _addFinalDiv: function SettingsFlyout_addFinalDiv() {
                    var _elms = this._element.getElementsByTagName("*");
                    var _maxTab = 0;
                    for (var i = 0; i < _elms.length; i++) {
                        if (_elms[i].tabIndex > _maxTab) {
                            _maxTab = _elms[i].tabIndex;
                        }
                    }
                    var finalDiv = _Global.document.createElement("div");
                    finalDiv.className = _Constants.finalDivClass;
                    finalDiv.style.display = "inline";
                    finalDiv.setAttribute("role", "menuitem");
                    finalDiv.setAttribute("aria-hidden", "true");
                    finalDiv.tabIndex = _maxTab;
                    _ElementUtilities._addEventListener(finalDiv, "focusin", this._focusOnFirstFocusableElementFromParent, false);

                    this._element.appendChild(finalDiv);
                },

                _writeProfilerMark: function SettingsFlyout_writeProfilerMark(text) {
                    _WriteProfilerMark("WinJS.UI.SettingsFlyout:" + this._id + ":" + text);
                }
            });

            // Statics
            SettingsFlyout.show = function () {
                /// <signature helpKeyword="WinJS.UI.SettingsFlyout.show">
                /// <summary locid="WinJS.UI.SettingsFlyout.show_static">
                /// Shows the SettingsPane UI, if hidden, regardless of other states.
                /// </summary>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </signature>
                /// Show the main settings pane
                if (_WinRT.Windows.UI.ApplicationSettings.SettingsPane) {
                    _WinRT.Windows.UI.ApplicationSettings.SettingsPane.show();
                }
                // And hide the WWA one
                var elements = _Global.document.querySelectorAll('div[data-win-control="WinJS.UI.SettingsFlyout"]');
                var len = elements.length;
                for (var i = 0; i < len; i++) {
                    var settingsFlyout = elements[i].winControl;
                    if (settingsFlyout) {
                        settingsFlyout._dismiss();
                    }
                }
            };

            var _settingsEvent = { event: undefined };
            SettingsFlyout.populateSettings = function (e) {
                /// <signature helpKeyword="WinJS.UI.SettingsFlyout.populateSettings">
                /// <summary locid="WinJS.UI.SettingsFlyout.populateSettings">
                /// Loads a portion of the SettingsFlyout. Your app calls this when the user invokes a settings command and the WinJS.Application.onsettings event occurs.
                /// </summary>
                /// <param name="e" type="Object" locid="WinJS.UI.SettingsFlyout.populateSettings_p:e">
                /// An object that contains information about the event, received from the WinJS.Application.onsettings event. The detail property of this object contains
                /// the applicationcommands sub-property that you set to an array of settings commands.
                /// </param>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </signature>
                _settingsEvent.event = e.detail;

                if (_settingsEvent.event.applicationcommands) {
                    var n = _WinRT.Windows.UI.ApplicationSettings;
                    Object.keys(_settingsEvent.event.applicationcommands).forEach(function (name) {
                        var setting = _settingsEvent.event.applicationcommands[name];
                        if (!setting.title) { setting.title = name; }
                        var command = new n.SettingsCommand(name, setting.title, SettingsFlyout._onSettingsCommand);
                        _settingsEvent.event.e.request.applicationCommands.append(command);
                    });
                }
            };

            SettingsFlyout._onSettingsCommand = function (command) {
                var id = command.id;
                if (_settingsEvent.event.applicationcommands && _settingsEvent.event.applicationcommands[id]) {
                    SettingsFlyout.showSettings(id, _settingsEvent.event.applicationcommands[id].href);
                }
            };

            SettingsFlyout.showSettings = function (id, path) {
                /// <signature helpKeyword="WinJS.UI.SettingsFlyout.showSettings">
                /// <summary locid="WinJS.UI.SettingsFlyout.showSettings">
                /// Show the SettingsFlyout using the settings element identifier (ID) and the path of the page that contains the settings element.
                /// </summary>
                /// <param name="id" type="String" locid="WinJS.UI.SettingsFlyout.showSettings_p:id">
                /// The ID of the settings element.
                /// </param>
                /// <param name="path" type="Object" locid="WinJS.UI.SettingsFlyout.showSettings_p:path">
                ///  The path of the page that contains the settings element.
                /// </param>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </signature>
                var control = _getChildSettingsControl(_Global.document, id);
                if (control) {
                    control.show();
                } else if (path) {
                    var divElement = _Global.document.createElement("div");
                    divElement = _Global.document.body.appendChild(divElement);
                    Pages.render(path, divElement).then(function () {
                        control = _getChildSettingsControl(divElement, id);
                        if (control) {
                            control._fragmentDiv = divElement;
                            control.show();
                        } else {
                            _Global.document.body.removeChild(divElement);
                        }
                    });
                } else {
                    throw new _ErrorFromName("WinJS.UI.SettingsFlyout.BadReference", strings.badReference);
                }
            };

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/settingsFlyoutAriaLabel").value; },
                get badReference() { return "Invalid argument: Invalid href to settings flyout fragment"; },
                get backbuttonAriaLabel() { return _Resources._getWinJSString("ui/backbuttonarialabel").value; },
                get widthDeprecationMessage() { return "SettingsFlyout.width may be altered or unavailable in future versions. Instead, style the CSS width property on elements with the .win-settingsflyout class."; },
            };

            return SettingsFlyout;
        })
    });


});
