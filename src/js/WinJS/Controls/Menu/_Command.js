// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// Menu Command
/// <dictionary>appbar,appbars,Flyout,Flyouts,onclick,Statics</dictionary>
define([
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_ErrorFromName',
    '../../Core/_Resources',
    '../../Promise',
    '../../Utilities/_Control',
    '../../Utilities/_ElementUtilities',
    '../_LegacyAppBar/_Constants',
    '../Flyout/_Overlay'
], function menuCommandInit(exports, _Global, _Base, _ErrorFromName, _Resources, Promise, _Control, _ElementUtilities, _Constants, _Overlay) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.MenuCommand">
        /// Represents a command to be displayed in a Menu. MenuCommand objects provide button, toggle button, flyout button,
        /// or separator functionality for Menu controls.
        /// </summary>
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        /// <icon src="ui_winjs.ui.menucommand.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.menucommand.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<button data-win-control="WinJS.UI.MenuCommand" data-win-options="{type:'button',label:'Button'}"></button>]]></htmlSnippet>
        /// <part name="MenuCommand" class="win-command" locid="WinJS.UI.MenuCommand_name">The MenuCommand control itself</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        MenuCommand: _Base.Namespace._lazy(function () {

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/menuCommandAriaLabel").value; },
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get badClick() { return "Invalid argument: The onclick property for an {0} must be a function"; },
                get badHrElement() { return "Invalid argument: For a separator, the element must be null or an hr element"; },
                get badButtonElement() { return "Invalid argument: For a button, toggle, or flyout command, the element must be null or a button element"; }
            };

            var MenuCommand = _Base.Class.define(function MenuCommand_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.MenuCommand.MenuCommand">
                /// <summary locid="WinJS.UI.MenuCommand.constructor">
                /// Creates a new MenuCommand object.
                /// </summary>
                /// <param name="element" domElement="true" locid="WinJS.UI.MenuCommand.constructor_p:element">
                /// The DOM element that will host the control.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.MenuCommand.constructor_p:options">
                /// The set of properties and values to apply to the new MenuCommand.
                /// </param>
                /// <returns type="WinJS.UI.MenuCommand" locid="WinJS.UI.MenuCommand.constructor_returnValue">
                /// A MenuCommand control.
                /// </returns>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </signature>

                // Check to make sure we weren't duplicated
                if (element && element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.MenuCommand.DuplicateConstruction", strings.duplicateConstruction);
                }

                this._disposed = false;

                // Don't blow up if they didn't pass options
                if (!options) {
                    options = {};
                }

                // Need a type before we can create our element
                if (!options.type) {
                    this._type = _Constants.typeButton;
                }

                // Go ahead and create it, separator types look different than buttons
                // Don't forget to use passed in element if one was provided.
                this._element = element;
                if (options.type === _Constants.typeSeparator) {
                    this._createSeparator();
                } else {
                    // This will also set the icon & label
                    this._createButton();
                }
                _ElementUtilities.addClass(this._element, "win-disposable");

                // Remember ourselves
                this._element.winControl = this;

                // Attach our css class
                _ElementUtilities.addClass(this._element, _Constants.menuCommandClass);

                if (!options.selected && options.type === _Constants.typeToggle) {
                    // Make sure toggle's have selected false for CSS
                    this.selected = false;
                }

                if (options.onclick) {
                    this.onclick = options.onclick;
                }
                options.onclick = this._handleClick.bind(this);

                _Control.setOptions(this, options);

                // Set our options
                if (this._type !== _Constants.typeSeparator) {
                    // Make sure we have an ARIA role
                    var role = this._element.getAttribute("role");
                    if (role === null || role === "" || role === undefined) {
                        role = "menuitem";
                        if (this._type === _Constants.typeToggle) {
                            role = "checkbox";
                        }
                        this._element.setAttribute("role", role);
                        if (this._type === _Constants.typeFlyout) {
                            this._element.setAttribute("aria-haspopup", true);
                        }
                    }
                    var label = this._element.getAttribute("aria-label");
                    if (label === null || label === "" || label === undefined) {
                        this._element.setAttribute("aria-label", strings.ariaLabel);
                    }
                }

            }, {
                /// <field type="String" locid="WinJS.UI.MenuCommand.id" helpKeyword="WinJS.UI.MenuCommand.id" isAdvanced="true">
                /// Gets the  ID of the MenuCommand.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                id: {
                    get: function () {
                        return this._element.id;
                    },
                    set: function (value) {
                        // we allow setting first time only. otherwise we ignore it.
                        if (!this._element.id) {
                            this._element.id = value;
                        }
                    }
                },

                /// <field type="String" readonly="true" defaultValue="button" oamOptionsDatatype="WinJS.UI.MenuCommand.type" locid="WinJS.UI.MenuCommand.type" helpKeyword="WinJS.UI.MenuCommand.type" isAdvanced="true">
                /// Gets the type of the MenuCommand. Possible values are "button", "toggle", "flyout", or "separator".
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                type: {
                    get: function () {
                        return this._type;
                    },
                    set: function (value) {
                        // we allow setting first time only. otherwise we ignore it.
                        if (!this._type) {
                            if (value !== _Constants.typeButton && value !== _Constants.typeFlyout && value !== _Constants.typeToggle && value !== _Constants.typeSeparator) {
                                value = _Constants.typeButton;
                            }

                            this._type = value;

                            if (value === _Constants.typeButton) {
                                _ElementUtilities.addClass(this.element, _Constants.menuCommandButtonClass);
                            } else if (value === _Constants.typeFlyout) {
                                _ElementUtilities.addClass(this.element, _Constants.menuCommandFlyoutClass);
                                this.element.addEventListener("keydown", this._handleKeyDown.bind(this), false);
                            } else if (value === _Constants.typeSeparator) {
                                _ElementUtilities.addClass(this.element, _Constants.menuCommandSeparatorClass);
                            } else if (value === _Constants.typeToggle) {
                                _ElementUtilities.addClass(this.element, _Constants.menuCommandToggleClass);
                            }
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.MenuCommand.label" helpKeyword="WinJS.UI.MenuCommand.label">
                /// The label of the MenuCommand
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                label: {
                    get: function () {
                        return this._label;
                    },
                    set: function (value) {
                        this._label = value || "";
                        if (this._labelSpan) {
                            this._labelSpan.textContent = this.label;
                        }

                        // Update aria-label
                        this._element.setAttribute("aria-label", this.label);
                    }
                },

                /// <field type="Function" locid="WinJS.UI.MenuCommand.onclick" helpKeyword="WinJS.UI.MenuCommand.onclick">
                /// Gets or sets the function to invoke when the command is clicked.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                onclick: {
                    get: function () {
                        return this._onclick;
                    },
                    set: function (value) {
                        if (value && typeof value !== "function") {
                            throw new _ErrorFromName("WinJS.UI.MenuCommand.BadClick", _Resources._formatString(strings.badClick, "MenuCommand"));
                        }
                        this._onclick = value;
                    }
                },

                /// <field type="Object" locid="WinJS.UI.MenuCommand.flyout" helpKeyword="WinJS.UI.MenuCommand.flyout">
                /// For flyout type MenuCommands, this property  returns the WinJS.UI.Flyout that this command invokes. When setting this property, you can set
                /// it to the string ID of the Flyout, the DOM object that hosts the Flyout, or the Flyout object itself.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                flyout: {
                    get: function () {
                        // Resolve it to the flyout
                        var flyout = this._flyout;
                        if (typeof flyout === "string") {
                            flyout = _Global.document.getElementById(flyout);
                        }
                        // If it doesn't have a .element, then we need to getControl on it
                        if (flyout && !flyout.element) {
                            flyout = flyout.winControl;
                        }

                        return flyout;
                    },
                    set: function (value) {

                        // Need to update aria-owns with the new ID.
                        var id = value;
                        if (id && typeof id !== "string") {
                            // Our controls have .element properties
                            if (id.element) {
                                id = id.element;
                            }
                            // Hope it's a DOM element, get ID from DOM element
                            if (id) {
                                if (id.id) {
                                    id = id.id;
                                } else {
                                    // No id, have to fake one
                                    id.id = _ElementUtilities._uniqueID(id);
                                    id = id.id;
                                }
                            }
                        }
                        if (typeof id === "string") {
                            this._element.setAttribute("aria-owns", id);
                        }

                        if (this._flyout !== value) {
                            MenuCommand._deactivateFlyoutCommand(this);
                        }

                        // Remember it
                        this._flyout = value;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.MenuCommand.selected" helpKeyword="WinJS.UI.MenuCommand.selected">
                /// Gets or sets the selected state of a toggle button. This property is true if the toggle button is selected; otherwise, it's false.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                selected: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return this._element.getAttribute("aria-checked") === "true";
                    },
                    set: function (value) {
                        this._element.setAttribute("aria-checked", !!value);
                    }
                },

                /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.MenuCommand.element" helpKeyword="WinJS.UI.MenuCommand.element">
                /// Gets the DOM element that hosts this MenuCommand.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.MenuCommand.disabled" helpKeyword="WinJS.UI.MenuCommand.disabled">
                /// Gets or sets a value that indicates whether the MenuCommand is disabled. This value is true if the MenuCommand is disabled; otherwise, false.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                disabled: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return !!this._element.disabled;
                    },
                    set: function (value) {
                        value = !!value;
                        if (value && this.type === _Constants.typeFlyout) {
                            MenuCommand._deactivateFlyoutCommand(this);
                        }
                        this._element.disabled = value;
                    }
                },

                /// <field type="Boolean" hidden="true" locid="WinJS.UI.MenuCommand.hidden" helpKeyword="WinJS.UI.MenuCommand.hidden">
                /// Determine if a command is currently hidden.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                hidden: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return this._element.style.visibility === "hidden";
                    },
                    set: function (value) {
                        var menuControl = _Overlay._Overlay._getParentControlUsingClassName(this._element, _Constants.menuClass);
                        if (menuControl && !menuControl.hidden) {
                            throw new _ErrorFromName("WinJS.UI.MenuCommand.CannotChangeHiddenProperty", _Resources._formatString(_Overlay._Overlay.commonstrings.cannotChangeHiddenProperty, "Menu"));
                        }

                        var style = this._element.style;
                        if (value) {
                            if (this.type === _Constants.typeFlyout) {
                                MenuCommand._deactivateFlyoutCommand(this);
                            }
                            style.visibility = "hidden";
                            style.display = "none";
                        } else {
                            style.visibility = "";
                            style.display = "block";
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.MenuCommand.extraClass" isAdvanced="true" helpKeyword="WinJS.UI.MenuCommand.extraClass">
                /// Gets or sets the extra CSS class that is applied to the host DOM element.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                extraClass: {
                    get: function () {
                        return this._extraClass;
                    },
                    set: function (value) {
                        if (this._extraClass) {
                            _ElementUtilities.removeClass(this._element, this._extraClass);
                        }
                        this._extraClass = value;
                        _ElementUtilities.addClass(this._element, this._extraClass);
                    }
                },


                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.MenuCommand.dispose">
                    /// <summary locid="WinJS.UI.MenuCommand.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;
                },

                addEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI.MenuCommand.addEventListener">
                    /// <summary locid="WinJS.UI.MenuCommand.addEventListener">
                    /// Registers an event handler for the specified event.
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.MenuCommand.addEventListener_p:type">The name of the event to register.</param>
                    /// <param name="listener" type="Function" locid="WinJS.UI.MenuCommand.addEventListener_p:listener">The function that handles the event.</param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI.MenuCommand.addEventListener_p:useCapture">
                    /// Set to true to register the event handler for the capturing phase; otherwise, set to false to register the  event handler for the bubbling phase.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    return this._element.addEventListener(type, listener, useCapture);
                },

                removeEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI.MenuCommand.removeEventListener">
                    /// <summary locid="WinJS.UI.MenuCommand.removeEventListener">
                    /// Removes the specified event handler that the addEventListener method registered.
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.MenuCommand.removeEventListener_p:type">The name of the event to remove.</param>
                    /// <param name="listener" type="Function" locid="WinJS.UI.MenuCommand.removeEventListener_p:listener">The event handler function to remove.</param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI.MenuCommand.removeEventListener_p:useCapture">
                    /// Set to true to remove the capturing phase event handler; set to false to remove the bubbling phase event handler.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    return this._element.removeEventListener(type, listener, useCapture);
                },

                // Private properties
                _createSeparator: function MenuCommand_createSeparator() {
                    // Make sure there's an input element
                    if (!this._element) {
                        this._element = _Global.document.createElement("hr");
                    } else {
                        // Verify the input was an hr
                        if (this._element.tagName !== "HR") {
                            throw new _ErrorFromName("WinJS.UI.MenuCommand.BadHrElement", strings.badHrElement);
                        }
                    }
                },

                _createButton: function MenuCommand_createButton() {
                    // Make sure there's an element
                    if (!this._element) {
                        this._element = _Global.document.createElement("button");
                    } else {
                        // Verify the input was a button
                        if (this._element.tagName !== "BUTTON") {
                            throw new _ErrorFromName("WinJS.UI.MenuCommand.BadButtonElement", strings.badButtonElement);
                        }
                    }

                    // Create our inner HTML. We will set aria values on the button itself further down in the constructor.
                    this._element.innerHTML =
                        '<div class="win-menucommand-liner">' +
                            '<span class="win-toggleicon" aria-hidden="true"></span>' +
                            '<span class="win-label" aria-hidden="true"></span>' +
                            '<span class="win-flyouticon" aria-hidden="true"></span>' +
                        '</div>';
                    this._element.type = "button";

                    // The purpose of menuCommandLiner is to lay out the MenuCommand's children in a flexbox. Ideally, this flexbox would
                    // be on MenuCommand.element. However, firefox lays out buttons with display:flex differently.
                    // Firefox bug 1014285 (Button with display:inline-flex doesn't layout properly)
                    // https://bugzilla.mozilla.org/show_bug.cgi?id=1014285
                    this._menuCommandLiner = this._element.firstElementChild;
                    this._toggleSpan = this._menuCommandLiner.firstElementChild;
                    this._labelSpan = this._toggleSpan.nextElementSibling;
                    this._flyoutSpan = this._labelSpan.nextElementSibling;

                },
                _sendEvent: function MenuCommand_sendEvent(eventName, detail) {
                    if (!this._disposed) {
                        var event = _Global.document.createEvent("CustomEvent");
                        event.initCustomEvent(eventName, true, true, (detail || {}));
                        this._element.dispatchEvent(event);
                    }
                },

                _invoke: function MenuCommand_invoke(event) {
                    if (!this.hidden && !this.disabled && !this._disposed) {
                        if (this._type === _Constants.typeToggle) {
                            this.selected = !this.selected;
                        } else if (this._type === _Constants.typeFlyout) {
                            MenuCommand._activateFlyoutCommand(this);
                        }

                        if (event && event.type === "click" && this.onclick) {
                            this.onclick(event);
                        }

                        // Bubble private 'invoked' event to Menu
                        this._sendEvent(_Constants._menuCommandInvokedEvent, { command: this });
                    }
                },

                _handleClick: function MenuCommand_handleClick(event) {
                    this._invoke(event);
                },

                _handleKeyDown: function MenuCommand_handleKeyDown(event) {
                    var Key = _ElementUtilities.Key,
                        rtl = _ElementUtilities._getComputedStyle(this.element).direction === "rtl",
                        rightKey = rtl ? Key.leftArrow : Key.rightArrow;

                    if (event.keyCode === rightKey && this.type === _Constants.typeFlyout) {
                        this._invoke(event);

                        // Prevent the page from scrolling
                        event.preventDefault();
                    }
                },
            }, {
                // Statics
                _activateFlyoutCommand: function MenuCommand_activateFlyoutCommand(menuCommand) {
                    // Activates the associated Flyout command and returns a promise once complete.
                    // A command is considered to be activated once the proper CSS class has been applied and its associated flyout has finished showing.
                    return new Promise(function (c, e) {
                        menuCommand = menuCommand.winControl || menuCommand;
                        var subFlyout = menuCommand.flyout;
                        // Flyout may not have processAll'd, so this may be a DOM object
                        if (subFlyout && subFlyout.hidden && subFlyout.show) {

                            // Add activation state to the command.
                            _ElementUtilities.addClass(menuCommand.element, _Constants.menuCommandFlyoutActivatedClass);
                            subFlyout.element.setAttribute("aria-expanded", "true");
                            subFlyout.addEventListener("beforehide", function beforeHide() {
                                // Remove activation state from the command if the flyout is ever hidden.
                                subFlyout.removeEventListener("beforehide", beforeHide, false);
                                _ElementUtilities.removeClass(menuCommand.element, _Constants.menuCommandFlyoutActivatedClass);
                                subFlyout.element.removeAttribute("aria-expanded");
                            }, false);

                            subFlyout.addEventListener("aftershow", function afterShow() {
                                subFlyout.removeEventListener("aftershow", afterShow, false);

                                // We are considered activated once we start showing the flyout.
                                c();
                            }, false);

                            subFlyout.show(menuCommand, "_cascade");
                        } else {
                            // Could not change command to activated state.
                            e();
                        }
                    });
                },

                _deactivateFlyoutCommand: function MenuCommand_deactivateFlyoutCommand(menuCommand) {
                    // Deactivates the associated Flyout command and returns a promise once complete.
                    // A command is considered to be deactivated once the proper CSS class has been removed and its associated flyout has finished hiding.
                    return new Promise(function (c) {
                        menuCommand = menuCommand.winControl || menuCommand;
                        _ElementUtilities.removeClass(menuCommand.element, _Constants.menuCommandFlyoutActivatedClass);

                        var subFlyout = menuCommand.flyout;
                        // Flyout may not have processAll'd, so this may be a DOM object.
                        if (subFlyout && !subFlyout.hidden && subFlyout.hide) {

                            subFlyout.addEventListener("afterhide", function afterHide() {
                                subFlyout.removeEventListener("afterhide", afterHide, false);
                                c();
                            }, false);

                            // Leverage pre-existing "beforehide" listener already set on the Flyout for clearing the command's activated state.
                            // The "beforehide" listener is expected to have been added to the Flyout in the call to _activateFlyoutCommand.
                            subFlyout.hide();
                        } else {
                            // subFlyout does not need to be hidden.
                            c();
                        }
                    });
                },
            });
            return MenuCommand;
        })
    });

});

