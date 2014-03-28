function JSAnimationUtils() {
}

JSAnimationUtils.prototype = (function () {
    return {
        addDomWwa: function (htmlString) {
            var Node = document.createElement("div");
            MSApp.execUnsafeLocalFunction(function () { Node.innerHTML = htmlString; });
            document.body.appendChild(Node);
        },

        addDom: function (isRTLTest) {

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

        },

        removeDom: function () {
            var element = document.getElementById("divs");
            LiveUnit.LoggingCore.logComment("Remove divs from the DOM");
            element.parentNode.removeChild(element);
        },

        getRestOfList: function (list, elem) {
            var ret = [];
            if (!elem) {
                count = 0;
            } else {
                count = 1;
                for (var i = 0; i < list.length; i++) {
                    if (elem != list[i]) {
                        count++;
                    } else {
                        break;
                    }
                }
            }
            for (var i = count; i < list.length; i++) {
                ret.push(list[i]);
            }
            return ret;
        },

        getBoundingRectArray: function (list) {
            var ret = [];
            if (!Array.isArray(list)) return null;
            for (var i = 0; i < list.length; i++) {
                ret.push(list[i].getBoundingClientRect());
            }
            return ret;
        },

        getAnimation: function (name) {
            var temp;
            for (i = 0; i < AnimationCollection.Animations.length; i++) {
                temp = AnimationCollection.Animations[i];
                if (name === temp.name) {
                    return temp;
                }
            }
        },

        getAnimationDuration: function (name, elemNum) {
            var anim;
            var duration;
            var ret;
            for (i = 0; i < AnimationCollection.Animations.length; i++) {
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
        },

        getAnimationCheckingPoint: function (name) {
            var anim;
            var animationCheckingPoint;
            for (i = 0; i < AnimationCollection.Animations.length; i++) {
                anim = AnimationCollection.Animations[i];
                if (name === anim.name) {
                    return anim.animationCheckPoint;
                }
            }
        },

        setOpacity: function (elems, opacity) {
            if (Array.isArray(elems)) {
                for (var i = 0; i < elems.length; i++) {
                    elems[i].style.opacity = opacity;
                }
            } else {
                elems.style.opacity = opacity;
            }
        }
    };
})();

