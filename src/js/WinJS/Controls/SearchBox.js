// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    '../Core/_Global',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Resources',
    '../Animations',
    '../BindingList',
    '../Controls/Repeater',
    '../Utilities/_Control',
    '../Utilities/_ElementListUtilities',
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    './SearchBox/_SearchSuggestionManagerShim',
    'require-style!less/desktop/controls'
], function searchboxInit(_Global, _WinRT, _Base, _ErrorFromName, _Events, _Resources, Animations, BindingList, Repeater, _Control, _ElementListUtilities, _ElementUtilities, _Hoverable, _SearchSuggestionManagerShim) {
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
        /// <event name="querychanged" bubbles="true" locid="WinJS.UI.SearchBox_e:querychanged">Raised when user or app changes the query text.</event>
        /// <event name="querysubmitted" bubbles="true" locid="WinJS.UI.SearchBox_e:querysubmitted">Raised when user clicks on search glyph or presses Enter.</event>
        /// <event name="resultsuggestionchosen" bubbles="true" locid="WinJS.UI.SearchBox_e:resultsuggestionchosen">Raised when user clicks  one of the displayed suggestions.</event>
        /// <event name="suggestionsrequested" bubbles="true" locid="WinJS.UI.SearchBox_e:suggestionsrequested">Raised when the system requests search suggestions from this app.</event>
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
            var createEvent = _Events._createEventProperty;
            var Key = _ElementUtilities.Key;

            // Enums
            var ClassName = {
                searchBox: "win-searchbox",
                searchBoxInput: "win-searchbox-input",
                searchBoxButton: "win-searchbox-button",
                searchBoxFlyout: "win-searchbox-flyout",
                searchBoxSuggestionResult: "win-searchbox-suggestion-result",
                searchBoxSuggestionQuery: "win-searchbox-suggestion-query",
                searchBoxSuggestionSeparator: "win-searchbox-suggestion-separator",
                searchBoxSuggestionSelected: "win-searchbox-suggestion-selected",
                searchBoxFlyoutHighlightText: "win-searchbox-flyout-highlighttext",
                searchBoxButtonInputFocus: "win-searchbox-button-input-focus",
                searchBoxInputFocus: "win-searchbox-input-focus",
                searchBoxSuggestionResultText: "win-searchbox-suggestion-result-text",
                searchBoxSuggestionResultDetailedText: "win-searchbox-suggestion-result-detailed-text",
                searchboxDisabled: "win-searchbox-disabled",
                searchboxHitHighlightSpan: "win-searchbox-hithighlight-span",
            };

            var EventName = {
                querychanged: "querychanged",
                querysubmitted: "querysubmitted",
                resultsuggestionchosen: "resultsuggestionchosen",
                suggestionsrequested: "suggestionsrequested",
                receivingfocusonkeyboardinput: "receivingfocusonkeyboardinput"
            };

            var strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get invalidSearchBoxSuggestionKind() { return "Error: Invalid search suggestion kind."; },
                get ariaLabel() { return _Resources._getWinJSString("ui/searchBoxAriaLabel").value; },
                get ariaLabelInputNoPlaceHolder() { return _Resources._getWinJSString("ui/searchBoxAriaLabelInputNoPlaceHolder").value; },
                get ariaLabelInputPlaceHolder() { return _Resources._getWinJSString("ui/searchBoxAriaLabelInputPlaceHolder").value; },
                get ariaLabelButton() { return _Resources._getWinJSString("ui/searchBoxAriaLabelButton").value; },
                get ariaLabelQuery() { return _Resources._getWinJSString("ui/searchBoxAriaLabelQuery").value; },
                get ariaLabelSeparator() { return _Resources._getWinJSString("ui/searchBoxAriaLabelSeparator").value; },
                get ariaLabelResult() { return _Resources._getWinJSString("ui/searchBoxAriaLabelResult").value; }
            };

            var SearchBox = _Base.Class.define(function SearchBox_ctor(element, options) {
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

                element = element || _Global.document.createElement("div");

                if (element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.SearchBox.DuplicateConstruction", strings.duplicateConstruction);
                }
                element.winControl = this;

                // Elements
                this._domElement = null;
                this._inputElement = null;
                this._buttonElement = null;
                this._flyout = null;
                this._flyoutDivElement = null;
                this._repeaterDivElement = null;
                this._repeater = null;

                // Variables
                this._disposed = false;
                this._focusOnKeyboardInput = false;
                this._chooseSuggestionOnEnter = false;
                this._lastKeyPressLanguage = "";

                // These are used to eliminate redundant query submitted events
                this._prevQueryText = "";
                this._prevLinguisticDetails = this._createSearchQueryLinguisticDetails([], 0, 0, "", "");
                this._prevCompositionStart = 0;
                this._prevCompositionLength = 0;
                this._isProcessingDownKey = false;
                this._isProcessingUpKey = false;
                this._isProcessingTabKey = false;
                this._isProcessingEnterKey = false;
                this._isFlyoutPointerDown = false;
                this._reflowImeOnPointerRelease = false;

                // Focus and selection related variables
                this._currentFocusedIndex = -1;
                this._currentSelectedIndex = -1;

                this._suggestionRendererBind = this._suggestionRenderer.bind(this);
                this._requestingFocusOnKeyboardInputHandlerBind = this._requestingFocusOnKeyboardInputHandler.bind(this);
                this._suggestionsRequestedHandlerBind = this._suggestionsRequestedHandler.bind(this);
                this._suggestionsChangedHandlerBind = this._suggestionsChangedHandler.bind(this);
                this._keydownCaptureHandlerBind = this._keydownCaptureHandler.bind(this);
                this._frameLoadCaptureHandlerBind = this._frameLoadCaptureHandler.bind(this);

                // Find out if we are in local compartment and if search APIs are available.
                this._searchSuggestionManager = null;
                this._searchSuggestions = null;

                // Get the search suggestion provider if it is available
                if (_WinRT.Windows.ApplicationModel.Search.Core.SearchSuggestionManager) {
                    this._searchSuggestionManager = new _WinRT.Windows.ApplicationModel.Search.Core.SearchSuggestionManager();
                } else {
                    this._searchSuggestionManager = new _SearchSuggestionManagerShim._SearchSuggestionManagerShim();
                }
                this._searchSuggestions = this._searchSuggestionManager.suggestions;

                this._hitFinder = null;
                this._setElement(element);
                _Control.setOptions(this, options);
                this._setAccessibilityProperties();
                _ElementUtilities.addClass(element, "win-disposable");
            }, {

                /// <field type='HTMLElement' domElement='true' hidden='true' locid="WinJS.UI.SearchBox.element" helpKeyword="WinJS.UI.SearchBox.element">
                /// The DOM element that hosts the SearchBox.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                element: {
                    get: function () {
                        return this._domElement;
                    }
                },

                /// <field type='String' locid="WinJS.UI.SearchBox.placeholderText" helpKeyword="WinJS.UI.SearchBox.placeholderText">
                /// Gets or sets the placeholder text for the SearchBox. This text is displayed if there is no
                /// other text in the input box.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                placeholderText: {
                    get: function () {
                        return this._inputElement.placeholder;
                    },
                    set: function (value) {
                        this._inputElement.placeholder = value;
                        this._updateInputElementAriaLabel();
                    }
                },

                /// <field type='String' locid="WinJS.UI.SearchBox.queryText" helpKeyword="WinJS.UI.SearchBox.queryText">
                /// Gets or sets the query text for the SearchBox.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                queryText: {
                    get: function () {
                        return this._inputElement.value;
                    },
                    set: function (value) {
                        this._inputElement.value = value;
                    }
                },

                /// <field type='bool' locid="WinJS.UI.SearchBox.searchHistoryDisabled" helpKeyword="WinJS.UI.SearchBox.searchHistoryDisabled">
                /// Gets or sets a value that specifies whether search history is disabled for the SearchBox. The default value is false.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                searchHistoryDisabled: {
                    get: function () {
                        if (this._searchSuggestionManager) {
                            return !this._searchSuggestionManager.searchHistoryEnabled;
                        } else {
                            return true;
                        }
                    },
                    set: function (value) {
                        if (this._searchSuggestionManager) {
                            this._searchSuggestionManager.searchHistoryEnabled = !value;
                        }
                    }
                },

                /// <field type='String' locid="WinJS.UI.SearchBox.searchHistoryContext" helpKeyword="WinJS.UI.SearchBox.searchHistoryContext">
                /// Gets or sets the search history context for the SearchBox. The search history context string is used as a secondary key for storing search history.
                /// (The primary key is the AppId.) An app can use the search history context string to store different search histories based on the context of the application.
                /// If you don't set this property, the system assumes that all searches in your app occur in the same context.
                /// If you update this property while the search pane is open with suggestions showing, the changes won't take effect until the user enters the next character.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                searchHistoryContext: {
                    get: function () {
                        if (this._searchSuggestionManager) {
                            return this._searchSuggestionManager.searchHistoryContext;
                        } else {
                            return "";
                        }
                    },
                    set: function (value) {
                        if (this._searchSuggestionManager) {
                            this._searchSuggestionManager.searchHistoryContext = value;
                        }
                    }
                },

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
                            if (!(this._searchSuggestionManager instanceof _SearchSuggestionManagerShim._SearchSuggestionManagerShim)) {
                                this._searchSuggestionManager.removeEventListener("requestingfocusonkeyboardinput", this._requestingFocusOnKeyboardInputHandlerBind);
                            } else {
                                this._updateKeydownCaptureListeners(_Global.top, false /*add*/);
                            }

                        } else if (!this._focusOnKeyboardInput && !!value) {
                            if (!(this._searchSuggestionManager instanceof _SearchSuggestionManagerShim._SearchSuggestionManagerShim)) {
                                this._searchSuggestionManager.addEventListener("requestingfocusonkeyboardinput", this._requestingFocusOnKeyboardInputHandlerBind);
                            } else {
                                this._updateKeydownCaptureListeners(_Global.top, true /*add*/);
                            }

                        }
                        this._focusOnKeyboardInput = !!value;
                    }
                },

                /// <field type='String' locid="WinJS.UI.SearchBox.chooseSuggestionOnEnter" helpKeyword="WinJS.UI.SearchBox.chooseSuggestionOnEnter">
                /// Gets or sets whether the first suggestion is chosen when the user presses Enter.
                /// When set to true, as the user types in the search box, a focus rectangle is drawn on the first search suggestion
                /// (if present and no IME composition in progress).  Pressing enter will behave the same as if clicked on the focused suggestion,
                /// and the down arrow key press will put real focus to the second suggestion and the up arrow key will remove focus.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                chooseSuggestionOnEnter: {
                    get: function () {
                        return this._chooseSuggestionOnEnter;
                    },
                    set: function (value) {
                        this._chooseSuggestionOnEnter = !!value;
                        this._updateSearchButtonClass();
                    }
                },

                /// <field type='bool' locid="WinJS.UI.SearchBox.disabled" helpKeyword="WinJS.UI.SearchBox.disabled">
                /// Gets or sets a value that specifies whether the SearchBox is disabled.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                disabled: {
                    get: function () {
                        return this._inputElement.disabled;
                    },
                    set: function (value) {
                        if (this._inputElement.disabled === !!value) {
                            return;
                        }

                        if (!value) {
                            // Enable control
                            this._inputElement.disabled = false;
                            this._buttonElement.disabled = false;
                            this._domElement.disabled = false;
                            _ElementUtilities.removeClass(this.element, ClassName.searchboxDisabled);
                            if (_Global.document.activeElement === this.element) {
                                _ElementUtilities._setActive(this._inputElement);
                            }
                        } else {
                            // Disable control
                            if (this._isFlyoutShown) {
                                this._hideFlyout();
                            }
                            _ElementUtilities.addClass(this.element, ClassName.searchboxDisabled);
                            this._inputElement.disabled = true;
                            this._buttonElement.disabled = true;
                            this._domElement.disabled = true;
                        }
                    }
                },

                // Methods
                setLocalContentSuggestionSettings: function SearchBox_setLocalContentSuggestionSettings(settings) {
                    /// <signature helpKeyword="WinJS.UI.SearchBox.SetLocalContentSuggestionSettings">
                    /// <summary locid="WinJS.UI.SearchBox.SetLocalContentSuggestionSettings">
                    /// Specifies whether suggestions based on local files are automatically displayed in the search pane, and defines the criteria that
                    /// the system uses to locate and filter these suggestions.
                    /// </summary>
                    /// <param name="eventName" type="Windows.ApplicationModel.Search. LocalContentSuggestionSettings" locid="WinJS.UI.SearchBox.setLocalContentSuggestionSettings_p:settings">
                    /// The new settings for local content suggestions.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </signature>
                    if (this._searchSuggestionManager) {
                        this._searchSuggestionManager.setLocalContentSuggestionSettings(settings);
                    }
                },

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

                    // Cancel pending promises.
                    if (this._flyoutOpenPromise) {
                        this._flyoutOpenPromise.cancel();
                    }

                    // Detach winrt events.
                    if (this._focusOnKeyboardInput) {
                        if (!(this._searchSuggestionManager instanceof _SearchSuggestionManagerShim._SearchSuggestionManagerShim)) {
                            this._searchSuggestionManager.removeEventListener("requestingfocusonkeyboardinput", this._requestingFocusOnKeyboardInputHandlerBind);
                        } else {
                            this._updateKeydownCaptureListeners(_Global.top, false /*add*/);
                        }

                    }
                    this._searchSuggestions.removeEventListener("vectorchanged", this._suggestionsChangedHandlerBind);
                    this._searchSuggestionManager.removeEventListener("suggestionsrequested", this._suggestionsRequestedHandlerBind);

                    this._searchSuggestionManager = null;
                    this._searchSuggestions = null;
                    this._hitFinder = null;

                    this._disposed = true;

                },

                /// <field type="Function" locid="WinJS.UI.SearchBox.onquerychanged" helpKeyword="WinJS.UI.SearchBox.onquerychanged">
                /// Raised when user or app changes the query text.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                onquerychanged: createEvent(EventName.querychanged),

                /// <field type="Function" locid="WinJS.UI.SearchBox.onquerysubmitted" helpKeyword="WinJS.UI.SearchBox.onquerysubmitted">
                /// Raised when user clicks on search glyph or presses enter button.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                onquerysubmitted: createEvent(EventName.querysubmitted),

                /// <field type="Function" locid="WinJS.UI.SearchBox.onresultsuggestionchosen" helpKeyword="WinJS.UI.SearchBox.onresultsuggestionchosen">
                /// Raised when user clicks on one of the suggestions displayed.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                onresultsuggestionchosen: createEvent(EventName.resultsuggestionchosen),

                /// <field type="Function" locid="WinJS.UI.SearchBox.onsuggestionsrequested" helpKeyword="WinJS.UI.SearchBox.onsuggestionsrequested">
                /// Raised when Windows requests search suggestions from the app.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                onsuggestionsrequested: createEvent(EventName.suggestionsrequested),

                // Private methods
                _isFlyoutShown: function SearchBox_isFlyoutShown() {
                    return (this._flyoutDivElement.style.display !== "none");
                },

                _isFlyoutBelow: function SearchBox_isFlyoutBelow() {
                    if (this._flyoutDivElement.getBoundingClientRect().top > this._inputElement.getBoundingClientRect().top) {
                        return true;
                    }
                    return false;
                },

                _getFlyoutTop: function SearchBox_getFlyoutTop() {
                    if (this._isFlyoutBelow()) {
                        return this._inputElement.getBoundingClientRect().bottom;
                    }
                    var popupHeight = this._flyoutDivElement.getBoundingClientRect().bottom - this._flyoutDivElement.getBoundingClientRect().top;
                    return this._inputElement.getBoundingClientRect().top - popupHeight;
                },

                _getFlyoutBottom: function SearchBox_getFlyoutBottom() {
                    if (this._isFlyoutBelow()) {
                        var popupHeight = this._flyoutDivElement.getBoundingClientRect().bottom - this._flyoutDivElement.getBoundingClientRect().top;
                        return this._inputElement.getBoundingClientRect().bottom + popupHeight;
                    }
                    return this._inputElement.getBoundingClientRect().top;
                },

                _updateFlyoutTopAndTouchAction: function SearchBox_updateFlyoutTopAndTouchAction() {
                    var popupHeight = this._flyoutDivElement.getBoundingClientRect().bottom - this._flyoutDivElement.getBoundingClientRect().top;
                    if (!this._isFlyoutBelow()) {
                        this._flyoutDivElement.style.top = "-" + popupHeight + "px";
                    }

                    // ms-scroll-chaining:none will still chain scroll parent element if child div does
                    // not have a scroll bar. Prevent this by setting and updating touch action
                    if (this._flyoutDivElement.scrollHeight > popupHeight) {
                        this._flyoutDivElement.style.touchAction = "pan-y";
                    } else {
                        this._flyoutDivElement.style.touchAction = "none";
                    }
                },

                _showFlyout: function SearchBox_showFlyout() {

                    if (this._isFlyoutShown()) {
                        return;
                    }

                    if (this._suggestionsData.length === 0) {
                        return;
                    }

                    this._flyoutDivElement.style.display = "block";

                    // Display above vs below
                    var minPopupHeight = this._flyoutDivElement.clientHeight;
                    if (minPopupHeight < SearchBox._Constants.MIN_POPUP_HEIGHT) {
                        minPopupHeight = SearchBox._Constants.MIN_POPUP_HEIGHT;
                    }
                    var flyoutRect = this._flyoutDivElement.getBoundingClientRect();
                    var searchBoxRect = this.element.getBoundingClientRect();
                    var popupHeight = flyoutRect.bottom - flyoutRect.top;
                    var popupWidth = flyoutRect.right - flyoutRect.left;
                    var searchBoxWidth = searchBoxRect.right - searchBoxRect.left;
                    var documentClientHeight = _Global.document.documentElement.clientHeight;
                    var documentClientWidth = _Global.document.documentElement.clientWidth;
                    var searchBoxClientHeight = this.element.clientHeight;
                    var searchBoxClientLeft = this.element.clientLeft;

                    var flyoutBelowSearchBox = true;
                    if ((searchBoxRect.bottom + minPopupHeight) <= documentClientHeight) {
                        // There is enough space below. Show below
                        this._flyoutDivElement.style.top = searchBoxClientHeight + "px";
                    } else if ((searchBoxRect.top - minPopupHeight) >= 0) {
                        // There is enough space above. Show above
                        this._flyoutDivElement.style.top = "-" + popupHeight + "px";
                        flyoutBelowSearchBox = false;
                    } else {
                        // Not enough space above or below. Show below.
                        this._flyoutDivElement.style.top = searchBoxClientHeight + "px";
                    }

                    // Align left vs right edge
                    var alignRight;
                    if (_Global.getComputedStyle(this._flyoutDivElement).direction === "rtl") {
                        // RTL: Align to the right edge if there is enough space to the left of the search box's
                        // right edge, or if there is not enough space to fit the flyout aligned to either edge.
                        alignRight = ((searchBoxRect.right - popupWidth) >= 0) || ((searchBoxRect.left + popupWidth) > documentClientWidth);

                    } else {
                        // LTR: Align to the right edge if there isn't enough space to the right of the search box's
                        // left edge, but there is enough space to the left of the search box's right edge.
                        alignRight = ((searchBoxRect.left + popupWidth) > documentClientWidth) && ((searchBoxRect.right - popupWidth) >= 0);
                    }

                    if (alignRight) {
                        this._flyoutDivElement.style.left = (searchBoxWidth - popupWidth - searchBoxClientLeft) + "px";
                    } else {
                        this._flyoutDivElement.style.left = "-" + searchBoxClientLeft + "px";
                    }

                    // ms-scroll-chaining:none will still chain scroll parent element if child div does
                    // not have a scroll bar. Prevent this by setting and updating touch action
                    if (this._flyoutDivElement.scrollHeight > popupHeight) {
                        this._flyoutDivElement.style.touchAction = "pan-y";
                    } else {
                        this._flyoutDivElement.style.touchAction = "none";
                    }

                    this._addFlyoutIMEPaddingIfRequired();

                    if (this._flyoutOpenPromise) {
                        this._flyoutOpenPromise.cancel();
                        this._flyoutOpenPromise = null;
                    }
                    var animationKeyframe = flyoutBelowSearchBox ? "WinJS-flyoutBelowSearchBox-showPopup" : "WinJS-flyoutAboveSearchBox-showPopup";
                    this._flyoutOpenPromise = Animations.showPopup(this._flyoutDivElement, { top: "0px", left: "0px", keyframe: animationKeyframe });
                },

                _hideFlyout: function SearchBox_hideFlyout() {
                    if (this._isFlyoutShown()) {
                        this._flyoutDivElement.style.display = "none";
                        this._updateSearchButtonClass();
                    }
                },

                _addNewSpan: function SearchBox_addNewSpan(element, textContent, insertBefore) {
                    // Adds new span element with specified inner text as child to element, placed before insertBefore
                    var spanElement = _Global.document.createElement("span");
                    spanElement.textContent = textContent;
                    spanElement.setAttribute("aria-hidden", "true");
                    _ElementUtilities.addClass(spanElement, ClassName.searchboxHitHighlightSpan);
                    element.insertBefore(spanElement, insertBefore);
                    return spanElement;
                },

                _addHitHighlightedText: function SearchBox_addHitHighlightedText(element, item, text) {
                    if (text) {
                        // Remove any existing hit highlighted text spans
                        _ElementListUtilities.query("." + ClassName.searchboxHitHighlightSpan, element).forEach(function (childElement) {
                            childElement.parentNode.removeChild(childElement);
                        });

                        // Insert spans at the front of element
                        var firstChild = element.firstChild;

                        var hitsProvided = item.hits;
                        if ((!hitsProvided) && (this._hitFinder !== null) && (item.kind !== _SearchSuggestionManagerShim._SearchSuggestionKind.Separator)) {
                            hitsProvided = this._hitFinder.find(text);
                        }

                        var hits = SearchBox._sortAndMergeHits(hitsProvided);

                        var lastPosition = 0;
                        for (var i = 0; i < hits.length; i++) {
                            var hit = hits[i];

                            // Add previous normal text
                            this._addNewSpan(element, text.substring(lastPosition, hit.startPosition), firstChild);

                            lastPosition = hit.startPosition + hit.length;

                            // Add hit highlighted text
                            var spanHitHighlightedText = this._addNewSpan(element, text.substring(hit.startPosition, lastPosition), firstChild);
                            _ElementUtilities.addClass(spanHitHighlightedText, ClassName.searchBoxFlyoutHighlightText);
                        }

                        // Add final normal text
                        if (lastPosition < text.length) {
                            this._addNewSpan(element, text.substring(lastPosition), firstChild);
                        }
                    }
                },

                _findSuggestionElementIndex: function SearchBox_findSuggestionElementIndex(curElement) {
                    if (curElement) {
                        for (var i = 0; i < this._suggestionsData.length; i++) {
                            if (this._repeater.elementFromIndex(i) === curElement) {
                                return i;
                            }
                        }
                    }
                    return -1;
                },

                _isSuggestionSelectable: function SearchBox_isSuggestionSelectable(suggestion) {
                    return ((suggestion.kind === _SearchSuggestionManagerShim._SearchSuggestionKind.Query) ||
                            (suggestion.kind === _SearchSuggestionManagerShim._SearchSuggestionKind.Result));
                },

                _findNextSuggestionElementIndex: function SearchBox_findNextSuggestionElementIndex(curIndex) {
                    // Returns -1 if there are no focusable elements after curIndex
                    // Returns first element if curIndex < 0
                    var startIndex = curIndex + 1;
                    if (startIndex < 0) {
                        startIndex = 0;
                    }

                    for (var i = startIndex; i < this._suggestionsData.length; i++) {
                        if ((this._repeater.elementFromIndex(i)) && (this._isSuggestionSelectable(this._suggestionsData.getAt(i)))) {
                            return i;
                        }
                    }
                    return -1;
                },

                _findPreviousSuggestionElementIndex: function SearchBox_findPreviousSuggestionElementIndex(curIndex) {
                    // Returns -1 if there are no focusable elements before curIndex
                    // Returns last element if curIndex >= suggestionsdata.length
                    var startIndex = curIndex - 1;
                    if (startIndex >= this._suggestionsData.length) {
                        startIndex = this._suggestionsData.length - 1;
                    }

                    for (var i = startIndex; i >= 0; i--) {
                        if ((this._repeater.elementFromIndex(i)) && (this._isSuggestionSelectable(this._suggestionsData.getAt(i)))) {
                            return i;
                        }
                    }
                    return -1;
                },

                _trySetFocusOnSuggestionIndex: function SearchBox_trySetFocusOnSuggestionIndex(index) {
                    try {
                        this._repeater.elementFromIndex(index).focus();
                    } catch (e) {
                    }
                },

                _updateFakeFocus: function SearchBox_updateFakeFocus() {
                    var firstElementIndex;
                    if (this._isFlyoutShown() && (this._chooseSuggestionOnEnter)) {
                        firstElementIndex = this._findNextSuggestionElementIndex(-1);
                    } else {
                        // This will clear the fake focus.
                        firstElementIndex = -1;
                    }

                    this._selectSuggestionAtIndex(firstElementIndex);
                },

                _updateSearchButtonClass: function SearchBox_updateSearchButtonClass() {
                    if ((this._currentSelectedIndex !== -1) || (_Global.document.activeElement !== this._inputElement)) {
                        // Focus is not in input. remove class
                        _ElementUtilities.removeClass(this._buttonElement, ClassName.searchBoxButtonInputFocus);
                    } else if (_Global.document.activeElement === this._inputElement) {
                        _ElementUtilities.addClass(this._buttonElement, ClassName.searchBoxButtonInputFocus);
                    }
                },

                _selectSuggestionAtIndex: function SearchBox_selectSuggestionAtIndex(indexToSelect) {
                    // Sets focus on the specified element and removes focus from others.
                    // Clears selection if index is outside of suggestiondata index range.
                    var curElement = null;
                    for (var i = 0; i < this._suggestionsData.length; i++) {
                        curElement = this._repeater.elementFromIndex(i);
                        if (i !== indexToSelect) {
                            _ElementUtilities.removeClass(curElement, ClassName.searchBoxSuggestionSelected);
                            curElement.setAttribute("aria-selected", "false");
                        } else {
                            _ElementUtilities.addClass(curElement, ClassName.searchBoxSuggestionSelected);
                            this._scrollToView(curElement);
                            curElement.setAttribute("aria-selected", "true");
                        }
                    }
                    this._updateSearchButtonClass();
                    this._currentSelectedIndex = indexToSelect;
                    if (curElement) {
                        this._inputElement.setAttribute("aria-activedescendant", this._repeaterDivElement.id + indexToSelect);
                    } else if (this._inputElement.hasAttribute("aria-activedescendant")) {
                        this._inputElement.removeAttribute("aria-activedescendant");
                    }
                },

                _scrollToView: function SearchBox_scrollToView(targetElement) {
                    var popupHeight = this._flyoutDivElement.getBoundingClientRect().bottom - this._flyoutDivElement.getBoundingClientRect().top;
                    if ((targetElement.offsetTop + targetElement.offsetHeight) > (this._flyoutDivElement.scrollTop + popupHeight)) {
                        // Element to scroll is below popup visible area
                        var scrollDifference = (targetElement.offsetTop + targetElement.offsetHeight) - (this._flyoutDivElement.scrollTop + popupHeight);
                        _ElementUtilities._zoomTo(this._flyoutDivElement, { contentX: 0, contentY: (this._flyoutDivElement.scrollTop + scrollDifference), viewportX: 0, viewportY: 0 });
                    } else if (targetElement.offsetTop < this._flyoutDivElement.scrollTop) {
                        // Element to scroll is above popup visible area
                        _ElementUtilities._zoomTo(this._flyoutDivElement, { contentX: 0, contentY: targetElement.offsetTop, viewportX: 0, viewportY: 0 });
                    }
                },

                _querySuggestionRenderer: function SearchBox_querySuggestionRenderer(item) {
                    var root = _Global.document.createElement("div");

                    this._addHitHighlightedText(root, item, item.text);
                    root.title = item.text;

                    _ElementUtilities.addClass(root, ClassName.searchBoxSuggestionQuery);

                    var that = this;
                    _ElementUtilities._addEventListener(root, "pointerup", function (ev) {
                        that._inputElement.focus();
                        that._processSuggestionChosen(item, ev);
                    });

                    root.setAttribute("role", "option");
                    var ariaLabel = _Resources._formatString(strings.ariaLabelQuery, item.text);
                    root.setAttribute("aria-label", ariaLabel);
                    return root;
                },

                _separatorSuggestionRenderer: function SearchBox_separatorSuggestionRenderer(item) {
                    var root = _Global.document.createElement("div");
                    if (item.text.length > 0) {
                        var textElement = _Global.document.createElement("div");
                        textElement.textContent = item.text;
                        textElement.title = item.text;
                        textElement.setAttribute("aria-hidden", "true");
                        root.appendChild(textElement);
                    }
                    root.insertAdjacentHTML("beforeend", "<hr/>");
                    _ElementUtilities.addClass(root, ClassName.searchBoxSuggestionSeparator);
                    root.setAttribute("role", "separator");
                    var ariaLabel = _Resources._formatString(strings.ariaLabelSeparator, item.text);
                    root.setAttribute("aria-label", ariaLabel);
                    return root;
                },

                _resultSuggestionRenderer: function SearchBox_resultSuggestionRenderer(item) {
                    var root = _Global.document.createElement("div");
                    var image = new _Global.Image();
                    image.style.opacity = 0;
                    var loadImage = function (url) {
                        function onload() {
                            image.removeEventListener("load", onload, false);
                            Animations.fadeIn(image);
                        }
                        image.addEventListener("load", onload, false);
                        image.src = url;
                    };

                    if (item.image !== null) {
                        item.image.openReadAsync().then(function (streamWithContentType) {
                            if (streamWithContentType !== null) {
                                loadImage(_Global.URL.createObjectURL(streamWithContentType, { oneTimeOnly: true }));
                            }
                        });
                    } else if (item.imageUrl !== null) {
                        loadImage(item.imageUrl);
                    }
                    image.setAttribute("aria-hidden", "true");
                    root.appendChild(image);

                    var divElement = _Global.document.createElement("div");
                    _ElementUtilities.addClass(divElement, ClassName.searchBoxSuggestionResultText);
                    this._addHitHighlightedText(divElement, item, item.text);
                    divElement.title = item.text;
                    divElement.setAttribute("aria-hidden", "true");
                    root.appendChild(divElement);

                    var brElement = _Global.document.createElement("br");
                    divElement.appendChild(brElement);

                    var divDetailElement = _Global.document.createElement("span");
                    _ElementUtilities.addClass(divDetailElement, ClassName.searchBoxSuggestionResultDetailedText);
                    this._addHitHighlightedText(divDetailElement, item, item.detailText);
                    divDetailElement.title = item.detailText;
                    divDetailElement.setAttribute("aria-hidden", "true");
                    divElement.appendChild(divDetailElement);

                    _ElementUtilities.addClass(root, ClassName.searchBoxSuggestionResult);

                    var that = this;
                    _ElementUtilities._addEventListener(root, "pointerup", function (ev) {
                        that._inputElement.focus();
                        that._processSuggestionChosen(item, ev);
                    });

                    root.setAttribute("role", "option");
                    var ariaLabel = _Resources._formatString(strings.ariaLabelResult, item.text, item.detailText);
                    root.setAttribute("aria-label", ariaLabel);
                    return root;
                },

                _suggestionRenderer: function SearchBox_suggestionRenderer(item) {
                    var root = null;
                    if (!item) {
                        return root;
                    }
                    if (item.kind === _SearchSuggestionManagerShim._SearchSuggestionKind.Query) {
                        root = this._querySuggestionRenderer(item);
                    } else if (item.kind === _SearchSuggestionManagerShim._SearchSuggestionKind.Separator) {
                        root = this._separatorSuggestionRenderer(item);
                    } else if (item.kind === _SearchSuggestionManagerShim._SearchSuggestionKind.Result) {
                        root = this._resultSuggestionRenderer(item);
                    } else {
                        throw new _ErrorFromName("WinJS.UI.SearchBox.invalidSearchBoxSuggestionKind", strings.invalidSearchBoxSuggestionKind);
                    }

                    return root;
                },

                _setElement: function SearchBox_setElement(element) {
                    this._domElement = element;
                    _ElementUtilities.addClass(this._domElement, ClassName.searchBox);

                    this._inputElement = _Global.document.createElement("input");
                    this._inputElement.type = "search";
                    _ElementUtilities.addClass(this._inputElement, ClassName.searchBoxInput);

                    this._buttonElement = _Global.document.createElement("div");
                    this._buttonElement.tabIndex = -1;
                    _ElementUtilities.addClass(this._buttonElement, ClassName.searchBoxButton);

                    this._flyoutDivElement = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._flyoutDivElement, ClassName.searchBoxFlyout);

                    this._repeaterDivElement = _Global.document.createElement('div');
                    this._suggestionsData = new BindingList.List();
                    this._repeater = new Repeater.Repeater(this._repeaterDivElement, { data: this._suggestionsData, template: this._suggestionRendererBind });

                    this._domElement.appendChild(this._inputElement);
                    this._domElement.appendChild(this._buttonElement);
                    this._domElement.appendChild(this._flyoutDivElement);
                    this._flyoutDivElement.appendChild(this._repeaterDivElement);
                    this._hideFlyout();

                    this._wireupUserEvents();
                    this._wireupWinRTEvents();
                    this._wireupRepeaterEvents();
                },

                _setAccessibilityProperties: function Searchbox_setAccessibilityProperties() {
                    // Set up accessibility properties
                    var label = this._domElement.getAttribute("aria-label");
                    if (!label) {
                        this._domElement.setAttribute("aria-label", strings.ariaLabel);
                    }
                    this._domElement.setAttribute("role", "group");
                    this._updateInputElementAriaLabel();
                    this._inputElement.setAttribute("role", "textbox");
                    this._buttonElement.setAttribute("role", "button");
                    this._buttonElement.setAttribute("aria-label", strings.ariaLabelButton);
                    this._repeaterDivElement.setAttribute("role", "listbox");
                    _ElementUtilities._ensureId(this._repeaterDivElement);
                    this._inputElement.setAttribute("aria-controls", this._repeaterDivElement.id);
                    this._repeaterDivElement.setAttribute("aria-live", "polite");
                },

                _updateInputElementAriaLabel: function Searchbox_updateInputElementAriaLabel() {
                    var ariaLabel = strings.ariaLabelInputNoPlaceHolder;
                    if (this._inputElement.placeholder && this._inputElement.placeholder) {
                        ariaLabel = _Resources._formatString(strings.ariaLabelInputPlaceHolder, this._inputElement.placeholder);
                    }
                    this._inputElement.setAttribute("aria-label", ariaLabel);
                },

                _submitQuery: function Searchbox_submitQuery(queryText, fillLinguisticDetails, event) {
                    if (this._disposed) {
                        return;
                    }

                    // get the most up to date value of the input langauge from WinRT if available
                    if (_WinRT.Windows.Globalization.Language) {
                        this._lastKeyPressLanguage = _WinRT.Windows.Globalization.Language.currentInputMethodLanguageTag;
                    }

                    this._fireEvent(SearchBox._EventName.querysubmitted, {
                        language: this._lastKeyPressLanguage,
                        linguisticDetails: this._getLinguisticDetails(true /*useCache*/, fillLinguisticDetails), // allow caching, but generate empty linguistic details if suggestion is used
                        queryText: queryText,
                        keyModifiers: SearchBox._getKeyModifiers(event)
                    });

                    if (this._searchSuggestionManager) {
                        this._searchSuggestionManager.addToHistory(
                            this._inputElement.value,
                            this._lastKeyPressLanguage
                            );
                    }
                },

                _processSuggestionChosen: function Searchbox_processSuggestionChosen(item, event) {
                    this.queryText = item.text;
                    if (item.kind === _SearchSuggestionManagerShim._SearchSuggestionKind.Query) {
                        this._submitQuery(item.text, false /*fillLinguisticDetails*/, event); // force empty linguistic details since explicitly chosen suggestion from list
                    } else if (item.kind === _SearchSuggestionManagerShim._SearchSuggestionKind.Result) {
                        this._fireEvent(SearchBox._EventName.resultsuggestionchosen, {
                            tag: item.tag,
                            keyModifiers: SearchBox._getKeyModifiers(event),
                            storageFile: null
                        });
                    }
                    this._hideFlyout();
                },

                _buttonClickHandler: function SearchBox_buttonClickHandler(event) {
                    this._inputElement.focus();
                    this._submitQuery(this._inputElement.value, true /*fillLinguisticDetails*/, event);
                    this._hideFlyout();
                },

                _inputOrImeChangeHandler: function SearchBox_inputImeChangeHandler() {
                    var isButtonDown = _ElementUtilities._matchesSelector(this._buttonElement, ":active");
                    // swallow the IME change event that gets fired when composition is ended due to keyboarding down to the suggestion list & mouse down on the button
                    if (!this._isProcessingImeFocusLossKey() && !isButtonDown && !this._isFlyoutPointerDown) {
                        var linguisticDetails = this._getLinguisticDetails(false /*useCache*/, true /*createFilled*/); // never cache on explicit user changes
                        var hasLinguisticDetailsChanged = this._hasLinguisticDetailsChanged(linguisticDetails); // updates this._prevLinguisticDetails

                        // Keep the previous composition cache up to date, execpt when composition ended with no text change and alternatives are kept.
                        // In that case, we need to use the cached values to correctly generate the query prefix/suffix for substituting alternatives, but still report to the client that the composition has ended (via start & length of composition of 0)
                        if ((this._inputElement.value !== this._prevQueryText) || (this._prevCompositionLength === 0) || (linguisticDetails.queryTextCompositionLength > 0)) {
                            this._prevCompositionStart = linguisticDetails.queryTextCompositionStart;
                            this._prevCompositionLength = linguisticDetails.queryTextCompositionLength;
                        }

                        if ((this._prevQueryText === this._inputElement.value) && !hasLinguisticDetailsChanged) {
                            // Sometimes the input change is fired even if there is no change in input.
                            // Swallow event in those cases.
                            return;
                        }
                        this._prevQueryText = this._inputElement.value;

                        // get the most up to date value of the input langauge from WinRT if available
                        if (_WinRT.Windows.Globalization.Language) {
                            this._lastKeyPressLanguage = _WinRT.Windows.Globalization.Language.currentInputMethodLanguageTag;
                        }

                        if (_WinRT.Windows.Data.Text.SemanticTextQuery) {
                            if (this._inputElement.value !== "") {
                                this._hitFinder = new _WinRT.Windows.Data.Text.SemanticTextQuery(this._inputElement.value, this._lastKeyPressLanguage);
                            } else {
                                this._hitFinder = null;
                            }
                        }

                        this._fireEvent(SearchBox._EventName.querychanged, {
                            language: this._lastKeyPressLanguage,
                            queryText: this._inputElement.value,
                            linguisticDetails: linguisticDetails
                        });
                        if (this._searchSuggestionManager) {
                            this._searchSuggestionManager.setQuery(
                                this._inputElement.value,
                                this._lastKeyPressLanguage,
                                linguisticDetails
                                );
                        }
                    }
                },

                _createSearchQueryLinguisticDetails: function SearchBox_createSearchQueryLinguisticDetails(compositionAlternatives, compositionStartOffset, compositionLength, queryTextPrefix, queryTextSuffix) {
                    var linguisticDetails = null;

                    // The linguistic alternatives we receive are only for the composition string being composed. We need to provide the linguistic alternatives
                    // in the form of the full query text with alternatives embedded.
                    var fullCompositionAlternatives = [];
                    for (var i = 0; i < compositionAlternatives.length; i++) {
                        fullCompositionAlternatives[i] = queryTextPrefix + compositionAlternatives[i] + queryTextSuffix;
                    }

                    if (_WinRT.Windows.ApplicationModel.Search.SearchQueryLinguisticDetails) {
                        linguisticDetails = new _WinRT.Windows.ApplicationModel.Search.SearchQueryLinguisticDetails(fullCompositionAlternatives, compositionStartOffset, compositionLength);
                    } else {
                        // If we're in web compartment, create a script version of the WinRT SearchQueryLinguisticDetails object
                        linguisticDetails = {
                            queryTextAlternatives: fullCompositionAlternatives,
                            queryTextCompositionStart: compositionStartOffset,
                            queryTextCompositionLength: compositionLength
                        };
                    }
                    return linguisticDetails;
                },

                _getLinguisticDetails: function SearchBox_getLinguisticDetails(useCache, createFilled) { // createFilled=false always creates an empty linguistic details object, otherwise generate it or use the cache
                    var linguisticDetails = null;
                    if ((this._inputElement.value === this._prevQueryText) && useCache && this._prevLinguisticDetails && createFilled) {
                        linguisticDetails = this._prevLinguisticDetails;
                    } else {
                        var compositionAlternatives = [];
                        var compositionStartOffset = 0;
                        var compositionLength = 0;
                        var queryTextPrefix = "";
                        var queryTextSuffix = "";
                        if (createFilled && this._inputElement.msGetInputContext && this._inputElement.msGetInputContext().getCompositionAlternatives) {
                            var context = this._inputElement.msGetInputContext();
                            compositionAlternatives = context.getCompositionAlternatives();
                            compositionStartOffset = context.compositionStartOffset;
                            compositionLength = context.compositionEndOffset - context.compositionStartOffset;

                            if ((this._inputElement.value !== this._prevQueryText) || (this._prevCompositionLength === 0) || (compositionLength > 0)) {
                                queryTextPrefix = this._inputElement.value.substring(0, compositionStartOffset);
                                queryTextSuffix = this._inputElement.value.substring(compositionStartOffset + compositionLength);
                            } else {
                                // composition ended, but alternatives have been kept, need to reuse the previous query prefix/suffix, but still report to the client that the composition has ended (start & length of composition of 0)
                                queryTextPrefix = this._inputElement.value.substring(0, this._prevCompositionStart);
                                queryTextSuffix = this._inputElement.value.substring(this._prevCompositionStart + this._prevCompositionLength);
                            }
                        }
                        linguisticDetails = this._createSearchQueryLinguisticDetails(compositionAlternatives, compositionStartOffset, compositionLength, queryTextPrefix, queryTextSuffix);
                    }
                    return linguisticDetails;
                },

                _handleTabKeyDown: function SearchBox_handleTabKeyDown(event) {
                    var closeFlyout = true;
                    if (event.shiftKey) {
                        // If focus is not in input
                        if (this._currentFocusedIndex !== -1) {
                            // Remove selection.
                            this._currentFocusedIndex = -1;
                            this._selectSuggestionAtIndex(this._currentFocusedIndex);
                            this._updateSearchButtonClass();
                            event.preventDefault();
                            event.stopPropagation();
                            closeFlyout = false;
                        }
                    } else if (this._currentFocusedIndex === -1) {
                        if (this._isFlyoutBelow()) {
                            // Move to first element
                            this._currentFocusedIndex = this._findNextSuggestionElementIndex(this._currentFocusedIndex);
                        } else {
                            // Move to last element
                            this._currentFocusedIndex = this._findPreviousSuggestionElementIndex(this._suggestionsData.length);
                        }
                        if (this._currentFocusedIndex !== -1) {
                            this._selectSuggestionAtIndex(this._currentFocusedIndex);
                            this._updateQueryTextWithSuggestionText(this._currentFocusedIndex);
                            this._updateSearchButtonClass();
                            event.preventDefault();
                            event.stopPropagation();
                            closeFlyout = false;
                        }
                    }

                    if (closeFlyout) {
                        this._hideFlyout();
                    }
                },

                _keyDownHandler: function SearchBox_keyDownHandler(event) {
                    this._lastKeyPressLanguage = event.locale;
                    if (event.keyCode === Key.tab) {
                        this._isProcessingTabKey = true;
                    } else if (event.keyCode === Key.upArrow) {
                        this._isProcessingUpKey = true;
                    } else if (event.keyCode === Key.downArrow) {
                        this._isProcessingDownKey = true;
                    } else if ((event.keyCode === Key.enter) && (event.locale === "ko")) {
                        this._isProcessingEnterKey = true;
                    }
                    // Ignore keys handled by ime.
                    if (event.keyCode !== Key.IME) {
                        if (event.keyCode === Key.tab) {
                            this._handleTabKeyDown(event);
                        } else if (event.keyCode === Key.escape) {
                            // If focus is not in input
                            if (this._currentFocusedIndex !== -1) {
                                this.queryText = this._prevQueryText;
                                this._currentFocusedIndex = -1;
                                this._selectSuggestionAtIndex(this._currentFocusedIndex);
                                this._updateSearchButtonClass();
                                event.preventDefault();
                                event.stopPropagation();
                            } else if (this.queryText !== "") {
                                this.queryText = "";
                                this._inputOrImeChangeHandler(null);
                                this._updateSearchButtonClass();
                                event.preventDefault();
                                event.stopPropagation();
                            }
                        } else if (event.keyCode === Key.upArrow) {
                            var prevIndex;
                            if (this._currentSelectedIndex !== -1) {
                                prevIndex = this._findPreviousSuggestionElementIndex(this._currentSelectedIndex);
                                // Restore user entered query when user navigates back to input.
                                if (prevIndex === -1) {
                                    this.queryText = this._prevQueryText;
                                }
                            } else {
                                prevIndex = this._findPreviousSuggestionElementIndex(this._suggestionsData.length);
                            }
                            this._currentFocusedIndex = prevIndex;
                            this._selectSuggestionAtIndex(prevIndex);
                            this._updateQueryTextWithSuggestionText(this._currentFocusedIndex);
                            this._updateSearchButtonClass();
                            event.preventDefault();
                            event.stopPropagation();
                        } else if (event.keyCode === Key.downArrow) {
                            var nextIndex = this._findNextSuggestionElementIndex(this._currentSelectedIndex);
                            // Restore user entered query when user navigates back to input.
                            if ((this._currentSelectedIndex !== -1) && (nextIndex === -1)) {
                                this.queryText = this._prevQueryText;
                            }
                            this._currentFocusedIndex = nextIndex;
                            this._selectSuggestionAtIndex(nextIndex);
                            this._updateQueryTextWithSuggestionText(this._currentFocusedIndex);
                            this._updateSearchButtonClass();
                            event.preventDefault();
                            event.stopPropagation();
                        } else if (event.keyCode === Key.enter) {
                            if (this._currentSelectedIndex === -1) {
                                this._submitQuery(this._inputElement.value, true /*fillLinguisticDetails*/, event);
                            } else {
                                this._processSuggestionChosen(this._suggestionsData.getAt(this._currentSelectedIndex), event);
                            }
                            this._hideFlyout();
                        } else if (SearchBox._isTypeToSearchKey(event)) {
                            // Type to search on suggestions scenario.
                            if (this._currentFocusedIndex !== -1) {
                                this._currentFocusedIndex = -1;
                                this._selectSuggestionAtIndex(-1);
                                this._updateFakeFocus();
                            }
                        }
                    }
                },

                _keyPressHandler: function SearchBox_keyPressHandler(event) {
                    this._lastKeyPressLanguage = event.locale;
                },

                _keyUpHandler: function SearchBox_keyUpHandler(event) {
                    if (event.keyCode === Key.tab) {
                        this._isProcessingTabKey = false;
                    } else if (event.keyCode === Key.upArrow) {
                        this._isProcessingUpKey = false;
                    } else if (event.keyCode === Key.downArrow) {
                        this._isProcessingDownKey = false;
                    } else if (event.keyCode === Key.enter) {
                        this._isProcessingEnterKey = false;
                    }
                },

                _searchBoxFocusHandler: function SearchBox__searchBoxFocusHandler(event) {
                    // Refresh hit highlighting if text has changed since focus was present
                    // This can happen if the user committed a suggestion previously.
                    if (this._inputElement.value !== this._prevQueryText) {
                        if (_WinRT.Windows.Data.Text.SemanticTextQuery) {
                            if (this._inputElement.value !== "") {
                                this._hitFinder = new _WinRT.Windows.Data.Text.SemanticTextQuery(this._inputElement.value, this._inputElement.lang);
                            } else {
                                this._hitFinder = null;
                            }
                        }
                    }

                    // If focus is returning to the input box from outside the search control, show the flyout and refresh the suggestions
                    if ((event.target === this._inputElement) && !this._isElementInSearchControl(event.relatedTarget)) {
                        this._showFlyout();
                        // If focus is not in input
                        if (this._currentFocusedIndex !== -1) {
                            this._selectSuggestionAtIndex(this._currentFocusedIndex);
                        } else {
                            this._updateFakeFocus();
                        }

                        if (this._searchSuggestionManager) {
                            this._searchSuggestionManager.setQuery(
                                this._inputElement.value,
                                this._lastKeyPressLanguage,
                                this._getLinguisticDetails(true /*useCache*/, true /*createFilled*/)
                                );
                        }
                    }

                    _ElementUtilities.addClass(this.element, ClassName.searchBoxInputFocus);
                    this._updateSearchButtonClass();
                },

                _searchBoxBlurHandler: function SearchBox_searchBoxBlurHandler(event) {
                    this._hideFlyoutIfLeavingSearchControl(event.relatedTarget);
                    _ElementUtilities.removeClass(this.element, ClassName.searchBoxInputFocus);
                    this._updateSearchButtonClass();
                    this._isProcessingDownKey = false;
                    this._isProcessingUpKey = false;
                    this._isProcessingTabKey = false;
                    this._isProcessingEnterKey = false;
                },

                _isIMEOccludingFlyout: function SearchBox_isIMEOccludingFlyout(imeRect) {
                    var flyoutTop = this._getFlyoutTop();
                    var flyoutBottom = this._getFlyoutBottom();
                    if (((imeRect.top >= flyoutTop) && (imeRect.top <= flyoutBottom)) ||
                        ((imeRect.bottom >= flyoutTop) && (imeRect.bottom <= flyoutBottom))) {
                        return true;
                    }
                    return false;
                },

                _addFlyoutIMEPaddingIfRequired: function SearchBox_addFlyoutIMEPaddingIfRequired() {
                    if (this._isFlyoutShown() && this._isFlyoutBelow() && this._inputElement.msGetInputContext && this._inputElement.msGetInputContext()) {
                        var context = this._inputElement.msGetInputContext();
                        var rect = context.getCandidateWindowClientRect();
                        if (this._isIMEOccludingFlyout(rect)) {
                            var animation = Animations.createRepositionAnimation(this._flyoutDivElement.children);
                            this._flyoutDivElement.style.paddingTop = (rect.bottom - rect.top) + "px";
                            animation.execute();
                        }
                    }
                },

                _msCandidateWindowShowHandler: function SearchBox_msCandidateWindowShowHandler() {
                    this._addFlyoutIMEPaddingIfRequired();
                    this._reflowImeOnPointerRelease = false;
                },

                _msCandidateWindowHideHandler: function SearchBox_msCandidateWindowHideHandler() {
                    if (!this._isFlyoutPointerDown) {
                        var animation = Animations.createRepositionAnimation(this._flyoutDivElement.children);
                        this._flyoutDivElement.style.paddingTop = "";
                        animation.execute();
                    } else {
                        this._reflowImeOnPointerRelease = true;
                    }
                },

                _wireupUserEvents: function SearchBox_wireupUserEvents() {
                    var inputOrImeChangeHandler = this._inputOrImeChangeHandler.bind(this);
                    this._buttonElement.addEventListener("click", this._buttonClickHandler.bind(this));
                    this._inputElement.addEventListener("input", inputOrImeChangeHandler);
                    this._inputElement.addEventListener("keydown", this._keyDownHandler.bind(this));
                    this._inputElement.addEventListener("keypress", this._keyPressHandler.bind(this));
                    this._inputElement.addEventListener("keyup", this._keyUpHandler.bind(this));
                    this._inputElement.addEventListener("focus", this._searchBoxFocusHandler.bind(this));
                    this._inputElement.addEventListener("blur", this._searchBoxBlurHandler.bind(this));
                    _ElementUtilities._addEventListener(this._inputElement, "pointerdown", this._inputPointerDownHandler.bind(this));
                    _ElementUtilities._addEventListener(this._flyoutDivElement, "pointerdown", this._flyoutPointerDownHandler.bind(this));
                    _ElementUtilities._addEventListener(this._flyoutDivElement, "pointerup", this._flyoutPointerReleasedHandler.bind(this));
                    _ElementUtilities._addEventListener(this._flyoutDivElement, "pointercancel", this._flyoutPointerReleasedHandler.bind(this));
                    _ElementUtilities._addEventListener(this._flyoutDivElement, "pointerout", this._flyoutPointerReleasedHandler.bind(this));

                    this._inputElement.addEventListener("compositionstart", inputOrImeChangeHandler);
                    this._inputElement.addEventListener("compositionupdate", inputOrImeChangeHandler);
                    this._inputElement.addEventListener("compositionend", inputOrImeChangeHandler);

                    if (this._inputElement.msGetInputContext && this._inputElement.msGetInputContext()) {
                        var context = this._inputElement.msGetInputContext();
                        context.addEventListener("MSCandidateWindowShow", this._msCandidateWindowShowHandler.bind(this));
                        context.addEventListener("MSCandidateWindowHide", this._msCandidateWindowHideHandler.bind(this));
                    }
                },

                _repeaterChangedHandler: function SearchBox_repeaterChangedHandler() {
                    this._updateFlyoutTopAndTouchAction();
                    if (this._isFlyoutShown()) {
                        this._repeaterDivElement.style.display = "none";
                        this._repeaterDivElement.style.display = "block";
                    }
                },

                _wireupRepeaterEvents: function SearchBox_wireupRepeaterEvents() {
                    var repeaterChangeHandler = this._repeaterChangedHandler.bind(this);
                    this._repeater.addEventListener("itemchanged", repeaterChangeHandler);
                    this._repeater.addEventListener("iteminserted", repeaterChangeHandler);
                    this._repeater.addEventListener("itemremoved", repeaterChangeHandler);
                    this._repeater.addEventListener("itemsreloaded", repeaterChangeHandler);
                },

                _inputPointerDownHandler: function SearchBox_inputPointerDownHandler() {
                    if ((_Global.document.activeElement === this._inputElement) && (this._currentSelectedIndex !== -1)) {
                        this._currentFocusedIndex = -1;
                        this._selectSuggestionAtIndex(this._currentFocusedIndex);
                    }
                },

                _flyoutPointerDownHandler: function SearchBox_flyoutPointerDownHandler(ev) {
                    this._isFlyoutPointerDown = true;
                    var srcElement = ev.target;
                    while (srcElement && (srcElement.parentNode !== this._repeaterDivElement)) {
                        srcElement = srcElement.parentNode;
                    }
                    var index = this._findSuggestionElementIndex(srcElement);
                    if ((index >= 0) && (index < this._suggestionsData.length) && (this._currentFocusedIndex !== index)) {
                        if (this._isSuggestionSelectable(this._suggestionsData.getAt(index))) {
                            this._currentFocusedIndex = index;
                            this._selectSuggestionAtIndex(index);
                            this._updateQueryTextWithSuggestionText(this._currentFocusedIndex);
                        }
                    }
                    // Prevent default so focus does not leave input element.
                    ev.preventDefault();
                },

                _flyoutPointerReleasedHandler: function SearchBox_flyoutPointerReleasedHandler() {
                    this._isFlyoutPointerDown = false;

                    if (this._reflowImeOnPointerRelease) {
                        this._reflowImeOnPointerRelease = false;
                        var animation = Animations.createRepositionAnimation(this._flyoutDivElement.children);
                        this._flyoutDivElement.style.paddingTop = "";
                        animation.execute();
                    }
                },

                _isElementInSearchControl: function SearchBox_isElementInSearchControl(targetElement) {
                    return this.element.contains(targetElement) || (this.element === targetElement);
                },

                _hideFlyoutIfLeavingSearchControl: function SearchBox__hideFlyoutIfLeavingSearchControl(targetElement) {
                    if (!this._isFlyoutShown()) {
                        return;
                    }
                    if (!this._isElementInSearchControl(targetElement)) {
                        this._hideFlyout();
                    }
                },

                _wireupWinRTEvents: function SearchBox_wireupWinRTEvents() {
                    this._searchSuggestions.addEventListener("vectorchanged", this._suggestionsChangedHandlerBind);
                    this._searchSuggestionManager.addEventListener("suggestionsrequested", this._suggestionsRequestedHandlerBind);
                },

                _suggestionsChangedHandler: function SearchBox_suggestionsChangedHandler(event) {
                    var collectionChange = event.collectionChange || event.detail.collectionChange;
                    var changeIndex = (+event.index === event.index) ? event.index : event.detail.index;
                    var ChangeEnum = _SearchSuggestionManagerShim._CollectionChange;
                    if (collectionChange === ChangeEnum.reset) {
                        if (this._isFlyoutShown()) {
                            this._hideFlyout();
                        }
                        this._suggestionsData.splice(0, this._suggestionsData.length);
                    } else if (collectionChange === ChangeEnum.itemInserted) {
                        var suggestion = this._searchSuggestions[changeIndex];
                        this._suggestionsData.splice(changeIndex, 0, suggestion);

                        this._showFlyout();

                    } else if (collectionChange === ChangeEnum.itemRemoved) {
                        if ((this._suggestionsData.length === 1)) {
                            _ElementUtilities._setActive(this._inputElement);

                            this._hideFlyout();
                        }
                        this._suggestionsData.splice(changeIndex, 1);
                    } else if (collectionChange === ChangeEnum.itemChanged) {
                        var suggestion = this._searchSuggestions[changeIndex];
                        if (suggestion !== this._suggestionsData.getAt(changeIndex)) {
                            this._suggestionsData.setAt(changeIndex, suggestion);
                        } else {
                            // If the suggestions manager gives us an identical item, it means that only the hit highlighted text has changed.
                            var existingElement = this._repeater.elementFromIndex(changeIndex);
                            if (_ElementUtilities.hasClass(existingElement, ClassName.searchBoxSuggestionQuery)) {
                                this._addHitHighlightedText(existingElement, suggestion, suggestion.text);
                            } else {
                                var resultSuggestionDiv = existingElement.querySelector("." + ClassName.searchBoxSuggestionResultText);
                                if (resultSuggestionDiv) {
                                    this._addHitHighlightedText(resultSuggestionDiv, suggestion, suggestion.text);
                                    var resultSuggestionDetailDiv = existingElement.querySelector("." + ClassName.searchBoxSuggestionResultDetailedText);
                                    if (resultSuggestionDetailDiv) {
                                        this._addHitHighlightedText(resultSuggestionDetailDiv, suggestion, suggestion.detailText);
                                    }
                                }
                            }
                        }
                    }

                    if (_Global.document.activeElement === this._inputElement) {
                        this._updateFakeFocus();
                    }
                },

                _suggestionsRequestedHandler: function SearchBox_suggestionsRequestedHandler(event) {
                    // get the most up to date value of the input langauge from WinRT if available
                    if (_WinRT.Windows.Globalization.Language) {
                        this._lastKeyPressLanguage = _WinRT.Windows.Globalization.Language.currentInputMethodLanguageTag;
                    }

                    var request = event.request || event.detail.request;
                    var deferral;
                    this._fireEvent(SearchBox._EventName.suggestionsrequested, {
                        setPromise: function (promise) {
                            deferral = request.getDeferral();
                            promise.then(function () {
                                deferral.complete();
                            });
                        },
                        searchSuggestionCollection: request.searchSuggestionCollection,
                        language: this._lastKeyPressLanguage,
                        linguisticDetails: this._getLinguisticDetails(true /*useCache*/, true /*createFilled*/),
                        queryText: this._inputElement.value
                    });
                },

                _fireEvent: function SearchBox_fireEvent(type, detail) {
                    // Returns true if ev.preventDefault() was not called
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent(type, true, true, detail);
                    return this.element.dispatchEvent(event);
                },

                _requestingFocusOnKeyboardInputHandler: function SearchBox_requestingFocusOnKeyboardInputHandler() {
                    this._fireEvent(SearchBox._EventName.receivingfocusonkeyboardinput, null);
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

                _hasLinguisticDetailsChanged: function SearchBox_hasLinguisticDetailsChanged(newLinguisticDetails) {
                    var hasLinguisticDetailsChanged = false;
                    if ((this._prevLinguisticDetails.queryTextCompositionStart !== newLinguisticDetails.queryTextCompositionStart) ||
                        (this._prevLinguisticDetails.queryTextCompositionLength !== newLinguisticDetails.queryTextCompositionLength) ||
                        (this._prevLinguisticDetails.queryTextAlternatives.length !== newLinguisticDetails.queryTextAlternatives.length)) {
                        hasLinguisticDetailsChanged = true;
                    }
                    this._prevLinguisticDetails = newLinguisticDetails;
                    return hasLinguisticDetailsChanged;
                },

                _isProcessingImeFocusLossKey: function SearchBox_isProcessingImeFocusLossKey() {
                    return this._isProcessingDownKey || this._isProcessingUpKey || this._isProcessingTabKey || this._isProcessingEnterKey;
                },

                _updateQueryTextWithSuggestionText: function SearchBox_updateQueryTextWithSuggestionText(suggestionIndex) {
                    if ((suggestionIndex >= 0) && (suggestionIndex < this._suggestionsData.length)) {
                        this.queryText = this._suggestionsData.getAt(suggestionIndex).text;
                    }
                }

            }, {
                _EventName: {
                    querychanged: EventName.querychanged,
                    querysubmitted: EventName.querysubmitted,
                    resultsuggestionchosen: EventName.resultsuggestionchosen,
                    suggestionsrequested: EventName.suggestionsrequested,
                    receivingfocusonkeyboardinput: EventName.receivingfocusonkeyboardinput
                },

                _Constants: {
                    MIN_POPUP_HEIGHT: 152,
                },

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

                _sortAndMergeHits: function searchBox_sortAndMergeHits(hitsProvided) {
                    var reducedHits = [];
                    if (hitsProvided) {
                        // Copy hitsprovided array as winrt objects are immutable.
                        var hits = new Array(hitsProvided.length);
                        for (var i = 0; i < hitsProvided.length; i++) {
                            hits.push({ startPosition: hitsProvided[i].startPosition, length: hitsProvided[i].length });
                        }
                        hits.sort(SearchBox._hitStartPositionAscendingSorter);
                        hits.reduce(SearchBox._hitIntersectionReducer, reducedHits);
                    }
                    return reducedHits;
                },

                _hitStartPositionAscendingSorter: function searchBox_hitStartPositionAscendingSorter(firstHit, secondHit) {
                    var returnValue = 0;
                    if (firstHit.startPosition < secondHit.startPosition) {
                        returnValue = -1;
                    } else if (firstHit.startPosition > secondHit.startPosition) {
                        returnValue = 1;
                    }
                    return returnValue;
                },

                _hitIntersectionReducer: function searchBox_hitIntersectionReducer(reducedHits, nextHit, currentIndex) {
                    if (currentIndex === 0) {
                        reducedHits.push(nextHit);
                    } else {
                        var curHit = reducedHits[reducedHits.length - 1];
                        var curHitEndPosition = curHit.startPosition + curHit.length;
                        if (nextHit.startPosition <= curHitEndPosition) {
                            // The next hit intersects or is next to current hit. Merge it.
                            var nextHitEndPosition = nextHit.startPosition + nextHit.length;
                            if (nextHitEndPosition > curHitEndPosition) {
                                curHit.length = nextHitEndPosition - curHit.startPosition;
                            }
                        } else {
                            // No intersection, simply add to reduced list.
                            reducedHits.push(nextHit);
                        }
                    }
                    return reducedHits;
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
