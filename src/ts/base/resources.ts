// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
module WinJS {
    "use strict";

    var contextChangedET = "contextchanged";

    export module Resources {

        var global:any = self;

        var resourceMap;
        var mrtEventHook = false;
        
        var resourceContext;
        var getStringImpl;

        var ListenerType = WinJS.Class.mix(WinJS.Class.define(null, { /* empty */ }, { supportedForProcessing: false }), WinJS.Utilities.eventMixin);
        var listeners = new ListenerType();

        var strings = {
            get malformedFormatStringInput() { return WinJS.Resources._getWinJSString("base/malformedFormatStringInput").value; },
        };

        export function addEventListener(type: "contextchanged", listener: (e: CustomEvent) => any);
        export function addEventListener(type:string, listener:EventListener, useCapture:boolean);
        export function addEventListener(type:string, listener:EventListener, useCapture:boolean) {
            /// <signature helpKeyword="WinJS.Resources.addEventListener">
            /// <summary locid="WinJS.Resources.addEventListener">
            /// Registers an event handler for the specified event.
            /// </summary>
            /// <param name='type' type="String" locid='WinJS.Resources.addEventListener_p:type'>
            /// The name of the event to handle.
            /// </param>
            /// <param name='listener' type="Function" locid='WinJS.Resources.addEventListener_p:listener'>
            /// The listener to invoke when the event gets raised.
            /// </param>
            /// <param name='useCapture' type="Boolean" locid='WinJS.Resources.addEventListener_p:useCapture'>
            /// Set to true to register the event handler for the capturing phase; set to false to register for the bubbling phase.
            /// </param>
            /// </signature>
            if (WinJS.Utilities.hasWinRT && !mrtEventHook) {
                if (type === contextChangedET) {
                    try {
                        var resContext = WinJS.Resources._getResourceContext();
                        if (resContext) {
                            resContext.qualifierValues.addEventListener("mapchanged", function (e) {
                                WinJS.Resources.dispatchEvent(contextChangedET, { qualifier: e.key, changed: e.target[e.key] });
                            }, false);

                        } else {
                            // The API can be called in the Background thread (web worker).
                            Windows.ApplicationModel.Resources.Core.ResourceManager.current.defaultContext.qualifierValues.addEventListener("mapchanged", function (e) {
                                WinJS.Resources.dispatchEvent(contextChangedET, { qualifier: e.key, changed: e.target[e.key] });
                            }, false);
                        }
                        mrtEventHook = true;
                    } catch (e) {
                    }
                }
            }
            listeners.addEventListener(type, listener, useCapture);
        }

        //function removeEventListener(type: "contextchanged", listener: (e: CustomEvent) => any);
        export var removeEventListener = listeners.removeEventListener.bind(listeners);

        //function dispatchEvent(type: "contextchanged", details);
        export var dispatchEvent = listeners.dispatchEvent.bind(listeners);

        export function _formatString(string:string, ...values:any[]):string {
            if(values.length) {
                string = string.replace(/({{)|(}})|{(\d+)}|({)|(})/g, function (unused, left, right, index, illegalLeft, illegalRight) {
                    if (illegalLeft || illegalRight) { throw WinJS.Resources._formatString(strings.malformedFormatStringInput, illegalLeft || illegalRight); }
                    return (left && "{") || (right && "}") || values[(index | 0)];
                });
            }
            return string;
        }

        export function _getStringWinRT(resourceId) {
            if (!resourceMap) {
                var mainResourceMap = Windows.ApplicationModel.Resources.Core.ResourceManager.current.mainResourceMap;
                try {
                    resourceMap = mainResourceMap.getSubtree('Resources');
                }
                catch (e) {
                }
                if (!resourceMap) {
                    resourceMap = mainResourceMap;
                }
            }

            var stringValue;
            var langValue;
            var resCandidate;
            try {
                var resContext = WinJS.Resources._getResourceContext();
                if (resContext) {
                    resCandidate = resourceMap.getValue(resourceId, resContext);
                } else {
                    resCandidate = resourceMap.getValue(resourceId);
                }

                if (resCandidate) {
                    stringValue = resCandidate.valueAsString;
                    if (stringValue === undefined) {
                        stringValue = resCandidate.toString();
                    }
                }
            }
            catch (e) { }

            if (!stringValue) {
                return { value: resourceId, empty: true };
            }

            try {
                langValue = resCandidate.getQualifierValue("Language");
            }
            catch (e) {
                return { value: stringValue };
            }

            return { value: stringValue, lang: langValue };
        }

        export function _getStringJS(resourceId) {
            var str = global.strings && global.strings[resourceId];
            if (typeof str === "string") {
                str = { value: str };
            }
            return str || { value: resourceId, empty: true };
        }

        export function _getResourceContext() {
            if (global.document) {
                if (!resourceContext) {
                    resourceContext = Windows.ApplicationModel.Resources.Core.ResourceContext.getForCurrentView();
                }
            }
            return resourceContext;
        }

        export function getString(resourceId:string);
        export function getString(resourceId:number);
        export function getString(resourceId:any) {
            /// <signature helpKeyword="WinJS.Resources.getString">
            /// <summary locid='WinJS.Resources.getString'>
            /// Retrieves the resource string that has the specified resource id.
            /// </summary>
            /// <param name='resourceId' type="Number" locid='WinJS.Resources.getString._p:resourceId'>
            /// The resource id of the string to retrieve.
            /// </param>
            /// <returns type='Object' locid='WinJS.Resources.getString_returnValue'>
            /// An object that can contain these properties:
            /// 
            /// value:
            /// The value of the requested string. This property is always present.
            /// 
            /// empty:
            /// A value that specifies whether the requested string wasn't found.
            /// If its true, the string wasn't found. If its false or undefined,
            /// the requested string was found.
            /// 
            /// lang:
            /// The language of the string, if specified. This property is only present
            /// for multi-language resources.
            /// 
            /// </returns>
            /// </signature>
            getStringImpl =
                getStringImpl ||
                    (WinJS.Utilities.hasWinRT
                        ? WinJS.Resources._getStringWinRT
                        : WinJS.Resources._getStringJS);

            return getStringImpl(resourceId);
        };
        
    }

    declare var oncontextchanged: (e: CustomEvent) => any;
    Object.defineProperties(WinJS.Resources, WinJS.Utilities.createEventProperties(contextChangedET));
}