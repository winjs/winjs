// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// AppBarCommand
/// <dictionary>appbar,appbars,Flyout,Flyouts,onclick,Statics</dictionary>
define([
    'exports',
    '../../Core/_Global',
    '../../Core/_WinRT',
    '../../Core/_Base',
    '../../Core/_ErrorFromName',
    '../../Core/_Resources',
    '../../Utilities/_Control',
    '../../Utilities/_Dispose',
    '../../Utilities/_ElementUtilities',
    '../Flyout/_Overlay',
    '../Tooltip',
    './_Constants',
    './_Icon'
    ], function appBarCommandInit(exports, _Global, _WinRT, _Base, _ErrorFromName, _Resources, _Control, _Dispose, _ElementUtilities, _Overlay, Tooltip, _Constants, _Icon) {
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
        /// <part name="appBarCommand" class="win-command" locid="WinJS.UI.AppBarCommand_part:appBarCommand">The AppBarCommand control itself.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        AppBarCommand: _Base.Namespace._lazy(function () {
            var core = _WinRT.Windows.UI.WebUI.Core;

            function _handleClick(event) {
                /*jshint validthis: true */
                var command = this.winControl;
                if (command) {
                    if (command._type === _Constants.typeToggle) {
                        command.selected = !command.selected;
                    }
                    if (command.onclick) {
                        command.onclick(event);
                    }
                }
            }

            // Duplicate code from Overlay static member function.
            function _getParentControlUsingClassName(element, className) {
                while (element && element !== _Global.document.body) {
                    if (_ElementUtilities.hasClass(element, className)) {
                        return element.winControl;
                    }
                    element = element.parentNode;
                }
                return null;
            }

            var strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get badClick() { return "Invalid argument: The onclick property for an {0} must be a function"; },
                get badDivElement() { return "Invalid argument: For a content command, the element must be null or a div element"; },
                get badHrElement() { return "Invalid argument: For a separator, the element must be null or an hr element"; },
                get badButtonElement() { return "Invalid argument: For a button, toggle, or flyout command, the element must be null or a button element"; },
                get cannotChangeHiddenProperty() { return "Unable to set hidden property while parent {0} is visible."; } // Duplicate string getter from overlay
            };

            return _Base.Class.define(function AppBarCommand_ctor(element, options) {
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
                options = options || {};

                // Need a type before we can create our element
                options.type = options.type || _Constants.typeButton;

                options.disabled = options.disabled || false;

                options.section = options.section || _Constants.sectionGlobal;

                // Don't forget to use passed in element if one was provided.
                this._element = element;

                // This will also set the icon & label
                this._createButton();

                _ElementUtilities.addClass(this._element, "win-disposable");

                // Remember ourselves
                this._element.winControl = this;

                // Attach our css class
                _ElementUtilities.addClass(this._element, _Constants.appBarCommandClass);

                if (options.onclick) {
                    this.onclick = options.onclick;
                }

                // Create CommandBarIconButton for the commandBar, forward 'iteminvoked' events to the AppBarCommand element.
                this._commandBarIconButton = new core.WebUICommandBarIconButton();
                this._forwardCommandBarIconButtonClick = this.element.click.bind(this.element);
                this._commandBarIconButton.addEventListener('iteminvoked', this._forwardCommandBarIconButtonClick, false);

                // We want to handle some clicks
                options.onclick = _handleClick;

                _Control.setOptions(this, options);

                if (this._type === _Constants.typeToggle && !options.selected) {
                    this.selected = false;
                }

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
                /// Gets or sets the type of the AppBarCommand. Possible values are "button" and "toggle"
                /// </field>
                type: {
                    get: function () {
                        return (this._commandBarIconButton.isToggleButton ? _Constants.typeToggle : _Constants.typeButton);
                    },
                    set: function (value) {
                        // we allow setting first time only. otherwise we ignore it.
                        if (!this._type) {
                            if (value === _Constants.typeToggle) {
                                this._type = value;
                                this._commandBarIconButton.isToggleButton = true;
                            } else {
                                this._type = _Constants.typeButton;
                                this._commandBarIconButton.isToggleButton = false;
                            }
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.AppBarCommand.label" helpKeyword="WinJS.UI.AppBarCommand.label">
                /// Gets or sets the label of the AppBarCommand.
                /// </field>
                label: {
                    get: function () {
                        return this._commandBarIconButton.label;
                    },
                    set: function (value) {
                        this._commandBarIconButton.label = value;
                        if (this._labelSpan) {
                            this._labelSpan.textContent = value;
                        }
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
                                this._commandBarIconButton.icon = new core.WebUICommandBarSymbolIcon(this._icon);
                            } else {
                                // Must be an image, set that
                                this._imageSpan.textContent = "";
                                this._imageSpan.style.backgroundImage = this._icon;
                                this._imageSpan.style.msHighContrastAdjust = "none";

                                // Parse the image url into a WebUICommandBarButtonBitmapIcon.
                                // Use computed style to get a normalized "url(\"<pathname>\")" string from the DOM. 
                                var imageUrl = _Global.getComputedStyle(this._imageSpan).backgroundImage;
                                // Make sure returned value is a url.
                                if (imageUrl.substring(0, 3) === 'url') {
                                    // Remove "url(" from the string.
                                    imageUrl = imageUrl.split("(")[1];
                                    // Extract <pathname> from inbetween the inner double quotes.
                                    imageUrl = imageUrl.split("\"")[1];

                                    // Create WinRT BitMapIcon
                                    var bmi = new core.WebUICommandBarBitmapIcon();
                                    bmi.uri = new _WinRT.Windows.Foundation.Uri(imageUrl);
                                    this._commandBarIconButton.icon = bmi;
                                }
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

                /// <field type="String" defaultValue="global" oamOptionsDatatype="WinJS.UI.AppBarCommand.section" locid="WinJS.UI.AppBarCommand.section" helpKeyword="WinJS.UI.AppBarCommand.section">
                /// Gets or sets the section that the AppBarCommand is in. Possible values are "selection" and "global".
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

                /// <field type="Boolean" locid="WinJS.UI.AppBarCommand.selected" helpKeyword="WinJS.UI.AppBarCommand.selected">Set or get the selected state of a toggle button.</field>
                selected: {
                    get: function () {
                        //  Keep in-sync with _commandBarIconButton
                        return this._commandBarIconButton.isChecked;
                    },
                    set: function (value) {
                        value = !!value;
                        this._commandBarIconButton.isChecked = value;
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
                        // Use the command bar element to keep in-sync
                        return !this._commandBarIconButton.enabled;
                    },
                    set: function (value) {
                        this._commandBarIconButton.enabled = !value;
                    }
                },

                /// <field type="Boolean" hidden="true" locid="WinJS.UI.AppBarCommand.hidden" helpKeyword="WinJS.UI.AppBarCommand.hidden">
                /// Gets a value that indicates whether the AppBarCommand is hiding or in the process of becoming hidden.
                /// A value of true indicates that the AppBarCommand is hiding or in the process of becoming hidden.
                /// </field>
                hidden: {
                    get: function () {
                        return this._hidden;
                    },
                    set: function (value) {
                        var appbarControl = _getParentControlUsingClassName(this._element, _Constants.appBarClass);
                        if (appbarControl && !appbarControl.hidden) {
                            throw new _ErrorFromName("WinJS.UI.AppBarCommand.CannotChangeHiddenProperty", _Resources._formatString(strings.cannotChangeHiddenProperty, "AppBar"));
                        }

                        // Ensure its a boolean.
                        value = !!value;

                        if (value === this.hidden) {
                            // No changes to make.
                            return;
                        }

                        if (appbarControl) {
                            // AppBar needs to project this change to the commandbar and trigger a check for color updates.
                            // Use AppBar method to set the value of this._hidden instead.
                            value ? appbarControl.hideCommands(this) : appbarControl.showCommands(this);
                        } else {
                            this._hidden = value;
                        }
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
                    this._commandBarIconButton.removeEventListener('iteminvoked', this._forwardCommandBarIconButtonClick, false);
                },

                addEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI.AppBarCommand.addEventListener">
                    /// <summary locid="WinJS.UI.AppBarCommand.addEventListener">
                    /// Registers an event handler for the specified event. 
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.AppBarCommand.addEventListener_p:type">
                    /// Required. The name of the event to register. It must be "beforeshow", "beforehide", "aftershow", or "afterhide".
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
                    ////      <span class="win-commandicon win-commandring"><span class="win-commandimage">&#xE0D5;</span></span><span class="win-label">Command 1</span>
                    //// Or This:
                    ////      <span class="win-commandicon win-commandring"><span class="win-commandimage" style="background-image:url('customimage.png')"></span></span><span class="win-label">Command 1</span>
                    //// </button>
                    this._element.type = "button";
                    this._iconSpan = _Global.document.createElement("span");
                    this._iconSpan.className = "win-commandicon win-commandring";
                    this._element.appendChild(this._iconSpan);
                    this._imageSpan = _Global.document.createElement("span");
                    this._imageSpan.className = "win-commandimage";
                    this._iconSpan.appendChild(this._imageSpan);
                    this._labelSpan = _Global.document.createElement("span");
                    this._labelSpan.className = "win-label";
                    this._element.appendChild(this._labelSpan);
                    // 'win-global' or 'win-selection' are added later by caller.
                    // Label and icon are added later by caller.
                },

                _setSection: function AppBarCommand_setSection(section) {
                    if (!section) {
                        section = _Constants.sectionGlobal;
                    }
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
            });
        })
    });

});
