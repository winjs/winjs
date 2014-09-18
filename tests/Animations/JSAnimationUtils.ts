// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

module JSAnimationUtils {

    "use strict";

    export function addDomWwa(htmlString) {
        var Node = document.createElement("div");
        MSApp.execUnsafeLocalFunction(function () { Node.innerHTML = htmlString; });
        document.body.appendChild(Node);
    }

    export function addDom(isRTLTest) {

        LiveUnit.LoggingCore.logComment("Add divs to the document");
        var node = document.createElement("div");
        node.setAttribute("id", "divs");

        var htmlString = "<div id='div1' class='bar' style='float:left; width:150px; height:150px; margin-left:10px; margin-top:10px; opacity:1'></div>" +
            "<div id='div2' class='bar' style='float:left; width:150px; height:150px; margin-left:10px; margin-top:10px; opacity:1'></div>" +
            "<div id='div3' class='bar' style='float:left; width:150px; height:150px; margin-left:10px; margin-top:10px; opacity:1'></div>" +
            "<div id='div4' class='bar' style='float:left; width:150px; height:150px; margin-left:10px; margin-top:10px; opacity:1'></div>" +
            "<div id='div5' class='bar' style='float:left; width:150px; height:150px; margin-left:10px; margin-top:10px; opacity:1'></div>" +
            "<div id='div6' class='bar' style='float:left; width:150px; height:150px; margin-left:10px; margin-top:10px; opacity:1'></div>" +
            "<div id='div7' class='bar' style='float:left; width:150px; height:150px; margin-left:10px; margin-top:10px; opacity:1'></div>" +
            "<div id='div8' class='bar' style='float:left; width:150px; height:150px; margin-left:10px; margin-top:10px; opacity:1'></div>";

        var htmlStringRtlTest = "<div id='div1' class='bar' style='float:left; width:150px; height:150px; margin-left:10px; margin-top:10px; opacity:1' dir='rtl'></div>" +
            "<div id='div2' class='bar' style='float:left; width:150px; height:150px; margin-left:10px; margin-top:10px; opacity:1' dir='rtl'></div>" +
            "<div id='div3' class='bar' style='float:left; width:150px; height:150px; margin-left:10px; margin-top:10px; opacity:1' dir='rtl'></div>";
        if (isRTLTest) {
            node.innerHTML = htmlStringRtlTest;
        } else {
            node.innerHTML = htmlString;
        }
        document.body.appendChild(node);

    }

    export function removeDom() {
        var element = document.getElementById("divs");
        LiveUnit.LoggingCore.logComment("Remove divs from the DOM");
        element.parentNode.removeChild(element);
    }

    export function getRestOfList(list, elem) {
        if (!Array.isArray(list)) {
            list = Array.prototype.slice.call(list, 0);
        }
        return list.slice(list.indexOf(elem) + 1);
    }

    export function getBoundingRectArray(list) {
        var ret = [];
        if (!Array.isArray(list)) return null;
        for (var i = 0; i < list.length; i++) {
            ret.push(list[i].getBoundingClientRect());
        }
        return ret;
    }

    export function getAnimation(name) {
        var temp;
        for (var i = 0; i < AnimationCollection.Animations.length; i++) {
            temp = AnimationCollection.Animations[i];
            if (name === temp.name) {
                return temp;
            }
        }
    }

    export function getAnimationDuration(name, elemNum = 1) {
        var anim;
        var duration;
        var ret;
        for (var i = 0; i < AnimationCollection.Animations.length; i++) {
            anim = AnimationCollection.Animations[i];
            if (name === anim.name) {
                if (!anim.hasStagger) {
                    ret = anim.duration;
                } else {
                    ret = anim.duration + anim.delay * anim.delayFactor * elemNum;
                    if (anim.delayCap) {
                        ret = Math.min(ret, anim.duration + anim.delayCap);
                    }
                }
            }
        }
        return ret;
    }

    export function getAnimationCheckingPoint(name) {
        var anim;
        var animationCheckingPoint;
        for (var i = 0; i < AnimationCollection.Animations.length; i++) {
            anim = AnimationCollection.Animations[i];
            if (name === anim.name) {
                return anim.animationCheckPoint;
            }
        }
    }

    export function setOpacity(elems, opacity) {
        if (Array.isArray(elems)) {
            for (var i = 0; i < elems.length; i++) {
                elems[i].style.opacity = opacity;
            }
        } else {
            elems.style.opacity = opacity;
        }
    }
}

