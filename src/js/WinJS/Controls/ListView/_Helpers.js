// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../../Core/_Base',
    '../ItemContainer/_Constants',
    '../../Animations'
], function helpersInit(exports, _Base, _Constants, Animations) {
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
        _stripedContainers: stripedContainers,
        _ListViewAnimationHelper: {
            fadeInElement: function (element) {
                return Animations.fadeIn(element);
            },
            fadeOutElement: function (element) {
                return Animations.fadeOut(element);
            },
            animateEntrance: function (canvas, firstEntrance) {
                return Animations.enterContent(canvas, [{ left: firstEntrance ? "100px" : "40px", top: "0px", rtlflip: true }], { mechanism: "transition" });
            },
        }
    });
});
