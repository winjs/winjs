// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// Menu
/// <dictionary>Menu,Menus,Flyout,Flyouts,Statics</dictionary>
define([
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Promise',
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    '../Utilities/_KeyboardBehavior',
    './_LegacyAppBar/_Constants',
    './Flyout',
    './Flyout/_Overlay',
    './Menu/_Command'
], function menuInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Resources, _WriteProfilerMark, Promise, _ElementUtilities, _Hoverable, _KeyboardBehavior, _Constants, Flyout, _Overlay, _Command) {
    "use strict";
    
    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.Menu">Represents a menu flyout for displaying commands.</summary>
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        /// <name locid="WinJS.UI.Menu_name">Menu</name>
        /// <icon src="ui_winjs.ui.menu.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.menu.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.Menu">
        /// <button data-win-control="WinJS.UI.MenuCommand" data-win-options="{id:'',label:'example',type:'button',onclick:null}"></button>
        /// </div>]]></htmlSnippet>
        /// <event name="beforeshow" locid="WinJS.UI.Menu_e:beforeshow">Raised just before showing a menu.</event>
        /// <event name="aftershow" locid="WinJS.UI.Menu_e:aftershow">Raised immediately after a menu is fully shown.</event>
        /// <event name="beforehide" locid="WinJS.UI.Menu_e:beforehide">Raised just before hiding a menu.</event>
        /// <event name="afterhide" locid="WinJS.UI.Menu_e:afterhide">Raised immediately after a menu is fully hidden.</event>
        /// <part name="menu" class="win-menu" locid="WinJS.UI.Menu_part:menu">The Menu control itself</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        Menu: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/menuAriaLabel").value; },
                get requiresCommands() { return "Invalid argument: commands must not be empty"; },
                get nullCommand() { return "Invalid argument: command must not be null"; },
            };

            function isCommandInMenu(object) {
                // Verifies that we have a menuCommand element and that it is in a Menu.
                var element = object.element || object;
                return _ElementUtilities._matchesSelector(element, "." + _Constants.menuClass + " " + "." + _Constants.menuCommandClass);
            }

            var Menu = _Base.Class.derive(Flyout.Flyout, function Menu_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.Menu.Menu">
                /// <summary locid="WinJS.UI.Menu.constructor">
                /// Creates a new Menu control.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.Menu.constructor_p:element">
                /// The DOM element that will host the control.
                /// </param>
                /// <param name="options" type="Object" domElement="false" locid="WinJS.UI.Menu.constructor_p:options">
                /// The set of properties and values to apply to the control.
                /// </param>
                /// <returns type="WinJS.UI.Menu" locid="WinJS.UI.Menu.constructor_returnValue">The new Menu control.</returns>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </signature>

                // We need to be built on top of a Flyout, so stomp on the user's input
                options = options || {};

                // Make sure there's an input element
                this._element = element || _Global.document.createElement("div");
                this._id = this._element.id || _ElementUtilities._uniqueID(this._element);
                this._writeProfilerMark("constructor,StartTM");

                // validate that if they didn't set commands, in which
                // case any HTML only contains commands.  Do this first
                // so that we don't leave partial Menus in the DOM.
                if (!options.commands && this._element) {
                    // Shallow copy object so we can modify it.
                    options = _BaseUtils._shallowCopy(options);
                    options.commands = this._verifyCommandsOnly(this._element, "WinJS.UI.MenuCommand");
                }

                
                // Menu default ARIA role and label.
                var role = "menu";
                var label = null;
                if (this._element) {
                    // We want to use any user defined ARIA role or label that have been set.
                    // Store them now because the baseFlyoutConstructor will overwrite them.
                    role = this._element.getAttribute("role") || role;
                    label = this._element.getAttribute("aria-label") || label;
                }

                // Call the base constructor helper.
                this._baseFlyoutConstructor(this._element, options);

                // Set ARIA role and label.
                this._element.setAttribute("role", role);
                this._element.setAttribute("aria-label", label);

                // Handle "esc" & "up/down" key presses
                this._element.addEventListener("keydown", this._handleKeyDown.bind(this), true);
                this._element.addEventListener(_Constants._menuCommandInvokedEvent, this._handleCommandInvoked.bind(this), false);
                this._element.addEventListener("mouseover", this._handleMouseOver.bind(this), false);
                this._element.addEventListener("mouseout", this._handleMouseOut.bind(this), false);

                // Attach our css class
                _ElementUtilities.addClass(this._element, _Constants.menuClass);

                this._winKeyboard = new _KeyboardBehavior._WinKeyboard(this._element);

                // Need to set our commands, making sure we're hidden first
                this.hide();
                this._writeProfilerMark("constructor,StopTM");
            }, {
                // Public Properties

                /// <field type="Array" locid="WinJS.UI.Menu.commands" helpKeyword="WinJS.UI.Menu.commands" isAdvanced="true">
                /// Sets the MenuCommand objects that appear in the Menu. You can set this to a single MenuCommand or an array of MenuCommand objects.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                commands: {
                    set: function (value) {
                        // Fail if trying to set when visible
                        if (!this.hidden) {
                            throw new _ErrorFromName("WinJS.UI.Menu.CannotChangeCommandsWhenVisible", _Resources._formatString(_Overlay._Overlay.commonstrings.cannotChangeCommandsWhenVisible, "Menu"));
                        }

                        // Start from scratch
                        _ElementUtilities.empty(this._element);

                        // In case they had only one...
                        if (!Array.isArray(value)) {
                            value = [value];
                        }

                        // Add commands
                        var len = value.length;
                        for (var i = 0; i < len; i++) {
                            this._addCommand(value[i]);
                        }
                    }
                },

                getCommandById: function (id) {
                    /// <signature helpKeyword="WinJS.UI.Menu.getCommandById">
                    /// <summary locid="WinJS.UI.Menu.getCommandById">
                    /// Retrieve the command with the specified ID from this Menu.  If more than one command is found, all are returned.
                    /// </summary>
                    /// <param name="id" type="String" locid="WinJS.UI.Menu.getCommandById_p:id">The ID of the command to find.</param>
                    /// <returns type="object" locid="WinJS.UI.Menu.getCommandById_returnValue">
                    /// The command found, an array of commands if more than one have the same ID, or null if no command is found.
                    /// </returns>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    var commands = this.element.querySelectorAll("#" + id);
                    var newCommands = [];
                    for (var count = 0, len = commands.length; count < len; count++) {
                        if (commands[count].winControl) {
                            newCommands.push(commands[count].winControl);
                        }
                    }

                    if (newCommands.length === 1) {
                        return newCommands[0];
                    } else if (newCommands.length === 0) {
                        return null;
                    }

                    return newCommands;
                },


                showCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI.Menu.showCommands">
                    /// <summary locid="WinJS.UI.Menu.showCommands">
                    /// Shows the specified commands of the Menu.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI.Menu.showCommands_p:commands">
                    /// The commands to show. The array elements may be Menu objects, or the string identifiers (IDs) of commands.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    if (!commands) {
                        throw new _ErrorFromName("WinJS.UI.Menu.RequiresCommands", strings.requiresCommands);
                    }

                    this._showCommands(commands, true);
                },

                hideCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI.Menu.hideCommands">
                    /// <summary locid="WinJS.UI.Menu.hideCommands">
                    /// Hides the Menu.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI.Menu.hideCommands_p:commands">
                    /// Required. Command or Commands to hide, either String, DOM elements, or WinJS objects.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    if (!commands) {
                        throw new _ErrorFromName("WinJS.UI.Menu.RequiresCommands", strings.requiresCommands);
                    }

                    this._hideCommands(commands, true);
                },

                showOnlyCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI.Menu.showOnlyCommands">
                    /// <summary locid="WinJS.UI.Menu.showOnlyCommands">
                    /// Shows the specified commands of the Menu while hiding all other commands.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI.Menu.showOnlyCommands_p:commands">
                    /// The commands to show. The array elements may be MenuCommand objects, or the string identifiers (IDs) of commands.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    if (!commands) {
                        throw new _ErrorFromName("WinJS.UI.Menu.RequiresCommands", strings.requiresCommands);
                    }

                    this._showOnlyCommands(commands, true);
                },

                _hide: function Menu_hide() {
                    if (this._hoverPromise) {
                        this._hoverPromise.cancel();
                    }
                    Flyout.Flyout.prototype._hide.call(this);
                },
                
                _afterHide: function Menu_afterHide() {
                    _ElementUtilities.removeClass(this.element, _Constants.menuMouseSpacingClass);
                    _ElementUtilities.removeClass(this.element, _Constants.menuTouchSpacingClass);
                },

                _beforeShow: function Menu_beforeShow() {
                    // Make sure menu commands display correctly
                    if (!_ElementUtilities.hasClass(this.element, _Constants.menuMouseSpacingClass) && !_ElementUtilities.hasClass(this.element, _Constants.menuTouchSpacingClass)) {
                        // The Menu's spacing shouldn't change while it is already shown. Only
                        // add a spacing class if it doesn't already have one. It will get
                        // removed after the Menu hides.
                        _ElementUtilities.addClass(
                            this.element,
                            Flyout.Flyout._cascadeManager.inputType === _KeyboardBehavior._InputTypes.mouse || Flyout.Flyout._cascadeManager.inputType === _KeyboardBehavior._InputTypes.keyboard ?
                                _Constants.menuMouseSpacingClass :
                                _Constants.menuTouchSpacingClass
                        );
                    }

                    this._checkMenuCommands();
                },

                _addCommand: function Menu_addCommand(command) {
                    if (!command) {
                        throw new _ErrorFromName("WinJS.UI.Menu.NullCommand", strings.nullCommand);
                    }
                    // See if it's a command already
                    if (!command._element) {
                        // Not a command, so assume it's options for a command
                        command = new _Command.MenuCommand(null, command);
                    }
                    // If we were attached somewhere else, detach us
                    if (command._element.parentElement) {
                        command._element.parentElement.removeChild(command._element);
                    }

                    // Reattach us
                    this._element.appendChild(command._element);
                },

                _dispose: function Menu_dispose() {
                    if (this._hoverPromise) {
                        this._hoverPromise.cancel();
                    }
                    Flyout.Flyout.prototype._dispose.call(this);

                },

                _commandsUpdated: function Menu_commandsUpdated() {
                    if (!this.hidden) {
                        this._checkMenuCommands();
                    }
                },

                _checkMenuCommands: function Menu_checkMenuCommands() {
                    // Make sure menu commands display correctly.
                    // Called when we show/hide commands or by _beforeShow() when the Menu is showing

                    var menuCommands = this._element.querySelectorAll(".win-command"),
                        hasToggleCommands = false,
                        hasFlyoutCommands = false;
                    if (menuCommands) {
                        for (var i = 0, len = menuCommands.length; i < len; i++) {
                            var menuCommand = menuCommands[i].winControl;
                            if (menuCommand && !menuCommand.hidden) {
                                if (!hasToggleCommands && menuCommand.type === _Constants.typeToggle) {
                                    hasToggleCommands = true;
                                }
                                if (!hasFlyoutCommands && menuCommand.type === _Constants.typeFlyout) {
                                    hasFlyoutCommands = true;
                                }
                            }
                        }
                    }
                    
                    _ElementUtilities[hasToggleCommands ? 'addClass' : 'removeClass'](this._element, _Constants.menuContainsToggleCommandClass);
                    _ElementUtilities[hasFlyoutCommands ? 'addClass' : 'removeClass'](this._element, _Constants.menuContainsFlyoutCommandClass);
                },

                _handleKeyDown: function Menu_handleKeyDown(event) {
                    if (event.keyCode === Key.upArrow) {
                        Menu._focusOnPreviousElement(this.element);

                        // Prevent the page from scrolling
                        event.preventDefault();
                    } else if (event.keyCode === Key.downArrow) {
                        Menu._focusOnNextElement(this.element);

                        // Prevent the page from scrolling
                        event.preventDefault();
                    } else if ((event.keyCode === Key.space || event.keyCode === Key.enter)
                           && (this.element === _Global.document.activeElement)) {
                        event.preventDefault();
                        this.hide();
                    } else if (event.keyCode === Key.tab) {
                        event.preventDefault();
                    }
                },

                _handleFocusIn: function Menu_handleFocusIn(event) {
                    // Menu focuses commands on mouseover. We need to handle cases involving activated flyout commands
                    // to ensure that mousing over different commands in a menu closes that command's sub flyout.
                    var target = event.target;
                    if (isCommandInMenu(target)) {
                        var command = target.winControl;
                        if (_ElementUtilities.hasClass(command.element, _Constants.menuCommandFlyoutActivatedClass)) {
                            // If it's an activated 'flyout' typed command, move focus onto the command's subFlyout.
                            // We expect this will collapse all decendant Flyouts of the subFlyout from the cascade.
                            command.flyout.element.focus();
                        } else {
                            // Deactivate any currently activated command in the Menu to subsequently trigger all subFlyouts descendants to collapse.
                            var activatedSiblingCommand = this.element.querySelector("." + _Constants.menuCommandFlyoutActivatedClass);
                            if (activatedSiblingCommand) {
                                _Command.MenuCommand._deactivateFlyoutCommand(activatedSiblingCommand);
                            }
                        }
                    } else if (target === this.element) {
                        // The Menu itself is receiving focus. Rely on the Flyout base implementation to notify the cascadeManager.
                        // We expect this will only happen when other Menu event handling code causes the Menu to focus itself.
                        Flyout.Flyout.prototype._handleFocusIn.call(this, event);
                    }
                },

                _handleCommandInvoked: function Menu_handleCommandInvoked(event) {
                    // Cascading Menus hide when invoking a command commits an action, not when invoking a command opens a subFlyout.
                    if (this._hoverPromise) {
                        // Prevent pending duplicate invoke triggered via hover.
                        this._hoverPromise.cancel();
                    }
                    var command = event.detail.command;
                    if (command._type !== _Constants.typeFlyout && command._type !== _Constants.typeSeparator) {
                        this._lightDismiss(); // Collapse all Menus/Flyouts.
                    }
                },

                _hoverPromise: null,
                _handleMouseOver: function Menu_handleMouseOver(event) {
                    var target = event.target;
                    if (isCommandInMenu(target)) {
                        var command = target.winControl,
                            that = this;

                        if (target.focus) {
                            target.focus();
                            // remove keyboard focus rect since focus has been triggered by mouse over.
                            _ElementUtilities.removeClass(target, "win-keyboard");

                            if (command.type === _Constants.typeFlyout && command.flyout && command.flyout.hidden) {
                                this._hoverPromise = this._hoverPromise || Promise.timeout(_Constants.menuCommandHoverDelay).then(
                                    function () {
                                        if (!that.hidden && !that._disposed) {
                                            command._invoke(event);
                                        }
                                        that._hoverPromise = null;
                                    },
                                    function () {
                                        that._hoverPromise = null;
                                    });
                            }
                        }
                    }
                },

                _handleMouseOut: function Menu_handleMouseOut(event) {
                    var target = event.target;
                    if (isCommandInMenu(target) && !target.contains(event.relatedTarget)) {
                        if (target === _Global.document.activeElement) {
                            // Menu gives focus to the menu itself
                            this.element.focus();
                        }
                        if (this._hoverPromise) {
                            this._hoverPromise.cancel();
                        }
                    }
                },

                _writeProfilerMark: function Menu_writeProfilerMark(text) {
                    _WriteProfilerMark("WinJS.UI.Menu:" + this._id + ":" + text);
                }
            });

            // Statics

            // Set focus to next focusable element in the menu (loop if necessary).
            //   Note: The loop works by first setting focus to the menu itself.  If the menu is
            //         what had focus before, then we break.  Otherwise we try the first child next.
            // Focus remains on the menu if nothing is focusable.
            Menu._focusOnNextElement = function (menu) {
                var _currentElement = _Global.document.activeElement;

                do {
                    if (_currentElement === menu) {
                        _currentElement = _currentElement.firstElementChild;
                    } else {
                        _currentElement = _currentElement.nextElementSibling;
                    }

                    if (_currentElement) {
                        _currentElement.focus();
                    } else {
                        _currentElement = menu;
                    }

                } while (_currentElement !== _Global.document.activeElement);
            };

            // Set focus to previous focusable element in the menu (loop if necessary).
            //   Note: The loop works by first setting focus to the menu itself.  If the menu is
            //         what had focus before, then we break.  Otherwise we try the last child next.
            // Focus remains on the menu if nothing is focusable.
            Menu._focusOnPreviousElement = function (menu) {
                var _currentElement = _Global.document.activeElement;

                do {
                    if (_currentElement === menu) {
                        _currentElement = _currentElement.lastElementChild;
                    } else {
                        _currentElement = _currentElement.previousElementSibling;
                    }

                    if (_currentElement) {
                        _currentElement.focus();
                    } else {
                        _currentElement = menu;
                    }

                } while (_currentElement !== _Global.document.activeElement);
            };

            return Menu;
        })
    });
});
