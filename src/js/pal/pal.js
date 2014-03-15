//
// WinJS PAL
//

(function (window) {

    function nop() { }

    var isMozilla = !!window.mozAnimationStartTime;
    var isSafari = navigator.userAgent.toLowerCase().indexOf("safari") > -1;
    window.__winjs_not_ie = isMozilla || isSafari || window.chrome;

    window.toStaticHTML = window.toStaticHTML || function (text) {
        return text;
    };   

    window.setImmediate = window.setImmediate
        || window.blinkSetImmediate
        || window.webkitSetImmediate
        || function (expression, args) { return setTimeout(expression, 0, args); };
    window.clearImmediate = window.clearImmediate
        || window.blinkClearImmediate
        || window.webkitClearImmediate
        || clearTimeout;

    window.msSetImmediate = window.setImmediate
        || window.blinkSetImmediate ||
        window.webkitSetImmediate
        || function (expression, args) { return setTimeout(expression, 0, args); };

    window.msClearImmediate = window.clearImmediate
        || window.blinkClearImmediate ||
        window.webkitClearImmediate ||
        clearTimeout;

    window.MSManipulationEvent = window.MSManipulationEvent || {
        MS_MANIPULATION_STATE_ACTIVE: 1,
        MS_MANIPULATION_STATE_CANCELLED: 6,
        MS_MANIPULATION_STATE_COMMITTED: 7,
        MS_MANIPULATION_STATE_DRAGGING: 5,
        MS_MANIPULATION_STATE_INERTIA: 2,
        MS_MANIPULATION_STATE_PRESELECT: 3,
        MS_MANIPULATION_STATE_SELECTING: 4,
        MS_MANIPULATION_STATE_STOPPED: 0
    };
    window.MSPointerEvent = window.MSPointerEvent || {};

    if (!window.MSGesture) {
        window.MSGesture = function () {
            this.addEventListener = nop;
            this.removeEventListener = nop;
            this.addPointer = nop;
            this.stop = nop;
        };
    }

    if (!window.MutationObserver) {
        window.MutationObserver = function () {
            this.observe = nop;
            this.disconnect = nop;
        };
    }
    
    if (window.HTMLElement && !HTMLElement.prototype.setActive) {
        HTMLElement.prototype.setActive = function () {
            var that = this;
            setImmediate(function () {
                that.focus();
            });

        };
    }

    try {
        if (window.HTMLElement && !HTMLElement.prototype.innerText) {
            Object.defineProperty(HTMLElement.prototype, "innerText", {
                get: function () {
                    return this.textContent;
                },
                set: function (value) {
                    this.textContent = "" + value;
                }
            });
        }       
    } catch (e) {
        // requesting HTMLElement.prototype.innerText throws in IE
    }

    // Translates a camel cased name (e.g. minHeight) to a dashed name (e.g. min-height)
    function camelCaseToDashed(name) {
        return name.replace(/([A-Z])/g, "-$1").toLowerCase();
    }

    function addCssTranslation(from, to) {
        Object.defineProperty(CSSStyleDeclaration.prototype, from, {
            get: function () {
                return this[to];
            },
            set: function (value) {
                this[to] = value;
            }
        });
    }

    if (isMozilla) {
        // Firefox doesn't support dashed CSS style names (e.g. min-height) so fake it by
        // mapping them to their camel cased counterparts (e.g. minHeight).
        Object.keys(CSS2Properties.prototype).forEach(function (prop) {
            addCssTranslation(camelCaseToDashed(prop), prop);
        });
    }

    if (window.chrome || isSafari || isMozilla) {
        var pointerEventsMap = {};
        function addPointerHandlers(element, eventNameLowercase, callback, capture) {
            if (!pointerEventsMap[element.uniqueID]) {
                pointerEventsMap[element.uniqueID] = {};
            }
            if (!pointerEventsMap[element.uniqueID][eventNameLowercase]) {
                pointerEventsMap[element.uniqueID][eventNameLowercase] = [];
            }

            var mouseWrapper,
                touchWrapper;

            var translations = eventTranslations[eventNameLowercase];

            if (translations.mouse) {
                mouseWrapper = function (e) {
                    e.type = eventNameLowercase;
                    return mouseEventTranslator(translations.mouse, callback, e);
                }
                element.addEventListener(translations.mouse, mouseWrapper, capture);
            }

            if (translations.touch) {
                touchWrapper = function (e) {
                    e.type = eventNameLowercase;
                    return touchEventTranslator(callback, e);
                }
                element.addEventListener(translations.touch, touchWrapper, capture);
            }

            pointerEventsMap[element.uniqueID][eventNameLowercase].push({
                originalCallback: callback,
                mouseWrapper: mouseWrapper,
                touchWrapper: touchWrapper,
                capture: capture
            });
        }

        function removePointerHandlers(element, eventNameLowercase, callback, capture) {
            if (!pointerEventsMap[element.uniqueID] || !pointerEventsMap[element.uniqueID][eventNameLowercase]) {
                return;
            }

            var mappedEvents = pointerEventsMap[element.uniqueID][eventNameLowercase];
            for (var i = 0; i < mappedEvents.length; i++) {
                var mapping = mappedEvents[i];
                if (mapping.originalCallback === callback && (!!capture === !!mapping.capture)) {
                    var translations = eventTranslations[eventNameLowercase];
                    if (mapping.mouseWrapper) {
                        element.removeEventListener(translations.mouse, mapping.mouseWrapper, capture);
                    }
                    if (mapping.touchWrapper) {
                        element.removeEventListener(translations.touch, mapping.touchWrapper, capture);
                    }
                    mappedEvents.splice(i, 1);
                    break;
                }
            }
        }
    }

    var touchPropertiesToCopy = [
    "screenX",
    "screenY",
    "clientX",
    "clientY",
    "pageX",
    "pageY",
    "radiusX",
    "radiusY",
    "rotationAngle",
    "force"
    ];

    function moveTouchPropertiesToEventObject(eventObject, touchObject) {
        eventObject.pointerId = touchObject.identifier;
        eventObject.pointerType = "touch";
        for (var i = 0; i < touchPropertiesToCopy.length; i++) {
            var prop = touchPropertiesToCopy[i];
            eventObject[prop] = touchObject[prop];
        }
    }

    function touchEventTranslator(callback, eventObject) {
        eventObject.preventDefault();
        var changedTouches = eventObject.changedTouches,
            retVal = null;

        for (var i = 0; i < changedTouches.length; i++) {
            moveTouchPropertiesToEventObject(eventObject, changedTouches[i]);
            retVal = retVal || callback(eventObject);
        }

        return retVal;
    }

    var lastMouseID = -1;
    function mouseEventTranslator(name, callback, eventObject) {
        eventObject.pointerType = "mouse";
        eventObject.pointerId = lastMouseID;
        if (name === "mouseup") {
            lastMouseID--;
        }
        return callback(eventObject);
    }

    var eventTranslations = {
        pointerdown: {
            touch: "touchstart",
            mouse: "mousedown"
        },
        pointerup: {
            touch: "touchend",
            mouse: "mouseup"
        },
        pointermove: {
            touch: "touchmove",
            mouse: "mousemove"
        },
        pointerenter: {
            touch: null,
            mouse: "mouseenter"
        },
        pointerover: {
            touch: null,
            mouse: "mouseover"
        },
        pointerout: {
            touch: "touchleave",
            mouse: "mouseout"
        },
        pointercancel: {
            touch: "touchcancel",
            mouse: null
        }
    };


    if (window.chrome || isSafari) {
        var cssTranslations = [
            "-ms-grid-row", "grid-row",
            "msGridRow", "grid-row",
            "-ms-grid-column", "grid-column",
            "msGridColumn", "grid-column",
            "-ms-grid-rows", "grid-definition-rows",
            "msGridRows", "grid-definition-rows",
            "-ms-grid-columns", "grid-definition-columns",
            "msGridColumns", "grid-definition-columns"
        ];
        for (var i = 0; i < cssTranslations.length; i += 2) {
            addCssTranslation(cssTranslations[i], cssTranslations[i + 1]);
        }

    }

    if (window.chrome || isSafari || isMozilla) {
        var originalAddEventListener = HTMLElement.prototype.addEventListener,
            originalRemoveEventListener = HTMLElement.prototype.removeEventListener;

        HTMLElement.prototype.addEventListener = function (name, callback, capture) {
            var eventNameLower = name && name.toLowerCase();
            if (eventTranslations[eventNameLower]) {
                return addPointerHandlers(this, eventNameLower, callback, capture);
            }
            return originalAddEventListener.call(this, name, callback, capture);
        };

        HTMLElement.prototype.removeEventListener = function (name, callback, capture) {
            var eventNameLower = name && name.toLowerCase();
            if (eventTranslations[eventNameLower]) {
                return removePointerHandlers(this, eventNameLower, callback, capture);
            }
            return originalRemoveEventListener.call(this, name, callback, capture);
        };

        HTMLElement.prototype.setPointerCapture = nop;
        HTMLElement.prototype.releasePointerCapture = nop;
    }

}(this));