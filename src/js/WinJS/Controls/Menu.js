// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
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
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    './AppBar/_Constants',
    './Flyout',
    './Flyout/_Overlay',
    './Menu/_Command',
    'require-style!less/controls'
    ], function menuInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Resources, _WriteProfilerMark, _ElementUtilities, _Hoverable, _Constants, Flyout, _Overlay, _Command) {
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
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        Menu: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/menuAriaLabel").value; },
                get requiresCommands() { return "Invalid argument: commands must not be empty"; },
                get nullCommand() { return "Invalid argument: command must not be null"; },
            };

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

                // Remember aria role in case base constructor changes it
                var role = this._element ? this._element.getAttribute("role") : null;
                var label = this._element ? this._element.getAttribute("aria-label") : null;

                // Call the base overlay constructor helper
                this._baseFlyoutConstructor(this._element, options);

                // Make sure we have an ARIA role
                if (role === null || role === "" || role === undefined) {
                    this._element.setAttribute("role", "menu");
                }
                if (label === null || label === "" || label === undefined) {
                    this._element.setAttribute("aria-label", strings.ariaLabel);
                }

                // Handle "esc" & "up/down" key presses
                this._element.addEventListener("keydown", this._handleKeyDown, true);

                // Attach our css class
                _ElementUtilities.addClass(this._element, _Constants.menuClass);

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

                show: function (anchor, placement, alignment) {
                    /// <signature helpKeyword="WinJS.UI.Menu.show">
                    /// <summary locid="WinJS.UI.Menu.show">
                    /// Shows the Menu, if hidden, regardless of other states.
                    /// </summary>
                    /// <param name="anchor" type="HTMLElement" domElement="true" locid="WinJS.UI.Menu.show_p:anchor">
                    /// The DOM element, or ID of a DOM element,  to anchor the Menu. This parameter overrides the anchor property for this method call only.
                    /// </param>
                    /// <param name="placement" type="object" domElement="false" locid="WinJS.UI.Menu.show_p:placement">
                    /// The placement of the Menu to the anchor: 'auto' (default), 'autohorizontal', 'autovertical', 'top', 'bottom', 'left', or 'right'. This parameter overrides the placement
                    /// property for this method call only.
                    /// </param>
                    /// <param name="alignment" type="object" domElement="false" locid="WinJS.UI.Menu.show_p:alignment">
                    /// For 'top' or 'bottom' placement, the alignment of the Menu to the anchor's edge: 'center' (default), 'left', or 'right'. This parameter
                    /// overrides the alignment property for this method call only.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    // Just call private version to make appbar flags happy
                    this._writeProfilerMark("show,StartTM"); // The corresponding "stop" profiler mark is handled in _Overlay._baseEndShow().
                    this._show(anchor, placement, alignment);
                },

                _show: function Menu_show(anchor, placement, alignment) {
                    // Before we show, we also need to check for children flyouts needing anchors
                    this._checkForFlyoutCommands();

                    // Call flyout show
                    this._baseFlyoutShow(anchor, placement, alignment);

                    // We need to check for toggles after we send the beforeshow event,
                    // so the developer has a chance to show or hide more commands.
                    // Flyout's _findPosition will make that call.
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

                // Called by flyout's _findPosition so that application can update it status
                // we do the test and we can then fix this last-minute before showing.
                _checkToggle: function Menu_checkToggle() {
                    var toggles = this._element.querySelectorAll(".win-command[aria-checked]");
                    var hasToggle = false;
                    if (toggles) {
                        for (var i = 0; i < toggles.length; i++) {
                            if (toggles[i] && toggles[i].winControl && !toggles[i].winControl.hidden) {
                                // Found a visible toggle control
                                hasToggle = true;
                                break;
                            }
                        }
                    }
                    if (hasToggle) {
                        _ElementUtilities.addClass(this._element, _Constants.menuToggleClass);
                    } else {
                        _ElementUtilities.removeClass(this._element, _Constants.menuToggleClass);
                    }
                },

                _checkForFlyoutCommands: function Menu_checkForFlyoutCommands() {
                    var commands = this._element.querySelectorAll(".win-command");
                    for (var count = 0; count < commands.length; count++) {
                        if (commands[count].winControl) {
                            // Remember our anchor in case it's a flyout
                            commands[count].winControl._parentFlyout = this;
                        }
                    }
                },

                _handleKeyDown: function Menu_handleKeyDown(event) {
                    var that = this;
                    if (event.keyCode === Key.escape) {
                        // Show a focus rect on what we move focus to
                        this.winControl._keyboardInvoked = true;
                        this.winControl._hide();
                    } else if ((event.keyCode === Key.space || event.keyCode === Key.enter)
                           && (this === _Global.document.activeElement)) {
                        event.preventDefault();
                        this.winControl.hide();
                    } else if (event.keyCode === Key.upArrow) {
                        Menu._focusOnPreviousElement(that);

                        // Prevent the page from scrolling
                        event.preventDefault();
                    } else if (event.keyCode === Key.downArrow) {
                        Menu._focusOnNextElement(that);

                        // Prevent the page from scrolling
                        event.preventDefault();
                    } else if (event.keyCode === Key.tab) {
                        event.preventDefault();
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
