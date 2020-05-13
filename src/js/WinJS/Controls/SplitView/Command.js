// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define(['exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_ErrorFromName',
    '../../Core/_Events',
    '../../ControlProcessor',
    '../../Utilities/_Control',
    '../../Utilities/_ElementUtilities',
    '../../Utilities/_KeyboardBehavior',
    '../AppBar/_Icon',
    'require-style!less/styles-splitviewcommand',
    'require-style!less/colors-splitviewcommand'
], function SplitViewCommandInit(exports, _Global, _Base, _ErrorFromName, _Events, ControlProcessor, _Control, _ElementUtilities, _KeyboardBehavior, _Icon) {
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

                    _ElementUtilities._removeEventListener(_Global, "pointerup", this._pointerUpBound, true);
                    _ElementUtilities._removeEventListener(_Global, "pointercancel", this._pointerCancelBound, true);
                    _ElementUtilities._removeEventListener(this._element, "pointerover", this._pointerOverBound, true);
                    _ElementUtilities._removeEventListener(this._element, "pointerout", this._pointerOutBound, true);

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
        /// <summary locid="WinJS.UI.SplitViewCommand">
        /// Represents a command in a SplitView.
        /// </summary>
        /// </field>
        /// <htmlSnippet><![CDATA[<div data-win-control="WinJS.UI.SplitViewCommand" data-win-options="{label:'Home',icon:WinJS.UI.AppBarIcon.home}"></div>]]></htmlSnippet>
        /// <part name="splitviewcommand" class="win-splitviewcommand" locid="WinJS.UI.SplitViewCommand_part:splitviewcommand">Styles the entire SplitViewCommand control.</part>
        /// <part name="button" class="win-splitviewcommand-button" locid="WinJS.UI.SplitViewCommand_part:button">Styles the button in a SplitViewCommand.</part>
        /// <part name="icon" class="win-splitviewcommand-icon" locid="WinJS.UI.SplitViewCommand_part:icon">Styles the icon in the button of a SplitViewCommand.</part>
        /// <part name="label" class="win-splitviewcommand-label" locid="WinJS.UI.SplitViewCommand_part:label">Styles the label in the button of a SplitViewCommand.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        SplitViewCommand: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            var strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; }
            };

            var ClassNames = {
                command: "win-splitviewcommand",
                commandButton: "win-splitviewcommand-button",
                commandButtonContent: "win-splitviewcommand-button-content",
                commandSplitButton: "win-splitviewcommand-splitbutton",
                commandSplitButtonOpened: "win-splitviewcommand-splitbutton-opened",
                commandIcon: "win-splitviewcommand-icon",
                commandLabel: "win-splitviewcommand-label"
            };

            var EventNames = {
                invoked: "invoked",
                _splitToggle: "_splittoggle",

            };

            var createEvent = _Events._createEventProperty;

            var SplitViewCommand = _Base.Class.define(function SplitViewCommand_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.SplitViewCommand.SplitViewCommand">
                /// <summary locid="WinJS.UI.SplitViewCommand.constructor">
                /// Creates a new SplitViewCommand.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.SplitViewCommand.constructor_p:element">
                /// The DOM element that will host the new  SplitViewCommand control.
                /// </param>
                /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.SplitViewCommand.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// Event names must begin with "on".
                /// </param>
                /// <returns type="WinJS.UI.SplitViewCommand" locid="WinJS.UI.SplitViewCommand.constructor_returnValue">
                /// The new SplitViewCommand.
                /// </returns>
                /// </signature>
                element = element || _Global.document.createElement("DIV");
                options = options || {};

                if (element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.SplitViewCommand.DuplicateConstruction", strings.duplicateConstruction);
                }

                // Sign up for keyboard focus rect
                this._winKeyboard = new _KeyboardBehavior._WinKeyboard(element);

                this._baseConstructor(element, options);
            }, {

                _baseConstructor: function SplitViewCommand_baseConstructor(element, options, classNames) {
                    this._classNames = classNames || ClassNames;

                    // Attaching JS control to DOM element
                    element.winControl = this;
                    this._element = element;
                    _ElementUtilities.addClass(this.element, this._classNames.command);
                    _ElementUtilities.addClass(this.element, "win-disposable");

                    this._tooltip = null;
                    this._splitOpened = false;
                    this._buildDom();
                    element.addEventListener('keydown', this._keydownHandler.bind(this));

                    _Control.setOptions(this, options);
                },

                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.SplitViewCommand.element" helpKeyword="WinJS.UI.SplitViewCommand.element">
                /// Gets the DOM element that hosts the SplitViewCommand.
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="String" locid="WinJS.UI.SplitViewCommand.label" helpKeyword="WinJS.UI.SplitViewCommand.label">
                /// Gets or sets the label of the SplitViewCommand.
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

                /// <field type="String" locid="WinJS.UI.SplitViewCommand.tooltip" helpKeyword="WinJS.UI.SplitViewCommand.tooltip">
                /// Gets or sets the tooltip of the SplitViewCommand.
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

                /// <field type="String" locid="WinJS.UI.SplitViewCommand.icon" helpKeyword="WinJS.UI.SplitViewCommand.icon">
                /// Gets or sets the icon of the SplitViewCommand. This value is either one of the values of the AppBarIcon enumeration or the path of a custom PNG file.
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
                            if(/[\/\\.]/.test(this._icon)) {
                                this._imageSpan.style.backgroundImage = this._icon;
                            } else {
                                _ElementUtilities.addClass(this._imageSpan, this._icon);
                            }
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

                /// <field type="Function" locid="WinJS.UI.SplitViewCommand.oninvoked" helpKeyword="WinJS.UI.SplitViewCommand.oninvoked">
                /// Raised when a SplitViewCommand has been invoked.
                /// </field>
                oninvoked: createEvent(EventNames.invoked),

                _toggleSplit: function SplitViewCommand_toggleSplit() {
                    this._splitOpened = !this._splitOpened;
                    if (this._splitOpened) {
                        _ElementUtilities.addClass(this._splitButtonEl, this._classNames.commandSplitButtonOpened);
                        this._splitButtonEl.setAttribute("aria-expanded", "true");
                    } else {
                        _ElementUtilities.removeClass(this._splitButtonEl, this._classNames.commandSplitButtonOpened);
                        this._splitButtonEl.setAttribute("aria-expanded", "false");
                    }
                    this._fireEvent(SplitViewCommand._EventName._splitToggle);
                },

                _rtl: {
                    get: function () {
                        return _ElementUtilities._getComputedStyle(this.element).direction === "rtl";
                    }
                },

                _keydownHandler: function SplitViewCommand_keydownHandler(ev) {
                    if (_ElementUtilities._matchesSelector(ev.target, ".win-interactive, .win-interactive *")) {
                        return;
                    }

                    var leftStr = this._rtl ? Key.rightArrow : Key.leftArrow;
                    var rightStr = this._rtl ? Key.leftArrow : Key.rightArrow;

                    if (!ev.altKey && (ev.keyCode === leftStr || ev.keyCode === Key.home || ev.keyCode === Key.end) && ev.target === this._splitButtonEl) {
                        _ElementUtilities._setActive(this._buttonEl);
                        if (ev.keyCode === leftStr) {
                            ev.stopPropagation();
                        }
                        ev.preventDefault();
                    } else if (!ev.altKey && ev.keyCode === rightStr && this.splitButton && (ev.target === this._buttonEl || this._buttonEl.contains(ev.target))) {
                        _ElementUtilities._setActive(this._splitButtonEl);
                        if (ev.keyCode === rightStr) {
                            ev.stopPropagation();
                        }
                        ev.preventDefault();
                    } else if ((ev.keyCode === Key.space || ev.keyCode === Key.enter) && (ev.target === this._buttonEl || this._buttonEl.contains(ev.target))) {
                        this._invoke();
                    } else if ((ev.keyCode === Key.space || ev.keyCode === Key.enter) && ev.target === this._splitButtonEl) {
                        this._toggleSplit();
                    }
                },

                _getFocusInto: function SplitViewCommand_getFocusInto(keyCode) {
                    var leftStr = this._rtl ? Key.rightArrow : Key.leftArrow;
                    if ((keyCode === leftStr) && this.splitButton) {
                        return this._splitButtonEl;
                    } else {
                        return this._buttonEl;
                    }
                },

                _buildDom: function SplitViewCommand_buildDom() {
                    var markup =
                        '<div tabindex="0" role="button" class="' + this._classNames.commandButton + '">' +
                            '<div class="' + this._classNames.commandButtonContent + '">' +
                                '<div class="' + this._classNames.commandIcon + '"></div>' +
                                '<div class="' + this._classNames.commandLabel + '"></div>' +
                            '</div>' +
                        '</div>' +
                        '<div tabindex="-1" aria-expanded="false" class="' + this._classNames.commandSplitButton + '"></div>';
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

                    var mutationObserver = new _ElementUtilities._MutationObserver(this._splitButtonAriaExpandedPropertyChangeHandler.bind(this));
                    mutationObserver.observe(this._splitButtonEl, { attributes: true, attributeFilter: ["aria-expanded"] });
                    this._splitButtonEl.addEventListener("click", this._handleSplitButtonClick.bind(this));

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

                _handleButtonClick: function SplitViewCommand_handleButtonClick(ev) {
                    var srcElement = ev.target;
                    if (!_ElementUtilities._matchesSelector(srcElement, ".win-interactive, .win-interactive *")) {
                        this._invoke();
                    }
                },

                _splitButtonAriaExpandedPropertyChangeHandler: function SplitViewCommand_splitButtonAriaExpandedPropertyChangeHandler() {
                    if ((this._splitButtonEl.getAttribute("aria-expanded") === "true") !== this._splitOpened) {
                        this._toggleSplit();
                    }
                },

                _handleSplitButtonClick: function SplitViewCommand_handleSplitButtonClick() {
                    this._toggleSplit();
                },

                _invoke: function SplitViewCommand_invoke() {
                    this._fireEvent(SplitViewCommand._EventName.invoked);
                },

                _fireEvent: function SplitViewCommand_fireEvent(type, detail) {
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent(type, true, false, detail);
                    this.element.dispatchEvent(event);
                },

                dispose: function SplitViewCommand_dispose() {
                    /// <signature helpKeyword="WinJS.UI.SplitViewCommand.dispose">
                    /// <summary locid="WinJS.UI.SplitViewCommand.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;

                    this._buttonPressedBehavior.dispose();
                    this._splitButtonPressedBehavior.dispose();
                }
            }, {
                _ClassName: ClassNames,
                _EventName: EventNames,
            });
            _Base.Class.mix(SplitViewCommand, _Control.DOMEventMixin);
            return SplitViewCommand;
        })
    });

});
