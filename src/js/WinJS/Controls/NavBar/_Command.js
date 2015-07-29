// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define([
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_ErrorFromName',
    '../../Navigation',
    '../../Utilities/_ElementUtilities',
    '../SplitView/Command',
], function NavBarCommandInit(exports, _Global, _Base, _ErrorFromName, Navigation, _ElementUtilities, SplitViewCommand) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
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
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        NavBarCommand: _Base.Namespace._lazy(function () {

            var strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get navBarCommandDeprecated() { return "NavBarCommand is deprecated and may not be available in future releases. If you were using a NavBarCommand inside of a SplitView, use SplitViewCommand instead."; }
            };

            var ClassNames = {
                command: "win-navbarcommand",
                commandButton: "win-navbarcommand-button",
                commandButtonContent: "win-navbarcommand-button-content",
                commandSplitButton: "win-navbarcommand-splitbutton",
                commandSplitButtonOpened: "win-navbarcommand-splitbutton-opened",
                commandIcon: "win-navbarcommand-icon",
                commandLabel: "win-navbarcommand-label"
            };

            var superClass = SplitViewCommand.SplitViewCommand.prototype;

            var NavBarCommand = _Base.Class.derive(SplitViewCommand.SplitViewCommand, function NavBarCommand_ctor(element, options) {
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
                /// <deprecated type="deprecate">
                /// NavBarCommand is deprecated and may not be available in future releases. 
                /// If you were using a NavBarCommand inside of a SplitView, use SplitViewCommand instead.
                /// </deprecated>
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </signature>
                _ElementUtilities._deprecated(strings.navBarCommandDeprecated);

                element = element || _Global.document.createElement("DIV");
                options = options || {};

                if (element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.NavBarCommand.DuplicateConstruction", strings.duplicateConstruction);
                }

                this._baseConstructor(element, options, ClassNames);

            },
            {
                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.NavBarCommand.element" helpKeyword="WinJS.UI.NavBarCommand.element">
                /// Gets the DOM element that hosts the NavBarCommand.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                element: {
                    get: function () {
                        return Object.getOwnPropertyDescriptor(superClass, "element").get.call(this);
                    }
                },
                /// <field type="String" locid="WinJS.UI.NavBarCommand.label" helpKeyword="WinJS.UI.NavBarCommand.label">
                /// Gets or sets the label of the NavBarCommand.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                label: {
                    get: function () {
                        return Object.getOwnPropertyDescriptor(superClass, "label").get.call(this);
                    },
                    set: function (value) {
                        return Object.getOwnPropertyDescriptor(superClass, "label").set.call(this, value);
                    }
                },
                /// <field type="String" locid="WinJS.UI.NavBarCommand.tooltip" helpKeyword="WinJS.UI.NavBarCommand.tooltip">
                /// Gets or sets the tooltip of the NavBarCommand.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                tooltip: {
                    get: function () {
                        return Object.getOwnPropertyDescriptor(superClass, "tooltip").get.call(this);
                    },
                    set: function (value) {
                        return Object.getOwnPropertyDescriptor(superClass, "tooltip").set.call(this, value);
                    }
                },
                /// <field type="String" locid="WinJS.UI.NavBarCommand.icon" helpKeyword="WinJS.UI.NavBarCommand.icon">
                /// Gets or sets the icon of the NavBarCommand. This value is either one of the values of the AppBarIcon enumeration or the path of a custom PNG file.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                icon: {
                    get: function () {
                        return Object.getOwnPropertyDescriptor(superClass, "icon").get.call(this);
                    },
                    set: function (value) {
                        return Object.getOwnPropertyDescriptor(superClass, "icon").set.call(this, value);
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

                /// <field type="Function" locid="WinJS.UI.NavBarCommand.oninvoked" helpKeyword="WinJS.UI.NavBarCommand.oninvoked">
                /// This API supports the Windows Library for JavaScript infrastructure and is not intended to be used directly from your code. 
                /// </field>
                oninvoked: {
                    // Override this this property from our parent class to "un-inherit it".
                    // NavBarCommand uses a private "_invoked" event to communicate with NavBarContainer.
                    // NavBarContainer fires a public "invoked" event when one of its commands has been invoked.
                    get: function () { return undefined; },
                    enumerable: false
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

                dispose: function NavBarCommand_dispose() {
                    /// <signature helpKeyword="WinJS.UI.NavBarCommand.dispose">
                    /// <summary locid="WinJS.UI.NavBarCommand.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </signature>
                    superClass.dispose.call(this);
                },

                _invoke: function NavBarCommand_invoke() {
                    if (this.location) {
                        Navigation.navigate(this.location, this.state);
                    }
                    this._fireEvent(NavBarCommand._EventName._invoked);
                },
            },
            {
                _ClassName: ClassNames,
                _EventName: {
                    _invoked: "_invoked",
                    _splitToggle: "_splittoggle",
                },
            });
            return NavBarCommand;
        })
    });

});