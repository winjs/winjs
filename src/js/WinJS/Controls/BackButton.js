// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// Back Button
define([
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_ErrorFromName',
    '../Core/_Resources',
    '../Navigation',
    '../Utilities/_Control',
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    'require-style!less/controls'
    ], function backButtonInit(_Global, _Base, _ErrorFromName, _Resources, Navigation, _Control, _ElementUtilities, _Hoverable) {
    "use strict";

    var Key = _ElementUtilities.Key;

    // Class Names
    var navigationBackButtonClass = 'win-navigation-backbutton';
    var glyphClass = "win-back";

    // CONSTANTS
    var MOUSE_BACK_BUTTON = 3;

    // Create Singleton for global event registering/unregistering. This Singleton should only be created once.
    // Here the function 'returnBackButtonSingelton' is called immediateley and its result is the singleton object.
    var singleton = (function createBackButtonSingleton() {

        /* Step 1: Build JavaScript closure */

        function hookUpBackButtonGlobalEventHandlers() {
            // Subscribes to global events on the window object
            _Global.addEventListener('keyup', backButtonGlobalKeyUpHandler, false);
            _ElementUtilities._addEventListener(_Global, 'pointerup', backButtonGlobalMSPointerUpHandler, false);
        }

        function unHookBackButtonGlobalEventHandlers() {
            // Unsubscribes from global events on the window object
            _Global.removeEventListener('keyup', backButtonGlobalKeyUpHandler, false);
            _ElementUtilities._removeEventListener(_Global, 'pointerup', backButtonGlobalMSPointerUpHandler, false);
        }

        function backButtonGlobalKeyUpHandler(event) {
            // Navigates back when (alt + left) or BrowserBack keys are released.
            if ((event.keyCode === Key.leftArrow && event.altKey && !event.shiftKey && !event.ctrlKey) || (event.keyCode === Key.browserBack)) {
                Navigation.back();
            }
        }

        function backButtonGlobalMSPointerUpHandler(event) {
            // Responds to clicks to enable navigation using 'back' mouse buttons.
            if (event.button === MOUSE_BACK_BUTTON) {
                Navigation.back();
            }
        }

        // Singleton reference count for registering and unregistering global event handlers.
        var backButtonReferenceCount = 0; //

        /* Step 2: Return Singleton object literal */
        return {
            addRef: function () {
                if (backButtonReferenceCount === 0) {
                    hookUpBackButtonGlobalEventHandlers();
                }
                backButtonReferenceCount++;
            },
            release: function () {
                if (backButtonReferenceCount > 0) { // Ensure count won't become negative.
                    backButtonReferenceCount--;
                    if (backButtonReferenceCount === 0) {
                        unHookBackButtonGlobalEventHandlers();
                    }
                }
            },
            getCount: function () { // Return the value of the reference count. Useful for unit testing.
                return backButtonReferenceCount;
            }
        };
    }()); // Immediate invoke creates and returns the Singleton

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.BackButton">
        /// Provides backwards navigation functionality.
        /// </summary>
        /// <compatibleWith platform="Windows" minVersion="8.1"/>
        /// </field>
        /// <icon src="ui_winjs.ui.backbutton.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.backbutton.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<button data-win-control="WinJS.UI.BackButton"></button>]]></htmlSnippet>
        /// <part name="BackButton" class="win-navigation-backbutton" locid="WinJS.UI.BackButton_part:BackButton">The BackButton control itself</part>
        /// <part name="BackArrowGlyph" class="win-back" locid="WinJS.UI.BackButton_part:BackArrowGlyph">The Back Arrow glyph</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        BackButton: _Base.Namespace._lazy(function () {
            // Statics
            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/backbuttonarialabel").value; },
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get badButtonElement() { return "Invalid argument: For a button, toggle, or flyout command, the element must be null or a button element"; }
            };

            var BackButton = _Base.Class.define(function BackButton_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.BackButton.BackButton">
                /// <summary locid="WinJS.UI.BackButton.constructor">
                /// Creates a new BackButton control
                /// </summary>
                /// <param name="element" domElement="true" locid="WinJS.UI.BackButton.constructor_p:element">
                /// The DOM element that will host the control. If this parameter is null, this constructor creates one for you.
                /// </param>
                /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.MenuBackButtonCommand.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control. Each property of the options object corresponds to
                /// one of the control's properties or events.
                /// </param>
                /// <returns type="WinJS.UI.BackButton" locid="WinJS.UI.BackButton.constructor_returnValue">
                /// A BackButton control.
                /// </returns>
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </signature>

                // Check to make sure we weren't duplicated
                if (element && element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.BackButton.DuplicateConstruction", strings.duplicateConstruction);
                }

                this._element = element || _Global.document.createElement("button");
                options = options || {};

                this._initializeButton(); // This will also set the aria-label and tooltip

                this._disposed = false;

                // Remember ourselves
                this._element.winControl = this;

                _Control.setOptions(this, options);

                // Add event handlers for this back button instance
                this._buttonClickHandler = this._handleBackButtonClick.bind(this);
                this._element.addEventListener('click', this._buttonClickHandler, false);
                this._navigatedHandler = this._handleNavigatedEvent.bind(this);
                Navigation.addEventListener('navigated', this._navigatedHandler, false);

                // Increment reference count / manage add global event handlers
                singleton.addRef();
            }, {

                /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.BackButton.element" helpKeyword="WinJS.UI.BackButton.element">
                /// Gets the DOM element that hosts the BackButton control.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.BackButton.dispose">
                    /// <summary locid="WinJS.UI.BackButton.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true; // Mark this control as disposed.

                    // Remove 'navigated' eventhandler for this BackButton
                    Navigation.removeEventListener('navigated', this._navigatedHandler, false);

                    singleton.release(); // Decrement reference count.

                },

                refresh: function () {
                    /// <signature helpKeyword="WinJS.UI.BackButton.refresh">
                    /// <summary locid="WinJS.UI.BackButton.refresh">
                    /// Sets the 'disabled' attribute to correct the value based on the current navigation history stack.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </signature>
                    if (Navigation.canGoBack) {
                        this._element.disabled = false;
                    } else {
                        this._element.disabled = true;
                    }
                },

                _initializeButton: function () {
                    //Final EN-US HTML should be:
                    //<button class="win-navigation-backbutton" aria-label="Back" title="Back" type="button"><span class="win-back"></span></button>
                    //Button will automatically be disabled if WinJS.Navigation.history.canGoBack is false.

                    // Verify the HTML is a button
                    if (this._element.tagName !== "BUTTON") {
                        throw new _ErrorFromName("WinJS.UI.BackButton.BadButtonElement", strings.badButtonElement);
                    }

                    // Attach our css classes
                    _ElementUtilities.addClass(this._element, navigationBackButtonClass);

                    // Attach disposable class.
                    _ElementUtilities.addClass(this._element, "win-disposable");

                    // Create inner glyph element
                    this._element.innerHTML = '<span class="' + glyphClass + '"></span>';

                    // Set the 'disabled' property to the correct value based on the current navigation history stack.
                    this.refresh();

                    // Set Aria-label and native tooltip to the same localized string equivalent of "Back"
                    this._element.setAttribute("aria-label", strings.ariaLabel);
                    this._element.setAttribute("title", strings.ariaLabel);

                    // Explicitly set type attribute to avoid the default <button> "submit" type.
                    this._element.setAttribute("type", "button");
                },

                _handleNavigatedEvent: function () {
                    // Handles WinJS.Navigation 'navigated' behavior
                    this.refresh();
                },

                _handleBackButtonClick: function () {
                    // Handles BackButton 'click' behavior
                    Navigation.back();
                }

            });
            // Private Static Method.
            BackButton._getReferenceCount = function () {
                return singleton.getCount(); // Expose this for Unit testing.
            };
            _Base.Class.mix(BackButton, _Control.DOMEventMixin);
            return BackButton;
        })
    });

});
