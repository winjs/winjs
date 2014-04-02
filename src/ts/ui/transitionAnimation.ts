// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function transitionAnimationInit(global, WinJS) {
    "use strict";

    // not supported in WebWorker
    if (!global.document) {
        return;
    }

    var Scheduler = WinJS.Utilities.Scheduler;
    var browserStyleEquivalents = WinJS.Utilities._browserStyleEquivalents;

    function makeArray(elements) {
        if (elements instanceof Array || elements instanceof NodeList || elements instanceof HTMLCollection) {
            return elements;
        } else if (elements) {
            return [elements];
        } else {
            return [];
        }
    }

    var keyframeCounter = 0;
    function getUniqueKeyframeName() {
        return "WinJSUIAnimation" + ++keyframeCounter;
    }
    function isUniqueKeyframeName(s) {
        return "WinJSUIAnimation" === s.substring(0, 16);
    }

    function resolveStyles(elem) {
        window.getComputedStyle(elem, null).opacity;
    }

    function copyWithEvaluation(iElem, elem) {
        return function (obj) {
            var newObj:any = {};
            for (var p in obj) {
                var v = obj[p];
                if (typeof v === "function") {
                    v = v(iElem, elem);
                }
                newObj[p] = v;
            }
            if (!newObj.exactTiming) {
                newObj.delay += UI._libraryDelay;
            }
            return newObj;
        };
    }

    var activeActions = [];

    var reason_ended = 0;
    var reason_interrupted = 1;
    var reason_canceled = 2;

    function stopExistingAction(id, prop) {
        var key = id + "|" + prop;
        var finish = activeActions[key];
        if (finish) {
            finish(reason_interrupted);
        }
    }

    function registerAction(id, prop, finish) {
        activeActions[id + "|" + prop] = finish;
    }

    function unregisterAction(id, prop) {
        delete activeActions[id + "|" + prop];
    }

    var StyleCache = WinJS.Class.define(
        // Constructor
        function StyleCache_ctor(id, desc, style) {
            this.cref = 0;
            this.id = id;
            this.desc = desc;
            this.removed = {};
            this.prevStyles = desc.props.map(function (p) { return style[p[0]]; });
            this.prevNames = this.names = style[desc.nameProp];
            desc.styleCaches[id] = this;
        }, {
            // Members
            destroy: function StyleCache_destroy(style, skipStylesReset) {
                var desc = this.desc;
                delete desc.styleCaches[this.id];
                if (!skipStylesReset) {
                    if (this.prevNames === "" &&
                        this.prevStyles.every(function (s) { return s === ""; })) {
                        style[desc.shorthandProp] = "";
                    } else {
                        desc.props.forEach(function (p, i) {
                            style[p[0]] = this.prevStyles[i];
                        }, this);
                        style[desc.nameProp] = this.prevNames;
                    }
                }
            },
            removeName: function StyleCache_removeName(style, name, elem, skipStylesReset) {
                var nameValue = this.names;
                var names = nameValue.split(", ");
                var index = names.lastIndexOf(name);
                if (index >= 0) {
                    names.splice(index, 1);
                    this.names = nameValue = names.join(", ");
                    if (nameValue === "" && this.desc.isTransition) {
                        nameValue = "none";
                    }
                }
                if (--this.cref) {
                    style[this.desc.nameProp] = nameValue;
                    if (!isUniqueKeyframeName(name)) {
                        this.removed[name] = true;
                    }
                } else {
                    if (elem && nameValue === "none") {
                        style[this.desc.nameProp] = nameValue;
                        resolveStyles(elem);
                    }
                    this.destroy(style, skipStylesReset);
                }
            }
        });

    function setTemporaryStyles(elem, id, style, actions, desc) {
        var styleCache = desc.styleCaches[id] ||
                         new StyleCache(id, desc, style);
        styleCache.cref += actions.length;

        actions.forEach(function (action) {
            stopExistingAction(id, action.property);
        });

        if (desc.isTransition ||
            actions.some(function (action) {
                return styleCache.removed[action[desc.nameField]];
        })) {
            resolveStyles(elem);
            styleCache.removed = {};
        }

        var newShorthand = actions.map(function (action) {
            return action[desc.nameField] + " " +
                desc.props.map(function (p) {
                    return (p[1] ? action[p[1]] : "") + p[2];
                }).join(" ");
        }).join(", ");

        var newNames = actions.map(function (action) {
            return action[desc.nameField];
        }).join(", ");
        if (styleCache.names !== "") {
            newShorthand = styleCache.names + ", " + newShorthand;
            newNames = styleCache.names + ", " + newNames;
        }

        style[desc.shorthandProp] = newShorthand;
        styleCache.names = newNames;
        return styleCache;
    }

    var elementTransitionProperties = {
        shorthandProp: browserStyleEquivalents["transition"].scriptName,
        nameProp: browserStyleEquivalents["transition-property"].scriptName,
        nameField: "property",
        props: [
            [browserStyleEquivalents["transition-duration"].scriptName, "duration", "ms"],
            [browserStyleEquivalents["transition-timing-function"].scriptName, "timing", ""],
            [browserStyleEquivalents["transition-delay"].scriptName, "delay", "ms"]
        ],
        isTransition: true,
        styleCaches: []
    };

    function completePromise(c, synchronous) {
        if (synchronous) {
            c();
        } else {
            Scheduler.schedule(function _Animation_completeAnimationPromise() {
                c();
            }, Scheduler.Priority.normal, null, "WinJS.UI._Animation._completeAnimationPromise");
        }
    }

    var uniformizeStyle;
    function executeElementTransition(elem, index, transitions, promises, animate) {
        if (transitions.length > 0) {
            var style = elem.style;
            var id = WinJS.Utilities._uniqueID(elem);
            if (!uniformizeStyle) {
                uniformizeStyle = document.createElement("DIV").style;
            }
            transitions = transitions.map(copyWithEvaluation(index, elem));
            transitions.forEach(function (transition) {
                var scriptNameOfProperty = WinJS.Utilities._getCamelCasedName(transition.property);
                if (transition.hasOwnProperty("from")) {
                    style[scriptNameOfProperty] = transition.from;
                }
                uniformizeStyle[scriptNameOfProperty] = transition.to;
                transition.to = uniformizeStyle[scriptNameOfProperty];
                transition.propertyScriptName = scriptNameOfProperty;
            });

            if (animate) {
                var styleCache = setTemporaryStyles(elem, id, style, transitions, elementTransitionProperties);
                var listener = elem.disabled ? document : elem;

                transitions.forEach(function (transition) {
                    var finish;
                    promises.push(new WinJS.Promise(function (c, e, p) {
                        finish = function (reason) {
                            if (onTransitionEnd) {
                                listener.removeEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], onTransitionEnd, false);
                                unregisterAction(id, transition.property);
                                styleCache.removeName(style, transition.propertyScriptName, reason ? elem : null, transition.skipStylesReset);
                                clearTimeout(timeoutId);
                                onTransitionEnd = null;
                            }
                            completePromise(c, reason === reason_canceled);
                        };

                        var onTransitionEnd = function (event) {
                            if (event.target === elem && event.propertyName === transition.property) {
                                finish();
                            }
                        };

                        registerAction(id, transition.property, finish);
                        listener.addEventListener(WinJS.Utilities._browserEventEquivalents["transitionEnd"], onTransitionEnd, false);

                        var padding = 0;
                        if (style[transition.propertyScriptName] !== transition.to) {
                            style[transition.propertyScriptName] = transition.to;
                            padding = 50;
                        }
                        var timeoutId = setTimeout(function () {
                            timeoutId = setTimeout(finish, transition.delay + transition.duration);
                        }, padding);
                    }, function () { finish(reason_canceled); }));
                });
            } else {
                transitions.forEach(function (transition) {
                    style[transition.propertyScriptName] = transition.to;
                });
            }
        }
    }

    var elementAnimationProperties = {
        shorthandProp: browserStyleEquivalents["animation"].scriptName,
        nameProp: browserStyleEquivalents["animation-name"].scriptName,
        nameField: "keyframe",
        props: [
            [browserStyleEquivalents["animation-duration"].scriptName, "duration", "ms"],
            [browserStyleEquivalents["animation-timing-function"].scriptName, "timing", ""],
            [browserStyleEquivalents["animation-delay"].scriptName, "delay", "ms"],
            [browserStyleEquivalents["animation-iteration-count"].scriptName, "", "1"],
            [browserStyleEquivalents["animation-direction"].scriptName, "", "normal"],
            [browserStyleEquivalents["animation-fill-mode"].scriptName, "", "both"]
        ],
        isTransition: false,
        styleCaches: []
    };

    function executeElementAnimation(elem, index, anims, promises, animate) {
        if (animate && anims.length > 0) {
            var style = elem.style;
            var id = WinJS.Utilities._uniqueID(elem);
            anims = anims.map(copyWithEvaluation(index, elem));
            var styleElem;
            var listener = elem.disabled ? document : elem;
            anims.forEach(function (anim) {
                if (!anim.keyframe) {
                    if (!styleElem) {
                        styleElem = document.createElement("STYLE");
                        document.documentElement.appendChild(styleElem);
                    }
                    anim.keyframe = getUniqueKeyframeName();
                    var kf = "@" + browserStyleEquivalents["keyframes"] + " " + anim.keyframe + " { from {" + anim.property + ":" + anim.from + ";} to {" + anim.property + ":" + anim.to + ";}}";
                    styleElem.sheet.insertRule(kf, 0);
                } else {
                    anim.keyframe = browserStyleEquivalents.animationPrefix + anim.keyframe;
                }
            });
            var styleCache = setTemporaryStyles(elem, id, style, anims, elementAnimationProperties);
            anims.forEach(function (anim) {
                var finish;
                promises.push(new WinJS.Promise(function (c, e, p) {

                    finish = function (reason) {
                        if (onAnimationEnd) {
                            listener.removeEventListener(WinJS.Utilities._browserEventEquivalents["animationEnd"], onAnimationEnd, false);
                            unregisterAction(id, anim.property);
                            styleCache.removeName(style, anim.keyframe);
                            clearTimeout(timeoutId);
                            onAnimationEnd = null;
                        }
                        completePromise(c, reason === reason_canceled);
                    };

                    var onAnimationEnd = function (event) {
                        if (event.target === elem && event.animationName === anim.keyframe) {
                            finish();
                        }
                    };

                    registerAction(id, anim.property, finish);
                    var timeoutId = setTimeout(function () {
                        timeoutId = setTimeout(finish, anim.delay + anim.duration);
                    }, 50);
                    listener.addEventListener(WinJS.Utilities._browserEventEquivalents["animationEnd"], onAnimationEnd, false);
                }, function () { finish(reason_canceled); }));
            });
            if (styleElem) {
                setTimeout(function () {
                    var parentElement = styleElem.parentElement;
                    if (parentElement) {
                        parentElement.removeChild(styleElem);
                    }
                }, 50);
            }
        }
    }

    var enableCount = 0;
    var animationSettings;
    function initAnimations() {
        if (!animationSettings) {
            if (WinJS.Utilities.hasWinRT) {
                animationSettings = new Windows.UI.ViewManagement.UISettings();
            }
            else {
                animationSettings = { animationsEnabled: true };
            }
        }
    }

    function isAnimationEnabled() {
        /// <signature helpKeyword="WinJS.UI.isAnimationEnabled">
        /// <summary locid="WinJS.UI.isAnimationEnabled">
        /// Determines whether the WinJS Animation Library will perform animations.
        /// </summary>
        /// <returns type="Boolean" locid="WinJS.UI.isAnimationEnabled_returnValue">
        /// true if WinJS animations will be performed.
        /// false if WinJS animations are suppressed.
        /// </returns>
        /// </signature>
        initAnimations();
        return enableCount + animationSettings.animationsEnabled > 0;
    }

    function applyAction(element, action, execAction) {
        try {
            var animate = WinJS.UI.isAnimationEnabled();
            var elems = makeArray(element);
            var actions = makeArray(action);

            var promises = [];

            for (var i = 0; i < elems.length; i++) {
                if (elems[i] instanceof Array) {
                    for (var j = 0; j < elems[i].length; j++) {
                        execAction(elems[i][j], i, actions, promises, animate);
                    }
                } else {
                    execAction(elems[i], i, actions, promises, animate);
                }
            }

            if (promises.length) {
                return WinJS.Promise.join(promises);
            } else {
                return Scheduler.schedulePromiseNormal(null, "WinJS.UI._Animation._completeActionPromise").then(null, function (error) {
                    // Convert a cancelation to the success path
                });
            }
        } catch (e) {
            return WinJS.Promise.wrapError(e);
        }
    }

    var UI = WinJS.Namespace.define("WinJS.UI", {
        disableAnimations: function () {
            /// <signature helpKeyword="WinJS.UI.disableAnimations">
            /// <summary locid="WinJS.UI.disableAnimations">
            /// Disables animations in the WinJS Animation Library
            /// by decrementing the animation enable count.
            /// </summary>
            /// </signature>
            enableCount--;
        },

        enableAnimations: function () {
            /// <signature helpKeyword="WinJS.UI.enableAnimations">
            /// <summary locid="WinJS.UI.enableAnimations">
            /// Enables animations in the WinJS Animation Library
            /// by incrementing the animation enable count.
            /// </summary>
            /// </signature>
            enableCount++;
        },

        isAnimationEnabled: isAnimationEnabled,

        _libraryDelay: 0,

        executeAnimation: function (element, animation) {
            /// <signature helpKeyword="WinJS.UI.executeAnimation">
            /// <summary locid="WinJS.UI.executeAnimation">
            /// Perform a CSS animation that can coexist with other
            /// Animation Library animations. Applications are not expected
            /// to call this function directly; they should prefer to use
            /// the high-level animations in the Animation Library.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.executeAnimation_p:element">
            /// Single element or collection of elements on which
            /// to perform a CSS animation.
            /// </param>
            /// <param name="animation" locid="WinJS.UI.executeAnimation_p:animation">
            /// Single animation description or array of animation descriptions.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.executeAnimation_returnValue">
            /// Promise object that completes when the CSS animation is complete.
            /// </returns>
            /// </signature>
            return applyAction(element, animation, executeElementAnimation);
        },

        executeTransition: function (element, transition) {
            /// <signature helpKeyword="WinJS.UI.executeTransition">
            /// <summary locid="WinJS.UI.executeTransition">
            /// Perform a CSS transition that can coexist with other
            /// Animation Library animations. Applications are not expected
            /// to call this function directly; they should prefer to use
            /// the high-level animations in the Animation Library.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.executeTransition_p:element">
            /// Single element or collection of elements on which
            /// to perform a CSS transition.
            /// </param>
            /// <param name="transition" locid="WinJS.UI.executeTransition_p:transition">
            /// Single transition description or array of transition descriptions.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.UI.executeTransition_returnValue">
            /// Promise object that completes when the CSS transition is complete.
            /// </returns>
            /// </signature>
            return applyAction(element, transition, executeElementTransition);
        }
    });
})(this, WinJS);
