// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// _LegacyAppBar
/// <dictionary>appbar,appBars,Flyout,Flyouts,iframe,Statics,unfocus,WinJS</dictionary>
define([
    'exports',
    '../Core/_Global',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Animations',
    '../Promise',
    '../Scheduler',
    '../Utilities/_Control',
    '../Utilities/_Dispose',
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    '../Utilities/_KeyboardBehavior',
    './_LegacyAppBar/_Constants',
    './_LegacyAppBar/_Layouts',
    './AppBar/_Command',
    './AppBar/_Icon',
    './Flyout/_Overlay',
    '../Application'
], function appBarInit(exports, _Global, _WinRT, _Base, _BaseUtils, _ErrorFromName, _Events, _Resources, _WriteProfilerMark, Animations, Promise, Scheduler, _Control, _Dispose, _ElementUtilities, _Hoverable, _KeyboardBehavior, _Constants, _Layouts, _Command, _Icon, _Overlay, Application) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI._LegacyAppBar">
        /// Represents an application toolbar for display commands.
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.appbar.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.appbar.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI._LegacyAppBar">
        /// <button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{id:'',label:'example',icon:'back',type:'button',onclick:null,section:'primary'}"></button>
        /// </div>]]></htmlSnippet>
        /// <event name="beforeopen" locid="WinJS.UI._LegacyAppBar_e:beforeopen">Raised just before showing the _LegacyAppBar.</event>
        /// <event name="afteropen" locid="WinJS.UI._LegacyAppBar_e:afteropen">Raised immediately after the _LegacyAppBar is fully shown.</event>
        /// <event name="beforeclose" locid="WinJS.UI._LegacyAppBar_e:beforeclose">Raised just before hiding the _LegacyAppBar.</event>
        /// <event name="afterclose" locid="WinJS.UI._LegacyAppBar_e:afterclose">Raised immediately after the _LegacyAppBar is fully hidden.</event>
        /// <part name="appbar" class="win-commandlayout" locid="WinJS.UI._LegacyAppBar_part:appbar">The _LegacyAppBar control itself.</part>
        /// <part name="appBarCustom" class="win-navbar" locid="WinJS.UI._LegacyAppBar_part:appBarCustom">Style for a custom layout _LegacyAppBar.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        _LegacyAppBar: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            var EVENTS = {
                beforeOpen: "beforeopen",
                afterOpen: "afteropen",
                beforeClose: "beforeclose",
                afterClose: "afterclose",
            };

            var createEvent = _Events._createEventProperty;

            // Enum of known constant pixel values for display modes.
            var knownVisibleHeights = {
                none: 0,
                hidden: 0,
                minimal: 25,
                compact: 48
            };

            // Maps each notion of a display modes to the corresponding visible position
            var displayModeVisiblePositions = {
                none: "hidden",
                hidden: "hidden",
                minimal: "minimal",
                shown: "shown",
                compact: "compact"
            };

            // Enum of closedDisplayMode constants
            var closedDisplayModes = {
                none: "none",
                minimal: "minimal",
                compact: "compact"
            };

            // Constants shown/hidden states
            var appbarShownState = "shown",
                appbarHiddenState = "hidden";

            // Hook into event
            var globalEventsInitialized = false;
            var edgyHappening = null;

            // Handler for the edgy starting/completed/cancelled events
            function _completedEdgy(e) {
                // If we had a right click on a flyout, ignore it.
                if (_Overlay._Overlay._containsRightMouseClick &&
                    e.kind === _WinRT.Windows.UI.Input.EdgeGestureKind.mouse) {
                    return;
                }
                if (edgyHappening) {
                    // Edgy was happening, just skip it
                    edgyHappening = null;
                } else {
                    // Edgy wasn't happening, so toggle
                    var keyboardInvoked = e.kind === _WinRT.Windows.UI.Input.EdgeGestureKind.keyboard;
                    _LegacyAppBar._toggleAllAppBarsState(keyboardInvoked);
                }
            }

            function _startingEdgy() {
                if (!edgyHappening) {
                    // Edgy wasn't happening, so toggle & start it
                    edgyHappening = _LegacyAppBar._toggleAllAppBarsState(false);
                }
            }

            function _canceledEdgy() {
                // Shouldn't get here unless edgy was happening.
                // Undo whatever we were doing.
                var bars = _getDynamicBarsForEdgy();
                if (edgyHappening === "showing") {
                    _Overlay._Overlay._hideAppBars(bars, false);
                } else if (edgyHappening === "hiding") {
                    _Overlay._Overlay._showAppBars(bars, false);
                }
                edgyHappening = null;
            }

            function _allManipulationChanged(event) {
                var elements = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                if (elements) {
                    var len = elements.length;
                    for (var i = 0; i < len; i++) {
                        var element = elements[i];
                        var appbar = element.winControl;
                        if (appbar && !element.disabled) {
                            appbar._manipulationChanged(event);
                        }
                    }
                }
            }

            // Get all the non-sticky bars and return them.
            // Returns array of _LegacyAppBar objects.
            // The array also has _hidden and/or _shown set if ANY are hidden or shown.
            function _getDynamicBarsForEdgy() {
                var elements = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                var len = elements.length;
                var _LegacyAppBars = [];
                _LegacyAppBars._shown = false;
                _LegacyAppBars._hidden = false;
                for (var i = 0; i < len; i++) {
                    var element = elements[i];
                    if (element.disabled) {
                        // Skip disabled _LegacyAppBars
                        continue;
                    }
                    var _LegacyAppBar = element.winControl;
                    if (_LegacyAppBar) {
                        _LegacyAppBars.push(_LegacyAppBar);
                        if (_ElementUtilities.hasClass(_LegacyAppBar._element, _Constants.hiddenClass) || _ElementUtilities.hasClass(_LegacyAppBar._element, _Constants.hidingClass)) {
                            _LegacyAppBars._hidden = true;
                        } else {
                            _LegacyAppBars._shown = true;
                        }
                    }
                }

                return _LegacyAppBars;
            }

            // Updates the firstDiv & finalDiv of all shown _LegacyAppBars
            function _updateAllAppBarsFirstAndFinalDiv() {
                var appBars = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                var appBar;
                for (var i = 0; i < appBars.length; i++) {
                    appBar = appBars[i].winControl;
                    if (appBar
                     && appBar.opened
                     && appBar._updateFirstAndFinalDiv) {
                        appBar._updateFirstAndFinalDiv();
                    }
                }
            }

            // Returns true if a visible non-sticky (light dismiss) _LegacyAppBar is found in the document
            function _isThereVisibleNonStickyBar() {
                var appBars = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                for (var i = 0; i < appBars.length; i++) {
                    var appBarControl = appBars[i].winControl;
                    if (appBarControl && !appBarControl.sticky &&
                        (appBarControl.opened || appBarControl._element.winAnimating === displayModeVisiblePositions.shown)) {
                        return true;
                    }
                }
                return false;
            }

            // If the previous focus was not a _LegacyAppBar or CED, store it in the cache
            // (_isAppBarOrChild tests CED for us).
            function _checkStorePreviousFocus(focusEvent) {
                if (focusEvent.relatedTarget
                 && focusEvent.relatedTarget.focus
             && !_Overlay._Overlay._isAppBarOrChild(focusEvent.relatedTarget)) {
                    _storePreviousFocus(focusEvent.relatedTarget);
                }
            }

            // Cache the previous focus information
            function _storePreviousFocus(element) {
                if (element) {
                    _Overlay._Overlay._ElementWithFocusPreviousToAppBar = element;
                }
            }

            // Try to return focus to what had focus before.
            // If successfully return focus to a textbox, restore the selection too.
            function _restorePreviousFocus() {
                _Overlay._Overlay._trySetActive(_Overlay._Overlay._ElementWithFocusPreviousToAppBar);
            }

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/appBarAriaLabel").value; },
                get requiresCommands() { return "Invalid argument: commands must not be empty"; },
                get cannotChangePlacementWhenVisible() { return "Invalid argument: The placement property cannot be set when the AppBar is visible, call hide() first"; },
                get cannotChangeLayoutWhenVisible() { return "Invalid argument: The layout property cannot be set when the AppBar is visible, call hide() first"; }
            };

            var _LegacyAppBar = _Base.Class.derive(_Overlay._Overlay, function _LegacyAppBar_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI._LegacyAppBar._LegacyAppBar">
                /// <summary locid="WinJS.UI._LegacyAppBar.constructor">
                /// Creates a new _LegacyAppBar control.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI._LegacyAppBar.constructor_p:element">
                /// The DOM element that will host the control.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI._LegacyAppBar.constructor_p:options">
                /// The set of properties and values to apply to the new _LegacyAppBar control.
                /// </param>
                /// <returns type="WinJS.UI._LegacyAppBar" locid="WinJS.UI._LegacyAppBar.constructor_returnValue">
                /// The new _LegacyAppBar control.
                /// </returns>
                /// </signature>

                this._initializing = true;

                // Simplify checking later
                options = options || {};

                // Make sure there's an element
                this._element = element || _Global.document.createElement("div");
                this._id = this._element.id || _ElementUtilities._uniqueID(this._element);
                this._writeProfilerMark("constructor,StartTM");

                // Attach our css class.
                _ElementUtilities.addClass(this._element, _Constants.appBarClass);

                // Make sure we have an ARIA role
                var role = this._element.getAttribute("role");
                if (!role) {
                    this._element.setAttribute("role", "menubar");
                }
                var label = this._element.getAttribute("aria-label");
                if (!label) {
                    this._element.setAttribute("aria-label", strings.ariaLabel);
                }

                // Call the _Overlay constructor helper to finish setting up our element.
                // Don't pass constructor options, _LegacyAppBar needs to set those itself specific order.
                this._baseOverlayConstructor(this._element);

                // Start off hidden
                this._lastPositionVisited = displayModeVisiblePositions.none;
                _ElementUtilities.addClass(this._element, _Constants.hiddenClass);

                // Add Invoke button.
                this._invokeButton = _Global.document.createElement("button");
                this._invokeButton.tabIndex = 0;
                this._invokeButton.setAttribute("type", "button");
                this._invokeButton.innerHTML = "<span class='" + _Constants.ellipsisClass + "'></span>";
                _ElementUtilities.addClass(this._invokeButton, _Constants.invokeButtonClass);
                this._element.appendChild(this._invokeButton);
                var that = this;
                this._invokeButton.addEventListener("click", function () {
                    that._keyboardInvoked = _KeyboardBehavior._keyboardSeenLast;
                    if (that.opened) {
                        that._hide();
                    } else {
                        that._show();
                    }
                }, false);

                // Run layout setter immediately. We need to know our layout in order to correctly
                // position any commands that may be getting set through the constructor.
                this._layout = _Constants.appBarLayoutCustom;
                delete options._layout;

                // Need to set placement before closedDisplayMode, closedDisplayMode sets our starting position, which is dependant on placement.
                this.placement = options.placement || _Constants.appBarPlacementBottom;
                this.closedDisplayMode = options.closedDisplayMode || closedDisplayModes.compact;

                _Control.setOptions(this, options);

                var commandsUpdatedBound = this._commandsUpdated.bind(this);
                this._element.addEventListener(_Constants.commandVisibilityChanged, function (ev) {
                    if (that._disposed) {
                        return;
                    }
                    if (that.opened) {
                        ev.preventDefault();
                    }
                    commandsUpdatedBound();
                });

                this._initializing = false;

                this._setFocusToAppBarBound = this._setFocusToAppBar.bind(this);

                // Make a click eating div
                _Overlay._Overlay._createClickEatingDivAppBar();

                // Handle key down (esc) and (left & right)
                this._element.addEventListener("keydown", this._handleKeyDown.bind(this), false);

                // Attach global event handlers
                if (!globalEventsInitialized) {
                    // We'll trigger on invoking.  Could also have invoked or canceled
                    // Eventually we may want click up on invoking and drop back on invoked.
                    Application.addEventListener("edgystarting", _startingEdgy);
                    Application.addEventListener("edgycompleted", _completedEdgy);
                    Application.addEventListener("edgycanceled", _canceledEdgy);

                    // Need to know if the IHM is done scrolling
                    _Global.document.addEventListener("MSManipulationStateChanged", _allManipulationChanged, false);

                    globalEventsInitialized = true;
                }

                // Need to store what had focus before
                _ElementUtilities._addEventListener(this._element, "focusin", function (event) { _checkStorePreviousFocus(event); }, false);

                // Need to hide ourselves if we lose focus
                _ElementUtilities._addEventListener(this._element, "focusout", function () { _Overlay._Overlay._hideIfAllAppBarsLostFocus(); }, false);


                if (this.closedDisplayMode === closedDisplayModes.none && this.layout === _Constants.appBarLayoutCommands) {
                    // Remove the commands layout _LegacyAppBar from the layout tree at this point so we don't cause unnecessary layout costs whenever
                    // the window resizes or when CSS changes are applied to the commands layout _LegacyAppBar's parent element.
                    this._element.style.display = "none";
                }

                this._winKeyboard = new _KeyboardBehavior._WinKeyboard(this._element);

                this._writeProfilerMark("constructor,StopTM");

                return this;
            }, {
                // Public Properties

                /// <field type="String" defaultValue="bottom" oamOptionsDatatype="WinJS.UI._LegacyAppBar.placement" locid="WinJS.UI._LegacyAppBar.placement" helpKeyword="WinJS.UI._LegacyAppBar.placement">The placement of the _LegacyAppBar on the display.  Values are "top" or "bottom".</field>
                placement: {
                    get: function _LegacyAppBar_get_placement() {
                        return this._placement;
                    },
                    set: function _LegacyAppBar_set_placement(value) {
                        // In designer we may have to move it
                        var wasShown = false;
                        if (_WinRT.Windows.ApplicationModel.DesignMode.designModeEnabled) {
                            this._hide();
                            wasShown = true;
                        }

                        if (this.opened) {
                            throw new _ErrorFromName("WinJS.UI._LegacyAppBar.CannotChangePlacementWhenVisible", strings.cannotChangePlacementWhenVisible);
                        }

                        // Set placement, coerce invalid values to 'bottom'
                        this._placement = (value === _Constants.appBarPlacementTop) ? _Constants.appBarPlacementTop : _Constants.appBarPlacementBottom;

                        // Clean up win-top, win-bottom styles
                        if (this._placement === _Constants.appBarPlacementTop) {
                            _ElementUtilities.addClass(this._element, _Constants.topClass);
                            _ElementUtilities.removeClass(this._element, _Constants.bottomClass);
                        } else if (this._placement === _Constants.appBarPlacementBottom) {
                            _ElementUtilities.removeClass(this._element, _Constants.topClass);
                            _ElementUtilities.addClass(this._element, _Constants.bottomClass);
                        }

                        // Update our position on screen.
                        this._ensurePosition();
                        if (wasShown) {
                            // Show again if we hid ourselves for the designer
                            this._show();
                        }
                    }
                },

                _layout: {
                    get: function _LegacyAppBar_get_layout() {
                        return this._layoutImpl.type;
                    },
                    set: function (layout) {
                        if (layout !== _Constants.appBarLayoutCommands &&
                            layout !== _Constants.appBarLayoutCustom &&
                            layout !== _Constants.appBarLayoutMenu) {
                        }

                        // In designer we may have to redraw it
                        var wasShown = false;
                        if (_WinRT.Windows.ApplicationModel.DesignMode.designModeEnabled) {
                            this._hide();
                            wasShown = true;
                        }

                        if (this.opened) {
                            throw new _ErrorFromName("WinJS.UI._LegacyAppBar.CannotChangeLayoutWhenVisible", strings.cannotChangeLayoutWhenVisible);
                        }

                        var commands;
                        if (!this._initializing) {
                            // Gather commands in preparation for hand off to new layout.
                            // We expect prev layout to return commands in the order they were set in,
                            // not necessarily the current DOM order the layout is using.
                            commands = this._layoutImpl.commandsInOrder;
                            this._layoutImpl.disconnect();
                        }

                        // Set layout
                        if (layout === _Constants.appBarLayoutCommands) {
                            this._layoutImpl = new _Layouts._AppBarCommandsLayout();
                        } else if (layout === _Constants.appBarLayoutMenu) {
                            this._layoutImpl = new _Layouts._AppBarMenuLayout();
                        } else {
                            // Custom layout uses Base _LegacyAppBar Layout class.
                            this._layoutImpl = new _Layouts._AppBarBaseLayout();
                        }
                        this._layoutImpl.connect(this._element);

                        if (commands && commands.length) {
                            // Reset _LegacyAppBar since layout changed.
                            this._layoutCommands(commands);
                        }

                        // Show again if we hid ourselves for the designer
                        if (wasShown) {
                            this._show();
                        }
                    },
                    configurable: true
                },

                /// <field type="Array" locid="WinJS.UI._LegacyAppBar.commands" helpKeyword="WinJS.UI._LegacyAppBar.commands" isAdvanced="true">
                /// Sets the AppBarCommands in the _LegacyAppBar. This property accepts an array of AppBarCommand objects.
                /// </field>
                commands: {
                    set: function _LegacyAppBar_set_commands(commands) {
                        // Fail if trying to set when shown
                        if (this.opened) {
                            throw new _ErrorFromName("WinJS.UI._LegacyAppBar.CannotChangeCommandsWhenVisible", _Resources._formatString(_Overlay._Overlay.commonstrings.cannotChangeCommandsWhenVisible, "_LegacyAppBar"));
                        }

                        // Dispose old commands before tossing them out.
                        if (!this._initializing) {
                            // AppBarCommands defined in markup don't want to be disposed during initialization.
                            this._disposeChildren();
                        }
                        this._layoutCommands(commands);
                    }
                },

                _layoutCommands: function _LegacyAppBar_layoutCommands(commands) {
                    // Function precondition: _LegacyAppBar must not be shown.

                    // Empties _LegacyAppBar HTML and repopulates with passed in commands.
                    _ElementUtilities.empty(this._element);
                    this._element.appendChild(this._invokeButton); // Keep our Show/Hide button.

                    // In case they had only one command to set...
                    if (!Array.isArray(commands)) {
                        commands = [commands];
                    }

                    this._layoutImpl.layout(commands);
                },

                /// <field type="String" defaultValue="compact" locid="WinJS.UI._LegacyAppBar.closedDisplayMode" helpKeyword="WinJS.UI._LegacyAppBar.closedDisplayMode" isAdvanced="true">
                /// Gets/Sets how _LegacyAppBar will display itself while hidden. Values are "none", "minimal" and '"compact".
                /// </field>
                closedDisplayMode: {
                    get: function _LegacyAppBar_get_closedDisplayMode() {
                        return this._closedDisplayMode;
                    },
                    set: function _LegacyAppBar_set_closedDisplayMode(value) {
                        var oldValue = this._closedDisplayMode;

                        if (oldValue !== value) {

                            // Determine if the visible position is changing. This can be used to determine if we need to delay updating closedDisplayMode related CSS classes
                            // to avoid affecting the animation.
                            var changeVisiblePosition = _ElementUtilities.hasClass(this._element, _Constants.hiddenClass) || _ElementUtilities.hasClass(this._element, _Constants.hidingClass);

                            if (value === closedDisplayModes.none) {
                                this._closedDisplayMode = closedDisplayModes.none;
                                if (!changeVisiblePosition || !oldValue) {
                                    _ElementUtilities.removeClass(this._element, _Constants.minimalClass);
                                    _ElementUtilities.removeClass(this._element, _Constants.compactClass);
                                }
                            } else if (value === closedDisplayModes.minimal) {
                                this._closedDisplayMode = closedDisplayModes.minimal;
                                if (!changeVisiblePosition || !oldValue || oldValue === closedDisplayModes.none) {
                                    _ElementUtilities.addClass(this._element, _Constants.minimalClass);
                                    _ElementUtilities.removeClass(this._element, _Constants.compactClass);
                                }
                            } else {
                                // Compact is default fallback.
                                this._closedDisplayMode = closedDisplayModes.compact;
                                _ElementUtilities.addClass(this._element, _Constants.compactClass);
                                _ElementUtilities.removeClass(this._element, _Constants.minimalClass);
                            }

                            // The invoke button has changed the amount of available space in the _LegacyAppBar. Layout might need to scale.
                            this._layoutImpl.resize();

                            if (changeVisiblePosition) {
                                // If the value is being set while we are not showing, change to our new position.
                                this._changeVisiblePosition(displayModeVisiblePositions[this._closedDisplayMode]);
                            }
                        }
                    },
                },



                /// <field type="Boolean" hidden="true" locid="WinJS.UI._LegacyAppBar.opened" helpKeyword="WinJS.UI._LegacyAppBar.opened">Read only, true if an _LegacyAppBar is 'hidden'.</field>
                opened: {
                    get: function () {
                        // Returns true if _LegacyAppBar is not 'hidden'.
                        return !_ElementUtilities.hasClass(this._element, _Constants.hiddenClass) &&
                            !_ElementUtilities.hasClass(this._element, _Constants.hidingClass) &&
                            this._doNext !== displayModeVisiblePositions.minimal &&
                            this._doNext !== displayModeVisiblePositions.compact &&
                            this._doNext !== displayModeVisiblePositions.none;
                    },
                },

                /// <field type="Function" locid="WinJS.UI._LegacyAppBar.onbeforeopen" helpKeyword="WinJS.UI._LegacyAppBar.onbeforeopen">
                /// Occurs immediately before the control is opened.
                /// </field>
                onbeforeopen: createEvent(EVENTS.beforeOpen),

                /// <field type="Function" locid="WinJS.UI._LegacyAppBar.onafteropen" helpKeyword="WinJS.UI._LegacyAppBar.onafteropen">
                /// Occurs immediately after the control is opened.
                /// </field>
                onafteropen: createEvent(EVENTS.afterOpen),

                /// <field type="Function" locid="WinJS.UI._LegacyAppBar.onbeforeclose" helpKeyword="WinJS.UI._LegacyAppBar.onbeforeclose">
                /// Occurs immediately before the control is closed.
                /// </field>
                onbeforeclose: createEvent(EVENTS.beforeClose),

                /// <field type="Function" locid="WinJS.UI._LegacyAppBar.onafterclose" helpKeyword="WinJS.UI._LegacyAppBar.onafterclose">
                /// Occurs immediately after the control is closed.
                /// </field>
                onafterclose: createEvent(EVENTS.afterClose),

                getCommandById: function (id) {
                    /// <signature helpKeyword="WinJS.UI._LegacyAppBar.getCommandById">
                    /// <summary locid="WinJS.UI._LegacyAppBar.getCommandById">
                    /// Retrieves the command with the specified ID from this _LegacyAppBar.
                    /// If more than one command is found, this method returns them all.
                    /// </summary>
                    /// <param name="id" type="String" locid="WinJS.UI._LegacyAppBar.getCommandById_p:id">Id of the command to return.</param>
                    /// <returns type="object" locid="WinJS.UI._LegacyAppBar.getCommandById_returnValue">
                    /// The command found, an array of commands if more than one have the same ID, or null if no command is found.
                    /// </returns>
                    /// </signature>
                    var commands = this._layoutImpl.commandsInOrder.filter(function (command) {
                        return command.id === id || command.element.id === id;
                    });

                    if (commands.length === 1) {
                        return commands[0];
                    } else if (commands.length === 0) {
                        return null;
                    }

                    return commands;
                },

                showCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI._LegacyAppBar.showCommands">
                    /// <summary locid="WinJS.UI._LegacyAppBar.showCommands">
                    /// Show the specified commands of the _LegacyAppBar.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI._LegacyAppBar.showCommands_p:commands">
                    /// An array of the commands to show. The array elements may be AppBarCommand objects, or the string identifiers (IDs) of commands.
                    /// </param>
                    /// </signature>
                    if (!commands) {
                        throw new _ErrorFromName("WinJS.UI._LegacyAppBar.RequiresCommands", strings.requiresCommands);
                    }

                    this._layoutImpl.showCommands(commands);
                },

                hideCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI._LegacyAppBar.hideCommands">
                    /// <summary locid="WinJS.UI._LegacyAppBar.hideCommands">
                    /// Hides the specified commands of the _LegacyAppBar.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI._LegacyAppBar.hideCommands_p:commands">Required. Command or Commands to hide, either String, DOM elements, or WinJS objects.</param>
                    /// </signature>
                    if (!commands) {
                        throw new _ErrorFromName("WinJS.UI._LegacyAppBar.RequiresCommands", strings.requiresCommands);
                    }

                    this._layoutImpl.hideCommands(commands);
                },

                showOnlyCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI._LegacyAppBar.showOnlyCommands">
                    /// <summary locid="WinJS.UI._LegacyAppBar.showOnlyCommands">
                    /// Show the specified commands, hiding all of the others in the _LegacyAppBar.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI._LegacyAppBar.showOnlyCommands_p:commands">
                    /// An array of the commands to show. The array elements may be AppBarCommand objects, or the string identifiers (IDs) of commands.
                    /// </param>
                    /// </signature>
                    if (!commands) {
                        throw new _ErrorFromName("WinJS.UI._LegacyAppBar.RequiresCommands", strings.requiresCommands);
                    }

                    this._layoutImpl.showOnlyCommands(commands);
                },

                open: function () {
                    /// <signature helpKeyword="WinJS.UI._LegacyAppBar.open">
                    /// <summary locid="WinJS.UI._LegacyAppBar.open">
                    /// Opens the _LegacyAppBar, if closed and not disabled, regardless of other state.
                    /// </summary>
                    /// </signature>
                    // Just wrap the private one, turning off keyboard invoked flag
                    this._writeProfilerMark("show,StartTM");
                    this._keyboardInvoked = false;
                    this._show();
                },

                _show: function _LegacyAppBar_show() {

                    var toPosition = displayModeVisiblePositions.shown;
                    var showing = null;

                    // If we're already shown, we are just going to animate our position, not fire events or manage focus.
                    if (!this.disabled && (_ElementUtilities.hasClass(this._element, _Constants.hiddenClass) || _ElementUtilities.hasClass(this._element, _Constants.hidingClass))) {
                        showing = appbarShownState;
                    }

                    this._changeVisiblePosition(toPosition, showing);

                    if (showing) {
                        // Need click-eating div to be visible ASAP.
                        _Overlay._Overlay._showClickEatingDivAppBar();

                        // Clean up tabbing behavior by making sure first and final divs are correct after showing.
                        this._updateFirstAndFinalDiv();
                        
                        // Store what had focus if nothing currently is stored
                        if (!_Overlay._Overlay._ElementWithFocusPreviousToAppBar) {
                            _storePreviousFocus(_Global.document.activeElement);
                        }

                        this._layoutImpl.setFocusOnShow();
                    }
                },

                close: function () {
                    /// <signature helpKeyword="WinJS.UI._LegacyAppBar.close">
                    /// <summary locid="WinJS.UI._LegacyAppBar.close">
                    /// Closes the _LegacyAppBar.
                    /// </summary>
                    /// </signature>
                    // Just wrap the private one
                    this._writeProfilerMark("hide,StartTM");
                    this._hide();
                },

                _hide: function _LegacyAppBar_hide(toPosition) {

                    var toPosition = toPosition || displayModeVisiblePositions[this.closedDisplayMode];
                    var hiding = null;

                    // If were already hidden, we are just going to animate our position, not fire events or manage focus again.
                    if (!_ElementUtilities.hasClass(this._element, _Constants.hiddenClass) && !_ElementUtilities.hasClass(this._element, _Constants.hidingClass)) {
                        hiding = appbarHiddenState;
                    }

                    this._changeVisiblePosition(toPosition, hiding);
                    if (hiding) {
                        // Determine if there are any _LegacyAppBars that are shown.
                        // Set the focus to the next shown _LegacyAppBar.
                        // If there are none, set the focus to the control stored in the cache, which
                        //   is what had focus before the _LegacyAppBars were given focus.
                        var appBars = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                        var areOtherAppBars = false;
                        var areOtherNonStickyAppBars = false;
                        var i;
                        for (i = 0; i < appBars.length; i++) {
                            var appBarControl = appBars[i].winControl;
                            if (appBarControl && appBarControl.opened && (appBarControl !== this)) {
                                areOtherAppBars = true;

                                if (!appBarControl.sticky) {
                                    areOtherNonStickyAppBars = true;
                                    break;
                                }
                            }
                        }

                        var settingsFlyouts = _Global.document.querySelectorAll("." + _Constants.settingsFlyoutClass);
                        var areVisibleSettingsFlyouts = false;
                        for (i = 0; i < settingsFlyouts.length; i++) {
                            var settingsFlyoutControl = settingsFlyouts[i].winControl;
                            if (settingsFlyoutControl && !settingsFlyoutControl.hidden) {
                                areVisibleSettingsFlyouts = true;
                                break;
                            }
                        }

                        if (!areOtherNonStickyAppBars && !areVisibleSettingsFlyouts) {
                            // Hide the click eating div because there are no other _LegacyAppBars showing
                            _Overlay._Overlay._hideClickEatingDivAppBar();
                        }

                        var that = this;
                        if (!areOtherAppBars) {
                            // Set focus to what had focus before showing the _LegacyAppBar
                            if (_Overlay._Overlay._ElementWithFocusPreviousToAppBar &&
                                (!_Global.document.activeElement || _Overlay._Overlay._isAppBarOrChild(_Global.document.activeElement))) {
                                _restorePreviousFocus();
                            }
                            // Always clear the previous focus (to prevent temporary leaking of element)
                            _Overlay._Overlay._ElementWithFocusPreviousToAppBar = null;
                        } else if (_LegacyAppBar._isWithinAppBarOrChild(_Global.document.activeElement, that.element)) {
                            // Set focus to next visible _LegacyAppBar in DOM

                            var foundCurrentAppBar = false;
                            for (i = 0; i <= appBars.length; i++) {
                                if (i === appBars.length) {
                                    i = 0;
                                }

                                var appBar = appBars[i];
                                if (appBar === this.element) {
                                    foundCurrentAppBar = true;
                                } else if (foundCurrentAppBar && appBar.winControl.opened) {
                                    appBar.winControl._keyboardInvoked = !!this._keyboardInvoked;
                                    appBar.winControl._setFocusToAppBar();
                                    break;
                                }
                            }
                        }

                        // Reset these values
                        this._keyboardInvoked = false;
                    }
                },

                _dispose: function _LegacyAppBar_dispose() {
                    _Dispose.disposeSubTree(this.element);
                    this._layoutImpl.dispose();
                    this.disabled = true;
                    this.close();
                },

                _disposeChildren: function _LegacyAppBar_disposeChildren() {
                    // Be purposeful about what we dispose.
                    this._layoutImpl.disposeChildren();
                },

                _isLightDismissible: function _LegacyAppBar_isLightDismissible() {
                    // An _LegacyAppBar is considered light dismissible if there is at least one visible non sticky _LegacyAppBar.
                    return _Overlay._Overlay.prototype._isLightDismissible.call(this) || _isThereVisibleNonStickyBar();
                },

                _handleKeyDown: function _LegacyAppBar_handleKeyDown(event) {
                    // On Left/Right arrow keys, moves focus to previous/next AppbarCommand element.
                    // On "Esc" key press hide flyouts and hide light dismiss _LegacyAppBars.

                    // Esc hides light-dismiss _LegacyAppBars in all layouts but if the user has a text box with an IME
                    // candidate window open, we want to skip the ESC key event since it is handled by the IME.
                    // When the IME handles a key it sets event.keyCode === Key.IME for an easy check.
                    if (event.keyCode === Key.escape && event.keyCode !== Key.IME) {
                        event.preventDefault();
                        event.stopPropagation();
                        this._lightDismiss(true);
                    }

                    // If the current active element isn't an intrinsic part of the _LegacyAppBar,
                    // Layout might want to handle additional keys.
                    if (!this._invokeButton.contains(_Global.document.activeElement)) {
                        this._layoutImpl.handleKeyDown(event);
                    }
                },

                _visiblePixels: {
                    get: function () {
                        // Returns object containing pixel height of each visible position
                        return {
                            hidden: knownVisibleHeights.hidden,
                            minimal: knownVisibleHeights.minimal,
                            compact: Math.max(this._heightWithoutLabels || 0, knownVisibleHeights.compact),
                            // Element can change size as content gets added or removed or if it
                            // experinces style changes. We have to look this up at run time.
                            shown: this._element.offsetHeight,
                        };
                    }
                },

                _visiblePosition: {
                    // Returns string value of our nearest, stationary, visible position.
                    get: function () {
                        // If we're animating into a new posistion, return the position we're animating into.
                        if (this._animating && displayModeVisiblePositions[this._element.winAnimating]) {
                            return this._element.winAnimating;
                        } else {
                            return this._lastPositionVisited;
                        }
                    }
                },

                _visible: {
                    // Returns true if our visible position is not completely hidden, else false.
                    get: function () {
                        return (this._visiblePosition !== displayModeVisiblePositions.none);
                    }
                },

                _changeVisiblePosition: function (toPosition, newState) {
                    /// <signature helpKeyword="WinJS.UI._LegacyAppBar._changeVisiblePosition">
                    /// <summary locid="WinJS.UI._LegacyAppBar._changeVisiblePosition">
                    /// Changes the visible position of the _LegacyAppBar.
                    /// </summary>
                    /// <param name="toPosition" type="String" locid="WinJS.UI._LegacyAppBar._changeVisiblePosition_p:toPosition">
                    /// Name of the visible position we want to move to.
                    /// </param>
                    /// <param name="newState" type="String" locid="WinJS.UI._LegacyAppBar._changeVisiblePosition_p:newState">
                    /// Name of the state we are entering. Values can be "showing", "hiding" or null.
                    /// If the value is null, then we are not changing states, only changing visible position.
                    /// </param>
                    /// </signature>

                    if ((this._visiblePosition === toPosition && !this._keyboardObscured) ||
                        (this.disabled && toPosition !== displayModeVisiblePositions.disabled)) {
                        // If we want to go where we already are, or we're disabled, return false.
                        this._afterPositionChange(null);
                    } else if (this._animating || this._needToHandleShowingKeyboard || this._needToHandleHidingKeyboard) {
                        // Only do one thing at a time. If we are already animating,
                        // or the IHM is animating, schedule this for later.
                        this._doNext = toPosition;
                        this._afterPositionChange(null);
                    } else {
                        // Begin position changing sequence.

                        // Set the animating flag to block any queued position changes until we're done.
                        this._element.winAnimating = toPosition;
                        var performAnimation = this._initializing ? false : true;

                        // Assume we are animating from the last position visited.
                        var fromPosition = this._lastPositionVisited;

                        // We'll need to measure our element to determine how far we need to animate.
                        // Make sure we have accurate dimensions.
                        this._element.style.display = "";

                        // Are we hiding completely, or about to become visible?
                        var hidingCompletely = (toPosition === displayModeVisiblePositions.hidden);

                        if (this._keyboardObscured) {
                            // We're changing position while covered by the IHM.
                            if (hidingCompletely) {
                                // If we're covered by the IHM we already look hidden.
                                // We can skip our animation and just hide.
                                performAnimation = false;
                            } else {
                                // Some portion of the _LegacyAppBar should be visible to users after its position changes.

                                // Un-obscure ourselves and become visible to the user again.
                                // Need to animate to our desired position as if we were coming up from behind the keyboard.
                                fromPosition = displayModeVisiblePositions.hidden;
                            }
                            this._keyboardObscured = false;
                        }

                        // Fire "before" event if we are changing state.
                        if (newState === appbarShownState) {
                            this._beforeShow();
                        } else if (newState === appbarHiddenState) {
                            this._beforeHide();
                        }

                        // Position our element into the correct "end of animation" position,
                        // also accounting for any viewport scrolling or soft keyboard positioning.
                        this._ensurePosition();

                        this._element.style.opacity = 1;
                        this._element.style.visibility = "visible";

                        this._animationPromise = (performAnimation) ? this._animatePositionChange(fromPosition, toPosition) : Promise.wrap();
                        this._animationPromise.then(
                            function () { this._afterPositionChange(toPosition, newState); }.bind(this),
                            function () { this._afterPositionChange(toPosition, newState); }.bind(this)
                        );
                    }
                },

                _afterPositionChange: function _LegacyAppBar_afterPositionChange(newPosition, newState) {
                    // Defines body of work to perform after changing positions.
                    if (this._disposed) {
                        return;
                    }

                    if (newPosition) {

                        // Update closedDisplayMode related CSS classes, which were delayed from the closedDisplayMode setter to avoid affecting the animation
                        if (newPosition === displayModeVisiblePositions.minimal) {
                            _ElementUtilities.addClass(this._element, _Constants.minimalClass);
                            _ElementUtilities.removeClass(this._element, _Constants.compactClass);
                        }

                        if (newPosition === displayModeVisiblePositions.hidden && this.closedDisplayMode === closedDisplayModes.none) {
                            _ElementUtilities.removeClass(this._element, _Constants.minimalClass);
                            _ElementUtilities.removeClass(this._element, _Constants.compactClass);
                        }

                        // Clear animation flag and record having visited this position.
                        this._element.winAnimating = "";
                        this._lastPositionVisited = newPosition;

                        if (this._doNext === this._lastPositionVisited) {
                            this._doNext = "";
                        }

                        if (newPosition === displayModeVisiblePositions.hidden) {
                            // Make sure animation is finished.
                            this._element.style.visibility = "hidden";
                            this._element.style.display = "none";
                        }

                        // Clean up animation transforms.
                        var transformProperty = _BaseUtils._browserStyleEquivalents["transform"].scriptName;
                        this._element.style[transformProperty] = "";

                        // Fire "after" event if we changed state.
                        if (newState === appbarShownState) {
                            this._afterShow();
                        } else if (newState === appbarHiddenState) {
                            this._afterHide();
                        }

                        // If we had something queued, do that
                        Scheduler.schedule(this._checkDoNext, Scheduler.Priority.normal, this, "WinJS.UI._LegacyAppBar._checkDoNext");
                    }

                    this._afterPositionChangeCallBack();
                },

                _afterPositionChangeCallBack: function () {
                    // Leave this blank for unit tests to overwrite.
                },

                _beforeShow: function _LegacyAppBar_beforeShow() {
                    // Each overlay tracks the size of the <HTML> element for triggering light-dismiss in the window resize handler.
                    this._cachedDocumentSize = this._cachedDocumentSize || _Overlay._Overlay._sizeOfDocument();

                    // In case their event 'beforeopen' event listener is going to manipulate commands,
                    // first see if there are any queued command animations we can handle while we're still hidden.
                    if (this._queuedCommandAnimation) {
                        this._showAndHideFast(this._queuedToShow, this._queuedToHide);
                        this._queuedToShow = [];
                        this._queuedToHide = [];
                    }

                    // Make sure everything fits before showing
                    this._layoutImpl.scale();

                    if (this.closedDisplayMode === closedDisplayModes.compact) {
                        this._heightWithoutLabels = this._element.offsetHeight;
                    }

                    _ElementUtilities.removeClass(this._element, _Constants.hiddenClass);
                    _ElementUtilities.addClass(this._element, _Constants.showingClass);

                    // Send our "beforeopen" event
                    this._sendEvent(EVENTS.beforeOpen);
                },

                _afterShow: function _LegacyAppBar_afterShow() {
                    _ElementUtilities.removeClass(this._element, _Constants.showingClass);
                    _ElementUtilities.addClass(this._element, _Constants.shownClass);

                    // Send our "afteropen" event
                    this._sendEvent(EVENTS.afterOpen);
                    this._writeProfilerMark("show,StopTM");
                },

                _beforeHide: function _LegacyAppBar_beforeHide() {

                    _ElementUtilities.removeClass(this._element, _Constants.shownClass);
                    _ElementUtilities.addClass(this._element, _Constants.hidingClass);

                    // Send our "beforeclose" event
                    this._sendEvent(EVENTS.beforeClose);
                },

                _afterHide: function _LegacyAppBar_afterHide() {

                    // In case their 'afterclose' event handler is going to manipulate commands,
                    // first see if there are any queued command animations we can handle now we're hidden.
                    if (this._queuedCommandAnimation) {
                        this._showAndHideFast(this._queuedToShow, this._queuedToHide);
                        this._queuedToShow = [];
                        this._queuedToHide = [];
                    }

                    _ElementUtilities.removeClass(this._element, _Constants.hidingClass);
                    _ElementUtilities.addClass(this._element, _Constants.hiddenClass);

                    // Send our "afterclose" event
                    this._sendEvent(EVENTS.afterClose);
                    this._writeProfilerMark("hide,StopTM");
                },

                _animatePositionChange: function _LegacyAppBar_animatePositionChange(fromPosition, toPosition) {
                    // Determines and executes the proper transition between visible positions

                    var layoutElementsAnimationPromise = this._layoutImpl.positionChanging(fromPosition, toPosition),
                        appBarElementAnimationPromise;

                    // Get values in terms of pixels to perform animation.
                    var beginningVisiblePixelHeight = this._visiblePixels[fromPosition],
                        endingVisiblePixelHeight = this._visiblePixels[toPosition],
                        distance = Math.abs(endingVisiblePixelHeight - beginningVisiblePixelHeight),
                        offsetTop = (this._placement === _Constants.appBarPlacementTop) ? -distance : distance;

                    if ((this._placement === _Constants.appBarPlacementTop) &&
                        ((fromPosition === displayModeVisiblePositions.shown &&
                        toPosition === displayModeVisiblePositions.compact) ||
                        (fromPosition === displayModeVisiblePositions.compact &&
                        toPosition === displayModeVisiblePositions.shown))) {
                        // Command icons remain in the same location on a top appbar
                        // when going from compact > shown or shown > compact.
                        offsetTop = 0;
                    }

                    // Animate
                    if (endingVisiblePixelHeight > beginningVisiblePixelHeight) {
                        var fromOffset = { top: offsetTop + "px", left: "0px" };
                        appBarElementAnimationPromise = Animations.showEdgeUI(this._element, fromOffset, { mechanism: "transition" });
                    } else {
                        var toOffset = { top: offsetTop + "px", left: "0px" };
                        appBarElementAnimationPromise = Animations.hideEdgeUI(this._element, toOffset, { mechanism: "transition" });
                    }

                    return Promise.join([layoutElementsAnimationPromise, appBarElementAnimationPromise]);
                },

                _checkDoNext: function _LegacyAppBar_checkDoNext() {
                    // Do nothing if we're still animating
                    if (this._animating || this._needToHandleShowingKeyboard || this._needToHandleHidingKeyboard || this._disposed) {
                        return;
                    }

                    if (this._doNext === displayModeVisiblePositions.disabled ||
                        this._doNext === displayModeVisiblePositions.hidden ||
                        this._doNext === displayModeVisiblePositions.minimal ||
                        this._doNext === displayModeVisiblePositions.compact) {
                        // Do hide first because animating commands would be easier
                        this._hide(this._doNext);
                        this._doNext = "";
                    } else if (this._queuedCommandAnimation) {
                        // Do queued commands before showing if possible
                        this._showAndHideQueue();
                    } else if (this._doNext === displayModeVisiblePositions.shown) {
                        // Show last so that we don't unnecessarily animate commands
                        this._show();
                        this._doNext = "";
                    }
                },

                // Set focus to the passed in _LegacyAppBar
                _setFocusToAppBar: function _LegacyAppBar_setFocusToAppBar(useSetActive, scroller) {
                    if (!this._focusOnFirstFocusableElement(useSetActive, scroller)) {
                        // No first element, set it to appbar itself
                        _Overlay._Overlay._trySetActive(this._element, scroller);
                    }
                },

                _commandsUpdated: function _LegacyAppBar_commandsUpdated() {
                    // If we are still initializing then we don't have a layout yet so it doesn't need updating.
                    if (!this._initializing) {
                        this._layoutImpl.commandsUpdated();
                        this._layoutImpl.scale();
                    }
                },

                _beginAnimateCommands: function _LegacyAppBar_beginAnimateCommands(showCommands, hideCommands, otherVisibleCommands) {
                    // The parameters are 3 mutually exclusive arrays of win-command elements contained in this Overlay.
                    // 1) showCommands[]: All of the HIDDEN win-command elements that ARE scheduled to show.
                    // 2) hideCommands[]: All of the VISIBLE win-command elements that ARE scheduled to hide.
                    // 3) otherVisibleCommands[]: All VISIBLE win-command elements that ARE NOT scheduled to hide.
                    this._layoutImpl.beginAnimateCommands(showCommands, hideCommands, otherVisibleCommands);
                },

                _endAnimateCommands: function _LegacyAppBar_endAnimateCommands() {
                    this._layoutImpl.endAnimateCommands();
                    this._endAnimateCommandsCallBack();
                },

                _endAnimateCommandsCallBack: function _LegacyAppBar_endAnimateCommandsCallBack() {
                    // Leave this blank for unit tests to overwrite.
                },

                // Get the top offset for top appbars.
                _getTopOfVisualViewport: function _LegacyAppBar_getTopOfVisualViewPort() {
                    return _Overlay._Overlay._keyboardInfo._visibleDocTop;
                },

                // Get the bottom offset for bottom appbars.
                _getAdjustedBottom: function _LegacyAppBar_getAdjustedBottom() {
                    // Need the distance the IHM moved as well.
                    return _Overlay._Overlay._keyboardInfo._visibleDocBottomOffset;
                },

                _showingKeyboard: function _LegacyAppBar_showingKeyboard(event) {
                    // Remember keyboard showing state.
                    this._keyboardObscured = false;
                    this._needToHandleHidingKeyboard = false;

                    // If we're already moved, then ignore the whole thing
                    if (_Overlay._Overlay._keyboardInfo._visible && this._alreadyInPlace()) {
                        return;
                    }

                    this._needToHandleShowingKeyboard = true;
                    // If focus is in the appbar, don't cause scrolling.
                    if (this.opened && this._element.contains(_Global.document.activeElement)) {
                        event.ensuredFocusedElementInView = true;
                    }

                    // Check if appbar moves or if we're ok leaving it obscured instead.
                    if (this._visible && this._placement !== _Constants.appBarPlacementTop && _Overlay._Overlay._isFlyoutVisible()) {
                        // Remember that we're obscured
                        this._keyboardObscured = true;
                    } else {
                        // Don't be obscured, clear _scrollHappened flag to give us inference later on when to re-show ourselves.
                        this._scrollHappened = false;
                    }

                    // Also set timeout regardless, so we can clean up our _keyboardShowing flag.
                    var that = this;
                    _Global.setTimeout(function (e) { that._checkKeyboardTimer(e); }, _Overlay._Overlay._keyboardInfo._animationShowLength + _Overlay._Overlay._scrollTimeout);
                },

                _hidingKeyboard: function _LegacyAppBar_hidingKeyboard() {
                    // We'll either just reveal the current space under the IHM or restore the window height.

                    // We won't be obscured
                    this._keyboardObscured = false;
                    this._needToHandleShowingKeyboard = false;
                    this._needToHandleHidingKeyboard = true;

                    // We'll either just reveal the current space or resize the window
                    if (!_Overlay._Overlay._keyboardInfo._isResized) {
                        // If we're not completely hidden, only fake hiding under keyboard, or already animating,
                        // then snap us to our final position.
                        if (this._visible || this._animating) {
                            // Not resized, update our final position immediately
                            this._checkScrollPosition();
                            this._element.style.display = "";
                        }
                        this._needToHandleHidingKeyboard = false;
                    }
                    // Else resize should clear keyboardHiding.
                },

                _resize: function _LegacyAppBar_resize(event) {
                    // If we're hidden by the keyboard, then hide bottom appbar so it doesn't pop up twice when it scrolls
                    if (this._needToHandleShowingKeyboard) {
                        // Top is allowed to scroll off the top, but we don't want bottom to peek up when
                        // scrolled into view since we'll show it ourselves and don't want a stutter effect.
                        if (this._visible) {
                            if (this._placement !== _Constants.appBarPlacementTop && !this._keyboardObscured) {
                                // If viewport doesn't match window, need to vanish momentarily so it doesn't scroll into view,
                                // however we don't want to toggle the visibility="hidden" hidden flag.
                                this._element.style.display = "none";
                            }
                        }
                        // else if we're top we stay, and if there's a flyout, stay obscured by the keyboard.
                    } else if (this._needToHandleHidingKeyboard) {
                        this._needToHandleHidingKeyboard = false;
                        if (this._visible || this._animating) {
                            // Snap to final position
                            this._checkScrollPosition();
                            this._element.style.display = "";
                        }
                    }

                    // Make sure everything still fits.
                    if (!this._initializing) {
                        this._layoutImpl.resize(event);
                    }
                },

                _checkKeyboardTimer: function _LegacyAppBar_checkKeyboardTimer() {
                    if (!this._scrollHappened) {
                        this._mayEdgeBackIn();
                    }
                },

                _manipulationChanged: function _LegacyAppBar_manipulationChanged(event) {
                    // See if we're at the not manipulating state, and we had a scroll happen,
                    // which is implicitly after the keyboard animated.
                    if (event.currentState === 0 && this._scrollHappened) {
                        this._mayEdgeBackIn();
                    }
                },

                _mayEdgeBackIn: function _LegacyAppBar_mayEdgeBackIn() {
                    // May need to react to IHM being resized event
                    if (this._needToHandleShowingKeyboard) {
                        // If not top appbar or viewport isn't still at top, then need to show again
                        this._needToHandleShowingKeyboard = false;
                        // If obscured (IHM + flyout showing), it's ok to stay obscured.
                        // If bottom we have to move, or if top scrolled off screen.
                        if (!this._keyboardObscured &&
                            (this._placement !== _Constants.appBarPlacementTop || _Overlay._Overlay._keyboardInfo._visibleDocTop !== 0)) {
                            var toPosition = this._visiblePosition;
                            this._lastPositionVisited = displayModeVisiblePositions.hidden;
                            this._changeVisiblePosition(toPosition, false);
                        } else {
                            // Ensure any animations dropped during the showing keyboard are caught up.
                            this._checkDoNext();
                        }
                    }
                    this._scrollHappened = false;
                },

                _ensurePosition: function _LegacyAppBar_ensurePosition() {
                    // Position the _LegacyAppBar element relative to the top or bottom edge of the visible
                    // document, based on the the visible position we think we need to be in.
                    var offSet = this._computePositionOffset();
                    this._element.style.bottom = offSet.bottom;
                    this._element.style.top = offSet.top;

                },

                _computePositionOffset: function _LegacyAppBar_computePositionOffset() {
                    // Calculates and returns top and bottom offsets for the _LegacyAppBar element, relative to the top or bottom edge of the visible
                    // document.
                    var positionOffSet = {};

                    if (this._placement === _Constants.appBarPlacementBottom) {
                        // If the IHM is open, the bottom of the visual viewport may or may not be obscured
                        // Use _getAdjustedBottom to account for the IHM if it is covering the bottom edge.
                        positionOffSet.bottom = this._getAdjustedBottom() + "px";
                        positionOffSet.top = "";
                    } else if (this._placement === _Constants.appBarPlacementTop) {
                        positionOffSet.bottom = "";
                        positionOffSet.top = this._getTopOfVisualViewport() + "px";
                    }

                    return positionOffSet;
                },

                _checkScrollPosition: function _LegacyAppBar_checkScrollPosition() {
                    // If IHM has appeared, then remember we may come in
                    if (this._needToHandleShowingKeyboard) {
                        // Tag that it's OK to edge back in.
                        this._scrollHappened = true;
                        return;
                    }

                    // We only need to update if we're not completely hidden.
                    if (this._visible || this._animating) {
                        this._ensurePosition();
                        // Ensure any animations dropped during the showing keyboard are caught up.
                        this._checkDoNext();
                    }
                },

                _alreadyInPlace: function _LegacyAppBar_alreadyInPlace() {
                    // See if we're already where we're supposed to be.
                    var offSet = this._computePositionOffset();
                    return (offSet.top === this._element.style.top && offSet.bottom === this._element.style.bottom);
                },

                // If there is a shown non-sticky _LegacyAppBar then it sets the firstDiv tabIndex to
                //   the minimum tabIndex found in the _LegacyAppBars and finalDiv to the max found.
                // Otherwise sets their tabIndex to -1 so they are not tab stops.
                _updateFirstAndFinalDiv: function _LegacyAppBar_updateFirstAndFinalDiv() {
                    var appBarFirstDiv = this._element.querySelectorAll("." + _Constants.firstDivClass);
                    appBarFirstDiv = appBarFirstDiv.length >= 1 ? appBarFirstDiv[0] : null;

                    var appBarFinalDiv = this._element.querySelectorAll("." + _Constants.finalDivClass);
                    appBarFinalDiv = appBarFinalDiv.length >= 1 ? appBarFinalDiv[0] : null;

                    // Remove the firstDiv & finalDiv if they are not at the appropriate locations
                    if (appBarFirstDiv && (this._element.children[0] !== appBarFirstDiv)) {
                        appBarFirstDiv.parentNode.removeChild(appBarFirstDiv);
                        appBarFirstDiv = null;
                    }
                    if (appBarFinalDiv && (this._element.children[this._element.children.length - 1] !== appBarFinalDiv)) {
                        appBarFinalDiv.parentNode.removeChild(appBarFinalDiv);
                        appBarFinalDiv = null;
                    }

                    // Create and add the firstDiv & finalDiv if they don't already exist
                    if (!appBarFirstDiv) {
                        // Add a firstDiv that will be the first child of the appBar.
                        // On focus set focus to the last element of the AppBar.
                        appBarFirstDiv = _Global.document.createElement("div");
                        // display: inline is needed so that the div doesn't take up space and cause the page to scroll on focus
                        appBarFirstDiv.style.display = "inline";
                        appBarFirstDiv.className = _Constants.firstDivClass;
                        appBarFirstDiv.tabIndex = -1;
                        appBarFirstDiv.setAttribute("aria-hidden", "true");
                        _ElementUtilities._addEventListener(appBarFirstDiv, "focusin", this._focusOnLastFocusableElementOrThis.bind(this), false);
                        // add to beginning
                        if (this._element.children[0]) {
                            this._element.insertBefore(appBarFirstDiv, this._element.children[0]);
                        } else {
                            this._element.appendChild(appBarFirstDiv);
                        }
                    }
                    if (!appBarFinalDiv) {
                        // Add a finalDiv that will be the last child of the appBar.
                        // On focus set focus to the first element of the AppBar.
                        appBarFinalDiv = _Global.document.createElement("div");
                        // display: inline is needed so that the div doesn't take up space and cause the page to scroll on focus
                        appBarFinalDiv.style.display = "inline";
                        appBarFinalDiv.className = _Constants.finalDivClass;
                        appBarFinalDiv.tabIndex = -1;
                        appBarFinalDiv.setAttribute("aria-hidden", "true");
                        _ElementUtilities._addEventListener(appBarFinalDiv, "focusin", this._focusOnFirstFocusableElementOrThis.bind(this), false);
                        this._element.appendChild(appBarFinalDiv);
                    }


                    // invokeButton should be the second to last element in the _LegacyAppBar's tab order. Second to the finalDiv.
                    if (this._element.children[this._element.children.length - 2] !== this._invokeButton) {
                        this._element.insertBefore(this._invokeButton, appBarFinalDiv);
                    }
                    var elms = this._element.getElementsByTagName("*");
                    var highestTabIndex = _ElementUtilities._getHighestTabIndexInList(elms);
                    this._invokeButton.tabIndex = highestTabIndex;

                    // Update the tabIndex of the firstDiv & finalDiv
                    if (appBarFirstDiv) {
                        appBarFirstDiv.tabIndex = _ElementUtilities._getLowestTabIndexInList(elms);
                    }
                    if (appBarFinalDiv) {
                        appBarFinalDiv.tabIndex = highestTabIndex;
                    }
                },

                _writeProfilerMark: function _LegacyAppBar_writeProfilerMark(text) {
                    _WriteProfilerMark("WinJS.UI._LegacyAppBar:" + this._id + ":" + text);
                }
            }, {
                // Statics
                _Events: EVENTS,

                _appBarsSynchronizationPromise: Promise.as(),

                // Returns true if the element or what had focus before the element (if a Flyout) is either:
                //   1) the appBar or subtree
                //   2) OR in a flyout spawned by the appBar
                // Returns false otherwise.
                _isWithinAppBarOrChild: function (element, appBar) {
                    if (!element || !appBar) {
                        return false;
                    }
                    if (appBar.contains(element)) {
                        return true;
                    }
                    var flyout = _Overlay._Overlay._getParentControlUsingClassName(element, _Constants.flyoutClass);
                    return (flyout && appBar.contains(flyout._previousFocus));
                },

                // Callback for _LegacyAppBar invokeButton and Edgy Event Command
                _toggleAllAppBarsState: function (keyboardInvoked, sourceAppBar) {
                    var bars = _getDynamicBarsForEdgy();

                    var hiding;
                    if (sourceAppBar) {
                        // If the sourceAppBar is shown, hide all _LegacyAppBars, else show all _LegacyAppBars.
                        hiding = _ElementUtilities.hasClass(sourceAppBar._element, _Constants.showingClass) || _ElementUtilities.hasClass(sourceAppBar._element, _Constants.shownClass);
                    } else {
                        // EDGY event behavior. No sourceAppBar specified.
                        // If every _LegacyAppBar is shown, hide them. Otherwise show them all.
                        hiding = bars._shown && !bars._hidden;
                    }

                    if (hiding) {
                        _LegacyAppBar._appBarsSynchronizationPromise = _LegacyAppBar._appBarsSynchronizationPromise.then(function () {
                            return _Overlay._Overlay._hideAppBars(bars, keyboardInvoked);
                        });
                        return "hiding";
                    } else {
                        _LegacyAppBar._appBarsSynchronizationPromise = _LegacyAppBar._appBarsSynchronizationPromise.then(function () {
                            return _Overlay._Overlay._showAppBars(bars, keyboardInvoked);
                        });
                        return "showing";
                    }
                },
            });

            return _LegacyAppBar;
        })
    });
});
