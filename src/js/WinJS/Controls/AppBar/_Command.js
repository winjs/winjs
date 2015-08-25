// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// AppBarCommand
/// <dictionary>appbar,appbars,Flyout,Flyouts,onclick,Statics</dictionary>
define([
    'exports',
    '../../Core/_Global',
    '../../Core/_WinRT',
    '../../Core/_Base',
    "../../Core/_BaseUtils",
    '../../Core/_ErrorFromName',
    "../../Core/_Events",
    '../../Core/_Resources',
    '../../Utilities/_Control',
    '../../Utilities/_Dispose',
    '../../Utilities/_ElementUtilities',
    '../Flyout/_Overlay',
    '../Tooltip',
    '../_LegacyAppBar/_Constants',
    './_Icon'
], function appBarCommandInit(exports, _Global, _WinRT, _Base, _BaseUtils, _ErrorFromName, _Events, _Resources, _Control, _Dispose, _ElementUtilities, _Overlay, Tooltip, _Constants, _Icon) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.AppBarCommand">
        /// Represents a command to display in an AppBar.
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.appbarcommand.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.appbarcommand.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{type:'button',label:'Button'}"></button>]]></htmlSnippet>
        /// <event name="commandvisibilitychanged" locid="WinJS.UI.AppBarCommand_e:commandvisibilitychanged">Raised after the hidden property has been programmatically changed.</event>
        /// <part name="appBarCommand" class="win-command" locid="WinJS.UI.AppBarCommand_part:appBarCommand">The AppBarCommand control itself.</part>
        /// <part name="appBarCommandIcon" class="win-commandicon" locid="WinJS.UI.AppBarCommand_part:appBarCommandIcon">The AppBarCommand's icon box.</part>
        /// <part name="appBarCommandImage" class="win-commandimage" locid="WinJS.UI.AppBarCommand_part:appBarCommandImage">The AppBarCommand's icon's image formatting.</part>
        /// <part name="appBarCommandLabel" class="win-label" locid="WinJS.UI.AppBarCommand_part:appBarCommandLabel">The AppBarCommand's label</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        AppBarCommand: _Base.Namespace._lazy(function () {

            function _handleClick(event) {
                /*jshint validthis: true */
                var command = this.winControl;
                if (command) {
                    if (command._type === _Constants.typeToggle) {
                        command.selected = !command.selected;
                    } else if (command._type === _Constants.typeFlyout && command._flyout) {
                        var flyout = command._flyout;
                        // Flyout may not have processAll'd, so this may be a DOM object
                        if (typeof flyout === "string") {
                            flyout = _Global.document.getElementById(flyout);
                        }
                        if (!flyout.show) {
                            flyout = flyout.winControl;
                        }
                        if (flyout && flyout.show) {
                            flyout.show(this, "autovertical");
                        }
                    }
                    if (command.onclick) {
                        command.onclick(event);
                    }
                }
            }

            // Used by AppBarCommands to notify listeners that a property has changed.
            var PropertyMutations = _Base.Class.define(function PropertyMutations_ctor() {
                this._observer = _BaseUtils._merge({}, _Events.eventMixin);
            }, {
                bind: function (callback) {
                    this._observer.addEventListener(_Constants.commandPropertyMutated, callback);
                },
                unbind: function (callback) {
                    this._observer.removeEventListener(_Constants.commandPropertyMutated, callback);
                },
                dispatchEvent: function (type, detail) {
                    this._observer.dispatchEvent(type, detail);
                },
            });

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/appBarCommandAriaLabel").value; },
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get badClick() { return "Invalid argument: The onclick property for an {0} must be a function"; },
                get badDivElement() { return "Invalid argument: For a content command, the element must be null or a div element"; },
                get badHrElement() { return "Invalid argument: For a separator, the element must be null or an hr element"; },
                get badButtonElement() { return "Invalid argument: For a button, toggle, or flyout command, the element must be null or a button element"; },
                get badPriority() { return "Invalid argument: the priority of an {0} must be a non-negative integer"; }
            };

            var AppBarCommand = _Base.Class.define(function AppBarCommand_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.AppBarCommand.AppBarCommand">
                /// <summary locid="WinJS.UI.AppBarCommand.constructor">
                /// Creates a new AppBarCommand control.
                /// </summary>
                /// <param name="element" domElement="true" locid="WinJS.UI.AppBarCommand.constructor_p:element">
                /// The DOM element that will host the control. AppBarCommand will create one if null.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.AppBarCommand.constructor_p:options">
                /// The set of properties and values to apply to the new AppBarCommand.
                /// </param>
                /// <returns type="WinJS.UI.AppBarCommand" locid="WinJS.UI.AppBarCommand.constructor_returnValue">
                /// The new AppBarCommand control.
                /// </returns>
                /// </signature>

                // Check to make sure we weren't duplicated
                if (element && element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.AppBarCommand.DuplicateConstruction", strings.duplicateConstruction);
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

                options.section = options.section || _Constants.sectionPrimary;

                // Go ahead and create it, separator and content types look different than buttons
                // Don't forget to use passed in element if one was provided.
                this._element = element;

                if (options.type === _Constants.typeContent) {
                    this._createContent();
                } else if (options.type === _Constants.typeSeparator) {
                    this._createSeparator();
                } else {
                    // This will also set the icon & label
                    this._createButton();
                }
                _ElementUtilities.addClass(this._element, "win-disposable");

                // Remember ourselves
                this._element.winControl = this;

                // Attach our css class
                _ElementUtilities.addClass(this._element, _Constants.appBarCommandClass);

                if (options.onclick) {
                    this.onclick = options.onclick;
                }
                // We want to handle some clicks
                options.onclick = _handleClick;

                _Control.setOptions(this, options);

                if (this._type === _Constants.typeToggle && !options.selected) {
                    this.selected = false;
                }

                // Set up pointerdown handler and clean up ARIA if needed
                if (this._type !== _Constants.typeSeparator) {

                    // Make sure we have an ARIA role
                    var role = this._element.getAttribute("role");
                    if (role === null || role === "" || role === undefined) {
                        if (this._type === _Constants.typeToggle) {
                            role = "checkbox";
                        } else if (this._type === _Constants.typeContent) {
                            role = "group";
                        } else {
                            role = "menuitem";
                        }
                        this._element.setAttribute("role", role);
                        if (this._type === _Constants.typeFlyout) {
                            this._element.setAttribute("aria-haspopup", true);
                        }
                    }
                    // Label should've been set by label, but if it was missed for some reason:
                    var label = this._element.getAttribute("aria-label");
                    if (label === null || label === "" || label === undefined) {
                        this._element.setAttribute("aria-label", strings.ariaLabel);
                    }
                }

                this._propertyMutations = new PropertyMutations();
                var that = this;
                ObservablePropertyWhiteList.forEach(function (propertyName) {
                    makeObservable(that, propertyName);
                });
            }, {
                /// <field type="String" locid="WinJS.UI.AppBarCommand.id" helpKeyword="WinJS.UI.AppBarCommand.id" isAdvanced="true">
                /// Gets or sets the ID of the AppBarCommand.
                /// </field>
                id: {
                    get: function () {
                        return this._element.id;
                    },

                    set: function (value) {
                        // we allow setting first time only. otherwise we ignore it.
                        if (value && !this._element.id) {
                            this._element.id = value;
                        }
                    }
                },

                /// <field type="String" defaultValue="button" readonly="true" oamOptionsDatatype="WinJS.UI.AppBarCommand.type" locid="WinJS.UI.AppBarCommand.type" helpKeyword="WinJS.UI.AppBarCommand.type" isAdvanced="true">
                /// Gets or sets the type of the AppBarCommand. Possible values are "button", "toggle", "flyout", "content" or "separator".
                /// </field>
                type: {
                    get: function () {
                        return this._type;
                    },
                    set: function (value) {
                        // we allow setting first time only. otherwise we ignore it.
                        if (!this._type) {
                            if (value !== _Constants.typeContent && value !== _Constants.typeFlyout && value !== _Constants.typeToggle && value !== _Constants.typeSeparator) {
                                this._type = _Constants.typeButton;
                            } else {
                                this._type = value;
                            }
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.AppBarCommand.label" helpKeyword="WinJS.UI.AppBarCommand.label">
                /// Gets or sets the label of the AppBarCommand.
                /// </field>
                label: {
                    get: function () {
                        return this._label;
                    },
                    set: function (value) {
                        this._label = value;
                        if (this._labelSpan) {
                            this._labelSpan.textContent = this.label;
                        }

                        // Ensure that we have a tooltip, by updating already-constructed tooltips.  Separators won't have these:
                        if (!this.tooltip && this._tooltipControl) {
                            this._tooltip = this.label;
                            this._tooltipControl.innerHTML = this.label;
                        }

                        // Update aria-label
                        this._element.setAttribute("aria-label", this.label);

                        // Check if we need to suppress the tooltip
                        this._testIdenticalTooltip();
                    }
                },

                /// <field type="String" locid="WinJS.UI.AppBarCommand.icon" helpKeyword="WinJS.UI.AppBarCommand.icon">
                /// Gets or sets the icon of the AppBarCommand.
                /// </field>
                icon: {
                    get: function () {
                        return this._icon;
                    },
                    set: function (value) {

                        this._icon = _Icon[value] || value;

                        if (this._imageSpan) {
                            // If the icon's a single character, presume a glyph
                            if (this._icon && this._icon.length === 1) {
                                // Set the glyph
                                this._imageSpan.textContent = this._icon;
                                this._imageSpan.style.backgroundImage = "";
                                this._imageSpan.style.msHighContrastAdjust = "";
                                _ElementUtilities.addClass(this._imageSpan, "win-commandglyph");
                            } else {
                                // Must be an image, set that
                                this._imageSpan.textContent = "";
                                this._imageSpan.style.backgroundImage = this._icon;
                                this._imageSpan.style.msHighContrastAdjust = "none";
                                _ElementUtilities.removeClass(this._imageSpan, "win-commandglyph");
                            }
                        }
                    }
                },

                /// <field type="Function" locid="WinJS.UI.AppBarCommand.onclick" helpKeyword="WinJS.UI.AppBarCommand.onclick">
                /// Gets or sets the function to invoke when the command is clicked.
                /// </field>
                onclick: {
                    get: function () {
                        return this._onclick;
                    },
                    set: function (value) {
                        if (value && typeof value !== "function") {
                            throw new _ErrorFromName("WinJS.UI.AppBarCommand.BadClick", _Resources._formatString(strings.badClick, "AppBarCommand"));
                        }
                        this._onclick = value;
                    }
                },

                /// <field type="Number" locid="WinJS.UI.AppBarCommand.priority" helpKeyword="WinJS.UI.AppBarCommand.priority">
                /// Gets or sets the priority of the command
                /// </field>
                priority: {
                    get: function () {
                        return this._priority;
                    },
                    set: function (value) {
                        if (value === undefined || (typeof value === "number" && value >= 0)) {
                            this._priority = value;
                        } else {
                            throw new _ErrorFromName("WinJS.UI.AppBarCommand.BadPriority", _Resources._formatString(strings.badPriority, "AppBarCommand"));
                        }

                    }
                },

                /// <field type="Object" locid="WinJS.UI.AppBarCommand.flyout" helpKeyword="WinJS.UI.AppBarCommand.flyout">
                /// For flyout-type AppBarCommands, this property returns the WinJS.UI.Flyout that this command invokes.
                /// When setting this property, you may also use the String ID of the flyout to invoke, the DOM object
                /// for the flyout, or the WinJS.UI.Flyout object itself.
                /// If the value is set to the String ID of the flyout to invoke, or the DOM object for the flyout, but this
                /// has not been processed yet, the getter will return the DOM object until it is processed, and
                /// subsequently return a flyout.
                /// </field>
                flyout: {
                    get: function () {
                        // Resolve it to the flyout
                        var flyout = this._flyout;
                        if (typeof flyout === "string") {
                            flyout = _Global.document.getElementById(flyout);
                        }
                        // If it doesn't have a .element, then we need to getControl on it
                        if (flyout && !flyout.element && flyout.winControl) {
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

                        // Remember it
                        this._flyout = value;
                    }
                },

                /// <field type="String" defaultValue="global" oamOptionsDatatype="WinJS.UI.AppBarCommand.section" locid="WinJS.UI.AppBarCommand.section" helpKeyword="WinJS.UI.AppBarCommand.section">
                /// Gets or sets the section that the AppBarCommand is in. Possible values are "secondary" and "primary".
                /// </field>
                section: {
                    get: function () {
                        return this._section;
                    },
                    set: function (value) {
                        // we allow settings section only one time
                        if (!this._section || _WinRT.Windows.ApplicationModel.DesignMode.designModeEnabled) {
                            this._setSection(value);
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.AppBarCommand.tooltip" helpKeyword="WinJS.UI.AppBarCommand.tooltip">Gets or sets the tooltip text of the AppBarCommand.</field>
                tooltip: {
                    get: function () {
                        return this._tooltip;
                    },
                    set: function (value) {
                        this._tooltip = value;

                        // Update already-constructed tooltips. Separators and content commands won't have these:
                        if (this._tooltipControl) {
                            this._tooltipControl.innerHTML = this._tooltip;
                        }

                        // Check if we need to suppress the tooltip
                        this._testIdenticalTooltip();
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.AppBarCommand.selected" helpKeyword="WinJS.UI.AppBarCommand.selected">Set or get the selected state of a toggle button.</field>
                selected: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return this._element.getAttribute("aria-checked") === "true";
                    },
                    set: function (value) {
                        this._element.setAttribute("aria-checked", value);
                    }
                },

                /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.AppBarCommand.element" helpKeyword="WinJS.UI.AppBarCommand.element">
                /// The DOM element that hosts the AppBarCommad.
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.AppBarCommand.disabled" helpKeyword="WinJS.UI.AppBarCommand.disabled">
                /// Gets or sets a value that indicates whether the AppBarCommand is disabled. A value of true disables the AppBarCommand, and a value of false enables it.
                /// </field>
                disabled: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return !!this._element.disabled;
                    },
                    set: function (value) {
                        this._element.disabled = value;
                    }
                },

                /// <field type="Boolean" hidden="true" locid="WinJS.UI.AppBarCommand.hidden" helpKeyword="WinJS.UI.AppBarCommand.hidden">
                /// Gets a value that indicates whether the AppBarCommand is hiding or in the process of becoming hidden.
                /// A value of true indicates that the AppBarCommand is hiding or in the process of becoming hidden.
                /// </field>
                hidden: {
                    get: function () {
                        return _ElementUtilities.hasClass(this._element, _Constants.commandHiddenClass);
                    },
                    set: function (value) {
                        if (value === this.hidden) {
                            // No changes to make.
                            return;
                        }

                        var wasHidden = this.hidden;

                        if (value) {
                            _ElementUtilities.addClass(this._element, _Constants.commandHiddenClass);
                        } else {
                            _ElementUtilities.removeClass(this._element, _Constants.commandHiddenClass);
                        }

                        if (!this._sendEvent(_Constants.commandVisibilityChanged)) {
                            if (wasHidden) {
                                _ElementUtilities.addClass(this._element, _Constants.commandHiddenClass);
                            } else {
                                _ElementUtilities.removeClass(this._element, _Constants.commandHiddenClass);
                            }
                        }
                    }
                },

                /// <field type="HTMLElement" domElement="true" locid="WinJS.UI.AppBarCommand.firstElementFocus" helpKeyword="WinJS.UI.AppBarCommand.firstElementFocus">
                /// Gets or sets the HTMLElement within a "content" type AppBarCommand that should receive focus whenever focus moves via Home or the arrow keys,
                /// from the previous AppBarCommand to the this AppBarCommand. Returns the AppBarCommand object's host element by default.
                /// </field>
                firstElementFocus: {
                    get: function () {
                        return this._firstElementFocus || this._lastElementFocus || this._element;
                    },
                    set: function (element) {
                        // Arguments of null and this.element should treated the same to ensure that this.element is never a tabstop when either focus property has been set.
                        this._firstElementFocus = (element === this.element) ? null : element;
                        this._updateTabStop();
                    }
                },

                /// <field type="HTMLElement" domElement="true" locid="WinJS.UI.AppBarCommand.lastElementFocus" helpKeyword="WinJS.UI.AppBarCommand.lastElementFocus">
                /// Gets or sets the HTMLElement within a "content" type AppBarCommand that should receive focus whenever focus would move, via End or arrow keys,
                /// from the next AppBarCommand to this AppBarCommand. Returns this AppBarCommand object's host element by default.
                /// </field>
                lastElementFocus: {
                    get: function () {
                        return this._lastElementFocus || this._firstElementFocus || this._element;
                    },
                    set: function (element) {
                        // Arguments of null and this.element should treated the same to ensure that this.element is never a tabstop when either focus property has been set.
                        this._lastElementFocus = (element === this.element) ? null : element;
                        this._updateTabStop();
                    }
                },

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.AppBarCommand.dispose">
                    /// <summary locid="WinJS.UI.AppBarCommand.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;

                    if (this._tooltipControl) {
                        this._tooltipControl.dispose();
                    }

                    if (this._type === _Constants.typeContent) {
                        _Dispose.disposeSubTree(this.element);
                    }
                },

                addEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI.AppBarCommand.addEventListener">
                    /// <summary locid="WinJS.UI.AppBarCommand.addEventListener">
                    /// Registers an event handler for the specified event.
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.AppBarCommand.addEventListener_p:type">
                    /// Required. The name of the event to register.
                    /// </param>
                    /// <param name="listener" type="Function" locid="WinJS.UI.AppBarCommand.addEventListener_p:listener">Required. The event handler function to associate with this event.</param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI.AppBarCommand.addEventListener_p:useCapture">
                    /// Optional. Set to true to register the event handler for the capturing phase; otherwise, set to false to register the event handler for the bubbling phase.
                    /// </param>
                    /// </signature>
                    return this._element.addEventListener(type, listener, useCapture);
                },

                removeEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI.AppBarCommand.removeEventListener">
                    /// <summary locid="WinJS.UI.AppBarCommand.removeEventListener">
                    /// Removes an event handler that the addEventListener method registered.
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.AppBarCommand.removeEventListener_p:type">Required. The name of the event to remove.</param>
                    /// <param name="listener" type="Function" locid="WinJS.UI.AppBarCommand.removeEventListener_p:listener">Required. The event handler function to remove.</param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI.AppBarCommand.removeEventListener_p:useCapture">
                    /// Optional. Set to true to remove the capturing phase event handler; otherwise, set to false to remove the bubbling phase event handler.
                    /// </param>
                    /// </signature>
                    return this._element.removeEventListener(type, listener, useCapture);
                },

                /// <field type="String" locid="WinJS.UI.AppBarCommand.extraClass" helpKeyword="WinJS.UI.AppBarCommand.extraClass" isAdvanced="true">Adds an extra CSS class during construction.</field>
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

                // Private
                _testIdenticalTooltip: function AppBarCommand_testIdenticalToolTip() {
                    this._hideIfFullSize = (this._label === this._tooltip);
                },

                _createContent: function AppBarCommand_createContent() {
                    // Make sure there's an element
                    if (!this._element) {
                        this._element = _Global.document.createElement("div");
                    } else {
                        // Verify the element was a div
                        if (this._element.tagName !== "DIV") {
                            throw new _ErrorFromName("WinJS.UI.AppBarCommand.BadDivElement", strings.badDivElement);
                        }
                    }

                    // If a tabIndex isnt set, default to 0;
                    if (parseInt(this._element.getAttribute("tabIndex"), 10) !== this._element.tabIndex) {
                        this._element.tabIndex = 0;
                    }
                },

                _createSeparator: function AppBarCommand_createSeparator() {
                    // Make sure there's an element
                    if (!this._element) {
                        this._element = _Global.document.createElement("hr");
                    } else {
                        // Verify the element was an hr
                        if (this._element.tagName !== "HR") {
                            throw new _ErrorFromName("WinJS.UI.AppBarCommand.BadHrElement", strings.badHrElement);
                        }
                    }
                },

                _createButton: function AppBarCommand_createButton() {
                    // Make sure there's an element
                    if (!this._element) {
                        this._element = _Global.document.createElement("button");
                    } else {
                        // Verify the element was a button
                        if (this._element.tagName !== "BUTTON") {
                            throw new _ErrorFromName("WinJS.UI.AppBarCommand.BadButtonElement", strings.badButtonElement);
                        }
                        // Make sure it has a type="button"
                        var type = this._element.getAttribute("type");
                        if (type === null || type === "" || type === undefined) {
                            this._element.setAttribute("type", "button");
                        }
                        this._element.innerHTML = "";
                    }

                    // AppBarCommand buttons need to look like this:
                    //// <button type="button" onclick="" class="win-command win-global">
                    ////      <span class="win-commandicon"><span class="win-commandimage">&#xE0D5;</span></span><span class="win-label">Command 1</span>
                    //// Or This:
                    ////      <span class="win-commandicon"><span class="win-commandimage" style="background-image:url('customimage.png')"></span></span><span class="win-label">Command 1</span>
                    //// </button>
                    this._element.type = "button";
                    this._iconSpan = _Global.document.createElement("span");
                    this._iconSpan.setAttribute("aria-hidden", "true");
                    this._iconSpan.className = "win-commandicon";
                    this._iconSpan.tabIndex = -1;
                    this._element.appendChild(this._iconSpan);
                    this._imageSpan = _Global.document.createElement("span");
                    this._imageSpan.setAttribute("aria-hidden", "true");
                    this._imageSpan.className = "win-commandimage";
                    this._imageSpan.tabIndex = -1;
                    this._iconSpan.appendChild(this._imageSpan);
                    this._labelSpan = _Global.document.createElement("span");
                    this._labelSpan.setAttribute("aria-hidden", "true");
                    this._labelSpan.className = "win-label";
                    this._labelSpan.tabIndex = -1;
                    this._element.appendChild(this._labelSpan);
                    // 'win-global' or 'win-selection' are added later by caller.
                    // Label and icon are added later by caller.

                    // Attach a tooltip - Note: we're going to stomp on it's setControl so we don't have to make another DOM element to hang it off of.
                    // This private _tooltipControl attribute is used by other pieces, changing the name could break them.
                    this._tooltipControl = new Tooltip.Tooltip(this._element);
                    var that = this;
                    this._tooltipControl.addEventListener("beforeopen", function () {
                        if (that._hideIfFullSize && !_Overlay._Overlay._getParentControlUsingClassName(that._element.parentElement, _Constants.reducedClass)) {
                            that._tooltipControl.close();
                        }
                    }, false);
                },

                _setSection: function AppBarCommand_setSection(section) {
                    if (!section) {
                        section = _Constants.sectionPrimary;
                    }

                    // _Constants.sectionSelection and _Constants.sectionGlobal are deprecated, so we will continue
                    //  adding/removing its corresponding CSS class for app compat.
                    // _Constants.sectionPrimary and _Constants.sectionSecondary no longer apply CSS classes to the
                    // commands.

                    if (this._section) {
                        // Remove the old section class
                        if (this._section === _Constants.sectionGlobal) {
                            _ElementUtilities.removeClass(this._element, _Constants.appBarCommandGlobalClass);
                        } else if (this.section === _Constants.sectionSelection) {
                            _ElementUtilities.removeClass(this._element, _Constants.appBarCommandSelectionClass);
                        }
                    }
                    // Add the new section class
                    this._section = section;
                    if (section === _Constants.sectionGlobal) {
                        _ElementUtilities.addClass(this._element, _Constants.appBarCommandGlobalClass);
                    } else if (section === _Constants.sectionSelection) {
                        _ElementUtilities.addClass(this._element, _Constants.appBarCommandSelectionClass);
                    }
                },

                _updateTabStop: function AppBarCommand_updateTabStop() {
                    // Whenever the firstElementFocus or lastElementFocus properties are set for content type AppBarCommands,
                    // the containing command element is no longer a tabstop.

                    if (this._firstElementFocus || this._lastElementFocus) {
                        this.element.tabIndex = -1;
                    } else {
                        this.element.tabIndex = 0;
                    }
                },

                _isFocusable: function AppBarCommand_isFocusable() {
                    return (!this.hidden && this._type !== _Constants.typeSeparator && !this.element.disabled &&
                        (this.firstElementFocus.tabIndex >= 0 || this.lastElementFocus.tabIndex >= 0));
                },

                _sendEvent: function AppBarCommand_sendEvent(eventName, detail) {
                    if (this._disposed) {
                        return;
                    }
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent(eventName, true, true, (detail || {}));
                    return this._element.dispatchEvent(event);
                },
            });


            // The list of AppBarCommand properties that we care about firing an event 
            // for, whenever they are changed after initial construction.
            var ObservablePropertyWhiteList = [
                "label",
                "disabled",
                "flyout",
                "extraClass",
                "selected",
                "onclick",
                "hidden",
            ];

            function makeObservable(command, propertyName) {
                // Make a pre-existing AppBarCommand property observable by firing the "_commandpropertymutated"
                // event whenever its value changes.

                // Preserve initial value in JS closure variable
                var _value = command[propertyName];

                // Preserve original getter/setter if they exist, else use inline proxy functions.
                var proto = command.constructor.prototype;
                var originalDesc = getPropertyDescriptor(proto, propertyName) || {};
                var getter = originalDesc.get.bind(command) || function getterProxy() {
                    return _value;
                };
                var setter = originalDesc.set.bind(command) || function setterProxy(value) {
                    _value = value;
                };

                // Define new observable Get/Set for propertyName on the command instance
                Object.defineProperty(command, propertyName, {
                    get: function observable_get() {
                        return getter();
                    },
                    set: function observable_set(value) {

                        var oldValue = getter();

                        // Process value through the original setter & getter before deciding to send an event.
                        setter(value);
                        var newValue = getter();
                        if (!this._disposed && oldValue !== value && oldValue !== newValue && !command._disposed) {

                            command._propertyMutations.dispatchEvent(
                                _Constants.commandPropertyMutated,
                                {
                                    command: command,
                                    propertyName: propertyName,
                                    oldValue: oldValue,
                                    newValue: newValue,
                                });
                        }
                    }
                });
            }

            function getPropertyDescriptor(obj, propertyName) {
                // Returns a matching property descriptor, or null, 
                // if no matching descriptor is found.
                var desc = null;
                while (obj && !desc) {
                    desc = Object.getOwnPropertyDescriptor(obj, propertyName);
                    obj = Object.getPrototypeOf(obj);
                    // Walk obj's prototype chain until we find a match.
                }
                return desc;
            }

            return AppBarCommand;
        })
    });

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        Command: _Base.Namespace._lazy(function () { return exports.AppBarCommand; })
    });
});
