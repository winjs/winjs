// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
module WinJS {
    "use strict";

    export module Utilities {

        export function markDisposable (element: HTMLElement, disposeImpl?:Function) {
            /// <signature helpKeyword="WinJS.Utilities.markDisposable">
            /// <summary locid="WinJS.Utilities.markDisposable">
            /// Adds the specified dispose implementation to the specified element and marks it as disposable.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.markDisposable_p:element">
            /// The element to mark as disposable.
            /// </param>
            /// <param name="disposeImpl" type="Function" locid="WinJS.Utilities.markDisposable_p:disposeImpl">
            /// The function containing the element-specific dispose logic that will be called by the dispose function.
            /// </param>
            /// </signature>
            var disposed = false;
            WinJS.Utilities.addClass(element, "win-disposable");

            var disposable = element.winControl || element;
            disposable.dispose = function () {
                if (disposed) {
                    return;
                }

                disposed = true;
                WinJS.Utilities.disposeSubTree(element);
                if (disposeImpl) {
                    disposeImpl();
                }
            };
        }

        export interface IDisposable extends HTMLElement {
            winControl?: IDisposable;
            dispose?: ()=>void;
        }

        export function disposeSubTree(element:HTMLElement) {
            /// <signature helpKeyword="WinJS.Utilities.disposeSubTree">
            /// <summary locid="WinJS.Utilities.disposeSubTree">
            /// Disposes all first-generation disposable elements that are descendents of the specified element.
            /// The specified element itself is not disposed.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.disposeSubTree_p:element">
            /// The root element whose sub-tree is to be disposed.
            /// </param>
            /// </signature>
            if (!element) {
                return;
            }
            
            WinJS.Utilities._writeProfilerMark("WinJS.Utilities.disposeSubTree,StartTM");
            var query = element.querySelectorAll(".win-disposable");

            var index = 0;
            var length = query.length;
            while (index < length) {
                var disposable:IDisposable = <any>query[index];
                if (disposable.winControl && disposable.winControl.dispose) {
                    disposable.winControl.dispose();
                }
                if (disposable.dispose) {
                    disposable.dispose();
                }

                // Skip over disposable's descendants since they are this disposable's responsibility to clean up.
                index += disposable.querySelectorAll(".win-disposable").length + 1;
            }
            WinJS.Utilities._writeProfilerMark("WinJS.Utilities.disposeSubTree,StopTM");
        }

        export function _disposeElement(element:IDisposable) {
            // This helper should only be used for supporting dispose scenarios predating the dispose pattern.
            // The specified element should be well enough defined so we don't have to check whether it
            // a) has a disposable winControl,
            // b) is disposable itself,
            // or has disposable descendants in which case either a) or b) must have been true when designed correctly.
            if (!element) {
                return;
            }

            var disposed = false;
            if (element.winControl && element.winControl.dispose) {
                element.winControl.dispose();
                disposed = true;
            }
            if (element.dispose) {
                element.dispose();
                disposed = true;
            }

            if (!disposed) {
                WinJS.Utilities.disposeSubTree(element);
            }
        }
    }
}
