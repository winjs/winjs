// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// AppBar
/// <dictionary>appbar,appBars,Flyout,Flyouts,iframe,Statics,unfocus,WinJS</dictionary>
define([
    '../../Core/_Global',
    '../../Core/_WinRT',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Core/_ErrorFromName',
    '../../Core/_Events',
    '../../Core/_Resources',
    '../../Core/_WriteProfilerMark',
    '../../ControlProcessor',
    '../../Scheduler',
    '../../Utilities/_Control',
    '../../Utilities/_Dispose',
    '../../Utilities/_ElementUtilities',
    './_CommandPhone',
    './_Constants',
    './_Icon'
    ], function appBarInit(_Global, _WinRT, _Base, _BaseUtils, _ErrorFromName, _Events, _Resources, _WriteProfilerMark, ControlProcessor, Scheduler, _Control, _Dispose, _ElementUtilities, _CommandPhone, _Constants, _Icon) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.AppBar">
        /// Represents an application toolbar for display commands. 
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.appbar.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.appbar.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.AppBar">
        /// <button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{id:'',label:'example',icon:'back',type:'button',onclick:null,section:'global'}"></button>
        /// </div>]]></htmlSnippet>
        /// <event name="beforeshow" locid="WinJS.UI.AppBar_e:beforeshow">Raised just before showing the AppBar.</event>
        /// <event name="aftershow" locid="WinJS.UI.AppBar_e:aftershow">Raised immediately after the AppBar is fully shown.</event>
        /// <event name="beforehide" locid="WinJS.UI.AppBar_e:beforehide">Raised just before hiding the AppBar.</event>
        /// <event name="afterhide" locid="WinJS.UI.AppBar_e:afterhide">Raised immediately after the AppBar is fully hidden.</event>
        /// <part name="appbar" class="win-commandlayout" locid="WinJS.UI.AppBar_part:appbar">The AppBar control itself.</part>
        /// <part name="appBarCustom" class="win-appbar" locid="WinJS.UI.AppBar_part:appBarCustom">Style for a custom layout AppBar.</part>
        /// <resource type="javascript" src="//Microsoft.Phone.WinJS.2.1/js/base.js" shared="true" />
        /// <resource type="javascript" src="//Microsoft.Phone.WinJS.2.1/js/ui.js" shared="true" />
        /// <resource type="css" src="//Microsoft.Phone.WinJS.2.1/css/ui-dark.css" shared="true" />
        AppBar: _Base.Namespace._lazy(function () {

            var appBarCounter = 0;
            var currentAppBar = null;

            var commandBar; // One static commandBar to be shared by all WinJS AppBar instances.
            var core = _WinRT.Windows.UI.WebUI.Core;

            var createEvent = _Events._createEventProperty;

            // Event Names
            var BEFORESHOW = "beforeshow";
            var AFTERSHOW = "aftershow";
            var BEFOREHIDE = "beforehide";
            var AFTERHIDE = "afterhide";

            // Hidden Display Modes
            var closedDisplayCompact = "compact";
            var closedDisplayMinimal = "minimal";

            var strings = {
                get requiresCommands() { return "Invalid argument: commands must not be empty"; },
                get nullCommand() { return "Invalid argument: command must not be null"; },
                get cannotChangePlacementWhenVisible() { return "Invalid argument: The placement property cannot be set when the AppBar is visible, call hide() first"; },
                get badLayout() { return "Invalid argument: The layout property must be 'custom' or 'commands'"; },
                get cannotChangeLayoutWhenVisible() { return "Invalid argument: The layout property cannot be set when the AppBar is visible, call hide() first"; },
                get cannotChangeCommandsWhenVisible() { return "Invalid argument: You must call hide() before changing {0} commands"; }, // duplicate string getter from Overlay.        
                get mustContainCommands() { return "Invalid HTML: AppBars/Menus must contain only AppBarCommands/MenuCommands"; }, // duplicate string getter from Overlay.  
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; }, // duplicate string getter from Overlay.  
            };

            // Send one of our events, duplicate of private _Overlay member function
            function _sendEvent(eventName, detail) {
                /*jshint validthis: true */
                if (this._disposed) {
                    return;
                }
                var event = _Global.document.createEvent("CustomEvent");
                event.initEvent(eventName, true, true, (detail || {}));
                this._element.dispatchEvent(event);
            }

            // Show commands, duplicate of private _Overlay member function
            function _showCommands(commands) {
                /*jshint validthis: true */
                var showHide = _resolveCommands.call(this, commands);
                this._showAndHideCommands(showHide.commands, []);
            }

            // Hide commands, duplicate of private _Overlay member function
            function _hideCommands(commands) {
                /*jshint validthis: true */
                var showHide = _resolveCommands.call(this, commands);
                this._showAndHideCommands([], showHide.commands);
            }

            // Hide commands, duplicate of private _Overlay member function
            function _showOnlyCommands(commands) {
                /*jshint validthis: true */
                var showHide = _resolveCommands.call(this, commands);
                this._showAndHideCommands(showHide.commands, showHide.others);
            }

            // Resolves our commands, duplicate of private _Overlay member function
            function _resolveCommands(commands) {
                /*jshint validthis: true */
                // First make sure they're all DOM elements.
                commands = _resolveElements(commands);

                // Now make sure they're all in this container
                var result = {};
                result.commands = [];
                result.others = [];
                var allCommands = this.element.querySelectorAll(".win-command");
                var countAll, countIn;
                for (countAll = 0; countAll < allCommands.length; countAll++) {
                    var found = false;
                    for (countIn = 0; countIn < commands.length; countIn++) {
                        if (commands[countIn] === allCommands[countAll]) {
                            result.commands.push(allCommands[countAll]);
                            commands.splice(countIn, 1);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        result.others.push(allCommands[countAll]);
                    }
                }
                return result;
            }

            // Helper to get DOM elements from input single object or array or IDs/toolkit/dom elements. Duplicate of private _Overlay helper.
            function _resolveElements(elements) {
                // No input is just an empty array
                if (!elements) {
                    return [];
                }

                // Make sure it's in array form.
                if (typeof elements === "string" || !elements || !elements.length) {
                    elements = [elements];
                }

                // Make sure we have a DOM element for each one, (could be string id name or toolkit object)
                var i,
                    realElements = [];
                for (i = 0; i < elements.length; i++) {
                    if (elements[i]) {
                        if (typeof elements[i] === "string") {
                            var element = _Global.document.getElementById(elements[i]);
                            if (element) {
                                realElements.push(element);
                            }
                        } else if (elements[i].element) {
                            realElements.push(elements[i].element);
                        } else {
                            realElements.push(elements[i]);
                        }
                    }
                }

                return realElements;
            }

            // Verify that this HTML AppBar only has AppBarCommands. duplicate of private _Overlay member function
            function _verifyCommandsOnly(element, type) {
                var children = element.children;
                var commands = new Array(children.length);
                for (var i = 0; i < children.length; i++) {
                    // If constructed they have win-command class, otherwise they have data-win-control
                    if (!_ElementUtilities.hasClass(children[i], "win-command") && children[i].getAttribute("data-win-control") !== type) {
                        //Not an AppBarCommand
                        throw new _ErrorFromName("WinJS.UI.AppBar.MustContainCommands", strings.mustContainCommands);
                    } else {
                        // Instantiate the commands.
                        ControlProcessor.processAll(children[i]);
                        commands[i] = children[i].winControl;
                    }
                }
                return commands;
            }

            // Remove all commands from the Phone AppBar UI
            function _clearCommandBar() {
                commandBar.primaryCommands.clear();
                commandBar.secondaryCommands.clear();
            }

            var AppBar = _Base.Class.define(function AppBar_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.AppBar.AppBar">
                /// <summary locid="WinJS.UI.AppBar.constructor">
                /// Creates a new AppBar control. 
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.AppBar.constructor_p:element">
                /// The DOM element that will host the control.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.AppBar.constructor_p:options">
                /// The set of properties and values to apply to the new AppBar control.
                /// </param>
                /// <returns type="WinJS.UI.AppBar" locid="WinJS.UI.AppBar.constructor_returnValue">
                /// The new AppBar control.
                /// </returns>
                /// </signature>

                // The first time getForCurrentView() is called, the commandBar will become visible. Subsequent calls just return the same static instance of the commandBar.
                // The act of creating this AppBar will replace all of the static commandBar's contents and state with the contents and state of this AppBar 
                // (unless options.disabled === true)
                commandBar = core.WebUICommandBar.getForCurrentView();
                commandBar.isOpen = false;

                this._uniqueId = appBarCounter;
                appBarCounter++;

                this._initializing = true;

                // Simplify checking later
                options = options || {};

                // Make sure there's an input element            
                this._element = element || _Global.document.createElement("div");
                this._id = this._element.id || _ElementUtilities._uniqueID(this._element);
                this._writeProfilerMark("constructor,StartTM");

                // validate that if they didn't set commands, that the HTML 
                // only contains commands.  Do this first so that we don't 
                // leave partial AppBars in the DOM.
                if (!options.commands && this._element) {
                    // Shallow copy object so we can modify it.
                    options = _BaseUtils._shallowCopy(options);
                    options.commands = _verifyCommandsOnly(this._element, "WinJS.UI.AppBarCommand");
                }

                // Check to make sure we weren't duplicated
                var winControl = this._element.winControl;
                if (winControl) {
                    throw new _ErrorFromName("WinJS.UI.AppBar.DuplicateConstruction", strings.duplicateConstruction);
                }

                this._disposed = false;

                if (!options.disabled) {
                    // Explicity set to false to ensure sure that setOptions sees the 'disabled' property on the options object.
                    options.disabled = false;
                } else {
                    // If we're supposed to be disabled, set the disabled property immediately to 
                    // disconnect from the commandBar before setOptions() is called.
                    this.disabled = options.disabled;
                    delete options.disabled;
                }

                // Default hidden display mode
                options.closedDisplayMode = options.closedDisplayMode || closedDisplayCompact;

                // Remember ourselves
                this._element.winControl = this;

                // Attach our css classes
                _ElementUtilities.addClass(this._element, _Constants.overlayClass);
                _ElementUtilities.addClass(this._element, "win-disposable");
                _ElementUtilities.addClass(this._element, _Constants.appBarClass);
                _ElementUtilities.addClass(this._element, _Constants.bottomClass);
                _ElementUtilities.addClass(this._element, _Constants.commandLayoutClass);

                this._wireUpEvents();

                _Control.setOptions(this, options);

                this._initializing = false;

                // Compute WebUICommandBar colors
                if (_Global.document.body.contains(this.element)) {
                    this._updateCommandBarColors();
                } else {
                    Scheduler.schedule(this._updateCommandBarColors, Scheduler.Priority.high, this, "WinJS.UI.AppBar._updateCommandBarColorsAsync");
                }

                this._writeProfilerMark("constructor,StopTM");

                return this;
            }, {
                /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.AppBar.element" helpKeyword="WinJS.UI.AppBar.element">
                /// The DOM element the AppBar is attached to
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.AppBar.disabled" helpKeyword="WinJS.UI.AppBar.disabled"> 
                /// Disable an AppBar.
                /// When disabled the AppBar will animate off of the screen, stop firing events and will no longer respond to method or property changes until it is re-enabled. 
                /// If another part of the App takes control of the commandBar while the AppBar is disabled, the AppBar will not know about it. 
                /// While the AppBar is disabled it will not respond to any commandBar events that it has registered listeners for.
                /// Re-enabling an AppBar will take back control of the commandBar and overwrite the commandBar's current state with the commands and state of the re-enabled AppBar.
                /// </field>
                disabled: {
                    get: function () {
                        return this._disabled;
                    },
                    set: function (value) {
                        value = !!value;

                        var isCurrent = (currentAppBar === this._uniqueId);
                        var changingState = (value !== this._disabled);
                        var initializing = this._initializing;

                        if(!isCurrent || changingState || initializing){
                            if (!value) { // Enabling

                                // When we enable the AppBar, the AppBar should take control of the commandBar and inject itself into it.
                                // It's IMPORTANT that we SET THIS FIRST, otherwise the AppBar components that interact with the commandBar will Nop.                                                                
                                this._disabled = false;

                                currentAppBar = this._uniqueId;
                                if (!this._initializing) {
                                    // An AppBar that was previously disabled is not guaranteed to be in sync with the commandBar when that AppBar is re-enabled. 
                                    // Re-load this AppBar's state into the commandBar.
                                    this.closedDisplayMode = this.closedDisplayMode;
                                    this._setCommands(this._getCommands());
                                    this._updateCommandBarColors();
                                }

                                // Show AppBar UI
                                commandBar.visible = true;

                            } else { // Disabling  
                                                                                            
                                if (isCurrent) {
                                    // If the commandBar menu was open, hiding the commandBar will throw the "menuclosed" event.
                                    commandBar.visible = false;
                                    currentAppBar = null;
                                }
                               
                                // It's IMPORTANT that we SET THIS LAST when disabling the AppBar. Otherwise we disconnect from the commandBar
                                // too early, and fail to fire the AppBar "hiding" event if the commandBar tells us "menuclosed".
                                this._disabled = true;
                            }
                        }
                    }
                },

                /// <field type="Boolean" hidden="true" locid="WinJS.UI.AppBar.hidden" helpKeyword="WinJS.UI.AppBar.hidden">
                /// Read only, true if the AppBar is currently not open.
                /// </field>
                hidden: {
                    get: function () {
                        return (this.disabled || !commandBar.isOpen);
                    }
                },

                /// <field type="String" defaultValue="bottom" oamOptionsDatatype="WinJS.UI.AppBar.placement" locid="WinJS.UI.AppBar.placement" helpKeyword="WinJS.UI.AppBar.placement" hidden="true">
                /// The placement of the AppBar on the display. The only value for phone is "bottom".
                /// </field>
                placement: {
                    get: function () {
                        // Always bottom for phone
                        return _Constants.appBarPlacementBottom;
                    },
                    set: function () {
                        //NOP on phone
                    }
                },

                /// <field type="String" defaultValue="commands" oamOptionsDatatype="WinJS.UI.AppBar.layout" locid="WinJS.UI.AppBar.layout" helpKeyword="WinJS.UI.AppBar.layout" hidden="true">
                /// The layout of the AppBar contents. "Commands is the only value on phone"
                /// </field>
                layout: {
                    get: function () {
                        // Always commands on phone
                        return _Constants.appBarLayoutCommands;
                    },
                    set: function (value) {
                        if (value !== _Constants.appBarLayoutCommands && value !== _Constants.appBarLayoutCustom) {
                            throw new _ErrorFromName("WinJS.UI.AppBar.BadLayout", strings.badLayout);
                        }
                        // NOP on phone
                    },
                },

                /// <field type="Boolean" locid="WinJS.UI.AppBar.sticky" isAdvanced="true" helpKeyword="WinJS.UI.AppBar.sticky">
                /// The value that indicates whether the AppBar is sticky. false is the only value on phone.
                /// </field>
                sticky: {
                    get: function () {
                        return false; // Always false on phone.
                    },
                    set: function () {
                        // NOP on phone
                    },
                },

                /// <field type="Array" locid="WinJS.UI.AppBar.commands" helpKeyword="WinJS.UI.AppBar.commands" isAdvanced="true">
                /// Gets/Sets the AppBarCommands in the AppBar. This property accepts an array of AppBarCommand objects.
                /// </field>
                commands: {
                    set: function (value) {
                        // Fail if trying to set when visible
                        if (!this.hidden) {
                            throw new _ErrorFromName("WinJS.UI.AppBar.CannotChangeCommandsWhenVisible", _Resources._formatString(strings.cannotChangeCommandsWhenVisible, "AppBar")); // Duplicate string from Overlay
                        }

                        // Start from scratch
                        if (!this._initializing) {
                            // AppBarCommands defined in markup don't want to be disposed during initialization.
                            this._disposeChildren();
                        }

                        this._setCommands(value);

                        if (!this._initializing) {
                            // Compute WebUICommandBar colors
                            this._updateCommandBarColors();
                        }
                    }
                },

                /// <field type="String" defaultValue="compact" locid="WinJS.UI.AppBar.closedDisplayMode" helpKeyword="WinJS.UI.AppBar.closedDisplayMode" isAdvanced="true">
                /// Gets/Sets how AppBar will display itself while closed. Values are "compact" and "minimal".
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1"/>
                /// </field>
                closedDisplayMode: {
                    get: function () {
                        return this._closedDisplayMode || closedDisplayCompact;
                    },
                    set: function (value) {
                        this._closedDisplayMode = value;
                        if (!this.disabled) {
                            var closedDisplayEnum = core.WebUICommandBarClosedDisplayMode;
                            if (value === closedDisplayMinimal) {
                                commandBar.closedDisplayMode = closedDisplayEnum.minimal;
                            } else {
                                commandBar.closedDisplayMode = closedDisplayEnum.compact;
                            }
                        }
                    },
                },

                getCommandById: function (id) {
                    /// <signature helpKeyword="WinJS.UI.AppBar.getCommandById">
                    /// <summary locid="WinJS.UI.AppBar.getCommandById">
                    /// Retrieves the command with the specified ID from this AppBar.
                    /// If more than one command is found, this method returns them all.
                    /// </summary>
                    /// <param name="id" type="String" locid="WinJS.UI.AppBar.getCommandById_p:id">Id of the command to return.</param>
                    /// <returns type="object" locid="WinJS.UI.AppBar.getCommandById_returnValue">
                    /// The command found, an array of commands if more than one have the same ID, or null if no command is found.
                    /// </returns>
                    /// </signature>
                    var commands = this.element.querySelectorAll("#" + id);
                    for (var count = 0; count < commands.length; count++) {
                        // Any elements we generated this should succeed for,
                        // but remove missing ones just to be safe.
                        commands[count] = commands[count].winControl;
                        if (!commands[count]) {
                            commands.splice(count, 1);
                        }
                    }

                    if (commands.length === 1) {
                        return commands[0];
                    } else if (commands.length === 0) {
                        return null;
                    }

                    return commands;
                },


                showCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI.AppBar.showCommands">
                    /// <summary locid="WinJS.UI.AppBar.showCommands">
                    /// Show the specified commands of the AppBar.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI.AppBar.showCommands_p:commands">
                    /// An array of the commands to show. The array elements may be AppBarCommand objects, or the string identifiers (IDs) of commands.
                    /// </param>
                    /// </signature>
                    if (!this.disabled) {
                        if (!commands) {
                            throw new _ErrorFromName("WinJS.UI.AppBar.RequiresCommands", strings.requiresCommands);
                        }

                        _showCommands.call(this, commands);
                    }
                },


                hideCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI.AppBar.hideCommands">
                    /// <summary locid="WinJS.UI.AppBar.hideCommands">
                    /// Hides the specified commands of the AppBar.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI.AppBar.hideCommands_p:commands">Required. Command or Commands to hide, either String, DOM elements, or WinJS objects.</param>
                    /// </signature>
                    if (!this.disabled) {
                        if (!commands) {
                            throw new _ErrorFromName("WinJS.UI.AppBar.RequiresCommands", strings.requiresCommands);
                        }

                        _hideCommands.call(this, commands);
                    }
                },


                showOnlyCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI.AppBar.showOnlyCommands">
                    /// <summary locid="WinJS.UI.AppBar.showOnlyCommands">
                    /// Show the specified commands, hiding all of the others in the AppBar.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI.AppBar.showOnlyCommands_p:commands">
                    /// An array of the commands to show. The array elements may be AppBarCommand objects, or the string identifiers (IDs) of commands.
                    /// </param>
                    /// </signature>
                    if (!this.disabled) {
                        if (!commands) {
                            throw new _ErrorFromName("WinJS.UI.AppBar.RequiresCommands", strings.requiresCommands);
                        }

                        _showOnlyCommands.call(this, commands);
                    }
                },

                show: function AppBar_show() {
                    /// <signature helpKeyword="WinJS.UI.AppBar.show">
                    /// <summary locid="WinJS.UI.AppBar.show">
                    /// Shows the AppBar, if hidden, regardless of other state
                    /// </summary>
                    /// </signature>
                    // Just wrap the private one, turning off keyboard invoked flag
                    this._writeProfilerMark("show,StartTM");

                    // Don't do anything if disabled
                    if (this.disabled) {
                        return;
                    }

                    commandBar.isOpen = true;

                    this._writeProfilerMark("show,StopTM");
                },

                hide: function AppBar_hide() {
                    /// <signature helpKeyword="WinJS.UI.AppBar.hide">
                    /// <summary locid="WinJS.UI.AppBar.hide">
                    /// Hides the AppBar.
                    /// </summary>
                    /// </signature>
                    // Just wrap the private one
                    this._writeProfilerMark("hide,StartTM");

                    // Don't do anything if disabled
                    if (this.disabled) {
                        return;
                    }

                    commandBar.isOpen = false;

                    this._writeProfilerMark("hide,StopTM");
                },

                dispose: function AppBar_dispose() {
                    /// <signature helpKeyword="WinJS.UI.AppBar.dispose">
                    /// <summary locid="WinJS.UI.AppBar.dispose">
                    /// Disposes this AppBar.
                    /// </summary>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }

                    this._disposed = true;

                    // Remove commandBar Event handlers, AppBar shouldn't fire any events from this point.
                    commandBar.removeEventListener("menuopened", this._commandBarMenuOpened, false);
                    commandBar.removeEventListener("menuclosed", this._commandBarMenuClosed, false);

                    this.disabled = true; // Stop talking to commandBar and remove it from view.

                    // Make sure we only remove our commands from the CommandBar UI, in case something 
                    // else had taken over the commandBar by the time this AppBar was disposed. 
                    _showOnlyCommands.call(this, []);

                    // Now dispose our commands.
                    this._disposeChildren();
                },

                /// <field type="Function" locid="WinJS.UI.AppBar.onbeforeshow" helpKeyword="WinJS.UI.AppBar.onbeforeshow">
                /// Occurs immediately before the control is shown.
                /// </field>
                onbeforeshow: createEvent(BEFORESHOW),

                /// <field type="Function" locid="WinJS.UI.AppBar.onaftershow" helpKeyword="WinJS.UI.AppBar.onaftershow">
                /// Occurs immediately after the control is shown.
                /// </field>
                onaftershow: createEvent(AFTERSHOW),

                /// <field type="Function" locid="WinJS.UI.AppBar.onbeforehide" helpKeyword="WinJS.UI.AppBar.onbeforehide">
                /// Occurs immediately before the control is hidden.
                /// </field>
                onbeforehide: createEvent(BEFOREHIDE),

                /// <field type="Function" locid="WinJS.UI.AppBar.onafterhide" helpKeyword="WinJS.UI.AppBar.onafterhide">
                /// Occurs immediately after the control is hidden.
                /// </field>
                onafterhide: createEvent(AFTERHIDE),

                _wireUpEvents: function AppBar_wireUpEvents() {
                    // Define commandBar event handlers.

                    this._commandBarMenuOpened = function AppBar_commandBarMenuOpened() {
                        if (!this.disabled) {
                            this._writeProfilerMark("commandBarMenuOpened,StartTM");
                            _sendEvent.call(this, BEFORESHOW);
                            _sendEvent.call(this, AFTERSHOW);
                            this._writeProfilerMark("commandBarMenuOpened,StopTM");
                        }
                    }.bind(this);

                    this._commandBarMenuClosed = function AppBar_commandBarMenuClosed() {
                        if (!this.disabled) {
                            this._writeProfilerMark("commandBarMenuClosed,StartTM");
                            _sendEvent.call(this, BEFOREHIDE);
                            _sendEvent.call(this, AFTERHIDE);
                            this._writeProfilerMark("commandBarMenuClosed,StopTM");
                        }
                    }.bind(this);

                    // Attach commandBar event handlers.
                    commandBar.addEventListener("menuopened", this._commandBarMenuOpened, false);
                    commandBar.addEventListener("menuclosed", this._commandBarMenuClosed, false);
                },

                _disposeChildren: function AppBar_disposeChildren() {
                    var children = this.element.children;
                    var length = children.length;
                    for (var i = 0; i < length; i++) {
                        var element = children[i];
                        if (this.layout === _Constants.appBarLayoutCommands) {
                            element.winControl.dispose();
                        } else {
                            _Dispose.disposeSubTree(element);
                        }
                    }
                },

                _addCommand: function AppBar_addCommand(command) {
                    if (!command) {
                        throw new _ErrorFromName("WinJS.UI.AppBar.NullCommand", strings.nullCommand);
                    }
                    // See if it's a command already
                    if (!command._element) {
                        // Not a command, so assume it is options for the command's constructor.
                        command = new _CommandPhone.AppBarCommand(null, command);
                    }
                    // If we were attached somewhere else, detach us
                    if (command._element.parentElement) {
                        command._element.parentElement.removeChild(command._element);
                    }
                    // Reattach us to the AppBar DOM
                    this._element.appendChild(command._element);

                    // Add visible commands to WebUICommandBar
                    if (!command.hidden && !this.disabled) {
                        command.section === "selection" ? commandBar.secondaryCommands.push(command._commandBarIconButton) : commandBar.primaryCommands.push(command._commandBarIconButton);
                    }
                },

                _getCommands: function AppBar_getCommands() {
                    var elements = this._element.querySelectorAll('.win-command');
                    var commands = [];
                    for (var i = 0, len = elements.length; i < len; i++) {
                        commands.push(elements[i].winControl);
                    }
                    return commands;
                },

                _setCommands: function AppBar_setCommands(commands) {
                    // Clear everything.
                    _ElementUtilities.empty(this._element);
                    if (!this.disabled) {
                        _clearCommandBar();
                    }

                    // In case they had only one...
                    if (!Array.isArray(commands)) {
                        commands = [commands];
                    }

                    // Add commands
                    var len = commands.length;
                    for (var i = 0; i < len; i++) {
                        this._addCommand(commands[i]);
                    }
                },

                _updateCommandBarColors: function AppBar_updateCommandBarColors() {

                    function extractColorValue(colorString) {
                        // colorString is in the form of "rgb(r,g,b)", "rgba(r,g,b,a)" 
                        // Remove the left paren, right paren, and commas.
                        var colorsArray = colorString.split("(")[1].split(")")[0].split(",");

                        return {
                            r: parseInt(colorsArray[0]),
                            g: parseInt(colorsArray[1]),
                            b: parseInt(colorsArray[2]),
                            a: colorsArray[3] ? parseFloat(colorsArray[3]) : 1,
                        };
                    }

                    if (!this.disabled) {

                        // Use AppBar element backgroundColor (RGBA) to set the new WebUICommandBar.backgroundColor and WebUICommandBar.opacity values
                        var bgColorString = _Global.getComputedStyle(this.element).backgroundColor;
                        if (bgColorString === 'transparent') { // bgColorString is in the form of "rgb(r,g,b)", "rgba(r,g,b,a)" , or "transparent"
                            // getComputedStyle() will give say 'transparent' when an element has no color styles applied to it, or when it has been explicitly set to 'transparent'.
                            // However getComputedStyle does NOT say 'transparent' when a color style of "rgba()" with an alpha value of 0 has been applied.
                            if (_Global.document.body.contains(this.element) || this.element.style.backgroundColor === 'transparent') {
                                // If the element is in the DOM, then the WinJS Default CSS rules have been applied, so we can trust that 'transparent' is an explicit color override.
                                commandBar.opacity = 0;
                            }
                        }
                        else if (bgColorString.substring(0, 3) === 'rgb') {
                            var bgColor = extractColorValue(bgColorString);
                            commandBar.backgroundColor = { a: 255, r: bgColor.r, g: bgColor.g, b: bgColor.b };
                            commandBar.opacity = bgColor.a;
                        }

                        // Use the label color (RGB) in the first DOM ordered AppBarCommand to set the new WebUICommandBar.foregroundColor value. 
                        // If there are no explicit styles on the AppBarCommands label element, the computedStyle of the label element's color 
                        // can/will inherit from the AppBarCommand element itself. If there are no explicit styles on the AppBarCommand element 
                        // the computedStyle of the label element's color can/will inherit form the AppBar element. Phone doesn't support 
                        // transparency in the foreground.
                        var colorSrc = this.element.querySelector(".win-label") || this.element;
                        var fgColorString = _Global.getComputedStyle(colorSrc).color;
                        if (fgColorString.substring(0, 3) === 'rgb') { // fgColorString is in the form of "rgb(r,g,b)", "rgba(r,g,b,a)" , or "transparent"
                            var fgColor = extractColorValue(fgColorString);
                            commandBar.foregroundColor = { a: 255, r: fgColor.r, g: fgColor.g, b: fgColor.b };

                        }
                    }
                },

                _showAndHideCommands: function AppBar_showAndHideCommands(showCommands, hideCommands) {
                    var count;
                    var len;
                    var primaryCommands = commandBar.primaryCommands;
                    var secondaryCommands = commandBar.secondaryCommands;

                    // Remove the CommandBarIconButtons whose corresponding AppBarComamnds are being hidden in AppBar.
                    var indexToRemove;
                    var hidingCommand;
                    for (count = 0, len = hideCommands.length; count < len; count++) {
                        hidingCommand = hideCommands[count].winControl;
                        if (!hidingCommand.hidden) {
                            // Should be in commandBar, needs to be removed.
                            if (hidingCommand.section === "global") {
                                // Remove from primary
                                indexToRemove = primaryCommands.length - 1;
                                while (hidingCommand._commandBarIconButton !== primaryCommands[indexToRemove] && indexToRemove >= 0) {
                                    indexToRemove--;
                                }
                                if (indexToRemove >= 0) {
                                    primaryCommands.removeAt(indexToRemove);
                                }
                            } else {
                                // Remove from secondary
                                indexToRemove = secondaryCommands.length - 1;
                                while (hidingCommand._commandBarIconButton !== secondaryCommands[indexToRemove] && indexToRemove >= 0) {
                                    indexToRemove--;
                                }
                                if (indexToRemove >= 0) {
                                    secondaryCommands.removeAt(indexToRemove);
                                }
                            }
                        }
                        hidingCommand._hidden = true; // Set private member to avoid recursive call
                    }

                    // Add CommandBarIconButton's whose corresponding AppBarComamnds are being shown in AppBar.
                    // Commands will be inserted into commandBar's Primary/Secondary Command properties.
                    // The Primary/Secondary Command properties are kept sorted relative to the AppBar's 
                    // DOM order of each WebUICommandBar elements' corresponding AppBarCommand object.
                    // We can leverage the fact that the Primary/Seconday Commands are already sorted as such.
                    // Iterate forwards while inserting WebUICommandBarIconButton's to minimize # of array shifts.
                    var allCommandsInDOMOrder = this._getCommands(); // All commands in the AppBar, sorted in DOM order.
                    var DOMIndex; // The index we use to iterate through the above allCommandsInDOMOrder array.
                    var indexToInsert; // The index of where we need to insert the Command to be shown into the CommandBar.
                    var showingCommand; // The command to be showm.

                    for (count = 0, len = showCommands.length; count < len; count++) {
                        DOMIndex = 0;
                        indexToInsert = 0;
                        showingCommand = showCommands[count].winControl;
                        if (showingCommand.hidden) {
                            // Command is not in commandBar, needs to be added.
                            if (showingCommand.section === "global") {
                                // Add as a primary.
                                while (showingCommand !== allCommandsInDOMOrder[DOMIndex]) {
                                    if (primaryCommands[indexToInsert] === allCommandsInDOMOrder[DOMIndex]._commandBarIconButton) {
                                        indexToInsert++;
                                    }
                                    DOMIndex++;
                                }
                                // Insert at the appropriate index to maintain sorted enviornment.                                
                                primaryCommands.insertAt(indexToInsert, showingCommand._commandBarIconButton);
                            } else {
                                // Add as a secondary
                                while (showingCommand !== allCommandsInDOMOrder[DOMIndex]) {
                                    if (secondaryCommands[indexToInsert] === allCommandsInDOMOrder[DOMIndex]._commandBarIconButton) {
                                        indexToInsert++;
                                    }
                                    DOMIndex++;
                                }
                                // Insert at the appropriate index to maintain sorted enviornment.                               
                                secondaryCommands.insertAt(indexToInsert, showingCommand._commandBarIconButton);
                            }
                        }
                        showingCommand._hidden = false; // Set private member to avoid recursive call
                    }

                    // Recompute colors.
                    this._updateCommandBarColors();
                },

                _writeProfilerMark: function AppBar_writeProfilerMark(text) {
                    _WriteProfilerMark("WinJS.UI.AppBar:" + this._id + ":" + text);
                },
            },
            {
                _currentAppBarId: { // Expose this static member for unit testing.
                    get: function () {
                        return currentAppBar;
                    },
                }
            });

            _Base.Class.mix(AppBar, _Control.DOMEventMixin);

            return AppBar;
        })
    });

});