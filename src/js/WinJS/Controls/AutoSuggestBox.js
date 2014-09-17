// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
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
    '../Promise',
    "../Controls/Repeater",
], function autoSuggestBoxInit(_Global, _WinRT, _Base, _ErrorFromName, _Events, _Resources, _Control, _ElementListUtilities, _ElementUtilities, _Hoverable, Animations, BindingList, Promise, Repeater) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {

        AutoSuggestBox: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            var ClassNames = {
                asb: "win-autosuggestbox",
                asbFlyout: "win-autosuggestbox-flyout",
                asbBoxFlyoutHighlightText: "win-autosuggestbox-flyout-highlighttext",
                asbHitHighlightSpan: "win-autosuggestbox-hithighlight-span",
                asbInput: "win-autosuggestbox-input",
                asbInputFocus: "win-autosuggestbox-input-focus",
                asbSuggestionSelected: "win-autosuggestbox-suggestion-selected",
                asbSuggestionQuery: "win-autosuggestbox-suggestion-query",
            };

            var EventNames = {
                querychanged: "querychanged",
                querysubmitted: "querysubmitted",
                //resultsuggestionchosen: "resultsuggestionchosen",
            };

            var Strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get invalidSuggestionKind() { return "Error: Invalid suggestion kind."; },

                //todo aria labels
                get ariaLabel() { return _Resources._getWinJSString("ui/searchBoxAriaLabel").value; },
                get ariaLabelInputNoPlaceHolder() { return _Resources._getWinJSString("ui/searchBoxAriaLabelInputNoPlaceHolder").value; },
                get ariaLabelInputPlaceHolder() { return _Resources._getWinJSString("ui/searchBoxAriaLabelInputPlaceHolder").value; },
                get ariaLabelQuery() { return _Resources._getWinJSString("ui/searchBoxAriaLabelQuery").value; },
            };

            var AutoSuggestBox = _Base.Class.define(function asb_ctor(element, options) {
                element = element || _Global.document.createElement("div");
                options = options || {};

                if (element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.AutoSuggestBox.DuplicateConstruction", Strings.duplicateConstruction);
                }

                this._element = element;
                element.winControl = this;
                element.classList.add(ClassNames.asb);
                element.classList.add("win-disposable");

                this._buildDOM();
                this._wireupUserEvents();

                this._currentFocusedIndex = -1;
                this._currentSelectedIndex = -1;
                this._flyoutOpenPromise = Promise.wrap();
                this._prevLinguisticDetails = this._getLinguisticDetails();
                this._prevQueryText = "";

                _Control.setOptions(this, options);

                this._hideFlyout();
            }, {
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
                        //this._updateSearchButtonClass();
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
                            // Enable control
                            this._element.disabled = false;
                            this._element.classList.remove(ClassNames.asbDisabled);
                            this._inputElement.disabled = false;
                            if (_Global.document.activeElement === this._element) {
                                _ElementUtilities._setActive(this._inputElement);
                            }
                        } else {
                            // Disable control
                            if (this._isFlyoutShown()) {
                                this._hideFlyout();
                            }
                            this._element.disabled = true;
                            this._element.classList.add(ClassNames.asbDisabled);
                            this._domElement.disabled = true;
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

                    this._disposed = true;
                },

                // Constructor Helpers
                _buildDOM: function asb_buildDOM() {
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
                    this._updateInputElementAriaLabel();
                    this._element.appendChild(this._inputElement);

                    // Flyout element
                    this._flyoutElement = _Global.document.createElement("div");
                    this._flyoutElement.classList.add(ClassNames.asbFlyout);
                    this._element.appendChild(this._flyoutElement);

                    // Repeater
                    var that = this;
                    function repeaterTemplate(item) {
                        var root = null;
                        if (!item) {
                            return root;
                        }
                        if (item.kind === AutoSuggestBox.SuggestionKinds.Query) {
                            root = querySuggestionRenderer(that, item);
                        } else if (item.kind === AutoSuggestBox.SuggestionKinds.Separator) {
                            //root = that._separatorSuggestionRenderer(item);
                        } else if (item.kind === AutoSuggestBox.SuggestionKinds.Result) {
                            //root = that._resultSuggestionRenderer(item);
                        } else {
                            throw new _ErrorFromName("WinJS.UI.AutoSuggestBox.invalidSuggestionKind", Strings.invalidSuggestionKind);
                        }
                        return root;
                    }
                    function repeaterDataChanged() {
                        // ms-scroll-chaining:none will still chain scroll parent element if child div does
                        // not have a scroll bar. Prevent this by setting and updating touch action
                        that._flyoutElement.style.touchAction = that._flyoutElement.scrollHeight > that._flyoutElement.getBoundingClientRect().height ? "pan-y" : "none";
                        if (that._isFlyoutShown()) {
                            that._repeaterElement.style.display = "none";
                            that._repeaterElement.style.display = "block";
                        }
                    }
                    this._suggestionsData = new BindingList.List();
                    this._repeaterElement = _Global.document.createElement("div");
                    this._repeater = new Repeater.Repeater(this._repeaterElement, {
                        data: this._suggestionsData,
                        template: repeaterTemplate,
                        onitemchanged: repeaterDataChanged,
                        oniteminserted: repeaterDataChanged,
                        onitemremoved: repeaterDataChanged,
                        onitemsreloaded: repeaterDataChanged
                    });
                    _ElementUtilities._ensureId(this._repeaterElement);
                    this._repeaterElement.setAttribute("role", "listbox");
                    this._repeaterElement.setAttribute("aria-live", "polite");
                    this._flyoutElement.appendChild(this._repeaterElement);
                },

                _wireupUserEvents: function asb_wireupUserEvents() {
                    this._inputElement.addEventListener("keydown", this._keyDownHandler.bind(this));
                    this._inputElement.addEventListener("keypress", this._keyPressHandler.bind(this));
                    this._inputElement.addEventListener("keyup", this._keyUpHandler.bind(this));
                    this._inputElement.addEventListener("focus", this._focusHandler.bind(this));
                    this._inputElement.addEventListener("blur", this._blurHandler.bind(this));
                    _ElementUtilities._addEventListener(this._inputElement, "pointerdown", this._inputPointerDownHandler.bind(this));

                    var flyoutPointerReleasedHandler = this._flyoutPointerReleasedHandler.bind(this);
                    _ElementUtilities._addEventListener(this._flyoutElement, "pointerup", flyoutPointerReleasedHandler);
                    _ElementUtilities._addEventListener(this._flyoutElement, "pointercancel", flyoutPointerReleasedHandler);
                    _ElementUtilities._addEventListener(this._flyoutElement, "pointerout", flyoutPointerReleasedHandler);
                    _ElementUtilities._addEventListener(this._flyoutElement, "pointerdown", this._flyoutPointerDownHandler.bind(this));

                    var inputOrImeChangeHandler = this._inputOrImeChangeHandler.bind(this);
                    this._inputElement.addEventListener("input", inputOrImeChangeHandler);
                    this._inputElement.addEventListener("compositionstart", inputOrImeChangeHandler);
                    this._inputElement.addEventListener("compositionupdate", inputOrImeChangeHandler);
                    this._inputElement.addEventListener("compositionend", inputOrImeChangeHandler);

                    var context = this._inputElement.msGetInputContext && this._inputElement.msGetInputContext();
                    if (context) {
                        context.addEventListener("MSCandidateWindowShow", this._msCandidateWindowShowHandler.bind(this));
                        context.addEventListener("MSCandidateWindowHide", this._msCandidateWindowHideHandler.bind(this));
                    }
                },

                // Flyout functions
                _hideFlyout: function asb_hideFlyout() {
                    if (this._isFlyoutShown()) {
                        this._flyoutElement.style.display = "none";
                        // todo: how does sb override this?
                        //this._updateSearchButtonClass();
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
                        this._flyoutElement.style.top = inputRect.height + "px";
                        this._flyoutElement.style.bottom = "";
                    } else {
                        this._flyoutElement.style.top = "";
                        this._flyoutElement.style.bottom = inputRect.height + "px";
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
                    var animation = Animations.createRepositionAnimation(this._flyoutElement.children);
                    this._flyoutElement.style.paddingTop = (rect.bottom - rect.top) + "px";
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
                    return ((suggestion.kind === AutoSuggestBox.SuggestionKinds.Query) ||
                            (suggestion.kind === AutoSuggestBox.SuggestionKinds.Result));
                },

                _processSuggestionChosen: function asb_processSuggestionChosen(item, event) {
                    this.queryText = item.text;
                    if (item.kind === AutoSuggestBox.SuggestionKinds.Query) {
                        this._submitQuery(item.text, false /*fillLinguisticDetails*/, event); // force empty linguistic details since explicitly chosen suggestion from list
                    }
                    //else if (item.kind === AutoSuggestBox.SearchSuggestionKinds.Result) {
                    //    this._fireEvent(EventNames.resultsuggestionchosen, {
                    //        tag: item.tag,
                    //        keyModifiers: getKeyModifiers(event),
                    //        storageFile: null
                    //    });
                    //}
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
                    //this._updateSearchButtonClass();
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

                _shouldIgnoreInput: function asb_shouldIgnoreInput() {
                    var processingIMEFocusLossKey = this._isProcessingDownKey || this._isProcessingUpKey || this._isProcessingTabKey || this._isProcessingEnterKey;
                    var isButtonDown = false; // todo button: _ElementUtilities._matchesSelector(this._buttonElement, ":active");

                    return processingIMEFocusLossKey || this._isFlyoutPointerDown || isButtonDown;
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

                    //if (this._searchSuggestionManager) {
                    //    this._searchSuggestionManager.addToHistory(this._inputElement.value, this._lastKeyPressLanguage);
                    //}
                },

                _updateInputElementAriaLabel: function asb_updateInputElementAriaLabel() {
                    this._inputElement.setAttribute("aria-label",
                        this._inputElement.placeholder ? _Resources._formatString(Strings.ariaLabelInputPlaceHolder, this._inputElement.placeholder) : Strings.ariaLabelInputNoPlaceHolder
                    );
                },

                // Event Handlers
                _blurHandler: function asb_blurHandler(event) {
                    // Hide flyout if focus is leaving the control
                    if (event.relatedTarget !== this._element && !this._element.contains(event.relatedTarget)) {
                        this._hideFlyout();
                    }
                    this._element.classList.remove(ClassNames.asbInputFocus);
                    // todo
                    //this._updateSearchButtonClass();
                    this._isProcessingDownKey = false;
                    this._isProcessingUpKey = false;
                    this._isProcessingTabKey = false;
                    this._isProcessingEnterKey = false;
                },

                _focusHandler: function asb_focusHandler(event) {
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
                    if (event.target === this._inputElement && event.relatedTarget !== this._element && !this._element.contains(event.relatedTarget)) {
                        this._showFlyout();
                        if (this._currentFocusedIndex !== -1) {
                            // Focus is not in input
                            this._selectSuggestionAtIndex(this._currentFocusedIndex);
                        } else {
                            this._updateFakeFocus();
                        }

                        // todo
                        //if (this._searchSuggestionManager) {
                        //    this._searchSuggestionManager.setQuery(
                        //        this._inputElement.value,
                        //        this._lastKeyPressLanguage,
                        //        this._getLinguisticDetails(true /*useCache*/, true /*createFilled*/)
                        //        );
                        //}
                    }

                    this._element.classList.add(ClassNames.asbInputFocus);
                    // todo
                    //this._updateSearchButtonClass();
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
                        var animation = Animations.createRepositionAnimation(this._flyoutElement.children);
                        this._flyoutElement.style.paddingTop = "";
                        animation.execute();
                    }
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
                        //if (this._searchSuggestionManager) {
                        //    this._searchSuggestionManager.setQuery(
                        //        this._inputElement.value,
                        //        this._lastKeyPressLanguage,
                        //        linguisticDetails
                        //        );
                        //}
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
                                //this._inputOrImeChangeHandler(null);
                                //this._updateSearchButtonClass();
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
                        // todo: tts
                        //else if (SearchBox._isTypeToSearchKey(event)) {
                        //    // Type to search on suggestions scenario.
                        //    if (this._currentFocusedIndex !== -1) {
                        //        this._currentFocusedIndex = -1;
                        //        this._selectSuggestionAtIndex(-1);
                        //        this._updateFakeFocus();
                        //    }
                        //}
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
                        var animation = Animations.createRepositionAnimation(this._flyoutElement.children);
                        this._flyoutElement.style.paddingTop = "";
                        animation.execute();
                    } else {
                        this._reflowImeOnPointerRelease = true;
                    }
                },

                _msCandidateWindowShowHandler: function asb_msCandidateWindowShowHandler() {
                    this._addFlyoutIMEPaddingIfRequired();
                    this._reflowImeOnPointerRelease = false;
                },
            }, {
                SuggestionKinds: {
                    Separator: "separator",
                    Query: "query",
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
                function sortAndMergeHits(hitsProvided) {
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

                if (text) {
                    // Remove any existing hit highlighted text spans
                    _ElementListUtilities.query("." + ClassNames.asbHitHighlightSpan, element).forEach(function (childElement) {
                        childElement.parentNode.removeChild(childElement);
                    });

                    // Insert spans at the front of element
                    var firstChild = element.firstChild;

                    var hitsProvided = item.hits;
                    if ((!hitsProvided) && (hitFinder) && (item.kind !== AutoSuggestBox.SuggestionKinds.Separator)) {
                        hitsProvided = hitFinder.find(text);
                    }

                    var hits = sortAndMergeHits(hitsProvided);

                    var lastPosition = 0;
                    for (var i = 0; i < hits.length; i++) {
                        var hit = hits[i];

                        // Add previous normal text
                        this._addNewSpan(element, text.substring(lastPosition, hit.startPosition), firstChild);

                        lastPosition = hit.startPosition + hit.length;

                        // Add hit highlighted text
                        var spanHitHighlightedText = this._addNewSpan(element, text.substring(hit.startPosition, lastPosition), firstChild);
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

            function querySuggestionRenderer(asb, item) {
                var root = _Global.document.createElement("div");

                addHitHighlightedText(root, item, item.text);
                root.title = item.text;

                root.classList.add(ClassNames.asbSuggestionQuery);

                _ElementUtilities._addEventListener(root, "pointerup", function (ev) {
                    asb._inputElement.focus();
                    asb._processSuggestionChosen(item, ev);
                }.bind(this));

                var ariaLabel = _Resources._formatString(Strings.ariaLabelQuery, item.text);
                root.setAttribute("role", "option");
                root.setAttribute("aria-label", ariaLabel);

                return root;
            }
            _Base.Class.mix(AutoSuggestBox, _Control.DOMEventMixin);
            return AutoSuggestBox;
        })
    });
});