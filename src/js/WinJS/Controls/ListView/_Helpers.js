// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define([
    'exports',
    '../../Core/_Base',
    '../ItemContainer/_Constants'
], function helpersInit(exports, _Base, _Constants) {
    "use strict";

    function nodeListToArray(nodeList) {
        return Array.prototype.slice.call(nodeList);
    }

    function repeat(strings, count) {
        // Continously concatenate a string or set of strings
        // until the specified number of concatenations are made.
        // e.g.
        //  repeat("a", 3) ==> "aaa"
        //  repeat(["a", "b"], 0) ==> ""
        //  repeat(["a", "b", "c"], 2) ==> "ab"
        //  repeat(["a", "b", "c"], 7) ==> "abcabca"
        if (typeof strings === "string") {
            return repeat([strings], count);
        }
        var result = new Array(Math.floor(count / strings.length) + 1).join(strings.join(""));
        result += strings.slice(0, count % strings.length).join("");
        return result;
    }

    function stripedContainers(count, nextItemIndex) {
        var containersMarkup,
            evenStripe = _Constants._containerEvenClass,
            oddStripe = _Constants._containerOddClass,
            stripes = nextItemIndex % 2 === 0 ? [evenStripe, oddStripe] : [oddStripe, evenStripe];

        var pairOfContainers = [
                "<div class='win-container " + stripes[0] + " win-backdrop'></div>",
                "<div class='win-container " + stripes[1] + " win-backdrop'></div>"
        ];

        containersMarkup = repeat(pairOfContainers, count);
        return containersMarkup;
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _nodeListToArray: nodeListToArray,
        _repeat: repeat,
        _stripedContainers: stripedContainers
    });
});
