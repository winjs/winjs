// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.


module AnimationVerifier {

    "use strict";
    export var rectBefore = null;
    export var rectAfter = null;


    export function VerifyEachElementStatusChange(f) {
        /// <summary>
        ///     Verify each element using the client rectangle before and after the animation/transition.
        /// </summary>
        /// <param name="f" type="Function">
        ///     When verifing translate or scale animations, the input parameters could be either single element or an array of elements.
        ///     This function is used to avoid dupication of code by saying if it is an array, we'll check each element by going through a loop.
        ///     If it is a single element, just check this one. The verification needs the client rectangle of the DOM element(s)
        ///     before and after the animation/transition.
        /// </param>
        /// <returns type="bool"/>
        function compareDouble(d1, d2, precision) {
            if (Math.abs(d1 - d2) <= precision) {
                return true;
            } else {
                return false;
            }
        }

        var ret = true;
        if (Array.isArray(AnimationVerifier.rectBefore)) {
            if (AnimationVerifier.rectBefore.length !== AnimationVerifier.rectAfter.length) {
                ret = false;
            } else {
                for (var i = 0; ret && i < AnimationVerifier.rectBefore.length; i++) {
                    ret = f(AnimationVerifier.rectBefore[i], AnimationVerifier.rectAfter[i], compareDouble);
                }
            }
        } else {
            ret = f(AnimationVerifier.rectBefore, AnimationVerifier.rectAfter, compareDouble);
        }

        return ret;
    }

    export function VerifyCoordinateTransitionInProgress(startX, startY, destX, destY, currX, currY) {
        /// <summary>
        ///     Verify translation mid-animations state
        /// </summary>
        /// <param name="startX" type="Integer">
        ///     Specifies the starting x-coordinate
        /// </param>
        /// <param name="startY" type="Integer">
        ///     Specifies the starting y-coordinate
        /// </param>
        /// <param name="destX" type="Integer">
        ///     Specifies the destination x-coordinate
        /// </param>
        /// <param name="destY" type="Integer">
        ///     Specifies the destination y-coordinate
        /// </param>
        /// <param name="currX" type="Integer">
        ///     Specifies the current x-coordinate
        /// </param>
        /// <param name="currY" type="Integer">
        ///     Specifies the current y-coordinate
        /// </param>
        /// <returns type="bool"/>
        if (currX == 0 && currY == 0) {
            LiveUnit.LoggingCore.logComment("WARNING: Current X,Y Coordinates are (0,0)");
            LiveUnit.LoggingCore.logComment("Likely reason for these coordinates: Animation 'complete' promise returned before 'transitionend' fired. Thus, coordinates test in transitionEndTestHandler() will be non-existant -> (0,0)");
            return true;
        }
        if (destX === startX) { //if (X isn't moving) make sure Y is in between start and destination coordinates
            return ((currY >= startY && currY <= destY) || (currY <= startY && currY >= destY));
        } else if (destY === startY) { //if (Y isn't moving) make sure X is in between start and destination coordinates
            return ((currX >= startX && currX <= destX) || (currX <= startX && currX >= destX));
        } else { //if (both X && Y are moving) make sure X and Y are in between start and destination coordinates
            return ((currX <= startX && currX >= destX && currY >= startY && currY <= destY) || //(start >= X >= dest) && (start <= Y <= dest)
                (currX <= startX && currX >= destX && currY <= startY && currY >= destY) || //(start >= X >= dest) && (start >= Y >= dest)
                (currX >= startX && currX <= destX && currY >= startY && currY <= destY) || //(start <= X <= dest) && (start <= Y <= dest)
                (currX >= startX && currX <= destX && currY <= startY && currY >= destY) //(start <= X <= dest) && (start >= Y >= dest)
                );
        }
    }

    export function VerifyDestinationCoordinates(refX, refY, actX, actY) {
        /// <summary>
        ///     Verify translation end state
        /// </summary>
        /// <param name="refX" type="Integer">
        ///     Specifies the intended destination x-coordinate
        /// </param>
        /// <param name="refY" type="Integer">
        ///     Specifies the intended destination y-coordinate
        /// </param>
        /// <param name="actX" type="Integer">
        ///     Specifies the actual destination x-coordinate
        /// </param>
        /// <param name="actY" type="Integer">
        ///     Specifies the actual destination y-coordinate
        /// </param>
        /// <returns type="bool"/>
        var toleranceX = Math.abs(refX * (.05));
        var toleranceY = Math.abs(refY * (.05));
        var lowerBoundX = refX - toleranceX;
        var upperBoundX = refX + toleranceX;
        var lowerBoundY = refY - toleranceY;
        var upperBoundY = refY + toleranceY;
        return (lowerBoundX <= actX && upperBoundX >= actX &&
            lowerBoundY <= actY && upperBoundY >= actY);
    }

    //Verify translate2D transition, final state should be the same as diffX, diffY
    export function VerifyTranslate2DTransition(diffX, diffY) {
        /// <summary>
        ///     Verify translate 2D transition
        /// </summary>
        /// <param name="diffX" type="Integer">
        ///     Specifies the vertical translate distance
        /// </param>
        /// <param name="diffY" type="Integer">
        ///     Specifies the vertical translate distance
        /// </param>
        /// <returns type="bool"/>
        var ret = true;
        return AnimationVerifier.VerifyEachElementStatusChange(function (before, after, compareDouble) {
            var hor = after.left - before.left;
            var ver = after.top - before.top;
            if (!compareDouble(diffX, hor, 0.05)) {
                LiveUnit.LoggingCore.logComment("Error:Horizontal move is not correct. should be:" + diffX + " currently:" + hor);
                ret = false;
            }
            if (!compareDouble(diffY, ver, 0.05)) {
                LiveUnit.LoggingCore.logComment("Error:Vertical move is not correct. Should be:" + diffY + " currently:" + ver);
                ret = false;
            }

            return ret;
        });
    }

    export function verifyTranslate2DAnimation(diffX, diffY, option) {
        /// <summary>
        ///     Verify translate 2D animation
        /// </summary>
        /// <param name="diffX" type="Integer">
        ///     Specifies the vertical translate distance
        /// </param>
        /// <param name="diffY" type="Integer">
        ///     Specifies the horizontal translate distance
        /// </param>
        /// <param name="option">
        ///     {isVertical:true/false, isRTL:true/false}
        /// </param>
        /// <returns type="bool"/>
        var ret = true;
        var hor, ver;
        //For vertical translate, the default setting can be positive or negative. If default is positive, current state must be between 0 and default (0 < current < default).
        //If default is negative, current state must be between default and 0 (defautl < current < 0). The horizontal movement should be same as diffY.
        function verifyEachTranslate(hor, ver, diffX, diffY, compareDouble) {
            if (!option.isVertical) {
                if ((diffX > 0) && (hor >= diffX || hor <= 0)) {
                    LiveUnit.LoggingCore.logComment("Error:Horizontal move is not correct. Should be between 0 and:" + diffX + " currently:" + hor);
                    ret = false;
                }
                if ((diffX < 0) && (hor <= diffX || hor >= 0)) {
                    LiveUnit.LoggingCore.logComment("Error:Horizontal move is not correct. Should be between 0 and:" + diffX + " currently:" + hor);
                    ret = false;
                }
                if (!compareDouble(diffY, ver, 0.01)) {
                    LiveUnit.LoggingCore.logComment("ver:" + ver);
                    LiveUnit.LoggingCore.logComment("Error:Veritical move is not correct. Should be: " + diffY + " currently:" + ver);
                    ret = false;
                }
            } else {
                if ((diffY > 0) && (ver >= diffY || ver <= 0)) {
                    LiveUnit.LoggingCore.logComment("Error:Vertical move is not correct. Should be between 0 and:" + diffY + " currently:" + ver);
                    ret = false;
                }
                if ((diffY < 0) && (ver <= diffY || ver >= 0)) {
                    LiveUnit.LoggingCore.logComment("Error:Vertical move is not correct. Should be between 0 and:" + diffY + " currently:" + ver);
                    ret = false;
                }
                if (!compareDouble(diffX, hor, 0.01)) {
                    LiveUnit.LoggingCore.logComment("Error:Vertical move is not correct. Should be :" + diffX + " currently:" + hor);
                    ret = false;
                }
            }
            return ret;
        }

        return AnimationVerifier.VerifyEachElementStatusChange(function (before, after, compareDouble) {
            // Horizontal offsets are flipped in RTL.
            if (option.isRTL) {
                hor = before.left - after.left;
                LiveUnit.LoggingCore.logComment("before:" + before.left);
                LiveUnit.LoggingCore.logComment("after:" + after.left);
            } else {
                hor = after.left - before.left;
            }
            var ver = after.top - before.top;
            return verifyEachTranslate(hor, ver, diffX, diffY, compareDouble);
        });
    }

    export function VerifyScale2DTransition(ratioX, ratioY) {
        /// <summary>
        ///     Verify scale 2D transition
        /// </summary>
        /// <param name="ratioX" type="Integer">
        ///     Specifies the vertical scaling factor
        /// </param>
        /// <param name="ratioY" type="Integer">
        ///     Specifies the horizontal scaling factor
        /// </param>
        /// <returns type="bool"/>
        var ret = true;
        return AnimationVerifier.VerifyEachElementStatusChange(function (before, after, compareDouble) {
            var actualRatioX = (after.right - after.left) / (before.right - before.left);
            var actualRatioY = (after.bottom - after.top) / (before.bottom - before.top);

            if (!compareDouble(actualRatioX, ratioX, 0.005)) {
                LiveUnit.LoggingCore.logComment("Error:Horizontal scale is not correct. should be:" + ratioX + " currently:" + actualRatioX);
                ret = false;
            }
            if (!compareDouble(actualRatioY, ratioY, 0.005)) {
                LiveUnit.LoggingCore.logComment("Error:Vertical scale is not correct. should be:" + ratioY + " currently:" + actualRatioY);
                ret = false;
            }

            return ret;
        });
    }

    export function VerifyScale2DAnimation(ratioX, ratioY) {
        /// <summary>
        ///     Verify scale 2D animation
        /// </summary>
        /// <param name="ratioX" type="Integer">
        ///     Specifies the vertical scaling factor
        /// </param>
        /// <param name="ratioY" type="Integer">
        ///     Specifies the horizontal scaling factor
        /// </param>
        /// <returns type="bool"/>
        var ret = true;
        return AnimationVerifier.VerifyEachElementStatusChange(function (before, after, compareDouble) {
            var actualRatioX = (after.right - after.left) / (before.right - before.left);
            var actualRatioY = (after.bottom - after.top) / (before.bottom - before.top);

            if ((actualRatioX === 1) || (actualRatioY === 1)) {
                LiveUnit.LoggingCore.logComment("Error:Horizontal scale is not correct. should between " + ratioX + " and " + ratioY + "currently ratioX=" + actualRatioX + " ratioY=" + actualRatioY);
                ret = false;
            }
            if (actualRatioX <= ratioX || actualRatioY <= ratioY) {
                LiveUnit.LoggingCore.logComment("Error:Horizontal scale is not correct. should between " + ratioX + " and " + ratioY + "currently ratioX=" + actualRatioX + " ratioY=" + actualRatioY);
                ret = false;
            }

            return ret;
        });
    }

    export function VerifyOpacityTransition(elem, value) {
        /// <summary>
        ///     Verify opacity transition.
        /// </summary>
        /// <param name="elem" type="object">
        ///     The DOM element(s) need to be verified.
        /// </param>
        /// <param name="value" type="Integer/double/float">
        ///     Final opacity value.
        /// </param>
        /// <returns type="bool"/>
        /// It verify if the opacity change to the expected value after animation.
        var ret = true;
        var opacity: number;
        if (Array.isArray(elem)) {
            for (var i = 0; i < elem.length; i++) {
                opacity = +(window.getComputedStyle(elem[i], null).getPropertyValue('opacity'));

                if (opacity !== value) {
                    var tolerance = .01;
                    if (opacity > (value + tolerance) || opacity < (value - tolerance)) {
                        LiveUnit.LoggingCore.logComment("Opacity is not correct. Should be: " + value + "currently is: " + opacity);
                        ret = false;
                        break;
                    }
                }
            }
        } else {
            opacity = +(window.getComputedStyle(elem, null).getPropertyValue('opacity'));
            if (opacity !== value) {
                var tolerance = .01;
                if (opacity > (value + tolerance) || opacity < (value - tolerance)) {
                    LiveUnit.LoggingCore.logComment("Opacity is not correct. Should be: " + value + "currently is: " + opacity);
                    ret = false;
                }
            }
        }

        return ret;
    }

    export function VerifyOpacityTransitionInProgress(elem) {
        /// <summary>
        ///     Verify opacity transition.
        /// </summary>
        /// <returns type="bool"/>
        var ret = true;
        var opacity: number;

        if (Array.isArray(elem)) {
            for (var i = 0; i < elem.length; i++) {
                opacity = +(window.getComputedStyle(elem[i], null).getPropertyValue('opacity'));
                if (opacity >= 0 && opacity <= 1) {
                    LiveUnit.LoggingCore.logComment("Opacity is not correct. Should be between 0 and 1, currently is: " + opacity);
                    ret = false;
                    break;
                }
            }
        } else {
            opacity = +(window.getComputedStyle(elem, null).getPropertyValue('opacity'));

            if (opacity >= 0 && opacity <= 1) {
                ret = true;
            } else {
                LiveUnit.LoggingCore.logComment("Opacity is not correct. Should be between 0 and 1, currently is: " + opacity);
                ret = false;
            }
        }

        return ret;
    }

    export function VerifyOpacityAnimation(elem) {
        /// <summary>
        ///     Verify opacity transition.
        /// </summary>
        /// <returns type="bool"/>
        var ret = true;
        var opacity: number;

        if (Array.isArray(elem)) {
            for (var i = 0; i < elem.length; i++) {
                opacity = +(window.getComputedStyle(elem[i], null).getPropertyValue('opacity'));
                if (opacity === 0 || opacity === 1) {
                    LiveUnit.LoggingCore.logComment("Opacity is not correct. Should be between 0 and 1, currently is: " + opacity);
                    ret = false;
                    break;
                }
            }
        } else {
            opacity = +(window.getComputedStyle(elem, null).getPropertyValue('opacity'));
            LiveUnit.LoggingCore.logComment("opacity:" + opacity);

            if (opacity === 0 || opacity === 1) {
                LiveUnit.LoggingCore.logComment("Opacity is not correct. Should be between 0 and 1, currently is: " + opacity);
                ret = false;
            }
        }

        return ret;
    }
}


