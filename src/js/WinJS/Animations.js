// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    './Core/_Global',
    './Core/_Base',
    './Core/_BaseUtils',
    './Core/_WriteProfilerMark',
    './Animations/_Constants',
    './Animations/_TransitionAnimation',
    './Promise'
    ], function animationsInit(exports, _Global, _Base, _BaseUtils, _WriteProfilerMark, _Constants, _TransitionAnimation, Promise) {
    "use strict";

    var transformNames = _BaseUtils._browserStyleEquivalents["transform"];

    // Default to 11 pixel from the left (or right if RTL)
    var defaultOffset = [{ top: "0px", left: "11px", rtlflip: true }];

    var OffsetArray = _Base.Class.define(function OffsetArray_ctor(offset, keyframe, defOffset) {
        // Constructor
        defOffset = defOffset || defaultOffset;
        if (Array.isArray(offset) && offset.length > 0) {
            this.offsetArray = offset;
            if (offset.length === 1) {
                this.keyframe = checkKeyframe(offset[0], defOffset[0], keyframe);
            }
        } else if (offset && offset.hasOwnProperty("top") && offset.hasOwnProperty("left")) {
            this.offsetArray = [offset];
            this.keyframe = checkKeyframe(offset, defOffset[0], keyframe);
        } else {
            this.offsetArray = defOffset;
            this.keyframe = chooseKeyframe(defOffset[0], keyframe);
        }
    }, { // Public Members
        getOffset: function (i) {
            if (i >= this.offsetArray.length) {
                i = this.offsetArray.length - 1;
            }
            return this.offsetArray[i];
        }
    }, { // Static Members
        supportedForProcessing: false,
    });

    function checkKeyframe(offset, defOffset, keyframe) {
        if (offset.keyframe) {
            return offset.keyframe;
        }

        if (!keyframe ||
            offset.left !== defOffset.left ||
            offset.top !== defOffset.top ||
            (offset.rtlflip && !defOffset.rtlflip)) {
            return null;
        }

        if (!offset.rtlflip) {
            return keyframe;
        }

        return keyframeCallback(keyframe);
    }

    function chooseKeyframe(defOffset, keyframe) {
        if (!keyframe || !defOffset.rtlflip) {
            return keyframe;
        }

        return keyframeCallback(keyframe);
    }

    function keyframeCallback(keyframe) {
        var keyframeRtl = keyframe + "-rtl";
        return function (i, elem) {
            return _Global.getComputedStyle(elem).direction === "ltr" ? keyframe : keyframeRtl;
        };
        }

    function makeArray(elements) {
        if (Array.isArray(elements) || elements instanceof _Global.NodeList || elements instanceof _Global.HTMLCollection) {
            return elements;
        } else if (elements) {
            return [elements];
        } else {
            return [];
        }
    }

    function collectOffsetArray(elemArray) {
        var offsetArray = [];
        for (var i = 0; i < elemArray.length; i++) {
            var offset = {
                top: elemArray[i].offsetTop,
                left: elemArray[i].offsetLeft
            };
            var matrix = _Global.getComputedStyle(elemArray[i], null)[transformNames.scriptName].split(",");
            if (matrix.length === 6) {
                offset.left += parseFloat(matrix[4]);
                offset.top += parseFloat(matrix[5]);
            }
            offsetArray.push(offset);
        }
        return offsetArray;
    }

    function staggerDelay(initialDelay, extraDelay, delayFactor, delayCap) {
        return function (i) {
            var ret = initialDelay;
            for (var j = 0; j < i; j++) {
                extraDelay *= delayFactor;
                ret += extraDelay;
            }
            if (delayCap) {
                ret = Math.min(ret, delayCap);
            }
            return ret;
        };
    }

    function makeOffsetsRelative(elemArray, offsetArray) {
        for (var i = 0; i < offsetArray.length; i++) {
            offsetArray[i].top -= elemArray[i].offsetTop;
            offsetArray[i].left -= elemArray[i].offsetLeft;
        }
    }

    function animTranslate2DTransform(elemArray, offsetArray, transition) {
        makeOffsetsRelative(elemArray, offsetArray);
        for (var i = 0; i < elemArray.length; i++) {
            if (offsetArray[i].top !== 0 || offsetArray[i].left !== 0) {
                elemArray[i].style[transformNames.scriptName] = "translate(" + offsetArray[i].left + "px, " + offsetArray[i].top + "px)";
            }
        }
        return _TransitionAnimation.executeTransition(elemArray, transition);
    }

    function animStaggeredSlide(curve, start, end, fadeIn, page, first, second, third) {
        var elementArray = [],
            startOffsetArray = [],
            endOffsetArray = [];
        function prepareSlide(elements, start, end) {
            if (!elements) {
                return;
            }
            var startOffset = {
                left: start + "px",
                top: "0px"
            },
            endOffset = {
                left: end + "px",
                top: "0px"
            };
            if (+elements.length === elements.length) {
                for (var i = 0, len = elements.length; i < len; i++) {
                    elementArray.push(elements[i]);
                    startOffsetArray.push(startOffset);
                    endOffsetArray.push(endOffset);
                }
            } else {
                elementArray.push(elements);
                startOffsetArray.push(startOffset);
                endOffsetArray.push(endOffset);
            }
        }
        var horizontalOffset = 200,
            startOffset = (start !== 0 ? (start < 0 ? -horizontalOffset : horizontalOffset) : 0),
            endOffset = (end !== 0 ? (end < 0 ? -horizontalOffset : horizontalOffset) : 0);
        prepareSlide(page, start, end);
        prepareSlide(first, startOffset, endOffset);
        prepareSlide(second, startOffset * 2, endOffset * 2);
        prepareSlide(third, startOffset * 3, endOffset * 3);
        startOffsetArray = new OffsetArray(startOffsetArray);
        endOffsetArray = new OffsetArray(endOffsetArray);
        return _TransitionAnimation.executeTransition(
            elementArray,
            [{
                property: transformNames.cssName,
                delay: 0,
                duration: 350,
                timing: curve,
                from: translateCallback(startOffsetArray),
                to: translateCallback(endOffsetArray)
            },
            {
                property: "opacity",
                delay: 0,
                duration: 350,
                timing: fadeIn ? "steps(1, start)" : "steps(1, end)",
                from: fadeIn ? 0 : 1,
                to: fadeIn ? 1 : 0
            }]);
    }

    function animRotationTransform(elemArray, origins, transition) {
        elemArray = makeArray(elemArray);
        origins = makeArray(origins);
        for (var i = 0, len = elemArray.length; i < len; i++) {
            var rtl = _Global.getComputedStyle(elemArray[i]).direction === "rtl";
            elemArray[i].style[_BaseUtils._browserStyleEquivalents["transform-origin"].scriptName] = origins[Math.min(origins.length - 1, i)][rtl ? "rtl" : "ltr"];
        }
        function onComplete() {
            clearAnimRotationTransform(elemArray);
        }
        return _TransitionAnimation.executeTransition(elemArray, transition).then(onComplete, onComplete);
    }

    function clearAnimRotationTransform(elemArray) {
        for (var i = 0, len = elemArray.length; i < len; i++) {
            elemArray[i].style[_BaseUtils._browserStyleEquivalents["transform-origin"].scriptName] = "";
            elemArray[i].style[transformNames.scriptName] = "";
            elemArray[i].style.opacity = "";
        }
    }

    function translateCallback(offsetArray, prefix) {
        prefix = prefix || "";
        return function (i, elem) {
            var offset = offsetArray.getOffset(i);
            var left = offset.left;
            if (offset.rtlflip && _Global.getComputedStyle(elem).direction === "rtl") {
                left = left.toString();
                if (left.charAt(0) === "-") {
                    left = left.substring(1);
                } else {
                    left = "-" + left;
                }
            }
            return prefix + "translate(" + left + ", " + offset.top + ")";
        };
    }

    function translateCallbackAnimate(offsetArray, suffix) {
        suffix = suffix || "";
        return function (i) {
            var offset = offsetArray[i];
            return "translate(" + offset.left + "px, " + offset.top + "px) " + suffix;
        };
    }

    function keyframeCallbackAnimate(offsetArray, keyframe) {
        return function (i) {
            var offset = offsetArray[i];
            return (offset.left === 0 && offset.top === 0) ? keyframe : null;
        };
    }

    function layoutTransition(LayoutTransition, target, affected, extra) {
        var targetArray = makeArray(target);
        var affectedArray = makeArray(affected);
        var offsetArray = collectOffsetArray(affectedArray);
        return new LayoutTransition(targetArray, affectedArray, offsetArray, extra);
    }

    function collectTurnstileTransformOrigins(elements) {
        var origins = [];
        for (var i = 0, len = elements.length; i < len; i++) {
            var itemBoundingBox = elements[i].getBoundingClientRect();
            var offsetLeftLTR = -(40 + itemBoundingBox.left);
            var offsetLeftRTL = 40 + (_Global.innerWidth - itemBoundingBox.right);
            var totalOffsetY = ((_Global.innerHeight / 2) - itemBoundingBox.top);
            origins.push(
                {
                    ltr: offsetLeftLTR + "px " + totalOffsetY + "px",
                    rtl: offsetLeftRTL + "px " + totalOffsetY + "px"
                }
            );
        }

        return origins;
    }

    function writeAnimationProfilerMark(text) {
        _WriteProfilerMark("WinJS.UI.Animation:" + text);
    }

    var ExpandAnimation = _Base.Class.define(function ExpandAnimation_ctor(revealedArray, affectedArray, offsetArray) {
        // Constructor
        this.revealedArray = revealedArray;
        this.affectedArray = affectedArray;
        this.offsetArray = offsetArray;
    }, { // Public Members
        execute: function () {
            writeAnimationProfilerMark("expandAnimation,StartTM");
            var promise1 = _TransitionAnimation.executeAnimation(
                this.revealedArray,
                {
                    keyframe: "WinJS-opacity-in",
                    property: "opacity",
                    delay: this.affectedArray.length > 0 ? 200 : 0,
                    duration: 167,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: 0,
                    to: 1
                });
            var promise2 = animTranslate2DTransform(
                this.affectedArray,
                this.offsetArray,
                {
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 367,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: ""
                });
            return Promise.join([promise1, promise2])
                .then(function () { writeAnimationProfilerMark("expandAnimation,StopTM"); });
        }
    }, { // Static Members
        supportedForProcessing: false,
    });

    var CollapseAnimation = _Base.Class.define(function CollapseAnimation_ctor(hiddenArray, affectedArray, offsetArray) {
        // Constructor
        this.hiddenArray = hiddenArray;
        this.affectedArray = affectedArray;
        this.offsetArray = offsetArray;
    }, { // Public Members
        execute: function () {
            writeAnimationProfilerMark("collapseAnimation,StartTM");
            var promise1 = _TransitionAnimation.executeAnimation(
                this.hiddenArray,
                {
                    keyframe: "WinJS-opacity-out",
                    property: "opacity",
                    delay: 0,
                    duration: 167,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: 1,
                    to: 0
                });
            var promise2 = animTranslate2DTransform(
                this.affectedArray,
                this.offsetArray,
                {
                    property: transformNames.cssName,
                    delay: this.hiddenArray.length > 0 ? 167 : 0,
                    duration: 367,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: ""
                });
            return Promise.join([promise1, promise2])
                .then(function () { writeAnimationProfilerMark("collapseAnimation,StopTM"); });
        }
    }, { // Static Members
        supportedForProcessing: false,
    });

    var RepositionAnimation = _Base.Class.define(function RepositionAnimation_ctor(target, elementArray, offsetArray) {
        // Constructor
        this.elementArray = elementArray;
        this.offsetArray = offsetArray;
    }, { // Public Members
        execute: function () {
            writeAnimationProfilerMark("repositionAnimation,StartTM");
            return animTranslate2DTransform(
                this.elementArray,
                this.offsetArray,
                {
                    property: transformNames.cssName,
                    delay: staggerDelay(0, 33, 1, 250),
                    duration: 367,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: ""
                })
                .then(function () { writeAnimationProfilerMark("repositionAnimation,StopTM"); });
        }
    }, { // Static Members
        supportedForProcessing: false,
    });

    var AddToListAnimation = _Base.Class.define(function AddToListAnimation_ctor(addedArray, affectedArray, offsetArray) {
        // Constructor
        this.addedArray = addedArray;
        this.affectedArray = affectedArray;
        this.offsetArray = offsetArray;
    }, { // Public Members
        execute: function () {
            writeAnimationProfilerMark("addToListAnimation,StartTM");
            var delay = this.affectedArray.length > 0 ? 240 : 0;
            var promise1 = _TransitionAnimation.executeAnimation(
                this.addedArray,
                [{
                    keyframe: "WinJS-scale-up",
                    property: transformNames.cssName,
                    delay: delay,
                    duration: 120,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: "scale(0.85)",
                    to: "none"
                },
                {
                    keyframe: "WinJS-opacity-in",
                    property: "opacity",
                    delay: delay,
                    duration: 120,
                    timing: "linear",
                    from: 0,
                    to: 1
                }]
            );
            var promise2 = animTranslate2DTransform(
                this.affectedArray,
                this.offsetArray,
                {
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 400,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: ""
                });
            return Promise.join([promise1, promise2])
                .then(function () { writeAnimationProfilerMark("addToListAnimation,StopTM"); });
        }
    }, { // Static Members
        supportedForProcessing: false,
    });

    var DeleteFromListAnimation = _Base.Class.define(function DeleteFromListAnimation_ctor(deletedArray, remainingArray, offsetArray) {
        // Constructor
        this.deletedArray = deletedArray;
        this.remainingArray = remainingArray;
        this.offsetArray = offsetArray;
    }, { // Public Members
        execute: function () {
            writeAnimationProfilerMark("deleteFromListAnimation,StartTM");
            var promise1 = _TransitionAnimation.executeAnimation(
                this.deletedArray,
                [{
                    keyframe: "WinJS-scale-down",
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 120,
                    timing: "cubic-bezier(0.11, 0.5, 0.24, .96)",
                    from: "none",
                    to: "scale(0.85)"
                },
                {
                    keyframe: "WinJS-opacity-out",
                    property: "opacity",
                    delay: 0,
                    duration: 120,
                    timing: "linear",
                    from: 1,
                    to: 0
                }]);
            var promise2 = animTranslate2DTransform(
                this.remainingArray,
                this.offsetArray,
                {
                    property: transformNames.cssName,
                    delay: this.deletedArray.length > 0 ? 60 : 0,
                    duration: 400,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: ""
                });
            return Promise.join([promise1, promise2])
                .then(function () { writeAnimationProfilerMark("deleteFromListAnimation,StopTM"); });
        }
    }, { // Static Members
        supportedForProcessing: false,
    });

    var _UpdateListAnimation = _Base.Class.define(function _UpdateListAnimation_ctor(addedArray, affectedArray, offsetArray, deleted) {
        // Constructor
        this.addedArray = addedArray;
        this.affectedArray = affectedArray;
        this.offsetArray = offsetArray;
        var deletedArray = makeArray(deleted);
        this.deletedArray = deletedArray;
        this.deletedOffsetArray = collectOffsetArray(deletedArray);
    }, { // Public Members
        execute: function () {
            writeAnimationProfilerMark("_updateListAnimation,StartTM");
            makeOffsetsRelative(this.deletedArray, this.deletedOffsetArray);

            var delay = 0;
            var promise1 = _TransitionAnimation.executeAnimation(
                this.deletedArray,
                [{
                    keyframe: keyframeCallbackAnimate(this.deletedOffsetArray, "WinJS-scale-down"),
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 120,
                    timing: "cubic-bezier(0.11, 0.5, 0.24, .96)",
                    from: translateCallbackAnimate(this.deletedOffsetArray),
                    to: translateCallbackAnimate(this.deletedOffsetArray, "scale(0.85)")
                },
                {
                    keyframe: "WinJS-opacity-out",
                    property: "opacity",
                    delay: 0,
                    duration: 120,
                    timing: "linear",
                    from: 1,
                    to: 0
                }]);

            if (this.deletedArray.length > 0) {
                delay += 60;
            }

            var promise2 = animTranslate2DTransform(
                this.affectedArray,
                this.offsetArray,
                {
                    property: transformNames.cssName,
                    delay: delay,
                    duration: 400,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: ""
                });

            if (this.affectedArray.length > 0) {
                delay += 240;
            } else if (delay) {
                delay += 60;
            }

            var promise3 = _TransitionAnimation.executeAnimation(
                this.addedArray,
                [{
                    keyframe: "WinJS-scale-up",
                    property: transformNames.cssName,
                    delay: delay,
                    duration: 120,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: "scale(0.85)",
                    to: "none"
                },
                {
                    keyframe: "WinJS-opacity-in",
                    property: "opacity",
                    delay: delay,
                    duration: 120,
                    timing: "linear",
                    from: 0,
                    to: 1
                }]
            );
            return Promise.join([promise1, promise2, promise3])
                .then(function () { writeAnimationProfilerMark("_updateListAnimation,StopTM"); });
        }
    }, { // Static Members
        supportedForProcessing: false,
    });


    var AddToSearchListAnimation = _Base.Class.define(function AddToSearchListAnimation_ctor(addedArray, affectedArray, offsetArray) {
        // Constructor
        this.addedArray = addedArray;
        this.affectedArray = affectedArray;
        this.offsetArray = offsetArray;
    }, { // Public Members
        execute: function () {
            writeAnimationProfilerMark("addToSearchListAnimation,StartTM");
            var promise1 = _TransitionAnimation.executeAnimation(
                this.addedArray,
                {
                    keyframe: "WinJS-opacity-in",
                    property: "opacity",
                    delay: this.affectedArray.length > 0 ? 240 : 0,
                    duration: 117,
                    timing: "linear",
                    from: 0,
                    to: 1
                });
            var promise2 = animTranslate2DTransform(
                this.affectedArray,
                this.offsetArray,
                {
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 400,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: ""
                });
            return Promise.join([promise1, promise2])
                .then(function () { writeAnimationProfilerMark("addToSearchListAnimation,StopTM"); });
        }
    }, { // Static Members
        supportedForProcessing: false,
    });

    var DeleteFromSearchListAnimation = _Base.Class.define(function DeleteFromSearchListAnimation_ctor(deletedArray, remainingArray, offsetArray) {
        // Constructor
        this.deletedArray = deletedArray;
        this.remainingArray = remainingArray;
        this.offsetArray = offsetArray;
    }, { // Public Members
        execute: function () {
            writeAnimationProfilerMark("deleteFromSearchListAnimation,StartTM");
            var promise1 = _TransitionAnimation.executeAnimation(
                this.deletedArray,
                {
                    keyframe: "WinJS-opacity-out",
                    property: "opacity",
                    delay: 0,
                    duration: 93,
                    timing: "linear",
                    from: 1,
                    to: 0
                });
            var promise2 = animTranslate2DTransform(
                this.remainingArray,
                this.offsetArray,
                {
                    property: transformNames.cssName,
                    delay: this.deletedArray.length > 0 ? 60 : 0,
                    duration: 400,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: ""
                });
            return Promise.join([promise1, promise2])
                .then(function () { writeAnimationProfilerMark("deleteFromSearchListAnimation,StopTM"); });
        }
    }, { // Static Members
        supportedForProcessing: false,
    });

    var PeekAnimation = _Base.Class.define(function PeekAnimation_ctor(target, elementArray, offsetArray) {
        // Constructor
        this.elementArray = elementArray;
        this.offsetArray = offsetArray;
    }, { // Public Members
        execute: function () {
            writeAnimationProfilerMark("peekAnimation,StartTM");
            return animTranslate2DTransform(
                this.elementArray,
                this.offsetArray,
                {
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 2000,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: ""
                })
                .then(function () { writeAnimationProfilerMark("peekAnimation,StopTM"); });
        }
    }, { // Static Members
        supportedForProcessing: false,
    });

    _Base.Namespace._moduleDefine(exports, "WinJS.UI.Animation", {

        createExpandAnimation: function (revealed, affected) {
            /// <signature helpKeyword="WinJS.UI.Animation.createExpandAnimation">
            /// <summary locid="WinJS.UI.Animation.createExpandAnimation">
            /// Creates an expand animation.
            /// After creating the ExpandAnimation object,
            /// modify the document to move the elements to their new positions,
            /// then call the execute method on the ExpandAnimation object.
            /// </summary>
            /// <param name="revealed" locid="WinJS.UI.Animation.createExpandAnimation_p:revealed">
            /// Single element or collection of elements which were revealed.
            /// </param>
            /// <param name="affected" locid="WinJS.UI.Animation.createExpandAnimation_p:affected">
            /// Single element or collection of elements whose positions were
            /// affected by the expand.
            /// </param>
            /// <returns type="{ execute: Function }" locid="WinJS.UI.Animation.createExpandAnimation_returnValue">
            /// ExpandAnimation object whose execute method returns
            /// a Promise that completes when the animation is complete.
            /// </returns>
            /// </signature>
            return layoutTransition(ExpandAnimation, revealed, affected);
        },

        createCollapseAnimation: function (hidden, affected) {
            /// <signature helpKeyword="WinJS.UI.Animation.createCollapseAnimation">
            /// <summary locid="WinJS.UI.Animation.createCollapseAnimation">
            /// Creates a collapse animation.
            /// After creating the CollapseAnimation object,
            /// modify the document to move the elements to their new positions,
            /// then call the execute method on the CollapseAnimation object.
            /// </summary>
            /// <param name="hidden" locid="WinJS.UI.Animation.createCollapseAnimation_p:hidden">
            /// Single element or collection of elements being removed from view.
            /// When the animation completes, the application should hide the elements
            /// or remove them from the document.
            /// </param>
            /// <param name="affected" locid="WinJS.UI.Animation.createCollapseAnimation_p:affected">
            /// Single element or collection of elements whose positions were
            /// affected by the collapse.
            /// </param>
            /// <returns type="{ execute: Function }" locid="WinJS.UI.Animation.createCollapseAnimation_returnValue">
            /// CollapseAnimation object whose execute method returns
            /// a Promise that completes when the animation is complete.
            /// </returns>
            /// </signature>
            return layoutTransition(CollapseAnimation, hidden, affected);
        },

        createRepositionAnimation: function (element) {
            /// <signature helpKeyword="WinJS.UI.Animation.createRepositionAnimation">
            /// <summary locid="WinJS.UI.Animation.createRepositionAnimation">
            /// Creates a reposition animation.
            /// After creating the RepositionAnimation object,
            /// modify the document to move the elements to their new positions,
            /// then call the execute method on the RepositionAnimation object.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Animation.createRepositionAnimation_p:element">
            /// Single element or collection of elements which were repositioned.
            /// </param>
            /// <returns type="{ execute: Function }" locid="WinJS.UI.Animation.createRepositionAnimation_returnValue">
            /// RepositionAnimation object whose execute method returns
            /// a Promise that completes when the animation is complete.
            /// </returns>
            /// </signature>
            return layoutTransition(RepositionAnimation, null, element);
        },

        fadeIn: function (shown) {
            /// <signature helpKeyword="WinJS.UI.Animation.fadeIn">
            /// <summary locid="WinJS.UI.Animation.fadeIn">
            /// Execute a fade-in animation.
            /// </summary>
            /// <param name="shown" locid="WinJS.UI.Animation.fadeIn_p:element">
            /// Single element or collection of elements to fade in.
            /// At the end of the animation, the opacity of the elements is 1.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.fadeIn_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("fadeIn,StartTM");

            return _TransitionAnimation.executeTransition(
                shown,
                {
                    property: "opacity",
                    delay: 0,
                    duration: 250,
                    timing: "linear",
                    from: 0,
                    to: 1
                })
                .then(function () { writeAnimationProfilerMark("fadeIn,StopTM"); });
        },

        fadeOut: function (hidden) {
            /// <signature helpKeyword="WinJS.UI.Animation.fadeOut">
            /// <summary locid="WinJS.UI.Animation.fadeOut">
            /// Execute a fade-out animation.
            /// </summary>
            /// <param name="hidden" locid="WinJS.UI.Animation.fadeOut_p:element">
            /// Single element or collection of elements to fade out.
            /// At the end of the animation, the opacity of the elements is 0.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.fadeOut_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("fadeOut,StartTM");

            return _TransitionAnimation.executeTransition(
                hidden,
                {
                    property: "opacity",
                    delay: 0,
                    duration: 167,
                    timing: "linear",
                    to: 0
                })
                .then(function () { writeAnimationProfilerMark("fadeOut,StopTM"); });
        },

        createAddToListAnimation: function (added, affected) {
            /// <signature helpKeyword="WinJS.UI.Animation.createAddToListAnimation" >
            /// <summary locid="WinJS.UI.Animation.createAddToListAnimation">
            /// Creates an animation for adding to a list.
            /// After creating the AddToListAnimation object,
            /// modify the document to move the elements to their new positions,
            /// then call the execute method on the AddToListAnimation object.
            /// </summary>
            /// <param name="added" locid="WinJS.UI.Animation.createAddToListAnimation_p:added">
            /// Single element or collection of elements which were added.
            /// </param>
            /// <param name="affected" locid="WinJS.UI.Animation.createAddToListAnimation_p:affected">
            /// Single element or collection of elements whose positions were
            /// affected by the add.
            /// </param>
            /// <returns type="{ execute: Function }" locid="WinJS.UI.Animation.createAddToListAnimation_returnValue">
            /// AddToListAnimation object whose execute method returns
            /// a Promise that completes when the animation is complete.
            /// </returns>
            /// </signature>
            return layoutTransition(AddToListAnimation, added, affected);
        },

        createDeleteFromListAnimation: function (deleted, remaining) {
            /// <signature helpKeyword="WinJS.UI.Animation.createDeleteFromListAnimation">
            /// <summary locid="WinJS.UI.Animation.createDeleteFromListAnimation">
            /// Crestes an animation for deleting from a list.
            /// After creating the DeleteFromListAnimation object,
            /// modify the document to reflect the deletion,
            /// then call the execute method on the DeleteFromListAnimation object.
            /// </summary>
            /// <param name="deleted" locid="WinJS.UI.Animation.createDeleteFromListAnimation_p:deleted">
            /// Single element or collection of elements which will be deleted.
            /// When the animation completes, the application should hide the elements
            /// or remove them from the document.
            /// </param>
            /// <param name="remaining" locid="WinJS.UI.Animation.createDeleteFromListAnimation_p:remaining">
            /// Single element or collection of elements whose positions were
            /// affected by the deletion.
            /// </param>
            /// <returns type="{ execute: Function }" locid="WinJS.UI.Animation.createDeleteFromListAnimation_returnValue">
            /// DeleteFromListAnimation object whose execute method returns
            /// a Promise that completes when the animation is complete.
            /// </returns>
            /// </signature>
            return layoutTransition(DeleteFromListAnimation, deleted, remaining);
        },

        _createUpdateListAnimation: function (added, deleted, affected) {
            return layoutTransition(_UpdateListAnimation, added, affected, deleted);
        },

        createAddToSearchListAnimation: function (added, affected) {
            /// <signature helpKeyword="WinJS.UI.Animation.createAddToSearchListAnimation">
            /// <summary locid="WinJS.UI.Animation.createAddToSearchListAnimation">
            /// Creates an animation for adding to a list of search results.
            /// This is similar to an AddToListAnimation, but faster.
            /// After creating the AddToSearchListAnimation object,
            /// modify the document to move the elements to their new positions,
            /// then call the execute method on the AddToSearchListAnimation object.
            /// </summary>
            /// <param name="added" locid="WinJS.UI.Animation.createAddToSearchListAnimation_p:added">
            /// Single element or collection of elements which were added.
            /// </param>
            /// <param name="affected" locid="WinJS.UI.Animation.createAddToSearchListAnimation_p:affected">
            /// Single element or collection of elements whose positions were
            /// affected by the add.
            /// </param>
            /// <returns type="{ execute: Function }" locid="WinJS.UI.Animation.createAddToSearchListAnimation_returnValue">
            /// AddToSearchListAnimation object whose execute method returns
            /// a Promise that completes when the animation is complete.
            /// </returns>
            /// </signature>
            return layoutTransition(AddToSearchListAnimation, added, affected);
        },

        createDeleteFromSearchListAnimation: function (deleted, remaining) {
            /// <signature helpKeyword="WinJS.UI.Animation.createDeleteFromSearchListAnimation">
            /// <summary locid="WinJS.UI.Animation.createDeleteFromSearchListAnimation">
            /// Creates an animation for deleting from a list of search results.
            /// This is similar to an DeleteFromListAnimation, but faster.
            /// After creating the DeleteFromSearchListAnimation object,
            /// modify the document to move the elements to their new positions,
            /// then call the execute method on the DeleteFromSearchListAnimation object.
            /// </summary>
            /// <param name="deleted" locid="WinJS.UI.Animation.createDeleteFromSearchListAnimation_p:deleted">
            /// Single element or collection of elements which will be deleted.
            /// When the animation completes, the application should hide the elements
            /// or remove them from the document.
            /// </param>
            /// <param name="remaining" locid="WinJS.UI.Animation.createDeleteFromSearchListAnimation_p:remaining">
            /// Single element or collection of elements whose positions were
            /// affected by the deletion.
            /// </param>
            /// <returns type="{ execute: Function }" locid="WinJS.UI.Animation.createDeleteFromSearchListAnimation_returnValue">
            /// DeleteFromSearchListAnimation object whose execute method returns
            /// a Promise that completes when the animation is complete.
            /// </returns>
            /// </signature>
            return layoutTransition(DeleteFromSearchListAnimation, deleted, remaining);
        },


        showEdgeUI: function (element, offset, options) {
            /// <signature helpKeyword="WinJS.UI.Animation.showEdgeUI">
            /// <summary locid="WinJS.UI.Animation.showEdgeUI">
            /// Slides an element or elements into position at the edge of the screen.
            /// This animation is designed for a small object like an appbar.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Animation.showEdgeUI_p:element">
            /// Single element or collection of elements to be slid into position.
            /// The elements should be at their final positions
            /// at the time the function is called.
            /// </param>
            /// <param name="offset" locid="WinJS.UI.Animation.showEdgeUI_p:offset">
            /// Optional offset object or collection of offset objects
            /// array describing the starting point of the animation.
            /// If the number of offset objects is less than the length of the
            /// element parameter, then the last value is repeated for all
            /// remaining elements.
            /// If this parameter is omitted, then a default value is used.
            /// </param>
            /// <param name="options" type="Object" optional="true" locid="WinJS.UI.Animation.showEdgeUI_p:options">
            /// Optional object which can specify the mechanism to use to play the animation. By default css
            /// animations are used but if { mechanism: "transition" } is provided css transitions will be used.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.showEdgeUI_p:returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("showEdgeUI,StartTM");

            var offsetArray = new OffsetArray(offset, "WinJS-showEdgeUI", [{ top: "-70px", left: "0px" }]);
            return _TransitionAnimation[((options && options.mechanism === "transition") ? "executeTransition" : "executeAnimation")](
                element,
                {
                    keyframe: offsetArray.keyframe,
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 367,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: offsetArray.keyframe || translateCallback(offsetArray),
                    to: "none"
                })
                .then(function () { writeAnimationProfilerMark("showEdgeUI,StopTM"); });
        },

        showPanel: function (element, offset) {
            /// <signature helpKeyword="WinJS.UI.Animation.showPanel">
            /// <summary locid="WinJS.UI.Animation.showPanel">
            /// Slides an element or elements into position at the edge of the screen.
            /// This animation is designed for a large object like a keyboard.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Animation.showPanel_p:element">
            /// Single element or collection of elements to be slid into position.
            /// The elements should be at their final positions
            /// at the time the function is called.
            /// </param>
            /// <param name="offset" locid="WinJS.UI.Animation.showPanel_p:offset">
            /// Optional offset object or collection of offset objects
            /// array describing the starting point of the animation.
            /// If the number of offset objects is less than the length of the
            /// element parameter, then the last value is repeated for all
            /// remaining elements.
            /// If this parameter is omitted, then a default value is used.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.showPanel_returnValue">
            /// promise object
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("showPanel,StartTM");

            var offsetArray = new OffsetArray(offset, "WinJS-showPanel", [{ top: "0px", left: "364px", rtlflip: true }]);
            return _TransitionAnimation.executeAnimation(
                element,
                {
                    keyframe: offsetArray.keyframe,
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 550,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: offsetArray.keyframe || translateCallback(offsetArray),
                    to: "none"
                })
                .then(function () { writeAnimationProfilerMark("showPanel,StopTM"); });
        },

        hideEdgeUI: function (element, offset, options) {
            /// <signature helpKeyword="WinJS.UI.Animation.hideEdgeUI">
            /// <summary locid="WinJS.UI.Animation.hideEdgeUI">
            /// Slides an element or elements at the edge of the screen out of view.
            /// This animation is designed for a small object like an appbar.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Animation.hideEdgeUI_p:element">
            /// Single element or collection of elements to be slid out.
            /// The elements should be at their onscreen positions
            /// at the time the function is called.
            /// </param>
            /// <param name="offset" locid="WinJS.UI.Animation.hideEdgeUI_p:offset">
            /// Optional offset object or collection of offset objects
            /// array describing the ending point of the animation.
            /// If the number of offset objects is less than the length of the
            /// element parameter, then the last value is repeated for all
            /// remaining elements.
            /// If this parameter is omitted, then a default value is used.
            /// </param>
            /// <param name="options" type="Object" optional="true" locid="WinJS.UI.Animation.hideEdgeUI_p:options">
            /// Optional object which can specify the mechanism to use to play the animation. By default css
            /// animations are used but if { mechanism: "transition" } is provided css transitions will be used.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.hideEdgeUI_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("hideEdgeUI,StartTM");

            var offsetArray = new OffsetArray(offset, "WinJS-hideEdgeUI", [{ top: "-70px", left: "0px" }]);
            return _TransitionAnimation[((options && options.mechanism === "transition") ? "executeTransition" : "executeAnimation")](
                element,
                {
                    keyframe: offsetArray.keyframe,
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 367,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: "none",
                    to: offsetArray.keyframe || translateCallback(offsetArray)
                })
                .then(function () { writeAnimationProfilerMark("hideEdgeUI,StopTM"); });
        },

        hidePanel: function (element, offset) {
            /// <signature helpKeyword="WinJS.UI.Animation.hidePanel">
            /// <summary locid="WinJS.UI.Animation.hidePanel">
            /// Slides an element or elements at the edge of the screen out of view.
            /// This animation is designed for a large object like a keyboard.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Animation.hidePanel_p:element">
            /// Single element or collection of elements to be slid out.
            /// The elements should be at their onscreen positions
            /// at the time the function is called.
            /// </param>
            /// <param name="offset" locid="WinJS.UI.Animation.hidePanel_p:offset">
            /// Optional offset object or collection of offset objects
            /// array describing the ending point of the animation.
            /// If the number of offset objects is less than the length of the
            /// element parameter, then the last value is repeated for all
            /// remaining elements.
            /// If this parameter is omitted, then a default value is used.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.hidePanel_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("hidePanel,StartTM");

            var offsetArray = new OffsetArray(offset, "WinJS-hidePanel", [{ top: "0px", left: "364px", rtlflip: true }]);
            return _TransitionAnimation.executeAnimation(
                element,
                {
                    keyframe: offsetArray.keyframe,
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 550,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: "none",
                    to: offsetArray.keyframe || translateCallback(offsetArray)
                })
                .then(function () { writeAnimationProfilerMark("hidePanel,StopTM"); });
        },

        showPopup: function (element, offset) {
            /// <signature helpKeyword="WinJS.UI.Animation.showPopup">
            /// <summary locid="WinJS.UI.Animation.showPopup">
            /// Displays an element or elements in the style of a popup.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Animation.showPopup_p:element">
            /// Single element or collection of elements to be shown like a popup.
            /// </param>
            /// <param name="offset" locid="WinJS.UI.Animation.showPopup_p:offset">
            /// Optional offset object or collection of offset objects
            /// array describing the starting point of the animation.
            /// If the number of offset objects is less than the length of the
            /// element parameter, then the last value is repeated for all
            /// remaining elements.
            /// If this parameter is omitted, then a default value is used.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.showPopup_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("showPopup,StartTM");

            var offsetArray = new OffsetArray(offset, "WinJS-showPopup", [{ top: "50px", left: "0px" }]);
            return _TransitionAnimation.executeAnimation(
                element,
                [{
                    keyframe: "WinJS-opacity-in",
                    property: "opacity",
                    delay: 83,
                    duration: 83,
                    timing: "linear",
                    from: 0,
                    to: 1
                },
                {
                    keyframe: offsetArray.keyframe,
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 367,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: offsetArray.keyframe || translateCallback(offsetArray),
                    to: "none"
                }])
                .then(function () { writeAnimationProfilerMark("showPopup,StopTM"); });
        },

        hidePopup: function (element) {
            /// <signature helpKeyword="WinJS.UI.Animation.hidePopup" >
            /// <summary locid="WinJS.UI.Animation.hidePopup">
            /// Removes a popup from the screen.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Animation.hidePopup_p:element">
            /// Single element or collection of elements to be hidden like a popup.
            /// When the animation completes, the application should hide the elements
            /// or remove them from the document.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.hidePopup_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("hidePopup,StartTM");

            return _TransitionAnimation.executeAnimation(
                element,
                {
                    keyframe: "WinJS-opacity-out",
                    property: "opacity",
                    delay: 0,
                    duration: 83,
                    timing: "linear",
                    from: 1,
                    to: 0
                })
                .then(function () { writeAnimationProfilerMark("hidePopup,StopTM"); });
        },

        pointerDown: function (element) {
            /// <signature helpKeyword="WinJS.UI.Animation.pointerDown">
            /// <summary locid="WinJS.UI.Animation.pointerDown">
            /// Execute a pointer-down animation.
            /// Use the pointerUp animation to reverse the effect of this animation.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Animation.pointerDown_p:element">
            /// Single element or collection of elements responding to the
            /// pointer-down event.
            /// At the end of the animation, the elements' properties have been
            /// modified to reflect the pointer-down state.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.pointerDown_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("pointerDown,StartTM");

            return _TransitionAnimation.executeTransition(
                 element,
                 {
                     property: transformNames.cssName,
                     delay: 0,
                     duration: 167,
                     timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                     to: "scale(0.975, 0.975)"
                 })
                .then(function () { writeAnimationProfilerMark("pointerDown,StopTM"); });
        },

        pointerUp: function (element) {
            /// <signature helpKeyword="WinJS.UI.Animation.pointerUp">
            /// <summary locid="WinJS.UI.Animation.pointerUp">
            /// Execute a pointer-up animation.
            /// This reverses the effect of a pointerDown animation.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Animation.pointerUp_p:element">
            /// Single element or collection of elements responding to
            /// the pointer-up event.
            /// At the end of the animation, the elements' properties have been
            /// returned to normal.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.pointerUp_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("pointerUp,StartTM");

            return _TransitionAnimation.executeTransition(
                 element,
                 {
                     property: transformNames.cssName,
                     delay: 0,
                     duration: 167,
                     timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                     to: ""
                 })
                .then(function () { writeAnimationProfilerMark("pointerUp,StopTM"); });
        },

        dragSourceStart: function (dragSource, affected) {
            /// <signature helpKeyword="WinJS.UI.Animation.dragSourceStart" >
            /// <summary locid="WinJS.UI.Animation.dragSourceStart">
            /// Execute a drag-start animation.
            /// Use the dragSourceEnd animation to reverse the effects of this animation.
            /// </summary>
            /// <param name="dragSource" locid="WinJS.UI.Animation.dragSourceStart_p:dragSource">
            /// Single element or collection of elements being dragged.
            /// At the end of the animation, the elements' properties have been
            /// modified to reflect the drag state.
            /// </param>
            /// <param name="affected" locid="WinJS.UI.Animation.dragSourceStart_p:affected">
            /// Single element or collection of elements to highlight as not
            /// being dragged.
            /// At the end of the animation, the elements' properties have been
            /// modified to reflect the drag state.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.dragSourceStart_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("dragSourceStart,StartTM");

            var promise1 = _TransitionAnimation.executeTransition(
                dragSource,
                [{
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 240,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: "scale(1.05)"
                },
                {
                    property: "opacity",
                    delay: 0,
                    duration: 240,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: 0.65
                }]);
            var promise2 = _TransitionAnimation.executeTransition(
                affected,
                {
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 240,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: "scale(0.95)"
                });
            return Promise.join([promise1, promise2])
                .then(function () { writeAnimationProfilerMark("dragSourceStart,StopTM"); });
        },

        dragSourceEnd: function (dragSource, offset, affected) {
            /// <signature helpKeyword="WinJS.UI.Animation.dragSourceEnd">
            /// <summary locid="WinJS.UI.Animation.dragSourceEnd">
            /// Execute a drag-end animation.
            /// This reverses the effect of the dragSourceStart animation.
            /// </summary>
            /// <param name="dragSource" locid="WinJS.UI.Animation.dragSourceEnd_p:dragSource">
            /// Single element or collection of elements no longer being dragged.
            /// At the end of the animation, the elements' properties have been
            /// returned to normal.
            /// </param>
            /// <param name="offset" locid="WinJS.UI.Animation.dragSourceEnd_p:offset">
            /// Optional offset object or collection of offset objects
            /// array describing the starting point of the animation.
            /// If the number of offset objects is less than the length of the
            /// dragSource parameter, then the last value is repeated for all
            /// remaining elements.
            /// If this parameter is omitted, then a default value is used.
            /// </param>
            /// <param name="affected" locid="WinJS.UI.Animation.dragSourceEnd_p:affected">
            /// Single element or collection of elements which were highlighted as not
            /// being dragged.
            /// At the end of the animation, the elements' properties have been
            /// returned to normal.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.dragSourceEnd_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("dragSourceEnd,StartTM");

            var offsetArray = new OffsetArray(offset, "WinJS-dragSourceEnd");
            var promise1 = _TransitionAnimation.executeTransition(
                dragSource,
                [{
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 500,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: "" // this removes the scale
                },
                {
                    property: "opacity",
                    delay: 0,
                    duration: 500,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: 1
                }]);

            var promise2 = _TransitionAnimation.executeAnimation(
                dragSource,
                {
                    keyframe: offsetArray.keyframe,
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 500,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: offsetArray.keyframe || translateCallback(offsetArray, "scale(1.05) "),
                    to: "none"
                });

            var promise3 = _TransitionAnimation.executeTransition(
                 affected,
                 {
                     property: transformNames.cssName,
                     delay: 0,
                     duration: 500,
                     timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                     to: ""
                 });
            return Promise.join([promise1, promise2, promise3])
                .then(function () { writeAnimationProfilerMark("dragSourceEnd,StopTM"); });
        },


        enterContent: function (incoming, offset, options) {
            /// <signature helpKeyword="WinJS.UI.Animation.enterContent">
            /// <summary locid="WinJS.UI.Animation.enterContent">
            /// Execute an enter-content animation.
            /// </summary>
            /// <param name="incoming" locid="WinJS.UI.Animation.enterContent_p:incoming">
            /// Single element or collection of elements which represent
            /// the incoming content.
            /// At the end of the animation, the opacity of the elements is 1.
            /// </param>
            /// <param name="offset" locid="WinJS.UI.Animation.enterContent_p:offset">
            /// Optional offset object or collection of offset objects
            /// array describing the starting point of the animation.
            /// If the number of offset objects is less than the length of the
            /// incoming parameter, then the last value is repeated for all
            /// remaining elements.
            /// If this parameter is omitted, then a default value is used.
            /// </param>
            /// <param name="options" type="Object" optional="true" locid="WinJS.UI.Animation.enterContent_p:options">
            /// Optional object which can specify the mechanism to use to play the animation. By default css
            /// animations are used but if { mechanism: "transition" } is provided css transitions will be used.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.enterContent_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("enterContent,StartTM");

            var animationPromise;
            var offsetArray = new OffsetArray(offset, "WinJS-enterContent", [{ top: "0px", left: "40px", rtlflip: true }]);
            if (options && options.mechanism === "transition") {
                animationPromise = _TransitionAnimation.executeTransition(
                    incoming,
                    [{
                        property: transformNames.cssName,
                        delay: 0,
                        duration: 550,
                        timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                        from: translateCallback(offsetArray),
                        to: "none"
                    },
                    {
                        property: "opacity",
                        delay: 0,
                        duration: 170,
                        timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                        from: 0,
                        to: 1
                    }]);
            } else {
                var promise1 = _TransitionAnimation.executeAnimation(
                    incoming,
                    {
                        keyframe: offsetArray.keyframe,
                        property: transformNames.cssName,
                        delay: 0,
                        duration: 550,
                        timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                        from: offsetArray.keyframe || translateCallback(offsetArray),
                        to: "none"
                    });
                var promise2 = _TransitionAnimation.executeTransition(
                    incoming,
                    {
                        property: "opacity",
                        delay: 0,
                        duration: 170,
                        timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                        from: 0,
                        to: 1
                    });
                animationPromise = Promise.join([promise1, promise2]);
            }
            return animationPromise.then(function () { writeAnimationProfilerMark("enterContent,StopTM"); });
        },

        exitContent: function (outgoing, offset) {
            /// <signature helpKeyword="WinJS.UI.Animation.exitContent">
            /// <summary locid="WinJS.UI.Animation.exitContent">
            /// Execute an exit-content animation.
            /// </summary>
            /// <param name="outgoing" locid="WinJS.UI.Animation.exitContent_p:outgoing">
            /// Single element or collection of elements which represent
            /// the outgoing content.
            /// At the end of the animation, the opacity of the elements is 0.
            /// </param>
            /// <param name="offset" locid="WinJS.UI.Animation.exitContent_p:offset">
            /// Optional offset object or collection of offset objects
            /// array describing the ending point of the animation.
            /// If the number of offset objects is less than the length of the
            /// outgoing parameter, then the last value is repeated for all
            /// remaining elements.
            /// If this parameter is omitted, then a default value is used.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.exitContent_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("exitContent,StartTM");

            var offsetArray = new OffsetArray(offset, "WinJS-exit", [{ top: "0px", left: "0px" }]);
            var promise1 = _TransitionAnimation.executeAnimation(
                outgoing,
                offset && {
                    keyframe: offsetArray.keyframe,
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 117,
                    timing: "linear",
                    from: "none",
                    to: offsetArray.keyframe || translateCallback(offsetArray)
                });

            var promise2 = _TransitionAnimation.executeTransition(
                outgoing,
                {
                    property: "opacity",
                    delay: 0,
                    duration: 117,
                    timing: "linear",
                    to: 0
                });
            return Promise.join([promise1, promise2])
                .then(function () { writeAnimationProfilerMark("exitContent,StopTM"); });
        },

        dragBetweenEnter: function (target, offset) {
            /// <signature helpKeyword="WinJS.UI.Animation.dragBetweenEnter">
            /// <summary locid="WinJS.UI.Animation.dragBetweenEnter">
            /// Execute an animation which indicates that a dragged object
            /// can be dropped between other elements.
            /// Use the dragBetweenLeave animation to reverse the effects of this animation.
            /// </summary>
            /// <param name="target" locid="WinJS.UI.Animation.dragBetweenEnter_p:target">
            /// Single element or collection of elements (usually two)
            /// that the dragged object can be dropped between.
            /// At the end of the animation, the elements' properties have been
            /// modified to reflect the drag-between state.
            /// </param>
            /// <param name="offset" locid="WinJS.UI.Animation.dragBetweenEnter_p:offset">
            /// Optional offset object or collection of offset objects
            /// array describing the ending point of the animation.
            /// If the number of offset objects is less than the length of the
            /// element parameter, then the last value is repeated for all
            /// remaining elements.
            /// If this parameter is omitted, then a default value is used.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.dragBetweenEnter_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("dragBetweenEnter,StartTM");

            var offsetArray = new OffsetArray(offset, null, [{ top: "-40px", left: "0px" }, { top: "40px", left: "0px" }]);
            return _TransitionAnimation.executeTransition(
                target,
                {
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 200,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: translateCallback(offsetArray, "scale(0.95) ")
                })
                .then(function () { writeAnimationProfilerMark("dragBetweenEnter,StopTM"); });
        },

        dragBetweenLeave: function (target) {
            /// <signature helpKeyword="WinJS.UI.Animation.dragBetweenLeave">
            /// <summary locid="WinJS.UI.Animation.dragBetweenLeave">
            /// Execute an animation which indicates that a dragged object
            /// will no longer be dropped between other elements.
            /// This reverses the effect of the dragBetweenEnter animation.
            /// </summary>
            /// <param name="target" locid="WinJS.UI.Animation.dragBetweenLeave_p:target">
            /// Single element or collection of elements (usually two)
            /// that the dragged object no longer will be dropped between.
            /// At the end of the animation, the elements' properties have been
            /// set to the dragSourceStart state.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.dragBetweenLeave_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("dragBetweenLeave,StartTM");

            return _TransitionAnimation.executeTransition(
                target,
                {
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 200,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: "scale(0.95)"
                })
                .then(function () { writeAnimationProfilerMark("dragBetweenLeave,StopTM"); });
        },

        swipeSelect: function (selected, selection) {
            /// <signature helpKeyword="WinJS.UI.Animation.swipeSelect">
            /// <summary locid="WinJS.UI.Animation.swipeSelect">
            /// Slide a swipe-selected object back into position when the
            /// pointer is released, and show the selection mark.
            /// </summary>
            /// <param name="selected" locid="WinJS.UI.Animation.swipeSelect_p:selected">
            /// Single element or collection of elements being selected.
            /// At the end of the animation, the elements' properties have been
            /// returned to normal.
            /// </param>
            /// <param name="selection" locid="WinJS.UI.Animation.swipeSelect_p:selection">
            /// Single element or collection of elements that is the selection mark.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.swipeSelect_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("swipeSelect,StartTM");

            var promise1 = _TransitionAnimation.executeTransition(
                selected,
                {
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 300,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: ""
                });

            var promise2 = _TransitionAnimation.executeAnimation(
                selection,
                {
                    keyframe: "WinJS-opacity-in",
                    property: "opacity",
                    delay: 0,
                    duration: 300,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: 0,
                    to: 1
                });
            return Promise.join([promise1, promise2])
                .then(function () { writeAnimationProfilerMark("swipeSelect,StopTM"); });
        },

        swipeDeselect: function (deselected, selection) {
            /// <signature helpKeyword="WinJS.UI.Animation.swipeDeselect">
            /// <summary locid="WinJS.UI.Animation.swipeDeselect">
            /// Slide a swipe-deselected object back into position when the
            /// pointer is released, and hide the selection mark.
            /// </summary>
            /// <param name="deselected" locid="WinJS.UI.Animation.swipeDeselect_p:deselected">
            /// Single element or collection of elements being deselected.
            /// At the end of the animation, the elements' properties have been
            /// returned to normal.
            /// </param>
            /// <param name="selection" locid="WinJS.UI.Animation.swipeDeselect_p:selection">
            /// Single element or collection of elements that is the selection mark.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.swipeDeselect_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("swipeDeselect,StartTM");

            var promise1 = _TransitionAnimation.executeTransition(
                deselected,
                {
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 300,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: ""
                });

            var promise2 = _TransitionAnimation.executeAnimation(
                selection,
                {
                    keyframe: "WinJS-opacity-out",
                    property: "opacity",
                    delay: 0,
                    duration: 300,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: 1,
                    to: 0
                });
            return Promise.join([promise1, promise2])
                .then(function () { writeAnimationProfilerMark("swipeDeselect,StopTM"); });
        },

        swipeReveal: function (target, offset) {
            /// <signature helpKeyword="WinJS.UI.Animation.swipeReveal">
            /// <summary locid="WinJS.UI.Animation.swipeReveal">
            /// Reveal an object as the result of a swipe, or slide the
            /// swipe-selected object back into position after the reveal.
            /// </summary>
            /// <param name="target" locid="WinJS.UI.Animation.swipeReveal_p:target">
            /// Single element or collection of elements being selected.
            /// At the end of the animation, the elements' properties have been
            /// modified to reflect the specified offset.
            /// </param>
            /// <param name="offset" locid="WinJS.UI.Animation.swipeReveal_p:offset">
            /// Optional offset object or collection of offset objects
            /// array describing the ending point of the animation.
            /// When moving the object back into position, the offset should be
            /// { top: "0px", left: "0px" }.
            /// If the number of offset objects is less than the length of the
            /// element parameter, then the last value is repeated for all
            /// remaining elements.
            /// If this parameter is omitted, then a default value is used.
            /// The default value describes the motion for a reveal.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.swipeReveal_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("swipeReveal,StartTM");

            var offsetArray = new OffsetArray(offset, null, [{ top: "25px", left: "0px" }]);
            return _TransitionAnimation.executeTransition(
                target,
                {
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 300,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    to: translateCallback(offsetArray)
                })
                .then(function () { writeAnimationProfilerMark("swipeReveal,StopTM"); });
        },

        enterPage: function (element, offset) {
            /// <signature helpKeyword="WinJS.UI.Animation.enterPage">
            /// <summary locid="WinJS.UI.Animation.enterPage">
            /// Execute an enterPage animation.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Animation.enterPage_p:element">
            /// Single element or collection of elements representing the
            /// incoming page.
            /// At the end of the animation, the opacity of the elements is 1.
            /// </param>
            /// <param name="offset" locid="WinJS.UI.Animation.enterPage_p:offset">
            /// Optional offset object or collection of offset objects
            /// array describing the starting point of the animation.
            /// If the number of offset objects is less than the length of the
            /// element parameter, then the last value is repeated for all
            /// remaining elements.
            /// If this parameter is omitted, then a default value is used.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.enterPage_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("enterPage,StartTM");

            var offsetArray = new OffsetArray(offset, "WinJS-enterPage", [{ top: "0px", left: "100px", rtlflip: true }]);
            var promise1 = _TransitionAnimation.executeAnimation(
                element,
                {
                    keyframe: offsetArray.keyframe,
                    property: transformNames.cssName,
                    delay: staggerDelay(0, 83, 1, 333),
                    duration: 1000,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: offsetArray.keyframe || translateCallback(offsetArray),
                    to: "none"
                });
            var promise2 = _TransitionAnimation.executeTransition(
                element,
                {
                    property: "opacity",
                    delay: staggerDelay(0, 83, 1, 333),
                    duration: 170,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: 0,
                    to: 1
                });
            return Promise.join([promise1, promise2])
                .then(function () { writeAnimationProfilerMark("enterPage,StopTM"); });
        },

        exitPage: function (outgoing, offset) {
            /// <signature helpKeyword="WinJS.UI.Animation.exitPage">
            /// <summary locid="WinJS.UI.Animation.exitPage">
            /// Execute an exitPage animation.
            /// </summary>
            /// <param name="outgoing" locid="WinJS.UI.Animation.exitPage_p:outgoing">
            /// Single element or collection of elements representing
            /// the outgoing page.
            /// At the end of the animation, the opacity of the elements is 0.
            /// </param>
            /// <param name="offset" locid="WinJS.UI.Animation.exitPage_p:offset">
            /// Optional offset object or collection of offset objects
            /// array describing the ending point of the animation.
            /// If the number of offset objects is less than the length of the
            /// outgoing parameter, then the last value is repeated for all
            /// remaining elements.
            /// If this parameter is omitted, then a default value is used.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.exitPage_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("exitPage,StartTM");

            var offsetArray = new OffsetArray(offset, "WinJS-exit", [{ top: "0px", left: "0px" }]);
            var promise1 = _TransitionAnimation.executeAnimation(
                outgoing,
                offset && {
                    keyframe: offsetArray.keyframe,
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 117,
                    timing: "linear",
                    from: "none",
                    to: offsetArray.keyframe || translateCallback(offsetArray)
                });

            var promise2 = _TransitionAnimation.executeTransition(
                outgoing,
                {
                    property: "opacity",
                    delay: 0,
                    duration: 117,
                    timing: "linear",
                    to: 0
                });
            return Promise.join([promise1, promise2])
                .then(function () { writeAnimationProfilerMark("exitPage,StopTM"); });
        },

        crossFade: function (incoming, outgoing) {
            /// <signature helpKeyword="WinJS.UI.Animation.crossFade">
            /// <summary locid="WinJS.UI.Animation.crossFade">
            /// Execute a crossFade animation.
            /// </summary>
            /// <param name="incoming" locid="WinJS.UI.Animation.crossFade_p:incoming">
            /// Single incoming element or collection of incoming elements.
            /// At the end of the animation, the opacity of the elements is 1.
            /// </param>
            /// <param name="outgoing" locid="WinJS.UI.Animation.crossFade_p:outgoing">
            /// Single outgoing element or collection of outgoing elements.
            /// At the end of the animation, the opacity of the elements is 0.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.crossFade_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("crossFade,StartTM");

            var promise1 = _TransitionAnimation.executeTransition(
                incoming,
                {
                    property: "opacity",
                    delay: 0,
                    duration: 167,
                    timing: "linear",
                    to: 1
                });

            var promise2 = _TransitionAnimation.executeTransition(
                outgoing,
                {
                    property: "opacity",
                    delay: 0,
                    duration: 167,
                    timing: "linear",
                    to: 0
                });
            return Promise.join([promise1, promise2])
                .then(function () { writeAnimationProfilerMark("crossFade,StopTM"); });
        },

        createPeekAnimation: function (element) {
            /// <signature helpKeyword="WinJS.UI.Animation.createPeekAnimation">
            /// <summary locid="WinJS.UI.Animation.createPeekAnimation">
            /// Creates a peek animation.
            /// After creating the PeekAnimation object,
            /// modify the document to move the elements to their new positions,
            /// then call the execute method on the PeekAnimation object.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.Animation.createPeekAnimation_p:element">
            /// Single element or collection of elements to be repositioned for peek.
            /// </param>
            /// <returns type="{ execute: Function }" locid="WinJS.UI.Animation.createPeekAnimation_returnValue">
            /// PeekAnimation object whose execute method returns
            /// a Promise that completes when the animation is complete.
            /// </returns>
            /// </signature>
            return layoutTransition(PeekAnimation, null, element);
        },

        updateBadge: function (incoming, offset) {
            /// <signature helpKeyword="WinJS.UI.Animation.updateBadge">
            /// <summary locid="WinJS.UI.Animation.updateBadge">
            /// Execute an updateBadge animation.
            /// </summary>
            /// <param name="incoming" locid="WinJS.UI.Animation.updateBadge_p:incoming">
            /// Single element or collection of elements representing the
            /// incoming badge.
            /// </param>
            /// <param name="offset" locid="WinJS.UI.Animation.updateBadge_p:offset">
            /// Optional offset object or collection of offset objects
            /// array describing the starting point of the animation.
            /// If the number of offset objects is less than the length of the
            /// incoming parameter, then the last value is repeated for all
            /// remaining elements.
            /// If this parameter is omitted, then a default value is used.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.updateBadge_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("updateBadge,StartTM");

            var offsetArray = new OffsetArray(offset, "WinJS-updateBadge", [{ top: "24px", left: "0px" }]);
            return _TransitionAnimation.executeAnimation(
                incoming,
                [{
                    keyframe: "WinJS-opacity-in",
                    property: "opacity",
                    delay: 0,
                    duration: 367,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: 0,
                    to: 1
                },
                {
                    keyframe: offsetArray.keyframe,
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 1333,
                    timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                    from: offsetArray.keyframe || translateCallback(offsetArray),
                    to: "none"
                }])
                .then(function () { writeAnimationProfilerMark("updateBadge,StopTM"); });
        },

        turnstileForwardIn: function (incomingElements) {
            /// <signature helpKeyword="WinJS.UI.Animation.turnstileForwardIn">
            /// <summary locid="WinJS.UI.Animation.turnstileForwardIn">
            /// Execute a turnstile forward in animation.
            /// </summary>
            /// <param name="incomingElements" locid="WinJS.UI.Animation.turnstileForwardIn_p:incomingElements">
            /// Single element or collection of elements to animate.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.turnstileForwardIn_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("turnstileForwardIn,StartTM");

            incomingElements = makeArray(incomingElements);
            var origins = collectTurnstileTransformOrigins(incomingElements);
            return animRotationTransform(
                incomingElements,
                origins,
                [{
                    property: transformNames.cssName,
                    delay: staggerDelay(0, 50, 1, 1000),
                    duration: 300,
                    timing: "cubic-bezier(0.01,0.975,0.4775,0.9775)",
                    from: "perspective(600px) rotateY(80deg)",
                    to: "perspective(600px) rotateY(0deg)"
                },
                {
                    property: "opacity",
                    delay: staggerDelay(0, 50, 1, 1000),
                    duration: 300,
                    timing: "cubic-bezier(0, 2, 0, 2)",
                    from: 0,
                    to: 1,
                }])
                .then(function () { writeAnimationProfilerMark("turnstileForwardIn,StopTM"); });
        },

        turnstileForwardOut: function (outgoingElements) {
            /// <signature helpKeyword="WinJS.UI.Animation.turnstileForwardOut">
            /// <summary locid="WinJS.UI.Animation.turnstileForwardOut">
            /// Execute a turnstile forward out animation.
            /// </summary>
            /// <param name="outgoingElements" locid="WinJS.UI.Animation.turnstileForwardOut_p:outgoingElements">
            /// Single element or collection of elements to animate.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.turnstileForwardOut_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("turnstileForwardOut,StartTM");

            outgoingElements = makeArray(outgoingElements);
            var origins = collectTurnstileTransformOrigins(outgoingElements);
            return animRotationTransform(
                outgoingElements,
                origins,
                [{
                    property: transformNames.cssName,
                    delay: staggerDelay(0, 50, 1, 1000),
                    duration: 128,
                    timing: "cubic-bezier(0.4925,0.01,0.7675,-0.01)",
                    from: "perspective(600px) rotateY(0deg)",
                    to: "perspective(600px) rotateY(-50deg)",
                },
                {
                    property: "opacity",
                    delay: staggerDelay(0, 50, 1, 1000),
                    duration: 128,
                    timing: "cubic-bezier(1,-0.42,0.995,-0.425)",
                    from: 1,
                    to: 0,
                }])
                .then(function () { writeAnimationProfilerMark("turnstileForwardOut,StopTM"); });
        },

        turnstileBackwardIn: function (incomingElements) {
            /// <signature helpKeyword="WinJS.UI.Animation.turnstileBackwardIn">
            /// <summary locid="WinJS.UI.Animation.turnstileBackwardIn">
            /// Execute a turnstile backwards in animation.
            /// </summary>
            /// <param name="incomingElements" locid="WinJS.UI.Animation.turnstileBackwardIn_p:incomingElements">
            /// Single element or collection of elements to animate.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.turnstileBackwardIn_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("turnstileBackwardIn,StartTM");

            incomingElements = makeArray(incomingElements);
            var origins = collectTurnstileTransformOrigins(incomingElements);
            return animRotationTransform(
                incomingElements,
                origins,
                [{
                    property: transformNames.cssName,
                    delay: staggerDelay(0, 50, 1, 1000),
                    duration: 300,
                    timing: "cubic-bezier(0.01,0.975,0.4775,0.9775)",
                    from: "perspective(600px) rotateY(-50deg)",
                    to: "perspective(600px) rotateY(0deg)"
                },
                {
                    property: "opacity",
                    delay: staggerDelay(0, 50, 1, 1000),
                    duration: 300,
                    timing: "cubic-bezier(0, 2, 0, 2)",
                    from: 0,
                    to: 1,
                }])
                .then(function () { writeAnimationProfilerMark("turnstileBackwardIn,StopTM"); });
        },

        turnstileBackwardOut: function (outgoingElements) {
            /// <signature helpKeyword="WinJS.UI.Animation.turnstileBackwardOut">
            /// <summary locid="WinJS.UI.Animation.turnstileBackwardOut">
            /// Execute a turnstile backward out animation.
            /// </summary>
            /// <param name="outgoingElements" locid="WinJS.UI.Animation.turnstileBackwardOut_p:outgoingElements">
            /// Single element or collection of elements to animate.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.turnstileBackwardOut_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("turnstileBackwardOut,StartTM");

            outgoingElements = makeArray(outgoingElements);
            var origins = collectTurnstileTransformOrigins(outgoingElements);
            return animRotationTransform(
                outgoingElements,
                origins,
                [{
                    property: transformNames.cssName,
                    delay: staggerDelay(0, 50, 1, 1000),
                    duration: 128,
                    timing: "cubic-bezier(0.4925,0.01,0.7675,-0.01)",
                    from: "perspective(800px) rotateY(0deg)",
                    to: "perspective(800px) rotateY(80deg)",
                },
                {
                    property: "opacity",
                    delay: staggerDelay(0, 50, 1, 1000),
                    duration: 128,
                    timing: "cubic-bezier(1,-0.42,0.995,-0.425)",
                    from: 1,
                    to: 0,
                }])
                .then(function () { writeAnimationProfilerMark("turnstileBackwardOut,StopTM"); });
        },

        slideDown: function (outgoingElements) {
            /// <signature helpKeyword="WinJS.UI.Animation.slideDown">
            /// <summary locid="WinJS.UI.Animation.slideDown">
            /// Execute a slide down animation.
            /// </summary>
            /// <param name="outgoingElements" locid="WinJS.UI.Animation.slideDown_p:outgoingElements">
            /// Single element or collection of elements to animate sliding down.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.slideDown_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("slideDown,StartTM");

            return animRotationTransform(
                outgoingElements,
                { ltr: "", rtl: "" },
                [{
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 250,
                    timing: "cubic-bezier(0.3825,0.0025,0.8775,-0.1075)",
                    from: "translate(0px, 0px)",
                    to: "translate(0px, 200px)"
                },
                {
                    property: "opacity",
                    delay: 0,
                    duration: 250,
                    timing: "cubic-bezier(1,-0.42,0.995,-0.425)",
                    from: 1,
                    to: 0
                }])
                .then(function () { writeAnimationProfilerMark("slideDown,StopTM"); });
        },

        slideUp: function (incomingElements) {
            /// <signature helpKeyword="WinJS.UI.Animation.slideUp">
            /// <summary locid="WinJS.UI.Animation.slideUp">
            /// Execute a slide up animation.
            /// </summary>
            /// <param name="incomingElements" locid="WinJS.UI.Animation.slideUp_p:incomingElements">
            /// Single element or collection of elements to animate sliding up.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.slideUp_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("slideUp,StartTM");

            return animRotationTransform(
                incomingElements,
                { ltr: "", rtl: "" },
                [{
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 350,
                    timing: "cubic-bezier(0.17,0.79,0.215,1.0025)",
                    from: "translate(0px, 200px)",
                    to: "translate(0px, 0px)"
                },
                {
                    property: "opacity",
                    delay: staggerDelay(0, 34, 1, 1000),
                    duration: 350,
                    timing: "cubic-bezier(0, 2, 0, 2)",
                    from: 0,
                    to: 1,
                }])
                .then(function () { writeAnimationProfilerMark("slideUp,StopTM"); });
        },

        slideRightIn: function (page, firstIncomingElements, secondIncomingElements, thirdIncomingElements) {
            /// <signature helpKeyword="WinJS.UI.Animation.slideRightIn">
            /// <summary locid="WinJS.UI.Animation.slideRightIn">
            /// Execute a slide in from left to right animation.
            /// </summary>
            /// <param name="page" locid="WinJS.UI.Animation.slideRightIn_p:page">
            /// The page containing all elements to slide.
            /// </param>
            /// <param name="firstIncomingElements" locid="WinJS.UI.Animation.slideRightIn_p:firstIncomingElements">
            /// First element or collection of elements to animate sliding in.
            /// </param>
            /// <param name="secondIncomingElements" locid="WinJS.UI.Animation.slideRightIn_p:secondIncomingElements">
            /// Second element or collection of elements to animate sliding in, which will be offset slightly farther than the first.
            /// </param>
            /// <param name="thirdIncomingElements" locid="WinJS.UI.Animation.slideRightIn_p:thirdIncomingElements">
            /// Third element or collection of elements to animate sliding in, which will be offset slightly farther than the second.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.slideRightIn_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("slideRightIn,StartTM");

            return animStaggeredSlide("cubic-bezier(0.17,0.79,0.215,1.0025)", -_Global.innerWidth, 0, true, page, firstIncomingElements, secondIncomingElements, thirdIncomingElements)
                .then(function () { writeAnimationProfilerMark("slideRightIn,StopTM"); });
        },

        slideRightOut: function (page, firstOutgoingElements, secondOutgoingElements, thirdOutgoingElements) {
            /// <signature helpKeyword="WinJS.UI.Animation.slideRightOut">
            /// <summary locid="WinJS.UI.Animation.slideRightOut">
            /// Execute a slide out from left to right animation.
            /// </summary>
            /// <param name="page" locid="WinJS.UI.Animation.slideRightOut_p:page">
            /// The page containing all elements to slide.
            /// </param>
            /// <param name="firstOutgoingElements" locid="WinJS.UI.Animation.slideRightOut_p:firstOutgoingElements">
            /// First element or collection of elements to animate sliding out.
            /// </param>
            /// <param name="secondOutgoingElements" locid="WinJS.UI.Animation.slideRightOut_p:secondOutgoingElements">
            /// Second element or collection of elements to animate sliding out, which will be offset slightly farther than the first.
            /// </param>
            /// <param name="thirdOutgoingElements" locid="WinJS.UI.Animation.slideRightOut_p:thirdOutgoingElements">
            /// Third element or collection of elements to animate sliding out, which will be offset slightly farther than the second.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.slideRightOut_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("slideRightOut,StartTM");

            return animStaggeredSlide("cubic-bezier(0.3825,0.0025,0.8775,-0.1075)", 0, _Global.innerWidth, false, page, firstOutgoingElements, secondOutgoingElements, thirdOutgoingElements)
                .then(function () { writeAnimationProfilerMark("slideRightOut,StopTM"); });
        },

        slideLeftIn: function (page, firstIncomingElements, secondIncomingElements, thirdIncomingElements) {
            /// <signature helpKeyword="WinJS.UI.Animation.slideLeftIn">
            /// <summary locid="WinJS.UI.Animation.slideLeftIn">
            /// Execute a slide in from right to left animation.
            /// </summary>
            /// <param name="page" locid="WinJS.UI.Animation.slideLeftIn_p:page">
            /// The page containing all elements to slide.
            /// </param>
            /// <param name="firstIncomingElements" locid="WinJS.UI.Animation.slideLeftIn_p:firstIncomingElements">
            /// First element or collection of elements to animate sliding in.
            /// </param>
            /// <param name="secondIncomingElements" locid="WinJS.UI.Animation.slideLeftIn_p:secondIncomingElements">
            /// Second element or collection of elements to animate sliding in, which will be offset slightly farther than the first.
            /// </param>
            /// <param name="thirdIncomingElements" locid="WinJS.UI.Animation.slideLeftIn_p:thirdIncomingElements">
            /// Third element or collection of elements to animate sliding in, which will be offset slightly farther than the second.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.slideLeftIn_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("slideLeftIn,StartTM");

            return animStaggeredSlide("cubic-bezier(0.17,0.79,0.215,1.0025)", _Global.innerWidth, 0, true, page, firstIncomingElements, secondIncomingElements, thirdIncomingElements)
                .then(function () { writeAnimationProfilerMark("slideLeftIn,StopTM"); });
        },

        slideLeftOut: function (page, firstOutgoingElements, secondOutgoingElements, thirdOutgoingElements) {
            /// <signature helpKeyword="WinJS.UI.Animation.slideLeftOut">
            /// <summary locid="WinJS.UI.Animation.slideLeftOut">
            /// Execute a slide out from right to left animation.
            /// </summary>
            /// <param name="page" locid="WinJS.UI.Animation.slideLeftOut_p:page">
            /// The page containing all elements to slide.
            /// </param>
            /// <param name="firstOutgoingElements" locid="WinJS.UI.Animation.slideLeftOut_p:firstOutgoingElements">
            /// First element or collection of elements to animate sliding out.
            /// </param>
            /// <param name="secondOutgoingElements" locid="WinJS.UI.Animation.slideLeftOut_p:secondOutgoingElements">
            /// Second element or collection of elements to animate sliding out, which will be offset slightly farther than the first.
            /// </param>
            /// <param name="thirdOutgoingElements" locid="WinJS.UI.Animation.slideLeftOut_p:thirdOutgoingElements">
            /// Third element or collection of elements to animate sliding out, which will be offset slightly farther than the second.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.slideLeftOut_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("slideLeftOut,StartTM");

            return animStaggeredSlide("cubic-bezier(0.3825,0.0025,0.8775,-0.1075)", 0, -_Global.innerWidth, false, page, firstOutgoingElements, secondOutgoingElements, thirdOutgoingElements)
                .then(function () { writeAnimationProfilerMark("slideLeftOut,StopTM"); });
        },

        continuumForwardIn: function (incomingPage, incomingItemRoot, incomingItemContent) {
            /// <signature helpKeyword="WinJS.UI.Animation.continuumForwardIn">
            /// <summary locid="WinJS.UI.Animation.continuumForwardIn">
            /// Execute a continuum animation, scaling up the incoming page while scaling, rotating, and translating the incoming item.
            /// </summary>
            /// <param name="incomingPage" locid="WinJS.UI.Animation.continuumForwardIn_p:incomingPage">
            /// Single element to be scaled up that is the page root and does not contain the incoming item.
            /// </param>
            /// <param name="incomingItemRoot" locid="WinJS.UI.Animation.continuumForwardIn_p:incomingItemRoot">
            /// Root of the item that will be translated as part of the continuum animation.
            /// </param>
            /// <param name="incomingItemContent" locid="WinJS.UI.Animation.continuumForwardIn_p:incomingItemContent">
            /// Content of the item that will be scaled and rotated as part of the continuum animation.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.continuumForwardIn_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("continuumForwardIn,StartTM");

            return Promise.join([
                _TransitionAnimation.executeTransition(incomingPage,
                [{
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 350,
                    timing: "cubic-bezier(0.33, 0.18, 0.11, 1)",
                    from: "scale(0.5, 0.5)",
                    to: "scale(1.0, 1.0)"
                },
                {
                    property: "opacity",
                    delay: 0,
                    duration: 350,
                    timing: "cubic-bezier(0, 2, 0, 2)",
                    from: 0,
                    to: 1,
                }]),
                _TransitionAnimation.executeTransition(incomingItemRoot,
                [{
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 350,
                    timing: "cubic-bezier(0.24,1.15,0.11,1.1575)",
                    from: "translate(0px, 225px)",
                    to: "translate(0px, 0px)"
                },
                {
                    property: "opacity",
                    delay: 0,
                    duration: 350,
                    timing: "cubic-bezier(0, 2, 0, 2)",
                    from: 0,
                    to: 1,
                }]),
                animRotationTransform(incomingItemContent, { ltr: "0px 50%", rtl: "100% 50%" },
                [{
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 350,
                    timing: "cubic-bezier(0,0.62,0.8225,0.9625)",
                    from: "rotateX(80deg) scale(1.5, 1.5)",
                    to: "rotateX(0deg) scale(1.0, 1.0)"
                },
                {
                    property: "opacity",
                    delay: 0,
                    duration: 350,
                    timing: "cubic-bezier(0, 2, 0, 2)",
                    from: 0,
                    to: 1,
                }])
            ])
            .then(function () { writeAnimationProfilerMark("continuumForwardIn,StopTM"); });
        },

        continuumForwardOut: function (outgoingPage, outgoingItem) {
            /// <signature helpKeyword="WinJS.UI.Animation.continuumForwardOut">
            /// <summary locid="WinJS.UI.Animation.continuumForwardOut">
            /// Execute a continuum animation, scaling down the outgoing page while scaling, rotating, and translating the outgoing item.
            /// </summary>
            /// <param name="outgoingPage" locid="WinJS.UI.Animation.continuumForwardOut_p:outgoingPage">
            /// Single element to be scaled down that is the page root and contains the outgoing item.
            /// </param>
            /// <param name="outgoingItem" locid="WinJS.UI.Animation.continuumForwardOut_p:outgoingItem">
            /// Single element to be scaled, rotated, and translated away from the outgoing page.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.continuumForwardOut_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("continuumForwardOut,StartTM");

            return Promise.join([
                _TransitionAnimation.executeTransition(outgoingPage,
                [{
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 120,
                    timing: "cubic-bezier(0.3825,0.0025,0.8775,-0.1075)",
                    from: "scale(1.0, 1.0)",
                    to: "scale(1.1, 1.1)"
                },
                {
                    property: "opacity",
                    delay: 0,
                    duration: 120,
                    timing: "cubic-bezier(1,-0.42,0.995,-0.425)",
                    from: 1,
                    to: 0,
                }]),
                animRotationTransform(outgoingItem, { ltr: "0px 100%", rtl: "100% 100%" },
                [{
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 152,
                    timing: "cubic-bezier(0.3825,0.0025,0.8775,-0.1075)",
                    from: "rotateX(0deg) scale(1.0, 1.0) translate(0px, 0px)",
                    to: "rotateX(80deg) scale(1.5, 1.5) translate(0px, 150px)"
                },
                {
                    property: "opacity",
                    delay: 0,
                    duration: 152,
                    timing: "cubic-bezier(1,-0.42,0.995,-0.425)",
                    from: 1,
                    to: 0,
                }])
            ])
            .then(function () { writeAnimationProfilerMark("continuumForwardOut,StopTM"); });
        },

        continuumBackwardIn: function (incomingPage, incomingItem) {
            /// <signature helpKeyword="WinJS.UI.Animation.continuumBackwardIn">
            /// <summary locid="WinJS.UI.Animation.continuumBackwardIn">
            /// Execute a continuum animation, scaling down the incoming page while scaling, rotating, and translating the incoming item.
            /// </summary>
            /// <param name="incomingPage" locid="WinJS.UI.Animation.continuumBackwardIn_p:incomingPage">
            /// Single element to be scaled down that is the page root and contains the incoming item.
            /// </param>
            /// <param name="incomingItem" locid="WinJS.UI.Animation.continuumBackwardIn_p:incomingItem">
            /// Single element to be scaled, rotated, and translated into its final position on the page.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.continuumBackwardIn_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("continuumBackwardIn,StartTM");

            return Promise.join([
                _TransitionAnimation.executeTransition(incomingPage,
                [{
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 200,
                    timing: "cubic-bezier(0.33, 0.18, 0.11, 1)",
                    from: "scale(1.25, 1.25)",
                    to: "scale(1.0, 1.0)"
                },
                {
                    property: "opacity",
                    delay: 0,
                    duration: 200,
                    timing: "cubic-bezier(0, 2, 0, 2)",
                    from: 0,
                    to: 1,
                }]),
                animRotationTransform(incomingItem, { ltr: "0px 50%", rtl: "100% 50%" },
                [{
                    property: transformNames.cssName,
                    delay: 0,
                    duration: 250,
                    timing: "cubic-bezier(0.2975, 0.7325, 0.4725, 0.99)",
                    from: "rotateX(80deg) translate(0px, -100px)",
                    to: "rotateX(0deg) translate(0px, 0px)"
                },
                {
                    property: "opacity",
                    delay: 0,
                    duration: 250,
                    timing: "cubic-bezier(0, 2, 0, 2)",
                    from: 0,
                    to: 1,
                }])
            ])
            .then(function () { writeAnimationProfilerMark("continuumBackwardIn,StopTM"); });
        },

        continuumBackwardOut: function (outgoingPage) {
            /// <signature helpKeyword="WinJS.UI.Animation.continuumBackwardOut">
            /// <summary locid="WinJS.UI.Animation.continuumBackwardOut">
            /// Execute a continuum animation, scaling down the outgoing page while.
            /// </summary>
            /// <param name="outgoingPage" locid="WinJS.UI.Animation.continuumBackwardOut_p:outgoingPage">
            /// Single element to be scaled down that is the page root.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.Animation.continuumBackwardOut_returnValue">
            /// Promise object that completes when the animation is complete.
            /// </returns>
            /// </signature>
            writeAnimationProfilerMark("continuumBackwardOut,StartTM");

            return _TransitionAnimation.executeTransition(outgoingPage,
            [{
                property: transformNames.cssName,
                delay: 0,
                duration: 167,
                timing: "cubic-bezier(0.3825,0.0025,0.8775,-0.1075)",
                from: "scale(1.0, 1.0)",
                to: "scale(0.5, 0.5)"
            },
            {
                property: "opacity",
                delay: 0,
                duration: 167,
                timing: "cubic-bezier(1,-0.42,0.995,-0.425)",
                from: 1,
                to: 0,
            }])
            .then(function () { writeAnimationProfilerMark("continuumBackwardOut,StopTM"); });
        },

        createPageNavigationAnimations: function (currentPreferredAnimation, nextPreferredAnimation, movingBackwards) {
            /// <signature helpKeyword="WinJS.UI.Animation.createPageNavigationAnimations" >
            /// <summary locid="WinJS.UI.Animation.createPageNavigationAnimations">
            /// Creates an exit and entrance animation to play for a page navigation given the current and incoming pages'
            /// animation preferences and whether the pages are navigating forwards or backwards.
            /// </summary>
            /// <param name="currentPreferredAnimation" locid="WinJS.UI.Animation.createPageNavigationAnimations_p:currentPreferredAnimation">
            /// A value from WinJS.UI.PageNavigationAnimation describing the animation the current page prefers to use.
            /// </param>
            /// <param name="nextPreferredAnimation" locid="WinJS.UI.Animation.createPageNavigationAnimations_p:nextPreferredAnimation">
            /// A value from WinJS.UI.PageNavigationAnimation describing the animation the incoming page prefers to use.
            /// </param>
            /// <param name="movingBackwards" locid="WinJS.UI.Animation.createPageNavigationAnimations_p:movingBackwards">
            /// Boolean value for whether the navigation is moving backwards.
            /// </param>
            /// <returns type="{ entrance: Function, exit: Function }" locid="WinJS.UI.Animation.createPageNavigationAnimations_returnValue">
            /// Returns an object containing the exit and entrance animations to play based on the parameters given.
            /// </returns>
            /// </signature>
            function emptyAnimationFunction() {
                return Promise.wrap();
            }
            
            return {
                exit: emptyAnimationFunction,
                entrance: exports.enterPage
            };
        }
    });

});