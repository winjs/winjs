// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//      Common Test Utilities for the WebControl test cases
//
//-----------------------------------------------------------------------------
"use strict";

function CommonUtils() {
}

CommonUtils.prototype = (function () {
    // Public methods
    // Please keep these in alphabetical order.
    // Please refrain from adding any LiveUnit.Assert's in this class.
    return {
        createPointerEvent: function() {
            // PointerEvent is already supported, so just use that
            if (window.PointerEvent) {
                var e = document.createEvent("PointerEvent");
                return e;
            }
            // Fallback to the ms prefix version from IE 10
            else if (window.MSPointerEvent) {
                var e = document.createEvent("MSPointerEvent");
                return e;
            }
            // Fallback to a mouse event
            else {
            }
        },

        initPointerEvent: function(e) {
            var args = Array.prototype.slice.call(arguments, 1);

            // PointerEvent is already supported, so just use that
            if (window.PointerEvent) {
                e.initPointerEvent.apply(e, args);
            }
            // Fallback to the ms prefix version from IE 10
            else if (window.MSPointerEvent) {

                // Camel case the "pointerevent" pattern and prefix with MS
                args[0] = args[0].replace(/pointer(.)/g, function(match, nextChar) {
                    return "MSPointer" + nextChar.toUpperCase();
                });

                e.initPointerEvent.apply(e, args);
            }
            // Fallback to a mouse event
            else {
            }
        },

        addCss: function CommonUtils_addCss(cssFileName, local) {
            /// <summary>
            ///     Load CSS from a file into the DOM.
            /// </summary>
            /// <param name="cssFileName" type="string">
            ///     Name of the CSS file to load.
            /// </param>
            /// <param name="cssFileName" type="string">
            ///     A promise that is fulfilled when the CSS has been added and loaded successfully. The promise yields
            ///     the <link> element that was added to document.head.
            /// </param>
            /// <returns type="boolean"/>

            var fullName = null;
            if (typeof (WebUnit) === 'undefined' && !local) {
                // Don't use getPath, since that returns the "file:" location and we want the "http:" location in order to enable our tests in WWA's.
                fullName = this.getCSSFromServer(cssFileName);
            }
            else {
                fullName = cssFileName;
            }
            var s = document.createElement("link");
            s.setAttribute("rel", "stylesheet");
            s.setAttribute("href", fullName);
            document.head.appendChild(s);

            return this.waitForCSSFile(cssFileName).then(function () {
                return s;
            });
        },

        getCSSFromServer: function CommonUtils_getCSSFromServer(fileName) {
            /// <summary>
            ///     Gets the CSS filename from the server
            /// </summary>
            /// <param name="fileName" type="string">
            ///     Name of the CSS file to load.
            /// </param>
            /// <returns type="string"/>

            var resourcePath = "";
            for (var i = 0; i < document.styleSheets.length; i++) {
                var sheet = document.styleSheets[i];
                if (sheet.href && (sheet.href.indexOf("ui-light.css") >= 0 || sheet.href.indexOf("ui-dark.css") >= 0)) {
                    resourcePath = sheet.href;
                    break;
                }
            }
            var ToIndex = resourcePath.lastIndexOf("/"),
                cssPath = resourcePath.substring(0, ToIndex);

            cssPath = cssPath + "/" + fileName;
            return cssPath;
        },

        waitForCSSFile: function waitForCSSFile(cssFile, attempt) {
            attempt = attempt || 0;
            if (attempt > 50) {
                return WinJS.Promise.wrapError("Failed to load CSS File: " + cssFile);
            }

            for (var i = 0, len = document.styleSheets.length; i < len; i++) {
                try {
                    // Firefox sometimes crashes here if stylesheets are being accessed too soon after they have been added
                    var styleSheet = document.styleSheets[i];
                    if (this.endsWith(styleSheet.href, cssFile) && styleSheet.cssRules && styleSheet.cssRules.length > 0) {
                        return WinJS.Promise.wrap();
                    }
                }
                catch(e) {
                }
            }

            var that = this;
            return WinJS.Promise.timeout(50).then(function () {
                return waitForCSSFile.call(that, cssFile, attempt + 1);
            });
        },

        endsWith: function endsWith(s, suffix) {
            return s && s.substring(s.length - suffix.length) === suffix;
        },

        removeCss: function CommonUtils_removeCss(cssFileName) {
            /// <summary>
            ///     Remove CSS from the DOM.
            /// </summary>
            /// <param name="cssFileName" type="string">
            ///     Name of the CSS file to remove.
            /// </param>
            /// <returns type="boolean"/>

            // Strip off any path from the filename.
            var slash = cssFileName.lastIndexOf("/");
            if (slash >= 0) {
                cssFileName = cssFileName.substring(slash + 1);
            }

            var removed = false,
                cssSheets = document.styleSheets;
            for (var i = cssSheets.length - 1; i >= 0; i--) {
                if (cssSheets[i].href && (cssSheets[i].href.indexOf(cssFileName) > 0)) {
                    cssSheets[i].ownerNode.parentNode.removeChild(cssSheets[i].ownerNode);
                    LiveUnit.LoggingCore.logComment("Successfully removed CSS Stylesheet: " + cssFileName);
                    removed = true;
                    break;
                }
            }

            if (!removed) {
                LiveUnit.LoggingCore.logComment("Unable to removed CSS Stylesheet: " + cssFileName);
            }

            return removed;
        },

        addTag: function (tagName, tagId, attributes) {
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
            var tag = document.createElement(tagName);
            tag.style.position = "absolute";
            tag.style.left = tag.style.top = "0px";
            for (var a in attributes) {
                tag.setAttribute(a, attributes[a]);
            }
            tag.setAttribute("id", tagId);
            document.body.appendChild(tag);
        },

        getElementById: function (elementId) {
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
        },

        removeElementById: function (tagId) {
            /// <summary>
            ///  Remove an existing tag from the DOM
            /// </summary>
            /// <param name="tagId" type="string">
            ///  String specifying the tag to remove.
            /// </param>
            var tag = document.getElementById(tagId);
            if (!tag) { return; }
            LiveUnit.LoggingCore.logComment("Remove tag \"" + tagId + "\" from the DOM");
            return tag.parentNode.removeChild(tag);
        },

        getElementsByClassName: function CommonUtils_getElementsByClassName(classname, node) {
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
        },

        getIEInfo: function CommonUtils_getIEInfo() {
            /// <summary>
            ///     Output to Log the IE Document Mode and JScript version.
            /// </summary>

            LiveUnit.LoggingCore.logComment("IE Document Mode: " + document.documentMode);
            // Comment all code except for Logging IE Document mode
            // to make sure the test code can be executed in both IE & WWA
            // @cc_on;
            // LiveUnit.LoggingCore.logComment("JScript Version: " + @_jscript_version);
            // @cc_off;
        },

        getPath: function CommonUtils_getPath(fileName) {
            /// <summary>
            ///     Return full path to a file where latch is run.
            /// </summary>
            /// <param name="fileName" type="string">
            ///     File name to retrieve full path
            /// </param>
            /// <returns type="string"/>

            var projectPathRE = /.+projectUrl=(.+)\\.+$/;
            // Here's an example of what window.location contains: http://localhost:4000/LiveUnitSite/LiveUnitSuiteBuilder.aspx?projectUrl=D:\test\FlipperTests.liveunit
            // The regEx will parse that string and store just the local path "D:\test" into path[1] because of the parens in the regEx.
            var path = projectPathRE.exec(window.location);
            // path[1] should hold just the local path, path[0] would contain the full match which would be the whole string which is not what we want.
            var fullPath = path[1];
            if (fullPath) {
                fullPath += "\\" + fileName;
            }

            LiveUnit.LoggingCore.logComment("Full Path to CSS: " + fullPath);
            return fullPath;
        },

        getImagePathOnServer: function CommonUtils_getImagePathOnServer(fileName) {
            var scriptTags = document.getElementsByTagName('script'),
                folderName = scriptTags[4].getAttribute('src'),
                ToIndex = folderName.indexOf("/");

            folderName = folderName.substring(0, ToIndex);
            var imagePath = folderName + "\\SiteFiles\\" + fileName;

            return imagePath;
        },

        isArray: function CommonUtils_isArray(obj) {
            /// <summary>
            ///     Checks for given object is an array
            /// </summary>
            /// <param name="obj" type="Object">
            ///     Object to verify.
            /// </param>
            /// <returns type="boolean"/>

            if (Array.isArray) {
                return Array.isArray(obj);
            }
            else {
                return obj && !(obj.propertyIsEnumerable('length')) && typeof obj === 'object' && typeof obj.length === 'number';
            }
        },

        simpleArrayDataSource: function CommonUtils_simpleArrayDataSource(numItems) {
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
        },

        simpleArrayRenderer: function CommonUtils_simpleArrayRenderer(itemPromise) {
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
        },

        getOffsetRect: function (elem, includeFixedPositionedElements) {
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
        },

        getDeclaredStyleBySelector: function (selectorText) {
            /// <summary>
            ///  Get the styles actually declared in CSS for the given selector.
            /// </summary>
            /// <param name="selectorText" type="string">
            ///  Selector string to look up in styleSheets.
            /// </param>
            /// <returns type="object" />
            var style = {};

            LiveUnit.LoggingCore.logComment("getDeclaredStyleBySelector(" + selectorText + ")");

            for (var sheetNum in document.styleSheets) {
                if (!isNaN(sheetNum)) {
                    var sheet = document.styleSheets[sheetNum];
                    if (!sheet) {
                        continue;
                    }

                    // HTML standard specifies styleSheet object should have a cssRules attribute,
                    //  but current implementations of IE (even IE9) still call this attribute rules
                    //  To be future-proof, use cssRules if its declared, otherwise continue using
                    //  the existing IE-only "rules" attribute of the styleSheet.
                    var rules = sheet.cssRules ? sheet.cssRules : sheet.rules;
                    if (!rules) {
                        continue;
                    }

                    for (var i = 0; i < rules.length; ++i) {
                        var rule = rules[i];
                        if (-1 !== rule.selectorText.toLowerCase().indexOf(selectorText)) {
                            for (var s in rule.style) {
                                style[s] = rule.style[s];
                            }
                        }
                    }
                }
            }
            return style;
        },

        randomString: function (maxLength) {
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
        },

        getOptionsAsString: function (options) {
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
        },

        randomHTML: function (totalElements, returnString) {
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
        },

        getClientRect: function (elem) {
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
        },

        mouseOver: function (fromElement, toElement) {
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
        },

        mouseOverUsingMiP: function (fromElement, toElement) {
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
                event = this.createPointerEvent();
                // pointerType = 4 (mouse event)
                this.initPointerEvent(event, "pointerout", true, true, window, 0, 0, 0, 0, 0,
                    false, false, false, false, 0, null, 0, 0, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
                fromElement.dispatchEvent(event);
            }
            if (toElement) {
                var rect = this.getClientRect(toElement);

                event = this.createPointerEvent();
                // pointerType = 4 (mouse event)
                this.initPointerEvent(event, "pointerover", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                    false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 1, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
                toElement.dispatchEvent(event);

                event = this.createPointerEvent();
                // pointerType = 4 (mouse event)
                this.initPointerEvent(event, "pointermove", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                    false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 1, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
                toElement.dispatchEvent(event);
            }
        },

        mouseDown: function (element) {
            /// <summary>
            ///  Throw mousedown event from element.
            ///  This is simply for backwards compatibility for our tests.  This should be removed once our tests and dev code are updated to use MiP.
            /// </summary>
            /// <param name="element" type="object">
            ///  Handle to element to throw mousedown from
            /// </param>
            if (element) {
                var rect = this.getClientRect(element);

                var event = document.createEvent("MouseEvents");
                event.initUIEvent("mousedown", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                    false, false, false, false, 0, element)
                element.dispatchEvent(event);
            }
        },

        mouseDownUsingMiP: function (element) {
            /// <summary>
            ///  Throw mousedown event from element.
            /// </summary>
            /// <param name="element" type="object">
            ///  Handle to element to throw mousedown from
            /// </param>
            if (element) {
                var rect = this.getClientRect(element);

                var event = this.createPointerEvent();
                // pointerType = 4 (mouse event)
                this.initPointerEvent(event, "pointerdown", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                    false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 1, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
                element.dispatchEvent(event);
            }
        },

        mouseUp: function (element) {
            /// <summary>
            ///  Throw mouseup event from element.
            ///  This is simply for backwards compatibility for our tests.  This should be removed once our tests and dev code are updated to use MiP.
            /// </summary>
            /// <param name="element" type="object">
            ///  Handle to element to throw mouseup from
            /// </param>
            if (element) {
                var rect = this.getClientRect(element);

                var event = document.createEvent("MouseEvents");
                event.initUIEvent("mouseup", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                    false, false, false, false, 0, element)
                element.dispatchEvent(event);
            }
        },

        mouseUpUsingMiP: function (element) {
            /// <summary>
            ///  Throw mouseup event from element.
            /// </summary>
            /// <param name="element" type="object">
            ///  Handle to element to throw mouseup from
            /// </param>
            if (element) {
                var rect = this.getClientRect(element);

                var event = this.createPointerEvent();
                // pointerType = 4 (mouse event)
                this.initPointerEvent(event, "pointerup", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                    false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 1, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
                element.dispatchEvent(event);
            }
        },

        click: function (element) {
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
        },

        clickUsingMiP: function (element) {
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
        },

        generateClickEventsUsingMiP: function (element) {
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

                event = this.createPointerEvent();
                // pointerType = 4 (mouse event)
                this.initPointerEvent(event, "pointerdown", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                    false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 1, (event.MSPOINTER_TYPE_MOUSE || "mouse"), 0, true);
                events[events.length] = event;

                event = this.createPointerEvent();
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
        },

        touchCancel: function (element) {
            /// <summary>
            ///  Throw touch MSPointerCancel event from element.
            /// </summary>
            /// <param name="element" type="object">
            ///  Handle to element to throw MSPointerCancel from
            /// </param>
            if (element) {
                var rect = this.getClientRect(element);

                var event = this.createPointerEvent();
                // pointerType = 2 (touch event)
                this.initPointerEvent(event, "pointercancel", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                    false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
                element.dispatchEvent(event);
            }
        },

        touchOver: function (fromElement, toElement) {
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

                event = this.createPointerEvent();
                // pointerType = 2 (touch event)
                this.initPointerEvent(event, "pointerout", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                    false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
                fromElement.dispatchEvent(event);
            }
            if (toElement) {
                rect = this.getClientRect(toElement);

                event = this.createPointerEvent();
                // pointerType = 2 (touch event)
                this.initPointerEvent(event, "pointerover", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                    false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
                toElement.dispatchEvent(event);

                event = this.createPointerEvent();
                // pointerType = 2 (touch event)
                this.initPointerEvent(event, "pointermove", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                    false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
                toElement.dispatchEvent(event);
            }
        },


        touchDown: function (element) {
            /// <summary>
            ///  Throw MSPointerDown event from element.
            /// </summary>
            /// <param name="element" type="object">
            ///  Handle to element to throw MSPointerDown from
            /// </param>
            if (element) {
                var rect = this.getClientRect(element);

                var event = this.createPointerEvent();
                // pointerType = 2 (touch event)
                this.initPointerEvent(event, "pointerdown", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y, // fake mouse coordinates
                    false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
                element.dispatchEvent(event);

                event = this.createPointerEvent();
                // pointerType = 2 (touch event)
                this.initPointerEvent(event, "pointermove", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                    false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
                element.dispatchEvent(event);
            }
        },

        touchUp: function (element) {
            /// <summary>
            ///  Throw MSPointerUp event from element.
            /// </summary>
            /// <param name="element" type="object">
            ///  Handle to element to throw MSPointerUp from
            /// </param>
            if (element) {
                var rect = this.getClientRect(element);

                var event = this.createPointerEvent();
                // pointerType = 2 (touch event)
                this.initPointerEvent(event, "pointermove", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                    false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
                element.dispatchEvent(event);

                event = this.createPointerEvent();
                // pointerType = 2 (touch event)
                this.initPointerEvent(event, "pointerup", true, true, window, 0,
                    window.screenLeft + rect.center.x, window.screenTop + rect.center.y, rect.center.x, rect.center.y,
                    false, false, false, false, 0, null, rect.width / 2, rect.height / 2, 0, 0, 0, 0, 0, 0, 0, (event.MSPOINTER_TYPE_TOUCH || "touch"), 0, true);
                element.dispatchEvent(event);
            }
        },

        tap: function (element) {
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
        },

        focus: function (element) {
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
        },

        blur: function (element) {
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
        },

        keydown: function (element, keyCode, locale) {
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
                var event = document.createEvent("CustomEvent");
                event.initCustomEvent("keydown", true, true, window, 0);
                event.keyCode = keyCode;
                event.locale = locale;
                element.dispatchEvent(event);
            }
        },

        keyup: function (element, keyCode, locale) {
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
                var event = document.createEvent("CustomEvent");
                event.initCustomEvent("keyup", true, true, window, 0);
                event.keyCode = keyCode;
                event.locale = locale;
                element.dispatchEvent(event);
            }
        },

        waitForEvent: function (element, eventName, action) {
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
    };
})();

window.CommonUtilities = new CommonUtils();
