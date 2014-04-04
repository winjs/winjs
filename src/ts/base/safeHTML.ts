// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
module WinJS {
    "use strict";

    export module Utilities {
        var global:any = self;

        export var setInnerHTML:(element: HTMLElement, text: string)=>void,
            setInnerHTMLUnsafe:(element: HTMLElement, text: string)=>void,
            setOuterHTML:(element: HTMLElement, text: string)=>void,
            setOuterHTMLUnsafe:(element: HTMLElement, text: string)=>void,
            insertAdjacentHTML:(element: HTMLElement, position: string, text: string)=>void,
            insertAdjacentHTMLUnsafe:(element: HTMLElement, position: string, text: string)=>void;

        var strings = {
            get nonStaticHTML() { return WinJS.Resources._getWinJSString("base/nonStaticHTML").value; },
        };

        setInnerHTML = setInnerHTMLUnsafe = function (element: HTMLElement, text: string) {
            /// <signature helpKeyword="WinJS.Utilities.setInnerHTML">
            /// <summary locid="WinJS.Utilities.setInnerHTML">
            /// Sets the innerHTML property of the specified element to the specified text.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.setInnerHTML_p:element">
            /// The element on which the innerHTML property is to be set.
            /// </param>
            /// <param name="text" type="String" locid="WinJS.Utilities.setInnerHTML_p:text">
            /// The value to be set to the innerHTML property.
            /// </param>
            /// </signature>
            element.innerHTML = text;
        };
        setOuterHTML = setOuterHTMLUnsafe = function (element: HTMLElement, text: string) {
            /// <signature helpKeyword="WinJS.Utilities.setOuterHTML">
            /// <summary locid="WinJS.Utilities.setOuterHTML">
            /// Sets the outerHTML property of the specified element to the specified text.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.setOuterHTML_p:element">
            /// The element on which the outerHTML property is to be set.
            /// </param>
            /// <param name="text" type="String" locid="WinJS.Utilities.setOuterHTML_p:text">
            /// The value to be set to the outerHTML property.
            /// </param>
            /// </signature>
            element.outerHTML = text;
        };
        insertAdjacentHTML = insertAdjacentHTMLUnsafe = function (element: HTMLElement, position: string, text: string) {
            /// <signature helpKeyword="WinJS.Utilities.insertAdjacentHTML">
            /// <summary locid="WinJS.Utilities.insertAdjacentHTML">
            /// Calls insertAdjacentHTML on the specified element.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.insertAdjacentHTML_p:element">
            /// The element on which insertAdjacentHTML is to be called.
            /// </param>
            /// <param name="position" type="String" locid="WinJS.Utilities.insertAdjacentHTML_p:position">
            /// The position relative to the element at which to insert the HTML.
            /// </param>
            /// <param name="text" type="String" locid="WinJS.Utilities.insertAdjacentHTML_p:text">
            /// The value to be provided to insertAdjacentHTML.
            /// </param>
            /// </signature>
            element.insertAdjacentHTML(position, text);
        };

        var msApp = global.MSApp;
        if (msApp) {
            setInnerHTMLUnsafe = function (element, text) {
                /// <signature helpKeyword="WinJS.Utilities.setInnerHTMLUnsafe">
                /// <summary locid="WinJS.Utilities.setInnerHTMLUnsafe">
                /// Sets the innerHTML property of the specified element to the specified text.
                /// </summary>
                /// <param name='element' type='HTMLElement' locid="WinJS.Utilities.setInnerHTMLUnsafe_p:element">
                /// The element on which the innerHTML property is to be set.
                /// </param>
                /// <param name='text' type="String" locid="WinJS.Utilities.setInnerHTMLUnsafe_p:text">
                /// The value to be set to the innerHTML property.
                /// </param>
                /// </signature>
                msApp.execUnsafeLocalFunction(function () {
                    element.innerHTML = text;
                });
            };
            setOuterHTMLUnsafe = function (element, text) {
                /// <signature helpKeyword="WinJS.Utilities.setOuterHTMLUnsafe">
                /// <summary locid="WinJS.Utilities.setOuterHTMLUnsafe">
                /// Sets the outerHTML property of the specified element to the specified text
                /// in the context of msWWA.execUnsafeLocalFunction.
                /// </summary>
                /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.setOuterHTMLUnsafe_p:element">
                /// The element on which the outerHTML property is to be set.
                /// </param>
                /// <param name="text" type="String" locid="WinJS.Utilities.setOuterHTMLUnsafe_p:text">
                /// The value to be set to the outerHTML property.
                /// </param>
                /// </signature>
                msApp.execUnsafeLocalFunction(function () {
                    element.outerHTML = text;
                });
            };
            insertAdjacentHTMLUnsafe = function (element, position, text) {
                /// <signature helpKeyword="WinJS.Utilities.insertAdjacentHTMLUnsafe">
                /// <summary locid="WinJS.Utilities.insertAdjacentHTMLUnsafe">
                /// Calls insertAdjacentHTML on the specified element in the context
                /// of msWWA.execUnsafeLocalFunction.
                /// </summary>
                /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.insertAdjacentHTMLUnsafe_p:element">
                /// The element on which insertAdjacentHTML is to be called.
                /// </param>
                /// <param name="position" type="String" locid="WinJS.Utilities.insertAdjacentHTMLUnsafe_p:position">
                /// The position relative to the element at which to insert the HTML.
                /// </param>
                /// <param name="text" type="String" locid="WinJS.Utilities.insertAdjacentHTMLUnsafe_p:text">
                /// Value to be provided to insertAdjacentHTML.
                /// </param>
                /// </signature>
                msApp.execUnsafeLocalFunction(function () {
                    element.insertAdjacentHTML(position, text);
                });
            };
        }
        else if (global.msIsStaticHTML) {
            var check = function (str) {
                if (!global.msIsStaticHTML(str)) {
                    throw new WinJS.ErrorFromName("WinJS.Utitilies.NonStaticHTML", strings.nonStaticHTML);
                }
            }
            // If we ever get isStaticHTML we can attempt to recreate the behavior we have in the local
            // compartment, in the mean-time all we can do is sanitize the input.
            //
            setInnerHTML = function (element: HTMLElement, text: string) {
                /// <signature helpKeyword="WinJS.Utilities.setInnerHTML">
                /// <summary locid="WinJS.Utilities.msIsStaticHTML.setInnerHTML">
                /// Sets the innerHTML property of a element to the specified text
                /// if it passes a msIsStaticHTML check.
                /// </summary>
                /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.msIsStaticHTML.setInnerHTML_p:element">
                /// The element on which the innerHTML property is to be set.
                /// </param>
                /// <param name="text" type="String" locid="WinJS.Utilities.msIsStaticHTML.setInnerHTML_p:text">
                /// The value to be set to the innerHTML property.
                /// </param>
                /// </signature>
                check(text);
                element.innerHTML = text;
            };
            setOuterHTML = function (element: HTMLElement, text: string) {
                /// <signature helpKeyword="WinJS.Utilities.setOuterHTML">
                /// <summary locid="WinJS.Utilities.msIsStaticHTML.setOuterHTML">
                /// Sets the outerHTML property of a element to the specified text
                /// if it passes a msIsStaticHTML check.
                /// </summary>
                /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.msIsStaticHTML.setOuterHTML_p:element">
                /// The element on which the outerHTML property is to be set.
                /// </param>
                /// <param name="text" type="String" locid="WinJS.Utilities.msIsStaticHTML.setOuterHTML_p:text">
                /// The value to be set to the outerHTML property.
                /// </param>
                /// </signature>
                check(text);
                element.outerHTML = text;
            };
            insertAdjacentHTML = function (element: HTMLElement, position: string, text: string) {
                /// <signature helpKeyword="WinJS.Utilities.insertAdjacentHTML">
                /// <summary locid="WinJS.Utilities.msIsStaticHTML.insertAdjacentHTML">
                /// Calls insertAdjacentHTML on the element if it passes
                /// a msIsStaticHTML check.
                /// </summary>
                /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.msIsStaticHTML.insertAdjacentHTML_p:element">
                /// The element on which insertAdjacentHTML is to be called.
                /// </param>
                /// <param name="position" type="String" locid="WinJS.Utilities.msIsStaticHTML.insertAdjacentHTML_p:position">
                /// The position relative to the element at which to insert the HTML.
                /// </param>
                /// <param name="text" type="String" locid="WinJS.Utilities.msIsStaticHTML.insertAdjacentHTML_p:text">
                /// The value to be provided to insertAdjacentHTML.
                /// </param>
                /// </signature>
                check(text);
                element.insertAdjacentHTML(position, text);
            };
        }
    }

}