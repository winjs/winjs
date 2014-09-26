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
    'require-style!less/controls'
], function searchboxInit(_Global, _WinRT, _Base, _ErrorFromName, _Events, _Resources, AutoSuggestBox, _Control, _ElementUtilities, _SuggestionManagerShim) {
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
                AutoSuggestBox.AutoSuggestBox.call(this, element, options);

                // Elements
                this._buttonElement = null;

                // Variables
                this._focusOnKeyboardInput = false;

                this._requestingFocusOnKeyboardInputHandlerBind = this._requestingFocusOnKeyboardInputHandler.bind(this);
                this._keydownCaptureHandlerBind = this._keydownCaptureHandler.bind(this);
                this._frameLoadCaptureHandlerBind = this._frameLoadCaptureHandler.bind(this);

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
                            if (!(this._suggestionManager instanceof _SuggestionManagerShim._SearchSuggestionManagerShim)) {
                                this._suggestionManager.removeEventListener("requestingfocusonkeyboardinput", this._requestingFocusOnKeyboardInputHandlerBind);
                            } else {
                                this._updateKeydownCaptureListeners(_Global.top, false /*add*/);
                            }

                        } else if (!this._focusOnKeyboardInput && !!value) {
                            if (!(this._suggestionManager instanceof _SuggestionManagerShim._SearchSuggestionManagerShim)) {
                                this._suggestionManager.addEventListener("requestingfocusonkeyboardinput", this._requestingFocusOnKeyboardInputHandlerBind);
                            } else {
                                this._updateKeydownCaptureListeners(_Global.top, true /*add*/);
                            }

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

                    // Detach winrt events.
                    if (this._focusOnKeyboardInput) {
                        if (!(this._suggestionManager instanceof _SuggestionManagerShim._SearchSuggestionManagerShim)) {
                            this._suggestionManager.removeEventListener("requestingfocusonkeyboardinput", this._requestingFocusOnKeyboardInputHandlerBind);
                        } else {
                            this._updateKeydownCaptureListeners(_Global.top, false /*add*/);
                        }
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
                },

                _keydownCaptureHandler: function SearchBox_keydownCaptureHandler(event) {
                    if (this._focusOnKeyboardInput && this._shouldKeyTriggerTypeToSearch(event)) {
                        this._requestingFocusOnKeyboardInputHandler(event);
                    }
                },

                _frameLoadCaptureHandler: function SearchBox_frameLoadCaptureHandler(event) {
                    if (this._focusOnKeyboardInput) {
                        this._updateKeydownCaptureListeners(event.target.contentWindow, true /*add*/);
                    }
                },

                _updateKeydownCaptureListeners: function SearchBox_updateTypeToSearchListeners(win, add) {
                    // Register for child frame keydown events in order to support FocusOnKeyboardInput
                    // when focus is in a child frame.  Also register for child frame load events so
                    // it still works after frame navigations.
                    // Note: This won't catch iframes added programmatically later, but that can be worked
                    // around by toggling FocusOnKeyboardInput off/on after the new iframe is added.
                    try {
                        if (add) {
                            win.document.addEventListener('keydown', this._keydownCaptureHandlerBind, true);
                        } else {
                            win.document.removeEventListener('keydown', this._keydownCaptureHandlerBind, true);
                        }
                    } catch (e) { // if the IFrame crosses domains, we'll get a permission denied error
                    }

                    if (win.frames) {
                        for (var i = 0, l = win.frames.length; i < l; i++) {
                            var childWin = win.frames[i];
                            this._updateKeydownCaptureListeners(childWin, add);

                            try {
                                if (add) {
                                    if (childWin.frameElement) {
                                        childWin.frameElement.addEventListener('load', this._frameLoadCaptureHandlerBind, true);
                                    }
                                } else {
                                    if (childWin.frameElement) {
                                        childWin.frameElement.removeEventListener('load', this._frameLoadCaptureHandlerBind, true);
                                    }
                                }
                            } catch (e) { // if the IFrame crosses domains, we'll get a permission denied error
                            }
                        }
                    }
                },

                _shouldKeyTriggerTypeToSearch: function SearchBox_shouldKeyTriggerTypeToSearch(event) {
                    var shouldTrigger = false;
                    // First, check if a metaKey is pressed (only applies to MacOS). If so, do nothing here.
                    if (!event.metaKey) {
                        // We also don't handle CTRL/ALT combinations, unless ALTGR is also set. Since there is no shortcut for checking AltGR,
                        // we need to use getModifierState, however, Safari currently doesn't support this.
                        if ((!event.ctrlKey && !event.altKey) || (event.getModifierState && event.getModifierState("AltGraph"))) {
                            // Show on most keys for visible characters like letters, numbers, etc.
                            switch (event.keyCode) {
                                case 0x30:  //0x30 0 key
                                case 0x31:  //0x31 1 key
                                case 0x32:  //0x32 2 key
                                case 0x33:  //0x33 3 key
                                case 0x34:  //0x34 4 key
                                case 0x35:  //0x35 5 key
                                case 0x36:  //0x36 6 key
                                case 0x37:  //0x37 7 key
                                case 0x38:  //0x38 8 key
                                case 0x39:  //0x39 9 key

                                case 0x41:  //0x41 A key
                                case 0x42:  //0x42 B key
                                case 0x43:  //0x43 C key
                                case 0x44:  //0x44 D key
                                case 0x45:  //0x45 E key
                                case 0x46:  //0x46 F key
                                case 0x47:  //0x47 G key
                                case 0x48:  //0x48 H key
                                case 0x49:  //0x49 I key
                                case 0x4A:  //0x4A J key
                                case 0x4B:  //0x4B K key
                                case 0x4C:  //0x4C L key
                                case 0x4D:  //0x4D M key
                                case 0x4E:  //0x4E N key
                                case 0x4F:  //0x4F O key
                                case 0x50:  //0x50 P key
                                case 0x51:  //0x51 Q key
                                case 0x52:  //0x52 R key
                                case 0x53:  //0x53 S key
                                case 0x54:  //0x54 T key
                                case 0x55:  //0x55 U key
                                case 0x56:  //0x56 V key
                                case 0x57:  //0x57 W key
                                case 0x58:  //0x58 X key
                                case 0x59:  //0x59 Y key
                                case 0x5A:  //0x5A Z key

                                case 0x60:  // VK_NUMPAD0,             //0x60 Numeric keypad 0 key
                                case 0x61:  // VK_NUMPAD1,             //0x61 Numeric keypad 1 key
                                case 0x62:  // VK_NUMPAD2,             //0x62 Numeric keypad 2 key
                                case 0x63:  // VK_NUMPAD3,             //0x63 Numeric keypad 3 key
                                case 0x64:  // VK_NUMPAD4,             //0x64 Numeric keypad 4 key
                                case 0x65:  // VK_NUMPAD5,             //0x65 Numeric keypad 5 key
                                case 0x66:  // VK_NUMPAD6,             //0x66 Numeric keypad 6 key
                                case 0x67:  // VK_NUMPAD7,             //0x67 Numeric keypad 7 key
                                case 0x68:  // VK_NUMPAD8,             //0x68 Numeric keypad 8 key
                                case 0x69:  // VK_NUMPAD9,             //0x69 Numeric keypad 9 key
                                case 0x6A:  // VK_MULTIPLY,            //0x6A Multiply key
                                case 0x6B:  // VK_ADD,                 //0x6B Add key
                                case 0x6C:  // VK_SEPARATOR,           //0x6C Separator key
                                case 0x6D:  // VK_SUBTRACT,            //0x6D Subtract key
                                case 0x6E:  // VK_DECIMAL,             //0x6E Decimal key
                                case 0x6F:  // VK_DIVIDE,              //0x6F Divide key

                                case 0xBA:  // VK_OEM_1,               //0xBA Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the ';:' key
                                case 0xBB:  // VK_OEM_PLUS,            //0xBB For any country/region, the '+' key
                                case 0xBC:  // VK_OEM_COMMA,           //0xBC For any country/region, the ',' key
                                case 0xBD:  // VK_OEM_MINUS,           //0xBD For any country/region, the '-' key
                                case 0xBE:  // VK_OEM_PERIOD,          //0xBE For any country/region, the '.' key
                                case 0xBF:  // VK_OEM_2,               //0xBF Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the '/?' key
                                case 0xC0:  // VK_OEM_3,               //0xC0 Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the '`~' key

                                case 0xDB:  // VK_OEM_4,               //0xDB Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the '[{' key
                                case 0xDC:  // VK_OEM_5,               //0xDC Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the '\|' key
                                case 0xDD:  // VK_OEM_6,               //0xDD Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the ']}' key
                                case 0xDE:  // VK_OEM_7,               //0xDE Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the 'single-quote/double-quote' key
                                case 0xDF:  // VK_OEM_8,               //0xDF Used for miscellaneous characters; it can vary by keyboard.

                                case 0xE2:  // VK_OEM_102,             //0xE2 Either the angle bracket key or the backslash key on the RT 102-key keyboard

                                case 0xE5:  // VK_PROCESSKEY,          //0xE5 IME PROCESS key

                                case 0xE7:  // VK_PACKET,              //0xE7 Used to pass Unicode characters as if they were keystrokes. The VK_PACKET key is the low word of a 32-bit Virtual Key value used for non-keyboard input methods. For more information, see Remark in KEYBDINPUT, SendInput, WM_KEYDOWN, and WM_KEYUP
                                    shouldTrigger = true;
                                    break;
                            }
                        }
                    }
                    return shouldTrigger;
                },

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
