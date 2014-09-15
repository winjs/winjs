// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    "../Core/_Global",
    "../Core/_Base",
    '../Core/_ErrorFromName',
    "../Utilities/_Control",
    '../Utilities/_ElementUtilities',
    '../BindingList',
    '../Controls/Repeater',
], function autoSuggestBoxInit(_Global, _Base, _ErrorFromName, _Control, _ElementUtilities, BindingList, Repeater) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {

        AutoSuggestBox: _Base.Namespace._lazy(function () {
            var classNames = {
                asb: "win-autosuggestbox",
                asbFlyout: "win-autosuggestbox-flyout",
                asbBoxFlyoutHighlightText: "win-autosuggestbox-flyout-highlighttext",
                asbHitHighlightSpan: "win-autosuggestbox-hithighlight-span",
                asbInput: "win-autosuggestbox-input",
                asbSuggestionQuery: "win-autosuggestbox-suggestion-query",
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

                // Binding event handlers
                this._suggestionRenderer = this._suggestionRenderer.bind(this);

                // Build control's DOM
                this._element = element;
                element.winControl = this;
                element.classList.add(classNames.asb);
                element.classList.add("win-disposable");

                this._inputElement = _Global.document.createElement("input");
                this._inputElement.type = "search";
                this._inputElement.classList.add(classNames.asbInput);
                element.appendChild(this._inputElement);

                this._flyoutDivElement = _Global.document.createElement('div');
                this._flyoutDivElement.classList.add(classNames.asbFlyout);
                element.appendChild(this._flyoutDivElement);

                this._suggestionsData = new BindingList.List();
                this._repeater = new Repeater.Repeater(null, { data: this._suggestionsData, template: this._suggestionRenderer });
                this._flyoutDivElement.appendChild(this._repeater.element);

                _Control.setOptions(this, options);
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

                _suggestionRenderer: function asb_suggestionRenderer(item) {
                    var root = null;
                    if (!item) {
                        return root;
                    }
                    if (item.kind === AutoSuggestBox.SuggestionKinds.Query) {
                        root = querySuggestionRenderer(this, item);
                    } else if (item.kind === _SearchSuggestionManagerShim._SearchSuggestionKind.Separator) {
                        //root = this._separatorSuggestionRenderer(item);
                    } else if (item.kind === _SearchSuggestionManagerShim._SearchSuggestionKind.Result) {
                        //root = this._resultSuggestionRenderer(item);
                    } else {
                        throw new _ErrorFromName("WinJS.UI.AutoSuggestBox.invalidSuggestionKind", strings.invalidSuggestionKind);
                    }

                    return root;
                }
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