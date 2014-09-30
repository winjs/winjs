// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    '../Core/_Global',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Resources',
    './AutoSuggestBox',
    '../Utilities/_Control',
    '../Utilities/_ElementUtilities',
    './AutoSuggestBox/_SearchSuggestionManagerShim',
    '../Application',
    'require-style!less/controls'
], function searchboxInit(_Global, _WinRT, _Base, _ErrorFromName, _Events, _Resources, AutoSuggestBox, _Control, _ElementUtilities, _SuggestionManagerShim, Application) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.SearchBox">
        /// Enables the user to perform search queries and select suggestions.
        /// </summary>
        /// <compatibleWith platform="Windows" minVersion="8.1"/>
        /// </field>
        /// <icon src="ui_winjs.ui.search.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.search.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<div data-win-control="WinJS.UI.SearchBox"></div>]]></htmlSnippet>
        /// <event name="receivingfocusonkeyboardinput" bubbles="true" locid="WinJS.UI.SearchBox_e:receivingfocusonkeyboardinput">
        /// Raised when the app automatically redirects focus to the search box. This event can only be raised when the focusOnKeyboardInput property is set to true.
        /// </event>
        /// <part name="searchbox" class="win-searchbox" locid="WinJS.UI.SearchBox:search">Styles the entire Search box control.</part>
        /// <part name="searchbox-input" class="win-searchbox-input" locid="WinJS.UI.SearchBox_part:Input">Styles the query input box.</part>
        /// <part name="searchbox-button" class="win-searchbox-button" locid="WinJS.UI.SearchBox_part:Button">Styles the search button.</part>
        /// <part name="searchbox-flyout" class="win-searchbox-flyout" locid="WinJS.UI.SearchBox_part:Flyout">Styles the result suggestions flyout.</part>
        /// <part name="searchbox-suggestion-result" class="win-searchbox-suggestion-result" locid="WinJS.UI.SearchBox_part:Suggestion_Result">Styles the result type suggestion.</part>
        /// <part name="searchbox-suggestion-query" class="win-searchbox-suggestion-query" locid="WinJS.UI.SearchBox_part:Suggestion_Query">Styles the query type suggestion.</part>
        /// <part name="searchbox-suggestion-separator" class="win-searchbox-suggestion-separator" locid="WinJS.UI.SearchBox_part:Suggestion_Separator">
        /// Styles the separator type suggestion.
        /// </part>
        /// <part name="searchbox-suggestion-selected" class="win-searchbox-suggestion-selected" locid="WinJS.UI.SearchBox_part:Suggestion_Selected">
        /// Styles the currently selected suggestion.
        /// </part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        SearchBox: _Base.Namespace._lazy(function () {

            // Enums
            var ClassName = {
                searchBox: "win-searchbox",
                searchBoxInput: "win-searchbox-input",
                searchBoxButton: "win-searchbox-button",
                searchBoxFlyout: "win-searchbox-flyout",
                searchBoxSuggestionResult: "win-searchbox-suggestion-result",
                searchBoxSuggestionQuery: "win-searchbox-suggestion-query",
                searchBoxSuggestionSeparator: "win-searchbox-suggestion-separator",
                searchBoxButtonInputFocus: "win-searchbox-button-input-focus",
            };

            var EventName = {
                receivingfocusonkeyboardinput: "receivingfocusonkeyboardinput"
            };

            var strings = {
                get invalidSearchBoxSuggestionKind() { return "Error: Invalid search suggestion kind."; },
                get ariaLabel() { return _Resources._getWinJSString("ui/searchBoxAriaLabel").value; },
                get ariaLabelInputNoPlaceHolder() { return _Resources._getWinJSString("ui/searchBoxAriaLabelInputNoPlaceHolder").value; },
                get ariaLabelInputPlaceHolder() { return _Resources._getWinJSString("ui/searchBoxAriaLabelInputPlaceHolder").value; },
            };

            var SearchBox = _Base.Class.derive(AutoSuggestBox.AutoSuggestBox, function SearchBox_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.SearchBox.SearchBox">
                /// <summary locid="WinJS.UI.SearchBox.constructor">
                /// Creates a new SearchBox.
                /// </summary>
                /// <param name="element" domElement="true" locid="WinJS.UI.SearchBox.constructor_p:element">
                /// The DOM element that hosts the SearchBox.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.SearchControl.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// Event names must begin with "on". For example, to provide a handler for the querychanged event,
                /// add a property named "onquerychanged" to the options object and set its value to the event handler.
                /// This parameter is optional.
                /// </param>
                /// <returns type="WinJS.UI.SearchBox" locid="WinJS.UI.SearchBox.constructor_returnValue">
                /// The new SearchBox.
                /// </returns>
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </signature>
                this._requestingFocusOnKeyboardInputHandlerBind = this._requestingFocusOnKeyboardInputHandler.bind(this);
                
                // Elements
                this._buttonElement = null;

                // Variables
                this._focusOnKeyboardInput = false;
                
                AutoSuggestBox.AutoSuggestBox.call(this, element, options);

                this._setupSearchBoxDOM();
            }, {
                /// <field type='String' locid="WinJS.UI.SearchBox.focusOnKeyboardInput" helpKeyword="WinJS.UI.SearchBox.focusOnKeyboardInput">
                /// Enable automatically focusing the search box when the user types into the app window (off by default) While this is enabled,
                /// input on the current thread will be intercepted and redirected to the search box. Only textual input will trigger the search box to focus.
                /// The caller will continue to receive non-text keys (such as arrows, tab, etc
                /// This will also not affect WIN/CTRL/ALT key combinations (except for Ctrl-V for paste).
                /// If the client needs more to happen than just set focus in the box (make control visible, etc.), they will need to handle the event.
                /// If enabled, the app must be sure to disable this if the user puts focus in some other edit field.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                focusOnKeyboardInput: {
                    get: function () {
                        return this._focusOnKeyboardInput;
                    },
                    set: function (value) {
                        if (this._focusOnKeyboardInput && !value) {
                            Application._applicationListener.removeEventListener(this.element, "requestingfocusonkeyboardinput", this._requestingFocusOnKeyboardInputHandlerBind);
                        } else if (!this._focusOnKeyboardInput && !!value) {
                            Application._applicationListener.addEventListener(this.element, "requestingfocusonkeyboardinput", this._requestingFocusOnKeyboardInputHandlerBind);
                        }
                        this._focusOnKeyboardInput = !!value;
                    }
                },

                // Methods
                dispose: function SearchBox() {
                    /// <signature helpKeyword="WinJS.UI.SearchBox.dispose">
                    /// <summary locid="WinJS.UI.SearchBox.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    AutoSuggestBox.AutoSuggestBox.prototype.dispose.call(this);
                    
                    if (this._focusOnKeyboardInput) {
                        Application._applicationListener.removeEventListener(this.element, "requestingfocusonkeyboardinput", this._requestingFocusOnKeyboardInputHandlerBind);
                    }
                },

                // Private methods
                _setupSearchBoxDOM: function SearchBox_setupSearchBoxDOM() {
                    this.element.classList.add(ClassName.searchBox);
                    this._flyoutElement.classList.add(ClassName.searchBoxFlyout);

                    this._inputElement.classList.add(ClassName.searchBoxInput);
                    this._inputElement.addEventListener("blur", this._searchboxInputBlurHandler.bind(this));
                    this._inputElement.addEventListener("focus", this._searchboxInputFocusHandler.bind(this));

                    this._buttonElement = _Global.document.createElement("div");
                    this._buttonElement.tabIndex = -1;
                    this._buttonElement.classList.add(ClassName.searchBoxButton);
                    this._buttonElement.addEventListener("click", this._buttonClickHandler.bind(this));
                    this.element.appendChild(this._buttonElement);
                },

                _disableControl: function SearchBox_disableControl() {
                    AutoSuggestBox.AutoSuggestBox.prototype._disableControl.call(this);
                    this._buttonElement.disabled = true;
                },

                _enableControl: function SearchBox_enableControl() {
                    AutoSuggestBox.AutoSuggestBox.prototype._enableControl.call(this);
                    this._buttonElement.disabled = false;
                },

                _renderSuggestion: function SearchBox_renderSuggestion(suggestion) {
                    // Overrides base class
                    var render = AutoSuggestBox.AutoSuggestBox.prototype._renderSuggestion.call(this, suggestion);
                    if (suggestion.kind === _SuggestionManagerShim._SearchSuggestionKind.Query) {
                        render.classList.add(ClassName.searchBoxSuggestionQuery);
                    } else if (suggestion.kind === _SuggestionManagerShim._SearchSuggestionKind.Separator) {
                        render.classList.add(ClassName.searchBoxSuggestionSeparator);
                    } else {
                        render.classList.add(ClassName.searchBoxSuggestionResult);
                    }
                    return render;
                },

                _shouldIgnoreInput: function asb_shouldIgnoreInput() {
                    // Overrides base class
                    var shouldIgnore = AutoSuggestBox.AutoSuggestBox.prototype._shouldIgnoreInput();
                    var isButtonDown = _ElementUtilities._matchesSelector(this._buttonElement, ":active");

                    return shouldIgnore || isButtonDown;
                },

                _updateInputElementAriaLabel: function SearchBox_updateInputElementAriaLabel() {
                    // Override base class
                    this._inputElement.setAttribute("aria-label",
                        this._inputElement.placeholder ? _Resources._formatString(strings.ariaLabelInputPlaceHolder, this._inputElement.placeholder) : strings.ariaLabelInputNoPlaceHolder
                    );
                },

                // Event Handlers
                _buttonClickHandler: function SearchBox_buttonClickHandler(event) {
                    this._inputElement.focus();
                    this._submitQuery(this._inputElement.value, true /*fillLinguisticDetails*/, event);
                    this._hideFlyout();
                },

                _searchboxInputBlurHandler: function SearchBox_inputBlurHandler() {
                    _ElementUtilities.removeClass(this._buttonElement, ClassName.searchBoxButtonInputFocus);
                },

                _searchboxInputFocusHandler: function SearchBox_inputFocusHandler() {
                    _ElementUtilities.addClass(this._buttonElement, ClassName.searchBoxButtonInputFocus);
                },

                // Type to search helpers
                _requestingFocusOnKeyboardInputHandler: function SearchBox_requestingFocusOnKeyboardInputHandler() {
                    this._fireEvent(EventName.receivingfocusonkeyboardinput, null);
                    if (_Global.document.activeElement !== this._inputElement) {
                        try {
                            this._inputElement.focus();
                        } catch (e) {
                        }
                    }
                }

            }, {
                createResultSuggestionImage: function SearchBox_createResultSuggestionImage(url) {
                    /// <signature helpKeyword="WinJS.UI.SearchBox.createResultSuggestionImage">
                    /// <summary locid="WinJS.UI.SearchBox.createResultSuggestionImage">
                    /// Creates the image argument for SearchSuggestionCollection.appendResultSuggestion.
                    /// </summary>
                    /// <param name="url" type="string" locid="WinJS.UI.SearchBox.SearchBox_createResultSuggestionImage_p:url">
                    /// The url of the image.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </signature>
                    if (_WinRT.Windows.Foundation.Uri && _WinRT.Windows.Storage.Streams.RandomAccessStreamReference) {
                        return _WinRT.Windows.Storage.Streams.RandomAccessStreamReference.createFromUri(new _WinRT.Windows.Foundation.Uri(url));
                    }
                    return url;
                },

                _getKeyModifiers: function SearchBox_getKeyModifiers(ev) {
                    // Returns the same value as http://msdn.microsoft.com/en-us/library/windows/apps/xaml/windows.system.virtualkeymodifiers
                    var VirtualKeys = {
                        ctrlKey: 1,
                        altKey: 2,
                        shiftKey: 4
                    };

                    var keyModifiers = 0;
                    if (ev.ctrlKey) {
                        keyModifiers |= VirtualKeys.ctrlKey;
                    }
                    if (ev.altKey) {
                        keyModifiers |= VirtualKeys.altKey;
                    }
                    if (ev.shiftKey) {
                        keyModifiers |= VirtualKeys.shiftKey;
                    }
                    return keyModifiers;
                },

                _isTypeToSearchKey: function searchBox__isTypeToSearchKey(event) {
                    if (event.shiftKey || event.ctrlKey || event.altKey) {
                        return false;
                    }
                    return true;
                }
            });
            _Base.Class.mix(SearchBox, _Control.DOMEventMixin);
            return SearchBox;
        })
    });
});
