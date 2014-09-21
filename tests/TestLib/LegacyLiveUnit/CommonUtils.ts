// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
///<reference path="../../../bin/typings/tsd.d.ts" />
///<reference path="../liveToQ/liveToQ.d.ts" />
///<reference path="../winjs.dev.d.ts" />


var __UnhandledErrors = {};

function errorEventHandler(evt) {
    var details = evt.detail;
    var id = details.id;
    if (!details.parent) {
        __UnhandledErrors[id] = details;
    } else if (details.handler) {
        delete __UnhandledErrors[id];
    }
}

function initUnhandledErrors() {
    __UnhandledErrors = {};
    WinJS.Promise.addEventListener("error", errorEventHandler);
}

function validateUnhandledErrors() {
    WinJS.Promise.removeEventListener("error", errorEventHandler);
    LiveUnit.Assert.areEqual(0, Object.keys(__UnhandledErrors).length, "Unhandled errors found");
}

function cleanupUnhandledErrors() {
    WinJS.Promise.removeEventListener("error", errorEventHandler);
    __UnhandledErrors = {};
}

function validateUnhandledErrorsOnIdle() {
    return WinJS.Utilities.Scheduler.requestDrain(WinJS.Utilities.Scheduler.Priority.idle).
        then(validateUnhandledErrors.bind(this));
}

module CommonUtilities {

    "use strict";

    var canElementResize = null;

    export function createPointerEvent(fallbackType:string) {
        // PointerEvent is already supported, so just use that
        if ((<any>window).PointerEvent) {
            var e = document.createEvent("PointerEvent");
            return e;
        } else if ((<any>window).MSPointerEvent) {
            // Fallback to the ms prefix version from IE 10
            var e = document.createEvent("MSPointerEvent");
            return e;
        } else if (fallbackType === "mouse") {
            var e = document.createEvent("MouseEvent");
            return e;
        } else if (fallbackType === "touch") {
            var e = document.createEvent("MouseEvent");
            (<any>e).isTouch = true;
            return e;
        }
    }

    export function initPointerEvent(e, ...args) {

        // PointerEvent is already supported, so just use that
        if ((<any>window).PointerEvent) {
            e.initPointerEvent.apply(e, args);
        } else if ((<any>window).MSPointerEvent) {
            // Fallback to the ms prefix version from IE 10

            // Camel case the "pointerevent" pattern and prefix with MS
            args[0] = args[0].replace(/pointer(.)/g, function(match, nextChar) {
                return "MSPointer" + nextChar.toUpperCase();
            });

            e.initPointerEvent.apply(e, args);
        } else if (e instanceof MouseEvent && !e.isTouch) {
            // Convert "pointerevent" to "mouseevent"
            args[0] = args[0].replace(/pointer/g, "mouse");

            // Get the arguments mouse events care about
            args = args.slice(0, 15);
            e.initMouseEvent.apply(e, args);
        } else if (e instanceof MouseEvent && e.isTouch) {
            // Convert "pointerevent" to "touchevent"
            args[0] = args[0].replace(/pointer/g, "touch");
            if (args[0] === "touchdown")
                args[0] = "touchstart";
            else if (args[0] === "touchup")
                args[0] = "touchend";
            else if (args[0] === "touchout")
                args[0] = "touchleave";

            // Get the arguments touch events care about
            args = args.slice(0, 15);
            e.initMouseEvent.apply(e, args);

            // Throw in the changedTouches array
            // No docs on how to construct an actual TouchList / Touch object, but this seems
            // to work
            e.changedTouches = [{screenX: args[5], screenY: args[6], clientX: args[7], clientY: args[8], pageX: args[7], pageY: args[8], target: args[14]}];
        }
    }

    export function endsWith(s, suffix) {
        return s && s.substring(s.length - suffix.length) === suffix;
    }

    export function addTag(tagName, tagId, attributes?) {
        /// <summary>
        ///  Add a tag of type tagName to the document with id set to tagId and other HTML attributes set to attributes
        /// </summary>
        /// <param name="tagName" type="string">
        ///  String specifying type of tag to create
        /// </param>
        /// <param name="tagId" type="string">
        ///  String specifying HTML id to give to created tag
        /// </param>
        /// <param name="attributes" type="object">
        ///  JavaScript object containing list of attributes to set on HTML tag (note that tagId takes precedence for "id" attribute)
        /// </param>
        LiveUnit.LoggingCore.logComment("Adding \"" + tagName + "\" with id \"" + tagId + "\" to the DOM");

        // Some controls have styles that conflict with position: absolute.
        // Instead of applying position: absolute to the added tag itself, put the tag
        // in a wrapping div.
        var wrapper = document.createElement("div");
        wrapper.style.position = "absolute";
        wrapper.style.left = wrapper.style.top = "0px";
        document.body.appendChild(wrapper);

        var tag = document.createElement(tagName);
        for (var a in attributes) {
            tag.setAttribute(a, attributes[a]);
        }
        tag.setAttribute("id", tagId);
        tag.setAttribute("has-wrapper", "true");
        wrapper.appendChild(tag);
    }

    export function getElementById(elementId) {
        /// <summary>
        ///  Try to get the given element by id and verify it was found.
        ///  Note:  Do NOT call this function from your setup or cleanup functions because if the assert fails, LiveUnit can crash.
        /// </summary>
        /// <param name="elementId" type="string">
        ///  String specifying the element to get.
        /// </param>
        /// <returns type="object" />
        var elem = document.getElementById(elementId);
        LiveUnit.Assert.isNotNull(elem, "Couldn't find element " + elementId);
        return elem;
    }

    export function removeElementById(tagId) {
        /// <summary>
        ///  Remove an existing tag from the DOM
        /// </summary>
        /// <param name="tagId" type="string">
        ///  String specifying the tag to remove.
        /// </param>
        var tag = document.getElementById(tagId);
        if (!tag) { return; }
        LiveUnit.LoggingCore.logComment("Remove tag \"" + tagId + "\" from the DOM");

        // We can't be sure that people using this method used addTag to create the element, so we have
        // to find out if this element has a wrapping div around it.
        if (tag.getAttribute("has-wrapper")) {
            return tag.parentNode.parentNode.removeChild(tag.parentNode);
        }
        return tag.parentNode.removeChild(tag);
    }

    export function getElementsByClassName(classname, node) {
        /// <summary>
        ///     Retrieves an array of elements with given class name under specified node.
        /// </summary>
        /// <param name="classname" type="string">
        ///     The string value representing the classname of elements to search for.
        /// </param>
        /// <param name="node" type="object">
        ///     (Defaults to document.body node) The HTML element representing the node to search for child elements matching classname.
        /// </param>
        /// <returns type="object"/>

        if (!node) {
            node = document.body;
        }

        var elementsByClassName = [],
            classNameRegExp = new RegExp('\\b' + classname + '\\b'),
            elements = node.getElementsByTagName("*");

        for (var i = 0; i < elements.length; i++) {
            if (elements[i].className.match(classNameRegExp)) {
                elementsByClassName.push(elements[i]);
            }
        }
        return elementsByClassName;
    }

    export function getIEInfo() {
        /// <summary>
        ///     Output to Log the IE Document Mode and JScript version.
        /// </summary>

        LiveUnit.LoggingCore.logComment("IE Document Mode: " + document.documentMode);
        // Comment all code except for Logging IE Document mode
        // to make sure the test code can be executed in both IE & WWA
        // @cc_on;
        // LiveUnit.LoggingCore.logComment("JScript Version: " + @_jscript_version);
        // @cc_off;
    }

    export function simpleArrayDataSource(numItems:number) {
        /// <summary>
        ///     Create a simple array of test data
        /// </summary>
        /// <param name="numItems" type="integer">
        ///     Number of items you want in the array.
        /// </param>
        /// <returns type="dataSource_object"/>

        var testData = [];
        for (var i = 0; i < numItems; ++i) {
            testData.push({ title: "Tile" + i, content: "Content" + i + "Content" + i + "Content" + i + "Content" + i });
        }
        return new WinJS.Binding.List(testData).dataSource;
    }

    export function simpleArrayRenderer(itemPromise) {
        /// <summary>
        ///     Item Renderer for the simpleArraryDataSource.
        /// </summary>

        return itemPromise.then(function (item) {
            var result = document.createElement("div");
            result.setAttribute("id", item.data.title);
            result.innerHTML =
                "<div>" + item.data.title + "</div>" +
                "<div>" + item.data.content + "</div>";
            return result;
        });
    }

    export function getOffsetRect(elem, includeFixedPositionedElements) {
        /// <summary>
        ///  Make an object storing the offset rect the given element takes up.
        ///  Output object contains properties: left, top, width, and height.
        /// </summary>
        /// <param name="elem" type="object">
        ///  DOM object to get the offsetRect of.
        /// </param>
        /// <param name="includeFixedPositionedElements" type="boolean">
        ///  Optional parameter.  If set to true, it includes fixed position elements while calculating the offsetRect which is needed for tooltips.
        /// </param>
        /// <returns type="object" />
        if (elem) {
            var rect = {
                left: 0,
                top: 0,
                width: elem.offsetWidth,
                height: elem.offsetHeight
            };

            // Fixed positioned element's (like the tooltip) have an offsetParent == null, so
            // allow this to enter this loop.  This first check that elem.offsetParent != null
            // is probably a bug and I should remove the check, but since so many tests are
            // calling this, I don't want to remove it until RC.
            if (elem.offsetParent || includeFixedPositionedElements) {
                do {
                    rect.left += elem.offsetLeft;
                    rect.top += elem.offsetTop;
                    elem = elem.offsetParent;
                } while (elem);
            }
            return rect;
        }
    }

    export function randomString(maxLength) {
        /// <summary>
        ///  Create a string of random chars of a random length up to maxLength
        /// </summary>
        /// <param name="maxLength" type="integer">
        ///  Number specifying maximum length for created string.
        /// </param>
        /// <returns type="string" />
        var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
        var string_length = Math.floor(Math.random() * maxLength);

        // Make sure the first character is not a number by grabbing any item from the
        //  chars array other than the first 10 (which happen to be 0-9)
        var rnum = Math.floor(Math.random() * (chars.length - 10)) + 10;
        var randomstring = chars.substring(rnum, rnum + 1);

        for (var i = 0; i < string_length; i++) {
            rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum, rnum + 1);
        }
        return randomstring;
    }

    export function getOptionsAsString(options) {
        /// <summary>
        ///  Convert an options object to a output-friendly string
        /// </summary>
        /// <returns type="string" />
        var optString = "";
        for (var opt in options) {
            if (optString !== "") {
                optString += ", ";
            }
            optString += opt + ": ";

            if (typeof options[opt] === "object") {
                optString += this.getOptionsAsString(options[opt]);
            } else if (typeof options[opt] === "string") {
                optString += "\"" + options[opt].substr(0, 17) + ((options[opt].length > 17) ? "..." : "") + "\"";
            } else {
                optString += options[opt];
            }
        }
        optString = "{" + optString + "}";

        return optString;
    }

    export function randomHTML(totalElements, returnString) {
        /// <summary>
        ///  Create a random block of HTML as either an element or a string
        /// </summary>
        /// <param name="totalElements" type="integer">
        ///  Number specifying total number of elements to add.
        /// </param>
        /// <param name="returnString" type="boolean">
        /// </param>
        /// <returns type="object" />

        if (typeof totalElements === "undefined") {
            totalElements = 10;
        }

        if (typeof returnString !== "boolean") {
            returnString = false;
        }

        var html = null;
        if (totalElements > 0) {
            html = this.randomHTML(totalElements - 1);

            var nextElement = null;
            switch (Math.floor(Math.random() * 5)) {
                case 0:
                    nextElement = document.createElement("div");
                    break;

                case 1:
                    nextElement = document.createElement("span");
                    nextElement.style.color = "Red";
                    nextElement.innerHTML = this.randomString(50);
                    break;

                case 2:
                    nextElement = document.createElement("p");
                    nextElement.innerHTML = this.randomString(50);
                    break;

                case 3:
                    nextElement = document.createElement("button");
                    nextElement.innerHTML = this.randomString(25);
                    break;

                case 4:
                    nextElement = document.createElement("img");
                    break;
            }

            nextElement.id = this.randomString(25);

            var appended = false;
            var parent = html;
            do {
                if (String(parent.tagName).toLowerCase() === "div") {
                    parent.appendChild(nextElement);
                    break;
                }

                parent = parent.parentNode;
            } while (parent);

        } else {
            html = document.createElement("div");
            html.id = this.randomString(25);
        }

        return (returnString) ? html.outerHTML : html;
    }

    export function getClientRect(elem) {
        /// <summary>
        ///  Get the client rectangle for the given element
        /// <param name="elem" type="object">
        ///  Handle to element to get the client rectangle for
        /// </param>
        /// <returns type="object" />
        /// </summary>
        if (!elem) {
            return null;
        }

        var rect = elem.getBoundingClientRect();
        // Some code samples show adding the scroll offsets of html and body to the values for getBoundingClientRect(), but
        // we don't seem to need that (ex. rect.left += (document.documentElement.scrollLeft + document.body.scrollLeft) ).
        // getBoundingClientRect is also returning the correct width and height properties (apparently this is undocumented),
        // so we don't have to create them ourselves.
        rect.center = { x: ((rect.left + rect.right) / 2), y: ((rect.top + rect.bottom) / 2) };

        return rect;
    }

    export function mouseOver(fromElement, toElement) {
        /// <summary>
        ///  Mouse hover from one element to another.
        ///  This is simply for backwards compatibility for our tests.  This should be removed once our tests and dev code are updated to use MiP.
        /// <param name="fromElement" type="object">
        ///  Handle to element mouse moving from, can be null
        /// </param>
        /// <param name="toElement" type="object">
        ///  Handle to element mouse moving over, can be null
        /// </param>
        /// </summary>
        var event;

        if (fromElement) {
            event = document.createEvent("MouseEvents");
            event.initMouseEvent("mouseout", true, true, window,
                0, 0, 0, 0, 0, false, false, false, false, 0, toElement);
            fromElement.dispatchEvent(event);
        }
        if (toElement) {

            var rect = this.getClientRect(toElement);

            event = document.createEvent("MouseEvents");
            event.initMouseEvent("mouseover", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, fromElement);
            toElement.dispatchEvent(event);
        }
    }

    export function mouseOverUsingMiP(fromElement, toElement) {
        /// <summary>
        ///  Mouse hover from one element to another.
        /// <param name="fromElement" type="object">
        ///  Handle to element mouse moving from, can be null
        /// </param>
        /// <param name="toElement" type="object">
        ///  Handle to element mouse moving over, can be null
        /// </param>
        /// </summary>
        var event;

        if (fromElement) {
            event = this.createPointerEvent("mouse");
            // pointerType = 4 (mouse event)
            this.initPointerEvent(event, "pointerout", true, true, window, 0, 0, 0, 0, 0,
                false, false, false, false, 0, null, 0, 0, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
            fromElement.dispatchEvent(event);
        }
        if (toElement) {
            var rect = this.getClientRect(toElement);

            event = this.createPointerEvent("mouse");
            // pointerType = 4 (mouse event)
            this.initPointerEvent(event, "pointerover", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 1, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
            toElement.dispatchEvent(event);

            event = this.createPointerEvent("mouse");
            // pointerType = 4 (mouse event)
            this.initPointerEvent(event, "pointermove", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 1, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
            toElement.dispatchEvent(event);
        }
    }

    export function mouseDown(element) {
        /// <summary>
        ///  Throw mousedown event from element.
        ///  This is simply for backwards compatibility for our tests.  This should be removed once our tests and dev code are updated to use MiP.
        /// </summary>
        /// <param name="element" type="object">
        ///  Handle to element to throw mousedown from
        /// </param>
        if (element) {
            var rect = this.getClientRect(element);
            var event:MouseEvent = <any>document.createEvent("MouseEvents");
            event.initMouseEvent("mousedown", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, element)
            element.dispatchEvent(event);
        }
    }

    export function mouseDownUsingMiP(element) {
        /// <summary>
        ///  Throw mousedown event from element.
        /// </summary>
        /// <param name="element" type="object">
        ///  Handle to element to throw mousedown from
        /// </param>
        if (element) {
            var rect = this.getClientRect(element);

            var event = this.createPointerEvent("mouse");
            // pointerType = 4 (mouse event)
            this.initPointerEvent(event, "pointerdown", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 1, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
            element.dispatchEvent(event);
        }
    }

    export function mouseUp(element) {
        /// <summary>
        ///  Throw mouseup event from element.
        ///  This is simply for backwards compatibility for our tests.  This should be removed once our tests and dev code are updated to use MiP.
        /// </summary>
        /// <param name="element" type="object">
        ///  Handle to element to throw mouseup from
        /// </param>
        if (element) {
            var rect = this.getClientRect(element);

            var event: MouseEvent = <any>document.createEvent("MouseEvents");
            event.initMouseEvent("mouseup", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, element)
            element.dispatchEvent(event);
        }
    }

    export function mouseUpUsingMiP(element) {
        /// <summary>
        ///  Throw mouseup event from element.
        /// </summary>
        /// <param name="element" type="object">
        ///  Handle to element to throw mouseup from
        /// </param>
        if (element) {
            var rect = this.getClientRect(element);

            var event = this.createPointerEvent("mouse");
            // pointerType = 4 (mouse event)
            this.initPointerEvent(event, "pointerup", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 1, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
            element.dispatchEvent(event);
        }
    }

    export function click(element) {
        /// <summary>
        ///  Throw click event from element.
        /// </summary>
        /// <param name="element" type="object">
        ///  Handle to element to throw click from
        /// </param>
        var event;

        if (element) {

            this.mouseDown(element);

            this.mouseUp(element);

            var rect = this.getClientRect(element);

            event = document.createEvent("MouseEvents");
            event.initMouseEvent("click", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, element);
            element.dispatchEvent(event);
        }
    }

    export function clickUsingMiP(element) {
        /// <summary>
        ///  Throw click event from element.
        /// </summary>
        /// <param name="element" type="object">
        ///  Handle to element to throw click from
        /// </param>
        var event;

        if (element) {

            this.mouseDownUsingMiP(element);

            this.mouseUpUsingMiP(element);

            var rect = this.getClientRect(element);

            // This will throw an MSGestureTap, too
            event = document.createEvent("MSGestureEvent");
            event.initGestureEvent("MSGestureTap", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null);
            element.dispatchEvent(event);

            // Even when everything else is MSPointer, elements still throw "click" events
            event = document.createEvent("MouseEvents");
            event.initMouseEvent("click", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, element);
            element.dispatchEvent(event);
        }
    }

    export function generateClickEventsUsingMiP(element) {
        /// <summary>
        ///  Generate click events from element, returning an array of events ready to be dispatched.
        /// </summary>
        /// <param name="element" type="object">
        ///  Handle to element to throw click from
        /// </param>
        var events = new Array();
        var event;

        if (element) {

            var rect = this.getClientRect(element);

            event = this.createPointerEvent("mouse");
            // pointerType = 4 (mouse event)
            this.initPointerEvent(event, "pointerdown", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 1, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
            events[events.length] = event;

            event = this.createPointerEvent("mouse");
            // pointerType = 4 (mouse event)
            this.initPointerEvent(event, "pointerup", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 1, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
            events[events.length] = event;

            // This will throw an MSGestureTap, too
            event = document.createEvent("MSGestureEvent");
            event.initGestureEvent("MSGestureTap", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null);
            events[events.length] = event;

            // Even when everything else is MSPointer, elements still throw "click" events
            event = document.createEvent("MouseEvents");
            event.initMouseEvent("click", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, element, true);
            events[events.length] = event;

            return events;
        }
    }

    export function touchCancel(element) {
        /// <summary>
        ///  Throw touch MSPointerCancel event from element.
        /// </summary>
        /// <param name="element" type="object">
        ///  Handle to element to throw MSPointerCancel from
        /// </param>
        if (element) {
            var rect = this.getClientRect(element);

            var event = this.createPointerEvent("touch");
            // pointerType = 2 (touch event)
            this.initPointerEvent(event, "pointercancel", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
            element.dispatchEvent(event);
        }
    }

    export function touchOver(fromElement, toElement) {
        /// <summary>
        ///  Touch hover from one element to another.
        /// <param name="fromElement" type="object">
        ///  Handle to element touch moving from, can be null
        /// </param>
        /// <param name="toElement" type="object">
        ///  Handle to element touch moving over, can be null
        /// </param>
        /// </summary>
        var event, rect;

        if (fromElement) {
            rect = this.getClientRect(fromElement);

            event = this.createPointerEvent("touch");
            // pointerType = 2 (touch event)
            this.initPointerEvent(event, "pointerout", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
            fromElement.dispatchEvent(event);
        }
        if (toElement) {
            rect = this.getClientRect(toElement);

            event = this.createPointerEvent("touch");
            // pointerType = 2 (touch event)
            this.initPointerEvent(event, "pointerover", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
            toElement.dispatchEvent(event);

            event = this.createPointerEvent("touch");
            // pointerType = 2 (touch event)
            this.initPointerEvent(event, "pointermove", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
            toElement.dispatchEvent(event);
        }
    }

    export function touchDown(element) {
        /// <summary>
        ///  Throw MSPointerDown event from element.
        /// </summary>
        /// <param name="element" type="object">
        ///  Handle to element to throw MSPointerDown from
        /// </param>
        if (element) {
            var rect = this.getClientRect(element);

            var event = this.createPointerEvent("touch");
            // pointerType = 2 (touch event)
            this.initPointerEvent(event, "pointerdown", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y, // fake mouse coordinates
                false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
            element.dispatchEvent(event);

            event = this.createPointerEvent("touch");
            // pointerType = 2 (touch event)
            this.initPointerEvent(event, "pointermove", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
            element.dispatchEvent(event);
        }
    }

    export function touchUp(element) {
        /// <summary>
        ///  Throw MSPointerUp event from element.
        /// </summary>
        /// <param name="element" type="object">
        ///  Handle to element to throw MSPointerUp from
        /// </param>
        if (element) {
            var rect = this.getClientRect(element);

            var event = this.createPointerEvent("touch");
            // pointerType = 2 (touch event)
            this.initPointerEvent(event, "pointermove", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
            element.dispatchEvent(event);

            event = this.createPointerEvent("touch");
            // pointerType = 2 (touch event)
            this.initPointerEvent(event, "pointerup", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
            element.dispatchEvent(event);
        }
    }

    export function tap(element) {
        /// <summary>
        ///  Throw click event from element.
        /// </summary>
        /// <param name="element" type="object">
        ///  Handle to element to throw click from
        /// </param>
        var event;

        if (element) {

            this.touchDown(element);

            this.touchUp(element);

            var rect = this.getClientRect(element);

            // This will throw an MSGestureTap, too
            if ("MSGestureEvent" in window) {
                event = document.createEvent("MSGestureEvent");
                event.initGestureEvent("MSGestureTap", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                    rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null);
                element.dispatchEvent(event);
            }

            // Even when everything else is MSPointer, elements still throw "click" events
            event = document.createEvent("MouseEvents");
            event.initMouseEvent("click", true, true, window, 0,
                window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                false, false, false, false, 0, element);
            element.dispatchEvent(event);
        }
    }

    export function focus(element) {
        /// <summary>
        ///  Throw focus event from element.
        /// </summary>
        /// <param name="element" type="object">
        ///  Handle to element to throw focus from
        /// </param>
        if (element) {
            // All of WinJS listens to these custom focus events instead of
            // the native browser focus events.
            WinJS.Utilities._bubbleEvent(element, "focusin", {
                type: "focusin"
            });
        }
    }

    export function blur(element) {
        /// <summary>
        ///  Throw blur event from element.
        /// </summary>
        /// <param name="element" type="object">
        ///  Handle to element to throw blur from
        /// </param>
        if (element) {
            // All of WinJS listens to these custom focus events instead of
            // the native browser focus events.
            WinJS.Utilities._bubbleEvent(element, "focusout", {
                type: "focusout"
            });
        }
    }

    export function keydown(element, keyCode, locale?) {
        /// <summary>
        ///  Throw keydown event from element.
        /// </summary>
        /// <param name="element" type="object">
        ///  Handle to element to throw keydown from
        /// </param>
        /// <param name="key" type="object">
        ///  Key identifier to throw
        /// </param>
        /// <param name="locale" type="string" isOptional="true">
        ///  Key identifier to throw
        /// </param>
        if (element) {
            locale = locale || "en-US";
            // We are purposely creating a CustomEvent instead of a KeyboardEvent because we cannot assign the keyCode.
            // This method works as long as there is no need to specify modifier keys.
            var event: CustomEvent = <any>document.createEvent("CustomEvent");
            event.initCustomEvent("keydown", true, true, null);
            (<any>event).keyCode = keyCode;
            (<any>event).locale = locale;
            element.dispatchEvent(event);
        }
    }

    export function keyup(element, keyCode, locale?) {
        /// <summary>
        ///  Throw keyup event from element.
        /// </summary>
        /// <param name="element" type="object">
        ///  Handle to element to throw keyup from
        /// </param>
        if (element) {
            locale = locale || "en-US";
            // We are purposely creating a CustomEvent instead of a KeyboardEvent because we cannot assign the keyCode.
            // This method works as long as there is no need to specify modifier keys.
            var event: CustomEvent = <any>document.createEvent("CustomEvent");
            event.initCustomEvent("keyup", true, true, null);
            (<any>event).keyCode = keyCode;
            (<any>event).locale = locale;
            element.dispatchEvent(event);
        }
    }

    export function waitForEvent(element, eventName, action) {
        /// <summary>
        /// Returns a promise that fulfills when the given event is fired on the element.
        /// It optionally takes a function that is executed and causes the event to fire
        /// </summary>
        /// <param name="element" type="object">
        ///  Element on which the event is fired
        /// </param>
        /// <param name="eventName" type="string">
        ///  Event to be listened for
        /// </param>
        /// <param name="action" type="function">
        ///  Optional. If provided, this function is executed that should eventually cause the event to fire
        /// </param>
        return new WinJS.Promise(function (c, e, p) {
            element.addEventListener(eventName, handler);
            function handler(ev) {
                element.removeEventListener(eventName, handler);
                c();
            }
            if (action) { action(); }
        });
    }


    // Only IE supports mselementresize and IE10+ supports requestAnimationFrame.
    // Android Web Browser on Jellybean supports neither.
    export function detectMsElementResize(completed) {

        // don't do feature detection twice
        if(canElementResize !== null) {
            return completed(canElementResize);
        }

        if(!window.requestAnimationFrame) {
            canElementResize = false;
            return completed(canElementResize);
        }

        function resizeCallback() {
            canElementResize = true;
            cleanup();
        }

        function detectCallback() {
            canElementResize = false;
            cleanup();
        }

        var detector = document.createElement("div");
        detector.style.visibility = 'hidden';
        detector.addEventListener("mselementresize", resizeCallback);
        detector.addEventListener("detectresize", detectCallback);
        document.body.appendChild(detector);
        detector.style.height = "1px";
        window.requestAnimationFrame(function() {
            var event = document.createEvent("Event");
            event.initEvent("detectresize", false, true);
            detector.dispatchEvent(event);
        });


        function cleanup() {
            document.body.removeChild(detector);
            detector.removeEventListener("mselementresize", resizeCallback);
            detector.removeEventListener("detectresize", detectCallback);

            completed(canElementResize);
        }
    }
}