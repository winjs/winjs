// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
//
// UTIL.JS
// Put non-feature specific functions used in > 1 test file in here to share with other tests
// and simplify maintenance across tests by avoiding copy/paste.
//

///<reference path="../../typings/bowser.d.ts"/>

"use strict";

module Helper {
    "use strict";

    var __UnhandledErrors = {};

    export function errorEventHandler(evt) {
        var details = evt.detail;
        var id = details.id;
        if (!details.parent) {
            __UnhandledErrors[id] = details;
        } else if (details.handler) {
            delete __UnhandledErrors[id];
        }
    }

    export function initUnhandledErrors() {
        __UnhandledErrors = {};
        WinJS.Promise.addEventListener("error", errorEventHandler);
    }

    export function validateUnhandledErrors() {
        WinJS.Promise.removeEventListener("error", errorEventHandler);
        LiveUnit.Assert.areEqual(0, Object.keys(__UnhandledErrors).length, "Unhandled errors found");
    }

    export function cleanupUnhandledErrors() {
        WinJS.Promise.removeEventListener("error", errorEventHandler);
        __UnhandledErrors = {};
    }

    export function validateUnhandledErrorsOnIdle() {
        return WinJS.Utilities.Scheduler.requestDrain(WinJS.Utilities.Scheduler.Priority.idle).
            then(validateUnhandledErrors.bind(this));
    }

    var canElementResize = null;

    export function createPointerEvent(fallbackType: string) {
        // PointerEvent is already supported, so just use that
        var e:any;
        if ((<any>window).PointerEvent) {
            return document.createEvent("PointerEvent");
        } else if ((<any>window).MSPointerEvent) {
            // Fallback to the ms prefix version from IE 10
            return document.createEvent("MSPointerEvent");
        } else if (fallbackType === "mouse") {
            return document.createEvent("MouseEvent");
        } else if (fallbackType === "touch") {
            e = document.createEvent("MouseEvent");
            e.isTouch = true;
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
            args[0] = args[0].replace(/pointer(.)/g, function (match, nextChar) {
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
            e.changedTouches = [{ screenX: args[5], screenY: args[6], clientX: args[7], clientY: args[8], pageX: args[7], pageY: args[8], target: args[14] }];
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

    export function simpleArrayDataSource(numItems: number) {
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

    export function mouseOverUsingMiP(fromElement, toElement?) {
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
            var event: MouseEvent = <any>document.createEvent("MouseEvents");
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

    export function focus2(element) {
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

    export function waitForEvent(element, eventName, action?) {
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
        if (canElementResize !== null) {
            return completed(canElementResize);
        }

        if (!window.requestAnimationFrame) {
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
        window.requestAnimationFrame(function () {
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


module Helper {

    export function unhandledTestError(msg) {
        try {
            LiveUnit.Assert.fail("unhandled test exception: " + msg);
        } catch (ex) {
            // don't rethrow assertion failure exception
        }
    }

    export function isWinRTEnabled() {
        // detect if WinRT is available (running under WWAHOST) to enable/disable appropriate tests
        return (window && ((<any>window).Windows !== undefined));
    }

    export function namedObjectContainsString(obj, string) {
        // loop through items inside obj and return index of match,
        // returns -1 if no match.
        var index = 0;
        string = string.toLowerCase();
        string = string.replace("../", "");

        for (var i in obj) {
            if (i.toLowerCase().indexOf(string) >= 0) {
                return index;
            }
            index++;
        }

        return -1;
    }

    export function enableWebunitErrorHandler(enable) {
        // QUnit doesn't use this feature
        if (!(<any>LiveUnit).exceptionHandler) {
            return;
        }
        // if you disable the webunit error handler, it will affect all tests in the run.
        // **MAKE SURE** you put it back per test case using finally{} blocks and or proper promise error paths as necessary.

        try {
            if (enable) {
                // restore the webunit global error handler
                window.addEventListener("error", (<any>LiveUnit).exceptionHandler, false);
            } else {
                // remove the webunit global handler which will call complete() if you encounter an error during fragment loading
                window.removeEventListener("error", (<any>LiveUnit).exceptionHandler, false);
            }
        } catch (ex) {
            // restore the webunit global error handler in case it was removed.  If already added, re-adding doesn't generate error.
            window.addEventListener("error", (<any>LiveUnit).exceptionHandler, false);
            LiveUnit.Assert.fail("unhandled exception from enableWebuniteErrorHandler(), webunit global error handler restored.  Exception=" + ex);
        }
    };

    // A utility function that returns a function that returns a timeout promise of the given value
    export function weShouldWait(delay) {
        return function (value) {
            return WinJS.Promise.timeout(delay).
                then(function () {
                    return value;
                });
        };
    }

    // A general purpose asynchronous looping function
    export function asyncWhile(conditionFunction, workFunction) {

        function loop() {
            return WinJS.Promise.as(conditionFunction()).
                then(function (shouldContinue) {
                    if (shouldContinue) {
                        return WinJS.Promise.as(workFunction()).then(loop);
                    } else {
                        return WinJS.Promise.wrap();
                    }
                });
        }

        return loop();
    }

    // CSS property translation
    // Uses feature detection to map "standard" CSS property names and values to their
    // prefixed counterparts.
    // Best used through Helper.translateCSSProperty and Helper.translateCSSValue
    // Please add to this list as neccessary and use it where possible in test code
    export var cssTranslations = {
        "touch-action": function () {
            var obj = { property: {}, value: {} };
            if ("touchAction" in document.documentElement.style) {
                obj = null;
            } else if ("msTouchAction" in document.documentElement.style) {
                obj.property["touch-action"] = "-ms-touch-action";
            }
            return obj;
        },
        "display": function () {
            var obj = { property: {}, value: {} };
            if ("flex" in document.documentElement.style) {
                obj = null;
            } else if ("msFlex" in document.documentElement.style) {
                obj.value["inline-flex"] = "-ms-inline-flexbox";
                obj.value["flex"] = "-ms-flexbox";
            } else if ("webkitFlex" in document.documentElement.style) {
                obj.value["inline-flex"] = "-webkit-inline-flex";
                obj.value["flex"] = "-webkit-flex";
            }
            return obj;
        },
        "flex": function () {
            var obj = { property: {}, value: {} };
            if ("flex" in document.documentElement.style) {
                obj = null;
            } else if ("msFlex" in document.documentElement.style) {
                obj.property["flex"] = "-ms-flex";
            } else if ("webkitFlex" in document.documentElement.style) {
                obj.property["flex"] = "-webkit-flex";
            }
            return obj;
        },
        "flex-grow": function () {
            var obj = { property: {}, value: {} };
            if ("flexGrow" in document.documentElement.style) {
                obj = null;
            } else if ("msFlexGrow" in document.documentElement.style) {
                obj.property["flex-grow"] = "-ms-flex-grow";
            } else if ("msFlexPositive" in document.documentElement.style) {
                obj.property["flex-grow"] = "-ms-flex-positive";
            } else if ("webkitFlexGrow" in document.documentElement.style) {
                obj.property["flex-grow"] = "-webkit-flex-grow";
            }
            return obj;
        },
        "flex-shrink": function () {
            var obj = { property: {}, value: {} };
            if ("flexShrink" in document.documentElement.style) {
                obj = null;
            } else if ("msFlexShrink" in document.documentElement.style) {
                obj.property["flex-shrink"] = "-ms-flex-shrink";
            } else if ("msFlexNegative" in document.documentElement.style) {
                obj.property["flex-shrink"] = "-ms-flex-negative";
            } else if ("webkitFlexShrink" in document.documentElement.style) {
                obj.property["flex-shrink"] = "-webkit-flex-shrink";
            }
            return obj;
        },
        "flex-basis": function () {
            var obj = { property: {}, value: {} };
            if ("flexBasis" in document.documentElement.style) {
                obj = null;
            } else if ("msFlexBasis" in document.documentElement.style) {
                obj.property["flex-basis"] = "-ms-flex-basis";
            } else if ("msFlexPreferredSize" in document.documentElement.style) {
                obj.property["flex-basis"] = "-ms-flex-preferred-size";
            } else if ("webkitFlexBasis" in document.documentElement.style) {
                obj.property["flex-basis"] = "-webkit-flex-basis";
            }
            return obj;
        }
    };

    // Translate a standard CSS property name to the prefixed version, if one is necessary
    // Uses feature detection
    export function translateCSSProperty(propertyName) {
        var translation = Helper.cssTranslations[propertyName]();
        if (!translation || !translation.property[propertyName]) {
            return propertyName;
        }
        return translation.property[propertyName];
    };

    // Translate a standard CSS property value to the prefixed version, if one is necessary
    // Uses feature detection
    export function translateCSSValue(propertyName, value) {
        var translation = Helper.cssTranslations[propertyName]();
        if (!translation || !translation.value[value]) {
            return value;
        }
        return translation.value[value];
    };

    // Some browsers (firefox) don't store the css property values in the root property name
    // For example flex: 1 1 auto; will not set the "flex" style attribute but instead the 3
    // sub attributes: flex-grow, flex-shrink, and flex-basis. This helper takes a property name
    // and re-builds the expected value out of the sub style components, which works in all supported
    // browsers.
    // Please add to the list of supported properties in this method as necessary.
    export function getCSSPropertyValue(styleObject, propertyName) {
        if (propertyName === "flex") {
            var shrink = styleObject.getPropertyValue(Helper.translateCSSProperty("flex-grow"));
            var grow = styleObject.getPropertyValue(Helper.translateCSSProperty("flex-shrink"));
            var basis = styleObject.getPropertyValue(Helper.translateCSSProperty("flex-basis"));
            return grow + " " + shrink + " " + basis;
        }
        return styleObject.getPropertyValue(Helper.translateCSSProperty(propertyName));
    };

    // Rounds *n* such that it has at most *decimalPoints* digits after the decimal point.
    export function round(n, decimalPoints) {
        return Math.round(n * Math.pow(10, decimalPoints)) / Math.pow(10, decimalPoints);
    };

    // Very fast method to generate a random number from a seed
    // https://software.intel.com/en-us/articles/fast-random-number-generator-on-the-intel-pentiumr-4-processor
    var fastRandSeed = 0;
    export function fastRand(seed) {
        if (typeof seed !== 'undefined') {
            fastRandSeed = seed;
        }
        fastRandSeed = 214013 * fastRandSeed + 2531011;

        // This mod is necessary because js treats all numbers as floats and won't overflow
        // the seed when this algorithm expects it to
        // Fast bitwise mod using a power of 2 found here:
        // http://stackoverflow.com/questions/6572670/other-ways-of-performing-modulo-operation
        fastRandSeed = (fastRandSeed & ((1 << 31) - 1)) >>> 0;
        return (fastRandSeed >> 16) & 0x7fff;
    };

    // Returns a random integer less than the given number
    export function getRandomNumberUpto(num) {
        return Math.floor(Math.random() * num);
    };

    // Returns a random item from the given array or binding list
    export function getRandomItem(array) {
        var randomIndex = Helper.getRandomNumberUpto(array.length);
        if (array instanceof Array) {
            return array[randomIndex];
        } else {
            return array.getAt(randomIndex);
        }
    };

    export function enableStyleSheets(suffix) {
        for (var i = 0; i < document.styleSheets.length; i++) {
            var sheet = document.styleSheets[i];
            if (sheet.href && Helper.endsWith(sheet.href, suffix)) {
                sheet.disabled = false;
            }
        }
    };

    export function disableStyleSheets(suffix) {
        for (var i = 0; i < document.styleSheets.length; i++) {
            var sheet = document.styleSheets[i];
            if (sheet.href && Helper.endsWith(sheet.href, suffix)) {
                sheet.disabled = true;
            }
        }
    };

    // Parses an rgb/rgba string as returned by getComputedStyle. For example:
    // Input: "rgb(10, 24, 215)"
    // Output: [10, 24, 215, 1.0]
    // Input: "rgba(10, 24, 215, 0.25)"
    // Output: [10, 24, 215, 0.25]
    // Special cases the color "transparent" which IE returns when no color is specified:
    // Input: "transparent"
    // Output: [0, 0, 0, 0.0]
    export function parseColor(colorString) {
        if (colorString === "transparent") {
            return [0, 0, 0, 0.0];
        } else if (colorString.indexOf("rgb") !== 0) {
            throw "Expected a CSS rgb string but found: " + colorString;
        }
        var start = colorString.indexOf("(") + 1;
        var end = colorString.indexOf(")");
        var nums = colorString.substring(start, end).split(",");
        return [
            parseInt(nums[0].trim(), 10),
            parseInt(nums[1].trim(), 10),
            parseInt(nums[2].trim(), 10),
            nums.length < 4 ? 1.0 : parseFloat(nums[3].trim())
        ];
    };

    function normalizedCssValue(attributeName, value) {
        var div = document.createElement("div");
        document.body.appendChild(div);

        div.style[attributeName] = value;
        var normalizedValue = getComputedStyle(div)[attributeName];

        document.body.removeChild(div);
        return normalizedValue;
    }

    function makeNormalizedCssValueAssertion(assertionFunction, attributeName) {
        return function (expected, actual, message?) {
            assertionFunction(
                normalizedCssValue(attributeName, expected),
                normalizedCssValue(attributeName, actual),
                message
                );
        };
    }

    export module Assert {
        export function areArraysEqual(expectedArray, actualArray, message) {
            if (!Array.isArray(expectedArray) || !(Array.isArray(actualArray))) {
                LiveUnit.Assert.fail(message);
            }

            if (expectedArray === actualArray) {
                return;
            }

            LiveUnit.Assert.areEqual(expectedArray.length, actualArray.length, message);

            for (var i = 0; i < expectedArray.length; i++) {
                LiveUnit.Assert.areEqual(expectedArray[i], actualArray[i], message);
            }
        }

        export function areSetsEqual(expectedArray, actualArray, message) {
            var expected = expectedArray.slice().sort();
            var actual = actualArray.slice().sort();
            Helper.Assert.areArraysEqual(expected, actual, message);
        }

        // Verifies CSS colors. *expectedColorString* and *actualColorString* are color strings of the form
        // returned by getComputedStyle. Specifically, they can look like this:
        // - "rgb(10, 24, 215)"
        // - "rgba(10, 24, 215, 0.25)"
        export function areColorsEqual(expectedColorString, actualColorString, message?) {
            var expectedColor = Helper.parseColor(expectedColorString);
            var actualColor = Helper.parseColor(actualColorString);
            // Verify red, green, blue
            Helper.Assert.areArraysEqual(expectedColor.slice(0, 3), actualColor.slice(0, 3), message);
            // Verify alpha with a tolerance of 0.05
            LiveUnit.Assert.isTrue(Math.abs(expectedColor[3] - actualColor[3]) <= .05, message);
        }

        // Verifies CSS urls. *expectedUrl* and *actualUrl* are expected to be valid CSS rules. For example,
        // url("foo.png").
        export var areUrlsEqual = makeNormalizedCssValueAssertion(LiveUnit.Assert.areEqual.bind(LiveUnit.Assert), "backgroundImage");

        export var areFontFamiliesEqual = makeNormalizedCssValueAssertion(LiveUnit.Assert.areEqual.bind(LiveUnit.Assert), "fontFamily");
        export var areFontFamiliesNotEqual = makeNormalizedCssValueAssertion(LiveUnit.Assert.areNotEqual.bind(LiveUnit.Assert), "fontFamily");

        export function areFloatsEqual(expectedValue, actualValue, message = "", tolerance = 0.1) {
            var diff = Math.abs(expectedValue - actualValue);
            LiveUnit.Assert.isTrue(diff <= tolerance, message + " (expected = " + expectedValue +
                ", actual = " + actualValue + ", tolerance = " + tolerance + ")");
        }

        export function areBoundingClientRectsEqual(expectedBoundingRect, actualBoundingRect, message = "", tolerance = 0.1) {
            for (var key in expectedBoundingRect) {
                var expectedValue = expectedBoundingRect[key],
                    actualValue = actualBoundingRect[key],
                    msg = message + " >> BoundingClientRect. " + key + ":";
                Helper.Assert.areFloatsEqual(expectedValue, actualValue, msg, tolerance);
            }
        }

        // Asserts that each key of *object* is a member of *validKeys*.
        export function areKeysValid(object, validKeys) {
            Object.keys(object).forEach(function (key) {
                LiveUnit.Assert.areNotEqual(-1, validKeys.indexOf(key),
                    "Test provided invalid key: " + key + ". Valid properties are: " + validKeys.join(", "));
            });
        }
    }

    export module Browser {
        // Taken from ListView's CSS grid feature detection
        export var supportsCSSGrid = !!("-ms-grid-row" in document.documentElement.style);

        // Temporary for disabling tests outside of IE11
        export var isIE11 = "PointerEvent" in window;
        export var isIE10 = navigator.appVersion.indexOf("MSIE 10") !== -1;
    };

    // Returns the group key for an item as defined by createData() below
    export function groupKey(item) {
        var groupIndex = Math.floor(item.data ? (item.data.index / 10) : (item.index / 10));
        return groupIndex.toString();
    };

    // Returns the group data for an item as defined by createData() below
    export function groupData(item) {
        var groupIndex = Math.floor(item.data ? (item.data.index / 10) : (item.index / 10));
        var groupData = {
            title: "group" + groupIndex,
            index: groupIndex,
            itemWidth: "150px",
            itemHeight: "150px"
        };
        return groupData;
    };

    // Creates an array with data item objects
    export function createData(size) {
        var data = [];
        for (var i = 0; i < size; i++) {
            data.push({ title: "title" + i, index: i, itemWidth: "100px", itemHeight: "100px" });
        }
        return data;
    };

    // Creates a binding list out of the provided array (data) or
    // creates a new data array of specified size
    export function createBindingList(size, data?) {
        return (data ? new WinJS.Binding.List(data) : new WinJS.Binding.List(Helper.createData(size)));
    };

    // Creates a VDS out of the provided array (data) or
    // creates a new data array of specified size
    export function createTestDataSource(size, data?, isSynchronous = true) {
        // Populate a data array
        if (!data) {
            data = Helper.createData(size);
        }

        // Create the datasource
        var controller = {
            directivesForMethod: function (method) {
                return {
                    callMethodSynchronously: isSynchronous,
                    delay: isSynchronous ? undefined : 0,
                    sendChangeNotifications: true,
                    countBeforeDelta: 0,
                    countAfterDelta: 0,
                    countBeforeOverride: -1,
                    countAfterOverride: -1
                };
            }
        };

        // Data adapter abilities
        var abilities = {
            itemsFromIndex: true,
            itemsFromKey: true,
            remove: true,
            getCount: true,
            setNotificationHandler: true
        };

        return Helper.ItemsManager.createTestDataSource(data, controller, abilities);
    };

    // Synchronous JS template for the data item created by createData() above
    export function syncJSTemplate(itemPromise) {
        return itemPromise.then(function (item) {
            var element = document.createElement("div");
            element.id = item.data.title;
            WinJS.Utilities.addClass(element, "syncJSTemplate");
            element.style.width = item.data.itemWidth;
            element.style.height = item.data.itemHeight;
            element.innerHTML = "<div>" + item.data.title + "</div>";
            return element;
        });
    };

    export function getOffsetRight(element) {
        return element.offsetParent.offsetWidth - element.offsetLeft - element.offsetWidth;
    };

    // Returns a promise which completes upon receiving a scroll event
    // from *element*.
    export function waitForScroll(element) {
        return new WinJS.Promise(function (c) {
            element.addEventListener("scroll", function onScroll() {
                element.removeEventListener("scroll", onScroll);
                c();
            });
        });
    };

    // Returns a promise which completes when *element* receives focus. When *includeDescendants* is true,
    // the promise completes when *element* or any of its descendants receives focus. *moveFocus* is a
    // callback which is expected to trigger the focus change that the caller is interested in.
    export function _waitForFocus(element, moveFocus, options) {
        options = options || {};
        var includeDescendants = options.includeDescendants;

        var p = new WinJS.Promise(function (complete) {
            element.addEventListener("focus", function focusHandler() {
                if (includeDescendants || document.activeElement === element) {
                    element.removeEventListener("focus", focusHandler, false);
                    complete();
                }
            }, true);
        });
        moveFocus();
        return p;
    };

    export function focus(element) {
        return Helper._waitForFocus(element, function () { element.focus(); }, {
            includeDescendants: false
        });
    };

    export function waitForFocus(element, moveFocus) {
        return Helper._waitForFocus(element, moveFocus, {
            includeDescendants: false
        });
    };

    export function waitForFocusWithin(element, moveFocus) {
        return Helper._waitForFocus(element, moveFocus, {
            includeDescendants: true
        });
    };

    // A wrapper around the browser's MouseEvent.initMouseEvent that turns the large argument list
    // into an options object to make function calls easier to understand.
    export function initMouseEvent(eventObject, type, options) {
        options = options || {};
        var canBubble = !!options.canBubble;
        var cancelable = !!options.cancelable;
        var view = options.view || window;
        var detail = options.detail || {};
        var clientX = options.clientX || 0;
        var clientY = options.clientY || 0;
        var screenX = typeof options.screenX === "number" ? options.screenX : window.screenLeft + clientX;
        var screenY = typeof options.screenY === "number" ? options.screenY : window.screenTop + clientY;
        var ctrlKey = !!options.ctrlKey;
        var altKey = !!options.altKey;
        var shiftKey = !!options.shiftKey;
        var metaKey = !!options.metaKey;
        var button = options.button || 0;
        var relatedTarget = options.relatedTarget || null;

        eventObject.initMouseEvent(type, canBubble, cancelable, view,
            detail, screenX, screenY, clientX, clientY,
            ctrlKey, altKey, shiftKey, metaKey,
            button, relatedTarget);
    };

    export function require(modulePath) {
        var module = null;
        WinJS.Utilities._require(modulePath, function (mod) {
            // WinJS.Utilities._require is guaranteed to be synchronous
            module = mod;
        });
        return module;
    };

    // Useful for disabling tests which were generated programmatically. Disables testName which
    // is part of the testObj tests. It's safest to call this function at the bottom of the
    // appropriate test file to ensure that the test has already been defined.
    //
    // Example usage: disableTest(WinJSTests.ConfigurationTests, "testDatasourceChange_incrementalGridLayout");
    export function disableTest(testObj, testName) {

        if (!testObj) {
            return;
        }

        var disabledName = "x" + testName;

        if (testObj.hasOwnProperty(testName)) {
            testObj[disabledName] = testObj[testName];
            delete testObj[testName];
        } else {
            disableTest(Object.getPrototypeOf(testObj), testName);
        }
    };
    
    export enum Browsers {
        ie10,
        ie11,
        edge,
        safari,
        chrome,
        firefox,
        android
    }
    
    export var BrowserCombos = {
        all:[
            Browsers.ie10,
            Browsers.ie11,
            Browsers.edge,
            Browsers.safari,
            Browsers.chrome,
            Browsers.firefox,
            Browsers.android
        ],
        allButIE:[
            Browsers.edge,
            Browsers.safari,
            Browsers.chrome,
            Browsers.firefox,
            Browsers.android
        ],
        onlyIE:[
            Browsers.ie10,
            Browsers.ie11
        ],
        allButIE11:[
            Browsers.ie10,
            Browsers.edge,
            Browsers.safari,
            Browsers.chrome,
            Browsers.firefox,
            Browsers.android
        ],
        allButIE10:[
            Browsers.ie11,
            Browsers.edge,
            Browsers.safari,
            Browsers.chrome,
            Browsers.firefox,
            Browsers.android
        ]
    }
    
    export function getCurrentBrowser(){
        if (bowser.msie && bowser.version === "10.0") {
            return Helper.Browsers.ie10;
        } else if (bowser.msie && bowser.version === "11.0") {
            return Helper.Browsers.ie11;
        } else if (bowser.chrome && !bowser.android) {
            return Helper.Browsers.chrome;
        } else if(bowser.safari) {
            return Helper.Browsers.safari;
        } else if (bowser.firefox) {
            return Helper.Browsers.firefox;
        } else if (bowser.android) {
            return Helper.Browsers.android;
        } else if (bowser.msedge) {
            return Helper.Browsers.edge;
        } else {
            throw new Error("Unrecognized Browser");
        }
    }
    
    // Useful for disabling tests in specific browsers. Disables any tests in testObj which 
    // are in the registry under the current browser.  Example usage:
    // 
    // disabledTestRegistry = {
    //     testButton: Helper.BrowserCombos.allButIE,
    //     testClick: [
    //         Helper.Browsers.safari,
    //         Helper.Browsers.chrome
    //     ],
    //     testTouch: [
    //          Helper.BrowserCombos.onlyIE,
    //          Helper.BrowserCombos.firefox
    //     ]
    // };

    // disableTests(TestClass, disabledTestRegistry);
    export function disableTests(testClass, registry) {
        
        if (!registry) {
            throw new Error("undefined registry in Helper.disableTests");
        }
        
        if (!testClass) {
            throw new Error("undefined testClass in Helper.disableTests");
        }
        
        function getDisabledTests(browser) {
            var testNames = Object.keys(registry);
            function shallowFlatten(list) {
                var flatList = [];
                for (var i = 0; i < list.length; i++) {
                    if (Array.isArray(list[i])) {
                        var nestedList = list[i];
                        for (var j = 0; j < nestedList.length; j++) {
                            flatList.push(nestedList[j]);
                        }
                    } else {
                        flatList.push(list[i]);
                    }
                }
                return flatList;
            }
             
            function ensureArray(obj) {
                if (!Array.isArray(obj)) {
                    obj = [obj];
                }
                return obj;
            }

            return testNames.filter(function (testName) {
                var disabledBrowsers = shallowFlatten(ensureArray(registry[testName]));
                return disabledBrowsers.indexOf(browser) !== -1;
            });
        }

        var disabledList = getDisabledTests(getCurrentBrowser());
        var proto = testClass.prototype;
        
        // Create instance of test class to access methods defined in constructor
        var testInst = new testClass();
        var testKeys = Object.keys(proto).concat(Object.keys(testInst));

        for (var i = 0; i < testKeys.length; i++) {
            var testKey = testKeys[i];
            var index = disabledList.indexOf(testKey);
            if (index !== -1) {
                disabledList.splice(index, 1);
                var disabledName = "x" + testKey;
                proto[disabledName] = proto[testKey];
                delete proto[testKey];
     
                // Create a property with the disabled test name that will not be overwritten
                // by properties created in the test class' constructor when an instance
                // of the class is created
                Object.defineProperty(proto, testKey, {
                    enumerable: false,
                    get: function(){
                        return undefined;
                    },
                    set: function (value){
                        //no-op
                    }
                });
            }
        }
        
        if (disabledList.length > 0) {
            var errorString = "Disabling non-existant test(s):";
            for (var i = 0; i < disabledList.length; i++) {
                errorString += disabledList[i] + " ";
            }
            throw new Error(errorString);
        }

    };

    // Useful for when you have a large number of configurations but don't want to
    // exhaustively test all unique combinations. This function takes an object that describes
    // all input parameters and their valid values, e.g.
    // { rtl: [true, false], layout:['list', 'grid'] }
    // and returns an array of objects that describe test cases for each unique
    // pair combination of inputs, e.g.
    // [ {rtl: true, layout: 'list'}, {rtl: true, layout: 'grid'}, ...]
    // The second argument provides an array of solutions that *must* be included in the output
    // more info: http://msdn.microsoft.com/en-us/library/cc150619.aspx
    export function pairwise(inputs, include?) {
        var results = [];
        var inputKeys = Object.keys(inputs);

        var combinations = [];

        // generate value combinations of all input values for each pair
        function generateUncovered(param1, param2) {
            var param1Inputs = inputs[param1];
            var param2Inputs = inputs[param2];
            var result = [];

            param1Inputs.forEach(function (value1) {
                param2Inputs.forEach(function (value2) {
                    result.push({
                        value1: value1,
                        value2: value2
                    });
                });
            });

            return result;
        }

        // when adding solutions to the results, simply remove them
        // from pending combinations after all slots are covered
        function addSolution(solution) {
            combinations = combinations.filter(function (combination) {
                combination.uncovered = combination.uncovered.filter(function (uncovered) {
                    if (solution[combination.param1] === uncovered.value1 && solution[combination.param2] === uncovered.value2) {
                        // remove combinations now covered
                        return false;
                    }
                    return true;
                });

                return combination.uncovered.length > 0;
            });

            results.push(solution);
        }

        for (var i = 0; i < inputKeys.length - 1; i++) {
            for (var j = i + 1; j < inputKeys.length; j++) {
                var param1 = inputKeys[i];
                var param2 = inputKeys[j];
                combinations.push({
                    param1: param1,
                    param2: param2,
                    uncovered: generateUncovered(param1, param2)
                });
            }
        }

        // mark any solutions passed in as covered
        if (Array.isArray(include)) {
            include.forEach(function (solution) {
                addSolution(solution);
            });
        }

        while (combinations.length) {
            // take first combination from pair with most uncovered slots
            var mostUncoveredPair = combinations.reduce(function (previous, current) {
                if (previous === null) {
                    return current;
                }

                if (previous.uncovered.length >= current.uncovered.length) {
                    return previous;
                } else {
                    return current;
                }
            });

            var solution = {};
            var combination = mostUncoveredPair.uncovered[0];
            solution[mostUncoveredPair.param1] = combination.value1;
            solution[mostUncoveredPair.param2] = combination.value2;

            // while not all parameters are in the solution yet
            var solutionKeys = Object.keys(solution);
            while (solutionKeys.length < inputKeys.length) {
                var candidates = [];

                // any uncovered parameter is a candidate
                inputKeys.forEach(function (param) {
                    if (solutionKeys.indexOf(param) === -1) {
                        inputs[param].forEach(function (value) {
                            candidates.push({
                                param: param,
                                value: value,
                                score: 0
                            });
                        });
                    }
                });

                var bestCandidate = candidates[0];

                var increment = function (param, value) {
                    candidates.some(function (candidate) {
                        if (candidate.param === param && candidate.value === value) {
                            candidate.score++;
                            if (candidate.score > bestCandidate.score) {
                                bestCandidate = candidate;
                            }
                            return true;
                        }
                    });
                };

                // find pairs that contain a parameter not in the solution
                combinations.forEach(function (combination) {
                    var hasParam1 = solutionKeys.indexOf(combination.param1) !== -1;
                    var hasParam2 = solutionKeys.indexOf(combination.param2) !== -1;

                    if (!hasParam1 || !hasParam2) {
                        // filter uncovered combinations consistent with existing inputs from these pairs
                        combination.uncovered.forEach(function (uncovered) {
                            if (hasParam1 && uncovered.value1 === solution[combination.param1]) {
                                increment(combination.param2, uncovered.value2);
                            } else if (hasParam2 && uncovered.value2 === solution[combination.param2]) {
                                increment(combination.param1, uncovered.value1);
                            } else {
                                increment(combination.param1, uncovered.value1);
                                increment(combination.param2, uncovered.value2);
                            }
                        });
                    }
                });

                // pick a value that satisfies the most of these combinations
                solution[bestCandidate.param] = bestCandidate.value;
                solutionKeys = Object.keys(solution);
            }

            // remove what is covered by the new solution
            addSolution(solution);
        }

        return results;
    }

    // a helper that allows JSON.stringify to handle recursive links in object graphs
    export function stringify(obj) {
        var str;
        try {
            var seenObjects = [];
            str = JSON.stringify(obj, function (key, value) {
                if (value === window) {
                    return "[window]";
                } else if (value instanceof HTMLElement) {
                    return "[HTMLElement]";
                } else if (typeof value === "function") {
                    return "[function]";
                } else if (typeof value === "object") {
                    if (value === null) {
                        return value;
                    } else if (seenObjects.indexOf(value) === -1) {
                        seenObjects.push(value);
                        return value;
                    } else {
                        return "[circular]";
                    }
                } else {
                    return value;
                }

            });
        } catch (err) {
            str = JSON.stringify("[object]");
        }
        return str;
    }

    // Removes the element if it has a parent
    export function removeElement(element: HTMLElement): void {
        var parent = element.parentNode;
        parent && parent.removeChild(element);
    }
}

module Helper {
    export module Promise {
        export function forEach<T>(array: Array<T>, asyncCallbackFn: (value?:T, index?, array?:Array<T>) => any): WinJS.Promise<any> {
            // Execute an asynchronous forEach loop over an array. The asynchronous forEach loop will apply the asyncCallbackFn parameter to subsequent values in the array parameter,
            // only after the Promise returned by applying asyncCallbackFn to the current value in the array has been completed.
            //
            // Returns a Promise that completes when all promises that were returned by applying asyncCallbackFn to every value in the array have been completed.
            var p = WinJS.Promise.as();
            array.forEach((value, index, array) => {
                p = p.then(() => {
                    return asyncCallbackFn(value, index, array);
                });

            });
            return p;
        }
    }
}
