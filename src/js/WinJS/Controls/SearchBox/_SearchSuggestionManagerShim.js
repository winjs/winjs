// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../../_Signal',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Core/_Events',
    '../../BindingList',
], function SearchSuggestionManagerShimInit(exports, _Signal, _Base, _BaseUtils, _Events, BindingList) {
    "use strict";

    var CollectionChange = {
        reset: 0,
        itemInserted: 1,
        itemRemoved: 2,
        itemChanged: 3
    };
    var SearchSuggestionKind = {
        Query: 0,
        Result: 1,
        Separator: 2
    };

    var SuggestionVectorShim = _Base.Class.derive(Array, function SuggestionVectorShim_ctor() {
    }, {
        reset: function () {
            this.length = 0;
            this.dispatchEvent("vectorchanged", { collectionChange: CollectionChange.reset, index: 0 });
        },

        insert: function (index, data) {
            this.splice(index, 0, data);
            this.dispatchEvent("vectorchanged", { collectionChange: CollectionChange.itemInserted, index: index });
        },

        remove: function (index) {
            this.splice(index, 1);
            this.dispatchEvent("vectorchanged", { collectionChange: CollectionChange.itemRemoved, index: index });
        },
    });
    _Base.Class.mix(SuggestionVectorShim, _Events.eventMixin);

    var SearchSuggestionCollectionShim = _Base.Class.define(function SearchSuggestionCollectionShim_ctor() {
        this._data = [];
    }, {
        size: {
            get: function () {
                return this._data.length;
            }
        },

        appendQuerySuggestion: function (text) {
            this._data.push({ kind: SearchSuggestionKind.Query, text: text });
        },
        appendQuerySuggestions: function (suggestions) {
            suggestions.forEach(this.appendQuerySuggestion.bind(this));
        },
        appendResultSuggestion: function (text, detailText, tag, imageUrl, imageAlternateText) {
            // 'image' must be null (not undefined) for SearchBox to fallback to use imageUrl instead
            this._data.push({ kind: SearchSuggestionKind.Result, text: text, detailText: detailText, tag: tag, imageUrl: imageUrl, imageAlternateText: imageAlternateText, image: null });
        },
        appendSearchSeparator: function (label) {
            this._data.push({ kind: SearchSuggestionKind.Separator, text: label });
        }
    });

    var SuggestionsRequestedEventArgShim = _Base.Class.define(function SuggestionsRequestedEventArgShim_ctor(queryText, language, linguisticDetails) {
        this._queryText = queryText;
        this._language = language;
        this._linguisticDetails = linguisticDetails;
        this._searchSuggestionCollection = new SearchSuggestionCollectionShim();
    }, {
        language: {
            get: function () {
                return this._language;
            }
        },
        linguisticDetails: {
            get: function () {
                return this._linguisticDetails;
            }
        },
        queryText: {
            get: function () {
                return this._queryText;
            }
        },
        searchSuggestionCollection: {
            get: function () {
                return this._searchSuggestionCollection;
            }
        },
        getDeferral: function () {
            return this._deferralSignal || (this._deferralSignal = new _Signal());
        },

        _deferralSignal: null,
    });

    var SearchSuggestionManagerShim = _Base.Class.define(function SearchSuggestionManagerShim_ctor() {
        this._updateVector = this._updateVector.bind(this);

        this._suggestionVector = new SuggestionVectorShim();
        this._query = "";
        this._history = { "": [] };

        this._dataSource = [];

        this.searchHistoryContext = "";
        this.searchHistoryEnabled = true;
    }, {
        addToHistory: function (queryText /*, language */) {
            if (!queryText || !queryText.trim()) {
                return;
            }

            var history = this._history[this.searchHistoryContext];
            var dupeIndex = -1;
            for (var i = 0, l = history.length; i < l; i++) {
                var item = history[i];
                if (item.text.toLowerCase() === queryText.toLowerCase()) {
                    dupeIndex = i;
                    break;
                }
            }
            if (dupeIndex >= 0) {
                history.splice(dupeIndex, 1);
            }

            history.splice(0, 0, { text: queryText, kind: SearchSuggestionKind.Query });
            this._updateVector();
        },

        clearHistory: function () {
            this._history[this.searchHistoryContext] = [];
            this._updateVector();
        },

        setLocalContentSuggestionSettings: function (settings) {
        },

        setQuery: function (queryText) {
            var that = this;
            function update(arr) {
                that._dataSource = arr;
                that._updateVector();
            }

            this._query = queryText;
            var arg = new SuggestionsRequestedEventArgShim(queryText);
            this.dispatchEvent("suggestionsrequested", { request: arg });
            if (arg._deferralSignal) {
                arg._deferralSignal.promise.then(update.bind(this, arg.searchSuggestionCollection._data));
            } else {
                update(arg.searchSuggestionCollection._data);
            }
        },

        searchHistoryContext: {
            get: function () {
                return "" + this._searchHistoryContext;
            },
            set: function (value) {
                value = "" + value;
                if (!this._history[value]) {
                    this._history[value] = [];
                }
                this._searchHistoryContext = value;
            }
        },

        searchHistoryEnabled: {
            get: function () {
                return this._searchHistoryEnabled;
            },
            set: function (value) {
                this._searchHistoryEnabled = value;
            }
        },

        suggestions: {
            get: function () {
                return this._suggestionVector;
            }
        },

        _updateVector: function () {
            // Can never clear the entire suggestions list or it will cause a visual flash because
            // the SearchBox control removes the suggestions list UI when the SSM fires vectorChanged
            // with size === 0, then re-renders it when the first suggestion is added.
            // Workaround is to insert a dummy entry, remove all old entries, add the new set of
            // eligible suggestions, then remove the dummy entry.
            this.suggestions.insert(this.suggestions.length, { text: "", kind: SearchSuggestionKind.Query });

            while (this.suggestions.length > 1) {
                this.suggestions.remove(0);
            }

            var index = 0;
            var added = {};
            if (this.searchHistoryEnabled) {
                var q = this._query.toLowerCase();
                this._history[this.searchHistoryContext].forEach(function (item) {
                    var text = item.text.toLowerCase();
                    if (text.indexOf(q) === 0) {
                        this.suggestions.insert(index, item);
                        added[text] = true;
                        index++;
                    }
                }, this);
            }
            this._dataSource.forEach(function (item) {
                if (item.kind === SearchSuggestionKind.Query) {
                    if (!added[item.text.toLowerCase()]) {
                        this.suggestions.insert(index, item);
                        index++;
                    }
                } else {
                    this.suggestions.insert(index, item);
                    index++;
                }
            }, this);

            this.suggestions.remove(this.suggestions.length - 1);
        },
    });
    _Base.Class.mix(SearchSuggestionManagerShim, _Events.eventMixin);

    _Base.Namespace._moduleDefine(exports, null, {
        _CollectionChange: CollectionChange,
        _SearchSuggestionKind: SearchSuggestionKind,
        _SearchSuggestionManagerShim: SearchSuggestionManagerShim,
    });
});