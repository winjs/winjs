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
    "../Animations",
    "../BindingList",
    "../Controls/Repeater",
], function autoSuggestBoxInit(_Global, _WinRT, _Base, _ErrorFromName, _Events, _Resources, _Control, _ElementListUtilities, _ElementUtilities, Animations, BindingList, Repeater) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {

        AutoSuggestBox: _Base.Namespace._lazy(function () {
            var classNames = {
                asb: "win-autosuggestbox",
                asbFlyout: "win-autosuggestbox-flyout",
                asbBoxFlyoutHighlightText: "win-autosuggestbox-flyout-highlighttext",
                asbHitHighlightSpan: "win-autosuggestbox-hithighlight-span",
                asbInput: "win-autosuggestbox-input",
                asbInputFocus: "win-autosuggestbox-input-focus",
                asbSuggestionQuery: "win-autosuggestbox-suggestion-query",
            };

            var constants = {
                minSuggestionHeight: 152,
            };

            var strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get invalidSuggestionKind() { return "Error: Invalid search suggestion kind."; },

                get ariaLabelQuery() { return _Resources._getWinJSString("ui/searchBoxAriaLabelQuery").value; },
            };

            var AutoSuggestBox = _Base.Class.define(function asb_ctor(element, options) {
                element = element || _Global.document.createElement("div");
                options = options || {};

                if (element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.AutoSuggestBox.DuplicateConstruction", strings.duplicateConstruction);
                }

                this._element = element;
                element.winControl = this;
                element.classList.add(classNames.asb);
                element.classList.add("win-disposable");

                this._buildDOM();
                this._wireupUserEvents();

                _Control.setOptions(this, options);

                this._hideFlyout();
            }, {
                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.AutoSuggestBox.element" helpKeyword="WinJS.UI.AutoSuggestBox.element">
                /// Gets the DOM element that hosts the AutoSuggestBox.
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1" />
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                dispose: function asb_dispose() {
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;
                },

                // Constructor Helpers
                _buildDOM: function asm_buildDOM() {
                    this._inputElement = _Global.document.createElement("input");
                    this._inputElement.type = "search";
                    this._inputElement.classList.add(classNames.asbInput);
                    this.element.appendChild(this._inputElement);

                    this._flyoutElement = _Global.document.createElement('div');
                    this._flyoutElement.classList.add(classNames.asbFlyout);
                    this.element.appendChild(this._flyoutElement);

                    this._suggestionsData = new BindingList.List();
                    this._repeater = new Repeater.Repeater(null, {
                        data: this._suggestionsData,
                        template: function (item) {
                            var root = null;
                            if (!item) {
                                return root;
                            }
                            if (item.kind === AutoSuggestBox.SuggestionKinds.Query) {
                                root = querySuggestionRenderer(this, item);
                            } else {
                                throw new _ErrorFromName("WinJS.UI.AutoSuggestBox.invalidSuggestionKind", strings.invalidSuggestionKind);
                            }

                            return root;
                        }.bind(this)
                    });
                    this._flyoutElement.appendChild(this._repeater.element);
                },

                _wireupUserEvents: function asm_wireupUserEvents() {
                    this._inputElement.addEventListener("focus", this._searchBoxFocusHandler.bind(this));
                    this._inputElement.addEventListener("blur", this._searchBoxBlurHandler.bind(this));
                },

                // Flyout functions
                _hideFlyout: function asm_hideFlyout() {
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

                    // Display above vs below
                    function calculateFlyoutTop() {
                        // The ASB flyout always opens in the direction where there is more space.
                        var spaceAbove = inputRect.top;
                        var spaceBelow = _Global.document.documentElement.clientHeight - inputRect.bottom;

                        return spaceAbove < spaceBelow ? inputRect.height : -flyoutRect.height;
                    }

                    var flyoutTop = calculateFlyoutTop();
                    this._flyoutElement.style.top = flyoutTop + "px";
                    var flyoutBelowSearchBox = flyoutTop > 0;

                    // Align left vs right edge
                    var alignRight;
                    if (_Global.getComputedStyle(this._flyoutElement).direction === "rtl") {
                        // RTL: Align to the right edge if there is enough space to the left of the search box's
                        // right edge, or if there is not enough space to fit the flyout aligned to either edge.
                        alignRight = ((inputRect.right - flyoutRect.width) >= 0) || ((inputRect.left + flyoutRect.width) > documentClientWidth);

                    } else {
                        // LTR: Align to the right edge if there isn't enough space to the right of the search box's
                        // left edge, but there is enough space to the left of the search box's right edge.
                        alignRight = ((inputRect.left + flyoutRect.width) > documentClientWidth) && ((inputRect.right - flyoutRect.width) >= 0);
                    }

                    if (alignRight) {
                        this._flyoutElement.style.left = (inputRect.width - flyoutRect.width - this.element.clientLeft) + "px";
                    } else {
                        this._flyoutElement.style.left = "-" + this.element.clientLeft + "px";
                    }

                    // ms-scroll-chaining:none will still chain scroll parent element if child div does
                    // not have a scroll bar. Prevent this by setting and updating touch action
                    if (this._flyoutElement.scrollHeight > flyoutRect.height) {
                        this._flyoutElement.style.touchAction = "pan-y";
                    } else {
                        this._flyoutElement.style.touchAction = "none";
                    }

                    if (this._flyoutOpenPromise) {
                        this._flyoutOpenPromise.cancel();
                        this._flyoutOpenPromise = null;
                    }
                    var animationKeyframe = flyoutBelowSearchBox ? "WinJS-flyoutBelowSearchBox-showPopup" : "WinJS-flyoutAboveSearchBox-showPopup";
                    this._flyoutOpenPromise = Animations.showPopup(this._flyoutElement, { top: "0px", left: "0px", keyframe: animationKeyframe });
                },

                _isFlyoutShown: function SearchBox_isFlyoutShown() {
                    return (this._flyoutElement.style.display !== "none");
                },

                // Event Handlers
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
                    if (event.target === this._inputElement && event.relatedTarget !== this.element && !this.element.contains(event.relatedTarget)) {
                        this._showFlyout();
                    }

                    this.element.classList.add(classNames.asbInputFocus);
                },

                _searchBoxBlurHandler: function SearchBox_searchBoxBlurHandler(event) {
                    // Hide flyout if focus is leaving the control
                    if (event.relatedTarget !== this.element && !this.element.contains(event.relatedTarget)) {
                        this._hideFlyout();
                    }
                    this.element.classList.remove(classNames.asbInputFocus);
                },
            }, {
                SuggestionKinds: {
                    Separator: "separator",
                    Query: "query",
                }
            });

            function querySuggestionRenderer(asb, item) {
                var root = _Global.document.createElement("div");

                addHitHighlightedText(root, item, item.text);
                root.title = item.text;

                root.classList.add(classNames.searchBoxSuggestionQuery);

                _ElementUtilities._addEventListener(root, "pointerup", function (ev) {
                    asb._inputElement.focus();
                    asb._processSuggestionChosen(item, ev);
                }.bind(this));

                var ariaLabel = _Resources._formatString(strings.ariaLabelQuery, item.text);
                root.setAttribute("role", "option");
                root.setAttribute("aria-label", ariaLabel);

                return root;
            }

            function addHitHighlightedText(element, item, text, hitFinder) {
                function addNewSpan(element, textContent, insertBefore) {
                    // Adds new span element with specified inner text as child to element, placed before insertBefore
                    var spanElement = _Global.document.createElement("span");
                    spanElement.textContent = textContent;
                    spanElement.setAttribute("aria-hidden", "true");
                    spanElement.classList.add(classNames.asbHitHighlightSpan);
                    element.insertBefore(spanElement, insertBefore);
                    return spanElement;
                }
                function sortAndMergeHits(hitsProvided) {
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
                }

                if (text) {
                    // Remove any existing hit highlighted text spans
                    _ElementListUtilities.query("." + classNames.asbHitHighlightSpan, element).forEach(function (childElement) {
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
                        _ElementUtilities.addClass(spanHitHighlightedText, classNames.asbBoxFlyoutHighlightText);
                    }

                    // Add final normal text
                    if (lastPosition < text.length) {
                        addNewSpan(element, text.substring(lastPosition), firstChild);
                    }
                }
            }

            return AutoSuggestBox;
        })
    });
});