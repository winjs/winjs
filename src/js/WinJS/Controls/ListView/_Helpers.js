// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../../Core/_Base',
    '../../Animations',
    '../../Utilities/_ElementUtilities'
    ], function helpersInit(exports, _Base, Animations, _ElementUtilities) {
    "use strict";

    function nodeListToArray(nodeList) {
        return Array.prototype.slice.call(nodeList);
    }

    function repeat(markup, count) {
        return new Array(count + 1).join(markup);
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _nodeListToArray: nodeListToArray,
        _repeat: repeat,
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
