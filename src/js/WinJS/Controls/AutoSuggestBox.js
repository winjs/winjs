// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    "exports",
    "../Core/_Global",
    "../Core/_WinRT",
    "../Core/_Base",
    "../Core/_ErrorFromName",
    "../Core/_Events",
    "../Core/_Resources",
    "../Utilities/_Control",
    "../Utilities/_ElementListUtilities",
    "../Utilities/_ElementUtilities",
    '../Utilities/_Hoverable',
    "../Animations",
    "../BindingList",
    "../Promise",
    "./Repeater",
    "./AutoSuggestBox/_SearchSuggestionManagerShim",
], function autoSuggestBoxInit(exports, _Global, _WinRT, _Base, _ErrorFromName, _Events, _Resources, _Control, _ElementListUtilities, _ElementUtilities, _Hoverable, Animations, BindingList, Promise, Repeater, _SuggestionManagerShim) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.AutoSuggestBox">
        /// A rich input box that provides suggestions as the user types.
        /// </summary>
        /// <compatibleWith platform="Windows" minVersion="8.1"/>
        /// </field>
        /// <icon src="ui_winjs.ui.autosuggest.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.autosuggest.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<div data-win-control="WinJS.UI.AutoSuggestBox"></div>]]></htmlSnippet>
        /// <event name="querychanged" bubbles="true" locid="WinJS.UI.AutoSuggestBox:querychanged">Raised when user or app changes the query text.</event>
        /// <event name="querysubmitted" bubbles="true" locid="WinJS.UI.AutoSuggestBox:querysubmitted">Raised when user presses Enter.</event>
        /// <event name="resultsuggestionchosen" bubbles="true" locid="WinJS.UI.AutoSuggestBox:resultsuggestionchosen">Raised when user clicks  one of the displayed suggestions.</event>
        /// <event name="suggestionsrequested" bubbles="true" locid="WinJS.UI.AutoSuggestBox:suggestionsrequested">Raised when the system requests suggestions from this app.</event>
        /// <part name="autosuggestbox" class="win-autosuggestbox" locid="WinJS.UI.AutoSuggestBox:autosuggest">Styles the entire Auto Suggest Box control.</part>
        /// <part name="autosuggestbox-input" class="win-autosuggestbox-input" locid="WinJS.UI.AutoSuggestBox_part:Input">Styles the query input box.</part>
        /// <part name="autosuggestbox-flyout" class="win-autosuggestbox-flyout" locid="WinJS.UI.AutoSuggestBox_part:Flyout">Styles the result suggestions flyout.</part>
        /// <part name="autosuggestbox-suggestion-query" class="win-autosuggestbox-suggestion-query" locid="WinJS.UI.AutoSuggestBox_part:Suggestion_Query">Styles the query type suggestion.</part>
        /// <part name="autosuggestbox-suggestion-result" class="win-autosuggestbox-suggestion-result" locid="WinJS.UI.AutoSuggestBox_part:Suggestion_Result">Styles the result type suggestion.</part>
        /// <part name="autosuggestbox-suggestion-selected" class="win-autosuggestbox-suggestion-selected" locid="WinJS.UI.AutoSuggestBox_part:Suggestion_Selected">Styles the currently selected suggestion.</part>
        /// <part name="autosuggestbox-suggestion-separator" class="win-autosuggestbox-suggestion-separator" locid="WinJS.UI.AutoSuggestBox_part:Suggestion_Separator">Styles the separator type suggestion.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        AutoSuggestBox: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            var ClassNames = {
                asb: "win-autosuggestbox",
                asbDisabled: "win-autosuggestbox-disabled",
                asbFlyout: "win-autosuggestbox-flyout",
                asbFlyoutAbove: "win-autosuggestbox-flyout-above",
                asbBoxFlyoutHighlightText: "win-autosuggestbox-flyout-highlighttext",
                asbHitHighlightSpan: "win-autosuggestbox-hithighlight-span",
                asbInput: "win-autosuggestbox-input",
                asbInputFocus: "win-autosuggestbox-input-focus",
                asbSuggestionQuery: "win-autosuggestbox-suggestion-query",
                asbSuggestionResult: "win-autosuggestbox-suggestion-result",
                asbSuggestionResultText: "win-autosuggestbox-suggestion-result-text",
                asbSuggestionResultDetailedText: "win-autosuggestbox-suggestion-result-detailed-text",
                asbSuggestionSelected: "win-autosuggestbox-suggestion-selected",
                asbSuggestionSeparator: "win-autosuggestbox-suggestion-separator",
            };

            var EventNames = {
                querychanged: "querychanged",
                querysubmitted: "querysubmitted",
                resultsuggestionchosen: "resultsuggestionchosen",
                suggestionsrequested: "suggestionsrequested"
            };

            var Strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get invalidSuggestionKind() { return "Error: Invalid suggestion kind."; },

                get ariaLabel() { return _Resources._getWinJSString("ui/autoSuggestBoxAriaLabel").value; },
                get ariaLabelInputNoPlaceHolder() { return _Resources._getWinJSString("ui/autoSuggestBoxAriaLabelInputNoPlaceHolder").value; },
                get ariaLabelInputPlaceHolder() { return _Resources._getWinJSString("ui/autoSuggestBoxAriaLabelInputPlaceHolder").value; },
                get ariaLabelQuery() { return _Resources._getWinJSString("ui/autoSuggestBoxAriaLabelQuery").value; },
                get ariaLabelResult() { return _Resources._getWinJSString("ui/autoSuggestBoxAriaLabelResult").value; },
                get ariaLabelSeparator() { return _Resources._getWinJSString("ui/autoSuggestBoxAriaLabelSeparator").value; },
            };

            var AutoSuggestBox = _Base.Class.define(function asb_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.AutoSuggestBox.AutoSuggestBox">
                /// <summary locid="WinJS.UI.AutoSuggestBox.constructor">
                /// Creates a new AutoSuggestBox.
                /// </summary>
                /// <param name="element" domElement="true" locid="WinJS.UI.AutoSuggestBox.constructor_p:element">
                /// The DOM element that hosts the AutoSuggestBox.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.AutoSuggestBox.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// Event names must begin with "on". For example, to provide a handler for the querychanged event,
                /// add a property named "onquerychanged" to the options object and set its value to the event handler.
                /// This parameter is optional.
                /// </param>
                /// <returns type="WinJS.UI.AutoSuggestBox" locid="WinJS.UI.AutoSuggestBox.constructor_returnValue">
                /// The new AutoSuggestBox.
                /// </returns>
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </signature>
                element = element || _Global.document.createElement("div");
                options = options || {};

                if (element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.AutoSuggestBox.DuplicateConstruction", Strings.duplicateConstruction);
                }

                this._suggestionsChangedHandler = this._suggestionsChangedHandler.bind(this);
                this._suggestionsRequestedHandler = this._suggestionsRequestedHandler.bind(this);

                this._element = element;
                element.winControl = this;
                element.classList.add(ClassNames.asb);
                element.classList.add("win-disposable");

                this._setupDOM();
                this._setupSSM();

                this._chooseSuggestionOnEnter = false;
                this._currentFocusedIndex = -1;
                this._currentSelectedIndex = -1;
                this._flyoutOpenPromise = Promise.wrap();
                this._lastKeyPressLanguage = "";
                this._prevLinguisticDetails = this._getLinguisticDetails();
                this._prevQueryText = "";

                _Control.setOptions(this, options);

                this._hideFlyout();
            }, {
                /// <field type="Function" locid="WinJS.UI.AutoSuggestBox.onresultsuggestionchosen" helpKeyword="WinJS.UI.AutoSuggestBox.onresultsuggestionchosen">
                /// Raised when user clicks on one of the suggestions displayed.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                onresultsuggestionchosen: _Events._createEventProperty(EventNames.resultsuggestionchosen),

                /// <field type="Function" locid="WinJS.UI.AutoSuggestBox.onquerychanged" helpKeyword="WinJS.UI.AutoSuggestBox.onquerychanged">
                /// Raised when user or app changes the query text.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                onquerychanged: _Events._createEventProperty(EventNames.querychanged),

                /// <field type="Function" locid="WinJS.UI.AutoSuggestBox.onquerysubmitted" helpKeyword="WinJS.UI.AutoSuggestBox.onquerysubmitted">
                /// Raised when user submits the current query.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                onquerysubmitted: _Events._createEventProperty(EventNames.querysubmitted),

                /// <field type="Function" locid="WinJS.UI.AutoSuggestBox.onsuggestionsrequested" helpKeyword="WinJS.UI.AutoSuggestBox.onsuggestionsrequested">
                /// Raised when Windows requests search suggestions from the app.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                onsuggestionsrequested: _Events._createEventProperty(EventNames.suggestionsrequested),

                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.AutoSuggestBox.element" helpKeyword="WinJS.UI.AutoSuggestBox.element">
                /// Gets the DOM element that hosts the AutoSuggestBox.
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1" />
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type='String' locid="WinJS.UI.AutoSuggestBox.chooseSuggestionOnEnter" helpKeyword="WinJS.UI.AutoSuggestBox.chooseSuggestionOnEnter">
                /// Gets or sets whether the first suggestion is chosen when the user presses Enter. When set to true, as the user types in the input box, a
                /// focus rectangle is drawn on the first suggestion (if present and no IME composition in progress). Pressing enter will behave the same as
                /// if clicked on the focused suggestion, and the down arrow key press will put real focus to the second suggestion and the up arrow key will
                /// remove focus.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                chooseSuggestionOnEnter: {
                    get: function () {
                        return this._chooseSuggestionOnEnter;
                    },
                    set: function (value) {
                        this._chooseSuggestionOnEnter = !!value;
                    }
                },

                /// <field type='bool' locid="WinJS.UI.AutoSuggestBox.disabled" helpKeyword="WinJS.UI.AutoSuggestBox.disabled">
                /// Gets or sets a value that specifies whether the AutoSuggestBox is disabled.
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
                            this._enableControl();
                        } else {
                            this._disableControl();
                        }
                    }
                },

                /// <field type='String' locid="WinJS.UI.AutoSuggestBox.placeholderText" helpKeyword="WinJS.UI.AutoSuggestBox.placeholderText">
                /// Gets or sets the placeholder text for the AutoSuggestBox. This text is displayed if there is no other text in the input box.
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

                /// <field type='String' locid="WinJS.UI.AutoSuggestBox.queryText" helpKeyword="WinJS.UI.AutoSuggestBox.queryText">
                /// Gets or sets the query text for the AutoSuggestBox.
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

                /// <field type='bool' locid="WinJS.UI.AutoSuggestBox.searchHistoryDisabled" helpKeyword="WinJS.UI.AutoSuggestBox.searchHistoryDisabled">
                /// Gets or sets a value that specifies whether history is disabled for the AutoSuggestBox. The default value is false.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                searchHistoryDisabled: {
                    get: function () {
                        return !this._suggestionManager.searchHistoryEnabled;
                    },
                    set: function (value) {
                        this._suggestionManager.searchHistoryEnabled = !value;
                    }
                },

                /// <field type='String' locid="WinJS.UI.AutoSuggestBox.searchHistoryContext" helpKeyword="WinJS.UI.AutoSuggestBox.searchHistoryContext">
                /// Gets or sets the search history context for the AutoSuggestBox. The search history context string is used as a secondary key for storing search history.
                /// (The primary key is the AppId.) An app can use the search history context string to store different search histories based on the context of the application.
                /// If you don't set this property, the system assumes that all searches in your app occur in the same context.
                /// If you update this property while the search pane is open with suggestions showing, the changes won't take effect until the user enters the next character.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                searchHistoryContext: {
                    get: function () {
                        return this._suggestionManager.searchHistoryContext;
                    },
                    set: function (value) {
                        this._suggestionManager.searchHistoryContext = value;
                    }
                },

                dispose: function asb_dispose() {
                    /// <signature helpKeyword="WinJS.UI.AutoSuggestBox.dispose">
                    /// <summary locid="WinJS.UI.AutoSuggestBox.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }

                    // Cancel pending promises.
                    this._flyoutOpenPromise.cancel();

                    this._suggestions.removeEventListener("vectorchanged", this._suggestionsChangedHandler);
                    this._suggestionManager.removeEventListener("suggestionsrequested", this._suggestionsRequestedHandler);

                    this._suggestionManager = null;
                    this._suggestions = null;
                    this._hitFinder = null;

                    this._disposed = true;
                },

                setLocalContentSuggestionSettings: function asb_setLocalContentSuggestionSettings(settings) {
                    /// <signature helpKeyword="WinJS.UI.AutoSuggestBox.SetLocalContentSuggestionSettings">
                    /// <summary locid="WinJS.UI.AutoSuggestBox.SetLocalContentSuggestionSettings">
                    /// Specifies whether suggestions based on local files are automatically displayed in the input field, and defines the criteria that
                    /// the system uses to locate and filter these suggestions.
                    /// </summary>
                    /// <param name="eventName" type="Windows.ApplicationModel.Search.LocalContentSuggestionSettings" locid="WinJS.UI.AutoSuggestBox.setLocalContentSuggestionSettings_p:settings">
                    /// The new settings for local content suggestions.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </signature>
                    this._suggestionManager.setLocalContentSuggestionSettings(settings);
                },

                // Constructor Helpers
                _setupDOM: function asb_setupDOM() {
                    var flyoutPointerReleasedHandler = this._flyoutPointerReleasedHandler.bind(this);
                    var inputOrImeChangeHandler = this._inputOrImeChangeHandler.bind(this);

                    // Root element
                    if (!this._element.getAttribute("aria-label")) {
                        this._element.setAttribute("aria-label", Strings.ariaLabel);
                    }
                    this._element.setAttribute("role", "group");

                    // Input element
                    this._inputElement = _Global.document.createElement("input");
                    this._inputElement.type = "search";
                    this._inputElement.classList.add(ClassNames.asbInput);
                    this._inputElement.setAttribute("role", "textbox");
                    this._inputElement.addEventListener("keydown", this._keyDownHandler.bind(this));
                    this._inputElement.addEventListener("keypress", this._keyPressHandler.bind(this));
                    this._inputElement.addEventListener("keyup", this._keyUpHandler.bind(this));
                    this._inputElement.addEventListener("focus", this._inputFocusHandler.bind(this));
                    this._inputElement.addEventListener("blur", this._inputBlurHandler.bind(this));
                    this._inputElement.addEventListener("input", inputOrImeChangeHandler);
                    this._inputElement.addEventListener("compositionstart", inputOrImeChangeHandler);
                    this._inputElement.addEventListener("compositionupdate", inputOrImeChangeHandler);
                    this._inputElement.addEventListener("compositionend", inputOrImeChangeHandler);
                    _ElementUtilities._addEventListener(this._inputElement, "pointerdown", this._inputPointerDownHandler.bind(this));
                    this._updateInputElementAriaLabel();
                    this._element.appendChild(this._inputElement);
                    var context = this._inputElement.msGetInputContext && this._inputElement.msGetInputContext();
                    if (context) {
                        context.addEventListener("MSCandidateWindowShow", this._msCandidateWindowShowHandler.bind(this));
                        context.addEventListener("MSCandidateWindowHide", this._msCandidateWindowHideHandler.bind(this));
                    }

                    // Flyout element
                    this._flyoutElement = _Global.document.createElement("div");
                    this._flyoutElement.classList.add(ClassNames.asbFlyout);
                    this._flyoutElement.addEventListener("blur", this._flyoutBlurHandler.bind(this));
                    _ElementUtilities._addEventListener(this._flyoutElement, "pointerup", flyoutPointerReleasedHandler);
                    _ElementUtilities._addEventListener(this._flyoutElement, "pointercancel", flyoutPointerReleasedHandler);
                    _ElementUtilities._addEventListener(this._flyoutElement, "pointerout", flyoutPointerReleasedHandler);
                    _ElementUtilities._addEventListener(this._flyoutElement, "pointerdown", this._flyoutPointerDownHandler.bind(this));
                    this._element.appendChild(this._flyoutElement);

                    // Repeater
                    var that = this;
                    function repeaterTemplate(suggestion) {
                        return that._renderSuggestion(suggestion);
                    }
                    this._suggestionsData = new BindingList.List();
                    this._repeaterElement = _Global.document.createElement("div");
                    this._repeater = new Repeater.Repeater(this._repeaterElement, {
                        data: this._suggestionsData,
                        template: repeaterTemplate,
                    });
                    _ElementUtilities._ensureId(this._repeaterElement);
                    this._repeaterElement.setAttribute("role", "listbox");
                    this._repeaterElement.setAttribute("aria-live", "polite");
                    this._flyoutElement.appendChild(this._repeaterElement);
                },

                _setupSSM: function asb_setupSSM() {
                    // Get the search suggestion provider if it is available
                    if (_WinRT.Windows.ApplicationModel.Search.Core.SearchSuggestionManager) {
                        this._suggestionManager = new _WinRT.Windows.ApplicationModel.Search.Core.SearchSuggestionManager();
                    } else {
                        this._suggestionManager = new _SuggestionManagerShim._SearchSuggestionManagerShim();
                    }
                    this._suggestions = this._suggestionManager.suggestions;

                    this._suggestions.addEventListener("vectorchanged", this._suggestionsChangedHandler);
                    this._suggestionManager.addEventListener("suggestionsrequested", this._suggestionsRequestedHandler);
                },

                // Flyout functions
                _hideFlyout: function asb_hideFlyout() {
                    if (this._isFlyoutShown()) {
                        this._flyoutElement.style.display = "none";
                    }
                },

                _showFlyout: function asb_showFlyout() {
                    if (this._isFlyoutShown()) {
                        return;
                    }

                    if (this._suggestionsData.length === 0) {
                        return;
                    }

                    this._flyoutElement.style.display = "block";

                    var inputRect = this._inputElement.getBoundingClientRect();
                    var flyoutRect = this._flyoutElement.getBoundingClientRect();
                    var documentClientWidth = _Global.document.documentElement.clientWidth;

                    // Display above vs below - the ASB flyout always opens in the direction where there is more space
                    var spaceAbove = inputRect.top;
                    var spaceBelow = _Global.document.documentElement.clientHeight - inputRect.bottom;
                    this._flyoutBelowInput = spaceBelow >= spaceAbove;
                    if (this._flyoutBelowInput) {
                        this._flyoutElement.classList.remove(ClassNames.asbFlyoutAbove);
                        this._flyoutElement.scrollTop = 0;
                    } else {
                        this._flyoutElement.classList.add(ClassNames.asbFlyoutAbove);
                        this._flyoutElement.scrollTop = this._flyoutElement.scrollHeight - this._flyoutElement.clientHeight;
                    }

                    this._addFlyoutIMEPaddingIfRequired();

                    // Align left vs right edge
                    var alignRight;
                    if (_Global.getComputedStyle(this._flyoutElement).direction === "rtl") {
                        // RTL: Align to the right edge if there is enough space to the left of the control's
                        // right edge, or if there is not enough space to fit the flyout aligned to either edge.
                        alignRight = ((inputRect.right - flyoutRect.width) >= 0) || ((inputRect.left + flyoutRect.width) > documentClientWidth);

                    } else {
                        // LTR: Align to the right edge if there isn't enough space to the right of the control's
                        // left edge, but there is enough space to the left of the control's right edge.
                        alignRight = ((inputRect.left + flyoutRect.width) > documentClientWidth) && ((inputRect.right - flyoutRect.width) >= 0);
                    }

                    if (alignRight) {
                        this._flyoutElement.style.left = (inputRect.width - flyoutRect.width - this._element.clientLeft) + "px";
                    } else {
                        this._flyoutElement.style.left = "-" + this._element.clientLeft + "px";
                    }

                    // ms-scroll-chaining:none will still chain scroll parent element if child div does
                    // not have a scroll bar. Prevent this by setting and updating touch action
                    this._flyoutElement.style.touchAction = this._flyoutElement.scrollHeight > flyoutRect.height ? "pan-y" : "none";

                    this._flyoutOpenPromise.cancel();
                    var animationKeyframe = this._flyoutBelowInput ? "WinJS-flyoutBelowASB-showPopup" : "WinJS-flyoutAboveASB-showPopup";
                    this._flyoutOpenPromise = Animations.showPopup(this._flyoutElement, { top: "0px", left: "0px", keyframe: animationKeyframe });
                },

                _addFlyoutIMEPaddingIfRequired: function asb_addFlyoutIMEPaddingIfRequired() {
                    // Check if we have InputContext APIs
                    var context = this._inputElement.msGetInputContext && this._inputElement.msGetInputContext();
                    if (!context) {
                        return;
                    }

                    // Check if flyout is visible and below input
                    if (!this._isFlyoutShown() || !this._flyoutBelowInput) {
                        return;
                    }

                    // Check if IME is occluding flyout
                    var flyoutRect = this._flyoutElement.getBoundingClientRect();
                    var imeRect = context.getCandidateWindowClientRect();
                    var inputRect = this._inputElement.getBoundingClientRect();
                    var flyoutTop = inputRect.bottom;
                    var flyoutBottom = inputRect.bottom + flyoutRect.height;
                    if (((imeRect.top < flyoutTop) || (imeRect.top > flyoutBottom)) &&
                        ((imeRect.bottom < flyoutTop) || (imeRect.bottom > flyoutBottom))) {
                        return;
                    }

                    // Shift the flyout down
                    var rect = context.getCandidateWindowClientRect();
                    var animation = Animations.createRepositionAnimation(this._flyoutElement);
                    this._flyoutElement.style.marginTop = (rect.bottom - rect.top + 4) + "px";
                    animation.execute();
                },

                _findNextSuggestionElementIndex: function asb_findNextSuggestionElementIndex(curIndex) {
                    // Returns -1 if there are no focusable elements after curIndex
                    // Returns first element if curIndex < 0
                    var startIndex = curIndex < 0 ? 0 : curIndex + 1;
                    for (var i = startIndex; i < this._suggestionsData.length; i++) {
                        if ((this._repeater.elementFromIndex(i)) && (this._isSuggestionSelectable(this._suggestionsData.getAt(i)))) {
                            return i;
                        }
                    }
                    return -1;
                },

                _findPreviousSuggestionElementIndex: function asb_findPreviousSuggestionElementIndex(curIndex) {
                    // Returns -1 if there are no focusable elements before curIndex
                    // Returns last element if curIndex >= suggestionsdata.length
                    var startIndex = curIndex >= this._suggestionsData.length ? this._suggestionsData.length - 1 : curIndex - 1;
                    for (var i = startIndex; i >= 0; i--) {
                        if ((this._repeater.elementFromIndex(i)) && (this._isSuggestionSelectable(this._suggestionsData.getAt(i)))) {
                            return i;
                        }
                    }
                    return -1;
                },

                _isFlyoutShown: function asb_isFlyoutShown() {
                    return (this._flyoutElement.style.display !== "none");
                },

                _isSuggestionSelectable: function asb_isSuggestionSelectable(suggestion) {
                    return ((suggestion.kind === _SuggestionManagerShim._SearchSuggestionKind.Query) ||
                            (suggestion.kind === _SuggestionManagerShim._SearchSuggestionKind.Result));
                },

                _processSuggestionChosen: function asb_processSuggestionChosen(item, event) {
                    this.queryText = item.text;
                    if (item.kind === _SuggestionManagerShim._SearchSuggestionKind.Query) {
                        this._submitQuery(item.text, false /*fillLinguisticDetails*/, event); // force empty linguistic details since explicitly chosen suggestion from list
                    } else if (item.kind === _SuggestionManagerShim._SearchSuggestionKind.Result) {
                        this._fireEvent(EventNames.resultsuggestionchosen, {
                            tag: item.tag,
                            keyModifiers: getKeyModifiers(event),
                            storageFile: null
                        });
                    }
                    this._hideFlyout();
                },

                _selectSuggestionAtIndex: function asb_selectSuggestionAtIndex(indexToSelect) {
                    var that = this;
                    function scrollToView(targetElement) {
                        var popupHeight = that._flyoutElement.getBoundingClientRect().bottom - that._flyoutElement.getBoundingClientRect().top;
                        if ((targetElement.offsetTop + targetElement.offsetHeight) > (that._flyoutElement.scrollTop + popupHeight)) {
                            // Element to scroll is below popup visible area
                            var scrollDifference = (targetElement.offsetTop + targetElement.offsetHeight) - (that._flyoutElement.scrollTop + popupHeight);
                            _ElementUtilities._zoomTo(that._flyoutElement, { contentX: 0, contentY: (that._flyoutElement.scrollTop + scrollDifference), viewportX: 0, viewportY: 0 });
                        } else if (targetElement.offsetTop < that._flyoutElement.scrollTop) {
                            // Element to scroll is above popup visible area
                            _ElementUtilities._zoomTo(that._flyoutElement, { contentX: 0, contentY: targetElement.offsetTop, viewportX: 0, viewportY: 0 });
                        }
                    }

                    // Sets focus on the specified element and removes focus from others.
                    // Clears selection if index is outside of suggestiondata index range.
                    var curElement = null;
                    for (var i = 0; i < this._suggestionsData.length; i++) {
                        curElement = this._repeater.elementFromIndex(i);
                        if (i !== indexToSelect) {
                            curElement.classList.remove(ClassNames.asbSuggestionSelected);
                            curElement.setAttribute("aria-selected", "false");
                        } else {
                            curElement.classList.add(ClassNames.asbSuggestionSelected);
                            scrollToView(curElement);
                            curElement.setAttribute("aria-selected", "true");
                        }
                    }
                    this._currentSelectedIndex = indexToSelect;
                    if (curElement) {
                        this._inputElement.setAttribute("aria-activedescendant", this._repeaterElement.id + indexToSelect);
                    } else if (this._inputElement.hasAttribute("aria-activedescendant")) {
                        this._inputElement.removeAttribute("aria-activedescendant");
                    }
                },

                _updateFakeFocus: function asm_updateFakeFocus() {
                    var firstElementIndex;
                    if (this._isFlyoutShown() && (this._chooseSuggestionOnEnter)) {
                        firstElementIndex = this._findNextSuggestionElementIndex(-1);
                    } else {
                        // This will clear the fake focus.
                        firstElementIndex = -1;
                    }

                    this._selectSuggestionAtIndex(firstElementIndex);
                },

                _updateQueryTextWithSuggestionText: function asb_updateQueryTextWithSuggestionText(suggestionIndex) {
                    if ((suggestionIndex >= 0) && (suggestionIndex < this._suggestionsData.length)) {
                        this.queryText = this._suggestionsData.getAt(suggestionIndex).text;
                    }
                },

                // Helpers
                _disableControl: function asb_disableControl() {
                    if (this._isFlyoutShown()) {
                        this._hideFlyout();
                    }
                    this._element.disabled = true;
                    this._element.classList.add(ClassNames.asbDisabled);
                    this._inputElement.disabled = true;
                },

                _enableControl: function asb_enableControl() {
                    this._element.disabled = false;
                    this._element.classList.remove(ClassNames.asbDisabled);
                    this._inputElement.disabled = false;
                    if (_Global.document.activeElement === this._element) {
                        _ElementUtilities._setActive(this._inputElement);
                    }
                },

                _fireEvent: function asb_fireEvent(type, detail) {
                    // Returns true if ev.preventDefault() was not called
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent(type, true, true, detail);
                    return this._element.dispatchEvent(event);
                },

                _getLinguisticDetails: function asb_getLinguisticDetails(useCache, createFilled) { // createFilled=false always creates an empty linguistic details object, otherwise generate it or use the cache
                    function createQueryLinguisticDetails(compositionAlternatives, compositionStartOffset, compositionLength, queryTextPrefix, queryTextSuffix) {
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
                    }

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
                        linguisticDetails = createQueryLinguisticDetails(compositionAlternatives, compositionStartOffset, compositionLength, queryTextPrefix, queryTextSuffix);
                    }
                    return linguisticDetails;
                },

                _isElementInSearchControl: function asb_isElementInSearchControl(targetElement) {
                    return this.element.contains(targetElement) || (this.element === targetElement);
                },

                _renderSuggestion: function asb_renderSuggestion(suggestion) {
                    var root = null;
                    if (!suggestion) {
                        return root;
                    }
                    if (suggestion.kind === _SuggestionManagerShim._SearchSuggestionKind.Query) {
                        root = querySuggestionRenderer(this, suggestion);
                    } else if (suggestion.kind === _SuggestionManagerShim._SearchSuggestionKind.Separator) {
                        root = separatorSuggestionRenderer(suggestion);
                    } else if (suggestion.kind === _SuggestionManagerShim._SearchSuggestionKind.Result) {
                        root = resultSuggestionRenderer(this, suggestion);
                    } else {
                        throw new _ErrorFromName("WinJS.UI.AutoSuggestBox.invalidSuggestionKind", Strings.invalidSuggestionKind);
                    }
                    return root;
                },

                _shouldIgnoreInput: function asb_shouldIgnoreInput() {
                    var processingIMEFocusLossKey = this._isProcessingDownKey || this._isProcessingUpKey || this._isProcessingTabKey || this._isProcessingEnterKey;
                    return processingIMEFocusLossKey || this._isFlyoutPointerDown;
                },

                _submitQuery: function asb_submitQuery(queryText, fillLinguisticDetails, event) {
                    if (this._disposed) {
                        return;
                    }

                    // get the most up to date value of the input langauge from WinRT if available
                    if (_WinRT.Windows.Globalization.Language) {
                        this._lastKeyPressLanguage = _WinRT.Windows.Globalization.Language.currentInputMethodLanguageTag;
                    }

                    this._fireEvent(EventNames.querysubmitted, {
                        language: this._lastKeyPressLanguage,
                        linguisticDetails: this._getLinguisticDetails(true /*useCache*/, fillLinguisticDetails), // allow caching, but generate empty linguistic details if suggestion is used
                        queryText: queryText,
                        keyModifiers: getKeyModifiers(event)
                    });

                    if (this._suggestionManager) {
                        this._suggestionManager.addToHistory(this._inputElement.value, this._lastKeyPressLanguage);
                    }
                },

                _updateInputElementAriaLabel: function asb_updateInputElementAriaLabel() {
                    this._inputElement.setAttribute("aria-label",
                        this._inputElement.placeholder ? _Resources._formatString(Strings.ariaLabelInputPlaceHolder, this._inputElement.placeholder) : Strings.ariaLabelInputNoPlaceHolder
                    );
                },

                // Event Handlers
                _flyoutBlurHandler: function asb_flyoutBlurHandler(event) {
                    if (this._isElementInSearchControl(_Global.document.activeElement)) {
                        this._internalFocusMove = true;
                    } else {
                        this._element.classList.remove(ClassNames.asbInputFocus);
                        this._hideFlyout();
                    }
                },

                _flyoutPointerDownHandler: function asm_flyoutPointerDownHandler(ev) {
                    var that = this;
                    var srcElement = ev.target;
                    function findSuggestionElementIndex() {
                        if (srcElement) {
                            for (var i = 0; i < that._suggestionsData.length; i++) {
                                if (that._repeater.elementFromIndex(i) === srcElement) {
                                    return i;
                                }
                            }
                        }
                        return -1;
                    }

                    this._isFlyoutPointerDown = true;
                    while (srcElement && (srcElement.parentNode !== this._repeaterElement)) {
                        srcElement = srcElement.parentNode;
                    }
                    var index = findSuggestionElementIndex();
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

                _flyoutPointerReleasedHandler: function asm_flyoutPointerReleasedHandler() {
                    this._isFlyoutPointerDown = false;

                    if (this._reflowImeOnPointerRelease) {
                        this._reflowImeOnPointerRelease = false;
                        var animation = Animations.createRepositionAnimation(this._flyoutElement);
                        this._flyoutElement.style.marginTop = "";
                        animation.execute();
                    }
                },

                _inputBlurHandler: function asb_inputBlurHandler(event) {
                    // Hide flyout if focus is leaving the control
                    if (!this._isElementInSearchControl(_Global.document.activeElement)) {
                        this._element.classList.remove(ClassNames.asbInputFocus);
                        this._hideFlyout();
                    }
                    this._isProcessingDownKey = false;
                    this._isProcessingUpKey = false;
                    this._isProcessingTabKey = false;
                    this._isProcessingEnterKey = false;
                },

                _inputFocusHandler: function asb_inputFocusHandler(event) {
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

                    // If focus is returning to the input box from outside the control, show the flyout and refresh the suggestions
                    if (event.target === this._inputElement && !this._internalFocusMove) {
                        this._showFlyout();
                        if (this._currentFocusedIndex !== -1) {
                            // Focus is not in input
                            this._selectSuggestionAtIndex(this._currentFocusedIndex);
                        } else {
                            this._updateFakeFocus();
                        }

                        this._suggestionManager.setQuery(
                            this._inputElement.value,
                            this._lastKeyPressLanguage,
                            this._getLinguisticDetails(true /*useCache*/, true /*createFilled*/)
                        );
                    }

                    this._internalFocusMove = false;
                    this._element.classList.add(ClassNames.asbInputFocus);
                },

                _inputOrImeChangeHandler: function asb_inputImeChangeHandler() {
                    var that = this;
                    function hasLinguisticDetailsChanged(newLinguisticDetails) {
                        var hasLinguisticDetailsChanged = false;
                        if ((that._prevLinguisticDetails.queryTextCompositionStart !== newLinguisticDetails.queryTextCompositionStart) ||
                            (that._prevLinguisticDetails.queryTextCompositionLength !== newLinguisticDetails.queryTextCompositionLength) ||
                            (that._prevLinguisticDetails.queryTextAlternatives.length !== newLinguisticDetails.queryTextAlternatives.length)) {
                            hasLinguisticDetailsChanged = true;
                        }
                        that._prevLinguisticDetails = newLinguisticDetails;
                        return hasLinguisticDetailsChanged;
                    }

                    // swallow the IME change event that gets fired when composition is ended due to keyboarding down to the suggestion list & mouse down on the button
                    if (!this._shouldIgnoreInput()) {
                        var linguisticDetails = this._getLinguisticDetails(false /*useCache*/, true /*createFilled*/); // never cache on explicit user changes
                        var hasLinguisticDetailsChanged = hasLinguisticDetailsChanged(linguisticDetails); // updates this._prevLinguisticDetails

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

                        this._fireEvent(EventNames.querychanged, {
                            language: this._lastKeyPressLanguage,
                            queryText: this._inputElement.value,
                            linguisticDetails: linguisticDetails
                        });

                        this._suggestionManager.setQuery(
                            this._inputElement.value,
                            this._lastKeyPressLanguage,
                            linguisticDetails
                        );
                    }
                },

                _inputPointerDownHandler: function asb_inputPointerDownHandler() {
                    if ((_Global.document.activeElement === this._inputElement) && (this._currentSelectedIndex !== -1)) {
                        this._currentFocusedIndex = -1;
                        this._selectSuggestionAtIndex(this._currentFocusedIndex);
                    }
                },

                _keyDownHandler: function asb_keyDownHandler(event) {
                    var that = this;
                    function setSelection(index) {
                        that._currentFocusedIndex = index;
                        that._selectSuggestionAtIndex(index);
                        event.preventDefault();
                        event.stopPropagation();
                    }

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
                            var closeFlyout = true;
                            if (event.shiftKey) {
                                if (this._currentFocusedIndex !== -1) {
                                    // Focus is not in input
                                    setSelection(-1);
                                    closeFlyout = false;
                                }
                            } else if (this._currentFocusedIndex === -1) {
                                this._currentFocusedIndex =
                                    this._flyoutBelowInput
                                    ? this._findNextSuggestionElementIndex(this._currentFocusedIndex)
                                    : this._findPreviousSuggestionElementIndex(this._suggestionsData.length);
                                if (this._currentFocusedIndex !== -1) {
                                    // Found a selectable element
                                    setSelection(this._currentFocusedIndex);
                                    this._updateQueryTextWithSuggestionText(this._currentFocusedIndex);
                                    closeFlyout = false;
                                }
                            }

                            if (closeFlyout) {
                                this._hideFlyout();
                            }
                        } else if (event.keyCode === Key.escape) {
                            if (this._currentFocusedIndex !== -1) {
                                // Focus is not in input
                                this.queryText = this._prevQueryText;
                                setSelection(-1);
                            } else if (this.queryText !== "") {
                                this.queryText = "";
                                this._inputOrImeChangeHandler(null);
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
                            setSelection(prevIndex);
                            this._updateQueryTextWithSuggestionText(this._currentFocusedIndex);
                        } else if (event.keyCode === Key.downArrow) {
                            var nextIndex = this._findNextSuggestionElementIndex(this._currentSelectedIndex);
                            // Restore user entered query when user navigates back to input.
                            if ((this._currentSelectedIndex !== -1) && (nextIndex === -1)) {
                                this.queryText = this._prevQueryText;
                            }
                            setSelection(nextIndex);
                            this._updateQueryTextWithSuggestionText(this._currentFocusedIndex);
                        } else if (event.keyCode === Key.enter) {
                            if (this._currentSelectedIndex === -1) {
                                this._submitQuery(this._inputElement.value, true /*fillLinguisticDetails*/, event);
                            } else {
                                this._processSuggestionChosen(this._suggestionsData.getAt(this._currentSelectedIndex), event);
                            }
                            this._hideFlyout();
                        }
                    }
                },

                _keyUpHandler: function asb_keyUpHandler(event) {
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

                _keyPressHandler: function asb_keyPressHandler(event) {
                    this._lastKeyPressLanguage = event.locale;
                },

                _msCandidateWindowHideHandler: function asb_msCandidateWindowHideHandler() {
                    if (!this._isFlyoutPointerDown) {
                        var animation = Animations.createRepositionAnimation(this._flyoutElement);
                        this._flyoutElement.style.marginTop = "";
                        animation.execute();
                    } else {
                        this._reflowImeOnPointerRelease = true;
                    }
                },

                _msCandidateWindowShowHandler: function asb_msCandidateWindowShowHandler() {
                    this._addFlyoutIMEPaddingIfRequired();
                    this._reflowImeOnPointerRelease = false;
                },

                _suggestionsChangedHandler: function asb_suggestionsChangedHandler(event) {
                    var collectionChange = event.collectionChange || event.detail.collectionChange;
                    var changeIndex = (+event.index === event.index) ? event.index : event.detail.index;
                    var ChangeEnum = _SuggestionManagerShim._CollectionChange;
                    if (collectionChange === ChangeEnum.reset) {
                        if (this._isFlyoutShown()) {
                            this._hideFlyout();
                        }
                        this._suggestionsData.splice(0, this._suggestionsData.length);
                    } else if (collectionChange === ChangeEnum.itemInserted) {
                        var suggestion = this._suggestions[changeIndex];
                        this._suggestionsData.splice(changeIndex, 0, suggestion);

                        this._showFlyout();

                    } else if (collectionChange === ChangeEnum.itemRemoved) {
                        if ((this._suggestionsData.length === 1)) {
                            _ElementUtilities._setActive(this._inputElement);

                            this._hideFlyout();
                        }
                        this._suggestionsData.splice(changeIndex, 1);
                    } else if (collectionChange === ChangeEnum.itemChanged) {
                        var suggestion = this._suggestions[changeIndex];
                        if (suggestion !== this._suggestionsData.getAt(changeIndex)) {
                            this._suggestionsData.setAt(changeIndex, suggestion);
                        } else {
                            // If the suggestions manager gives us an identical item, it means that only the hit highlighted text has changed.
                            var existingElement = this._repeater.elementFromIndex(changeIndex);
                            if (_ElementUtilities.hasClass(existingElement, ClassNames.asbSuggestionQuery)) {
                                this._addHitHighlightedText(existingElement, suggestion, suggestion.text);
                            } else {
                                var resultSuggestionDiv = existingElement.querySelector("." + ClassNames.asbSuggestionResultText);
                                if (resultSuggestionDiv) {
                                    this._addHitHighlightedText(resultSuggestionDiv, suggestion, suggestion.text);
                                    var resultSuggestionDetailDiv = existingElement.querySelector("." + ClassNames.asbSuggestionResultDetailedText);
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

                _suggestionsRequestedHandler: function asb_suggestionsRequestedHandler(event) {
                    // get the most up to date value of the input langauge from WinRT if available
                    if (_WinRT.Windows.Globalization.Language) {
                        this._lastKeyPressLanguage = _WinRT.Windows.Globalization.Language.currentInputMethodLanguageTag;
                    }

                    var request = event.request || event.detail.request;
                    var deferral;
                    this._fireEvent(EventNames.suggestionsrequested, {
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
            }, {
                createResultSuggestionImage: function asb_createResultSuggestionImage(url) {
                    /// <signature helpKeyword="WinJS.UI.AutoSuggestBox.createResultSuggestionImage">
                    /// <summary locid="WinJS.UI.AutoSuggestBox.createResultSuggestionImage">
                    /// Creates the image argument for SearchSuggestionCollection.appendResultSuggestion.
                    /// </summary>
                    /// <param name="url" type="string" locid="WinJS.UI.AutoSuggestBox.asb_createResultSuggestionImage_p:url">
                    /// The url of the image.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </signature>
                    if (_WinRT.Windows.Foundation.Uri && _WinRT.Windows.Storage.Streams.RandomAccessStreamReference) {
                        return _WinRT.Windows.Storage.Streams.RandomAccessStreamReference.createFromUri(new _WinRT.Windows.Foundation.Uri(url));
                    }
                    return url;
                },

                _EventNames: EventNames,

                _sortAndMergeHits: function asb_sortAndMergeHits(hitsProvided) {
                    function hitStartPositionAscendingSorter(firstHit, secondHit) {
                        var returnValue = 0;
                        if (firstHit.startPosition < secondHit.startPosition) {
                            returnValue = -1;
                        } else if (firstHit.startPosition > secondHit.startPosition) {
                            returnValue = 1;
                        }
                        return returnValue;
                    }
                    function hitIntersectionReducer(reducedHits, nextHit, currentIndex) {
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
                    }

                    var reducedHits = [];
                    if (hitsProvided) {
                        // Copy hitsprovided array as winrt objects are immutable.
                        var hits = new Array(hitsProvided.length);
                        for (var i = 0; i < hitsProvided.length; i++) {
                            hits.push({ startPosition: hitsProvided[i].startPosition, length: hitsProvided[i].length });
                        }
                        hits.sort(hitStartPositionAscendingSorter);
                        hits.reduce(hitIntersectionReducer, reducedHits);
                    }
                    return reducedHits;
                }
            });

            function addHitHighlightedText(element, item, text, hitFinder) {
                function addNewSpan(element, textContent, insertBefore) {
                    // Adds new span element with specified inner text as child to element, placed before insertBefore
                    var spanElement = _Global.document.createElement("span");
                    spanElement.textContent = textContent;
                    spanElement.setAttribute("aria-hidden", "true");
                    spanElement.classList.add(ClassNames.asbHitHighlightSpan);
                    element.insertBefore(spanElement, insertBefore);
                    return spanElement;
                }

                if (text) {
                    // Remove any existing hit highlighted text spans
                    _ElementListUtilities.query("." + ClassNames.asbHitHighlightSpan, element).forEach(function (childElement) {
                        childElement.parentNode.removeChild(childElement);
                    });

                    // Insert spans at the front of element
                    var firstChild = element.firstChild;

                    var hitsProvided = item.hits;
                    if ((!hitsProvided) && (hitFinder) && (item.kind !== _SuggestionManagerShim._SearchSuggestionKind.Separator)) {
                        hitsProvided = hitFinder.find(text);
                    }

                    var hits = AutoSuggestBox._sortAndMergeHits(hitsProvided);

                    var lastPosition = 0;
                    for (var i = 0; i < hits.length; i++) {
                        var hit = hits[i];

                        // Add previous normal text
                        addNewSpan(element, text.substring(lastPosition, hit.startPosition), firstChild);

                        lastPosition = hit.startPosition + hit.length;

                        // Add hit highlighted text
                        var spanHitHighlightedText = addNewSpan(element, text.substring(hit.startPosition, lastPosition), firstChild);
                        _ElementUtilities.addClass(spanHitHighlightedText, ClassNames.asbBoxFlyoutHighlightText);
                    }

                    // Add final normal text
                    if (lastPosition < text.length) {
                        addNewSpan(element, text.substring(lastPosition), firstChild);
                    }
                }
            }

            function getKeyModifiers(ev) {
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
            }

            function resultSuggestionRenderer(asb, item) {
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
                _ElementUtilities.addClass(divElement, ClassNames.asbSuggestionResultText);
                addHitHighlightedText(divElement, item, item.text);
                divElement.title = item.text;
                divElement.setAttribute("aria-hidden", "true");
                root.appendChild(divElement);

                var brElement = _Global.document.createElement("br");
                divElement.appendChild(brElement);

                var divDetailElement = _Global.document.createElement("span");
                _ElementUtilities.addClass(divDetailElement, ClassNames.asbSuggestionResultDetailedText);
                addHitHighlightedText(divDetailElement, item, item.detailText);
                divDetailElement.title = item.detailText;
                divDetailElement.setAttribute("aria-hidden", "true");
                divElement.appendChild(divDetailElement);

                _ElementUtilities.addClass(root, ClassNames.asbSuggestionResult);

                _ElementUtilities._addEventListener(root, "pointerup", function (ev) {
                    asb._inputElement.focus();
                    asb._processSuggestionChosen(item, ev);
                });

                root.setAttribute("role", "option");
                var ariaLabel = _Resources._formatString(Strings.ariaLabelResult, item.text, item.detailText);
                root.setAttribute("aria-label", ariaLabel);
                return root;
            }

            function querySuggestionRenderer(asb, item) {
                var root = _Global.document.createElement("div");

                addHitHighlightedText(root, item, item.text);
                root.title = item.text;

                root.classList.add(ClassNames.asbSuggestionQuery);

                _ElementUtilities._addEventListener(root, "pointerup", function (ev) {
                    asb._inputElement.focus();
                    asb._processSuggestionChosen(item, ev);
                });

                var ariaLabel = _Resources._formatString(Strings.ariaLabelQuery, item.text);
                root.setAttribute("role", "option");
                root.setAttribute("aria-label", ariaLabel);

                return root;
            }

            function separatorSuggestionRenderer(item) {
                var root = _Global.document.createElement("div");
                if (item.text.length > 0) {
                    var textElement = _Global.document.createElement("div");
                    textElement.textContent = item.text;
                    textElement.title = item.text;
                    textElement.setAttribute("aria-hidden", "true");
                    root.appendChild(textElement);
                }
                root.insertAdjacentHTML("beforeend", "<hr/>");
                _ElementUtilities.addClass(root, ClassNames.asbSuggestionSeparator);
                root.setAttribute("role", "separator");
                var ariaLabel = _Resources._formatString(Strings.ariaLabelSeparator, item.text);
                root.setAttribute("aria-label", ariaLabel);
                return root;
            }

            _Base.Class.mix(AutoSuggestBox, _Control.DOMEventMixin);
            return AutoSuggestBox;
        })
    });
});