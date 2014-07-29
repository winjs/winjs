// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_ErrorFromName',
    '../../Core/_Resources',
    '../../ControlProcessor',
    '../../Navigation',
    '../../Utilities/_Control',
    '../../Utilities/_ElementUtilities',
    '../AppBar/_Icon'
    ], function NavBarCommandInit(exports, _Global, _Base, _ErrorFromName, _Resources, ControlProcessor, Navigation, _Control, _ElementUtilities, _Icon) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _WinPressed: _Base.Namespace._lazy(function () {
            var WinPressed = _Base.Class.define(function _WinPressed_ctor(element) {
                // WinPressed is the combination of :hover:active
                // :hover is delayed by trident for touch by 300ms so if you want :hover:active to work quickly you need to
                // use this behavior.
                // :active does not bubble to its parent like :hover does so this is also useful for that scenario.
                this._element = element;
                _ElementUtilities._addEventListener(this._element, "pointerdown", this._MSPointerDownButtonHandler.bind(this));
            }, {
                _MSPointerDownButtonHandler: function _WinPressed_MSPointerDownButtonHandler(ev) {
                    if (!this._pointerUpBound) {
                        this._pointerUpBound = this._MSPointerUpHandler.bind(this);
                        this._pointerCancelBound = this._MSPointerCancelHandler.bind(this);
                        this._pointerOverBound = this._MSPointerOverHandler.bind(this);
                        this._pointerOutBound = this._MSPointerOutHandler.bind(this);
                    }

                    if (ev.isPrimary) {
                        if (this._pointerId) {
                            this._resetPointer();
                        }

                        if (!_ElementUtilities._matchesSelector(ev.target, ".win-interactive, .win-interactive *")) {
                            this._pointerId = ev.pointerId;

                            _ElementUtilities._addEventListener(_Global, "pointerup", this._pointerUpBound, true);
                            _ElementUtilities._addEventListener(_Global, "pointercancel", this._pointerCancelBound), true;
                            _ElementUtilities._addEventListener(this._element, "pointerover", this._pointerOverBound, true);
                            _ElementUtilities._addEventListener(this._element, "pointerout", this._pointerOutBound, true);

                            _ElementUtilities.addClass(this._element, WinPressed.winPressed);
                        }
                    }
                },

                _MSPointerOverHandler: function _WinPressed_MSPointerOverHandler(ev) {
                    if (this._pointerId === ev.pointerId) {
                        _ElementUtilities.addClass(this._element, WinPressed.winPressed);
                    }
                },

                _MSPointerOutHandler: function _WinPressed_MSPointerOutHandler(ev) {
                    if (this._pointerId === ev.pointerId) {
                        _ElementUtilities.removeClass(this._element, WinPressed.winPressed);
                    }
                },

                _MSPointerCancelHandler: function _WinPressed_MSPointerCancelHandler(ev) {
                    if (this._pointerId === ev.pointerId) {
                        this._resetPointer();
                    }
                },

                _MSPointerUpHandler: function _WinPressed_MSPointerUpHandler(ev) {
                    if (this._pointerId === ev.pointerId) {
                        this._resetPointer();
                    }
                },

                _resetPointer: function _WinPressed_resetPointer() {
                    this._pointerId = null;

                    _Global.removeEventListener("pointerup", this._pointerUpBound, true);
                    _Global.removeEventListener("pointercancel", this._pointerCancelBound, true);
                    this._element.removeEventListener("pointerover", this._pointerOverBound, true);
                    this._element.removeEventListener("pointerout", this._pointerOutBound, true);

                    _ElementUtilities.removeClass(this._element, WinPressed.winPressed);
                },

                dispose: function _WinPressed_dispose() {
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;

                    this._resetPointer();
                }
            }, {
                winPressed: "win-pressed"
            });

            return WinPressed;
        }),
        /// <field>
        /// <summary locid="WinJS.UI.NavBarCommand">
        /// Represents a navigation command in an NavBarContainer.
        /// </summary>
        /// <compatibleWith platform="Windows" minVersion="8.1"/>
        /// </field>
        /// <icon src="ui_winjs.ui.navbarcommand.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.navbarcommand.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<div data-win-control="WinJS.UI.NavBarCommand" data-win-options="{location:'/pages/home/home.html',label:'Home',icon:WinJS.UI.AppBarIcon.home}"></div>]]></htmlSnippet>
        /// <part name="navbarcommand" class="win-navbarcommand" locid="WinJS.UI.NavBarCommand_part:navbarcommand">Styles the entire NavBarCommand control.</part>
        /// <part name="button" class="win-navbarcommand-button" locid="WinJS.UI.NavBarCommand_part:button">Styles the main button in a NavBarCommand.</part>
        /// <part name="splitbutton" class="win-navbarcommand-splitbutton" locid="WinJS.UI.NavBarCommand_part:splitbutton">Styles the split button in a NavBarCommand</part>
        /// <part name="icon" class="win-navbarcommand-icon" locid="WinJS.UI.NavBarCommand_part:icon">Styles the icon in the main button of a NavBarCommand.</part>
        /// <part name="label" class="win-navbarcommand-label" locid="WinJS.UI.NavBarCommand_part:label">Styles the label in the main button of a NavBarCommand.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        NavBarCommand: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            var strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; }
            };

            var NavBarCommand = _Base.Class.define(function NavBarCommand_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.NavBarCommand.NavBarCommand">
                /// <summary locid="WinJS.UI.NavBarCommand.constructor">
                /// Creates a new NavBarCommand.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.NavBarCommand.constructor_p:element">
                /// The DOM element that will host the new  NavBarCommand control.
                /// </param>
                /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.NavBarCommand.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control. 
                /// Each property of the options object corresponds to one of the control's properties or events. 
                /// Event names must begin with "on". 
                /// </param>
                /// <returns type="WinJS.UI.NavBarCommand" locid="WinJS.UI.NavBarCommand.constructor_returnValue">
                /// The new NavBarCommand.
                /// </returns>
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </signature>
                element = element || _Global.document.createElement("DIV");
                options = options || {};

                if (element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.NavBarCommand.DuplicateConstruction", strings.duplicateConstruction);
                }

                // Attaching JS control to DOM element
                element.winControl = this;
                this._element = element;
                _ElementUtilities.addClass(this.element, NavBarCommand._ClassName.navbarcommand);
                _ElementUtilities.addClass(this.element, "win-disposable");

                this._tooltip = null;
                this._splitOpened = false;
                this._buildDom();
                element.addEventListener('keydown', this._keydownHandler.bind(this));
                
                _Control.setOptions(this, options);
            }, {
                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.NavBarCommand.element" helpKeyword="WinJS.UI.NavBarCommand.element">
                /// Gets the DOM element that hosts the NavBarCommand.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="String" locid="WinJS.UI.NavBarCommand.label" helpKeyword="WinJS.UI.NavBarCommand.label">
                /// Gets or sets the label of the NavBarCommand.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                label: {
                    get: function () {
                        return this._label;
                    },
                    set: function (value) {
                        this._label = value;
                        this._labelEl.textContent = value;
                    }
                },

                /// <field type="String" locid="WinJS.UI.NavBarCommand.tooltip" helpKeyword="WinJS.UI.NavBarCommand.tooltip">
                /// Gets or sets the tooltip of the NavBarCommand.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                tooltip: {
                    get: function () {
                        return this._tooltip;
                    },
                    set: function (value) {
                        this._tooltip = value;
                        if (this._tooltip || this._tooltip === "") {
                            this._element.setAttribute('title', this._tooltip);
                        } else {
                            this._element.removeAttribute('title');
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.NavBarCommand.icon" helpKeyword="WinJS.UI.NavBarCommand.icon">
                /// Gets or sets the icon of the NavBarCommand. This value is either one of the values of the AppBarIcon enumeration or the path of a custom PNG file. 
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                icon: {
                    get: function () {
                        return this._icon;
                    },
                    set: function (value) {
                        this._icon = (_Icon[value] || value);

                        // If the icon's a single character, presume a glyph
                        if (this._icon && this._icon.length === 1) {
                            // Set the glyph
                            this._imageSpan.textContent = this._icon;
                            this._imageSpan.style.backgroundImage = "";
                            this._imageSpan.style.msHighContrastAdjust = "";
                            this._imageSpan.style.display = "";
                        } else if (this._icon && this._icon.length > 1) {
                            // Must be an image, set that
                            this._imageSpan.textContent = "";
                            this._imageSpan.style.backgroundImage = this._icon;
                            this._imageSpan.style.msHighContrastAdjust = "none";
                            this._imageSpan.style.display = "";
                        } else {
                            this._imageSpan.textContent = "";
                            this._imageSpan.style.backgroundImage = "";
                            this._imageSpan.style.msHighContrastAdjust = "";
                            this._imageSpan.style.display = "none";
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.NavBarCommand.location" helpKeyword="WinJS.UI.NavBarCommand.location">
                /// Gets or sets the command's target location. 
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                location: {
                    get: function () {
                        return this._location;
                    },
                    set: function (value) {
                        this._location = value;
                    }
                },

                /// <field type="String" locid="WinJS.UI.NavBarCommand.state" helpKeyword="WinJS.UI.NavBarCommand.state">
                /// Gets or sets the state value used for navigation. The command passes this object to the WinJS.Navigation.navigate function. 
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                state: {
                    get: function () {
                        return this._state;
                    },
                    set: function (value) {
                        this._state = value;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.NavBarCommand.splitButton" helpKeyword="WinJS.UI.NavBarCommand.splitButton">
                /// Gets or sets a value that specifies whether the NavBarCommand has a split button.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                splitButton: {
                    get: function () {
                        return this._split;
                    },
                    set: function (value) {
                        this._split = value;
                        if (this._split) {
                            this._splitButtonEl.style.display = "";
                        } else {
                            this._splitButtonEl.style.display = "none";
                        }
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.NavBarCommand.splitOpened" hidden="true" helpKeyword="WinJS.UI.NavBarCommand.splitOpened">
                /// Gets or sets a value that specifies whether the split button is open.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                splitOpened: {
                    get: function () {
                        return this._splitOpened;
                    },
                    set: function (value) {
                        if (this._splitOpened !== !!value) {
                            this._toggleSplit();
                        }
                    }
                },

                _toggleSplit: function NavBarCommand_toggleSplit() {
                    this._splitOpened = !this._splitOpened;
                    if (this._splitOpened) {
                        _ElementUtilities.addClass(this._splitButtonEl, NavBarCommand._ClassName.navbarcommandsplitbuttonopened);
                        this._splitButtonEl.setAttribute("aria-expanded", "true");
                    } else {
                        _ElementUtilities.removeClass(this._splitButtonEl, NavBarCommand._ClassName.navbarcommandsplitbuttonopened);
                        this._splitButtonEl.setAttribute("aria-expanded", "false");
                    }
                    this._fireEvent(NavBarCommand._EventName._splitToggle);
                },

                _rtl: {
                    get: function () {
                        return _Global.getComputedStyle(this.element).direction === "rtl";
                    }
                },

                _keydownHandler: function NavBarCommand_keydownHandler(ev) {
                    if (_ElementUtilities._matchesSelector(ev.target, ".win-interactive, .win-interactive *")) {
                        return;
                    }

                    var leftStr = this._rtl ? Key.rightArrow : Key.leftArrow;
                    var rightStr = this._rtl ? Key.leftArrow : Key.rightArrow;

                    if (!ev.altKey && (ev.keyCode === leftStr || ev.keyCode === Key.home || ev.keyCode === Key.end) && ev.target === this._splitButtonEl) {
                        this._splitButtonActive = false;
                        _ElementUtilities._setActive(this._buttonEl);
                        if (ev.keyCode === leftStr) {
                            ev.stopPropagation();
                        }
                        ev.preventDefault();
                    } else if (!ev.altKey && ev.keyCode === rightStr && this.splitButton && (ev.target === this._buttonEl || this._buttonEl.contains(ev.target))) {
                        this._splitButtonActive = true;
                        _ElementUtilities._setActive(this._splitButtonEl);
                        if (ev.keyCode === rightStr) {
                            ev.stopPropagation();
                        }
                        ev.preventDefault();
                    } else if ((ev.keyCode === Key.space || ev.keyCode === Key.enter) && (ev.target === this._buttonEl || this._buttonEl.contains(ev.target))) {
                        if (this.location) {
                            Navigation.navigate(this.location, this.state);
                        }
                        this._fireEvent(NavBarCommand._EventName._invoked);
                    } else if ((ev.keyCode === Key.space || ev.keyCode === Key.enter) && ev.target === this._splitButtonEl) {
                        this._toggleSplit();
                    }
                },

                _getFocusInto: function NavBarCommand_getFocusInto(keyCode) {
                    var leftStr = this._rtl ? Key.rightArrow : Key.leftArrow;
                    if ((keyCode === leftStr) && this.splitButton) {
                        this._splitButtonActive = true;
                        return this._splitButtonEl;
                    } else {
                        this._splitButtonActive = false;
                        return this._buttonEl;
                    }
                },

                _buildDom: function NavBarCommand_buildDom() {
                    var markup =
                        '<div tabindex="0" role="button" class="' + NavBarCommand._ClassName.navbarcommandbutton + '">' +
                            '<div class="' + NavBarCommand._ClassName.navbarcommandbuttoncontent + '">' +
                                '<div class="' + NavBarCommand._ClassName.navbarcommandicon + '"></div>' +
                                '<div class="' + NavBarCommand._ClassName.navbarcommandlabel + '"></div>' +
                            '</div>' +
                        '</div>' +
                        '<div tabindex="0" aria-expanded="false" class="' + NavBarCommand._ClassName.navbarcommandsplitbutton + '"></div>';
                    this.element.insertAdjacentHTML("afterBegin", markup);

                    this._buttonEl = this.element.firstElementChild;
                    this._buttonPressedBehavior = new exports._WinPressed(this._buttonEl);
                    this._contentEl = this._buttonEl.firstElementChild;
                    this._imageSpan = this._contentEl.firstElementChild;
                    this._imageSpan.style.display = "none";
                    this._labelEl = this._imageSpan.nextElementSibling;
                    this._splitButtonEl = this._buttonEl.nextElementSibling;
                    this._splitButtonPressedBehavior = new exports._WinPressed(this._splitButtonEl);
                    this._splitButtonEl.style.display = "none";

                    _ElementUtilities._ensureId(this._buttonEl);
                    this._splitButtonEl.setAttribute("aria-labelledby", this._buttonEl.id);

                    this._buttonEl.addEventListener("click", this._handleButtonClick.bind(this));
                    this._buttonEl.addEventListener("beforeactivate", this._beforeactivateButtonHandler.bind(this));
                    this._buttonEl.addEventListener("pointerdown", this._MSPointerDownButtonHandler.bind(this));

                    var mutationObserver = new _ElementUtilities._MutationObserver(this._splitButtonAriaExpandedPropertyChangeHandler.bind(this));
                    mutationObserver.observe(this._splitButtonEl, { attributes: true, attributeFilter: ["aria-expanded"] });
                    this._splitButtonEl.addEventListener("click", this._handleSplitButtonClick.bind(this));
                    this._splitButtonEl.addEventListener("beforeactivate", this._beforeactivateSplitButtonHandler.bind(this));
                    this._splitButtonEl.addEventListener("pointerdown", this._MSPointerDownSplitButtonHandler.bind(this));

                    // reparent any other elements.
                    var tempEl = this._splitButtonEl.nextSibling;
                    while (tempEl) {
                        this._buttonEl.insertBefore(tempEl, this._contentEl);
                        if (tempEl.nodeName !== "#text") {
                            ControlProcessor.processAll(tempEl);
                        }
                        tempEl = this._splitButtonEl.nextSibling;
                    }
                },

                _MSPointerDownButtonHandler: function NavBarCommand_MSPointerDownButtonHandler() {
                    this._splitButtonActive = false;
                },

                _MSPointerDownSplitButtonHandler: function NavBarCommand_MSPointerDownSplitButtonHandler() {
                    this._splitButtonActive = true;
                },

                _handleButtonClick: function NavBarCommand_handleButtonClick(ev) {
                    var srcElement = ev.target;
                    if (!_ElementUtilities._matchesSelector(srcElement, ".win-interactive, .win-interactive *")) {
                        if (this.location) {
                            Navigation.navigate(this.location, this.state);
                        }
                        this._fireEvent(NavBarCommand._EventName._invoked);
                    }
                },

                _splitButtonAriaExpandedPropertyChangeHandler: function NavBarCommand_splitButtonAriaExpandedPropertyChangeHandler() {
                    if ((this._splitButtonEl.getAttribute("aria-expanded") === "true") !== this._splitOpened) {
                        this._toggleSplit();
                    }
                },

                _handleSplitButtonClick: function NavBarCommand_handleSplitButtonClick() {
                    this._toggleSplit();
                },

                _beforeactivateSplitButtonHandler: function NavBarCommand_beforeactivateSplitButtonHandler(ev) {
                    if (!this._splitButtonActive) {
                        ev.stopPropagation();
                        ev.preventDefault();
                    }
                },

                _beforeactivateButtonHandler: function NavBarCommand_beforeactivateButtonHandler(ev) {
                    if (this._splitButtonActive) {
                        ev.stopPropagation();
                        ev.preventDefault();
                    }
                },

                _fireEvent: function NavBarCommand_fireEvent(type, detail) {
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent(type, true, false, detail);
                    this.element.dispatchEvent(event);
                },

                dispose: function NavBarCommand_dispose() {
                    /// <signature helpKeyword="WinJS.UI.NavBarCommand.dispose">
                    /// <summary locid="WinJS.UI.NavBarCommand.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;

                    this._buttonPressedBehavior.dispose();
                    this._splitButtonPressedBehavior.dispose();
                }
            }, {
                _ClassName: {
                    navbarcommand: "win-navbarcommand",
                    navbarcommandbutton: "win-navbarcommand-button",
                    navbarcommandbuttoncontent: "win-navbarcommand-button-content",
                    navbarcommandsplitbutton: "win-navbarcommand-splitbutton",
                    navbarcommandsplitbuttonopened: "win-navbarcommand-splitbutton-opened",
                    navbarcommandicon: "win-navbarcommand-icon",
                    navbarcommandlabel: "win-navbarcommand-label"
                },
                _EventName: {
                    _invoked: "_invoked",
                    _splitToggle: "_splittoggle"
                }
            });
            _Base.Class.mix(NavBarCommand, _Control.DOMEventMixin);
            return NavBarCommand;
        })
    });

});