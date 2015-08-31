// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="../../typings/typings.d.ts" />
/// <reference path="../TestLib/liveToQ/liveToQ.d.ts" />
/// <reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {

    //var _ElementResizeInstrument = <typeof WinJS.Utilities._ElementResizeInstrument> Helper.require("WinJS/Utilities/ElementResizeInstrument");
    var _ElementResizeInstrument = <typeof WinJS.Utilities._ElementResizeInstrument>WinJS.UI['_ElementResizeInstrument'];

    function disposeAndRemoveElement(element: HTMLElement) {
        if (element.winControl) {
            element.winControl.dispose();
        }
        WinJS.Utilities.disposeSubTree(element);
        if (element.parentElement) {
            element.parentElement.removeChild(element);
        }
    }

    function useSynchronousResizeEventHandling(instrument: WinJS.Utilities._ElementResizeInstrument) {
        // Remove delay for batching edits, and render changes synchronously.
        instrument._batchResizeEvents = (handleResizeFn) => {
            handleResizeFn();
        }
    }

    export class ElementResizeInstrumentTests {
        "use strict";

        //unhandledTestError(msg) {
        //    try {
        //        LiveUnit.Assert.fail("unhandled test exception: " + msg);
        //    } catch (ex) {
        //        // don't rethrow assertion failure exception
        //    }
        //}

        _element: HTMLElement;
        _parentEl: HTMLElement;
        _childEl: HTMLElement;
        _parentResizeInstrument: WinJS.Utilities._ElementResizeInstrument;
        _childResizeInstrument: WinJS.Utilities._ElementResizeInstrument;

        setUp() {
            this._element = document.createElement("DIV");
            this._parentEl = document.createElement("DIV");
            this._childEl = document.createElement("DIV");

            this._parentEl.appendChild(this._childEl);
            this._element.appendChild(this._parentEl);
            document.body.appendChild(this._element);

            this._element.setAttribute("style", "position: relative; height: 800px; width: 800px;");

            var parentStyleText = "position: relative; width: 65%; maxWidth: inherit; minWidth: inherit; height: 65%; maxHeight: inherit; minHeight: inherit; padding: 0px;";
            var childStyleText = parentStyleText;

            this._parentEl.setAttribute("style", parentStyleText);
            this._parentResizeInstrument = new _ElementResizeInstrument();
            this._parentEl.appendChild(this._parentResizeInstrument.element);

            this._childEl.setAttribute("style", childStyleText);
            this._childResizeInstrument = new _ElementResizeInstrument();
            this._childEl.appendChild(this._childResizeInstrument.element);
        }

        tearDown() {
            if (this._element) {
                disposeAndRemoveElement(this._element)
                this._element = null;
                this._parentEl = null;
                this._childEl = null;
                this._parentResizeInstrument = null;
                this._childResizeInstrument = null;
            }
        }

        verifySynchronousChildResizeEvents() {
            // Verifies that resizing the child element only causes the child element resizeHandler to fire.

            // Helper function requires resize events to be handled synchronously
            useSynchronousResizeEventHandling(this._childResizeInstrument);
            useSynchronousResizeEventHandling(this._parentResizeInstrument);

            return new WinJS.Promise((c) => {

                function parentResizeHandler(): void {
                    LiveUnit.Assert.fail("Size changes to the child element should not trigger resize events in the parent element.");
                }
                var monitoringParent = this._parentResizeInstrument.monitorAncestor(parentResizeHandler);

                var childResizeHandled: boolean;
                function childResizeHandler(): void {
                    childResizeHandled = true;
                };
                var monitoringChild = this._childResizeInstrument.monitorAncestor(childResizeHandler);

                WinJS.Promise.join([monitoringChild, monitoringParent]).then(() => {

                    var childStyle = this._childEl.style;

                    // width
                    childResizeHandled = false;
                    childStyle.width = "50%";
                    LiveUnit.Assert.isTrue(childResizeHandled);

                    // height
                    // padding
                    // maxWidth
                    // maxHeight
                    // minWidth
                    // maxWidth

                    c();
                });
            });

        }

        testElementResize(complete) {
            this.verifySynchronousChildResizeEvents().then(() => {
                complete();
            })
        }

        testDispose() {

        }

        testRepeatMonitorings() {
            // Verify that calling monitor a second time with the a new function will stop firing the old function
        }


    }
}
LiveUnit.registerTestClass("CorsicaTests.ElementResizeInstrumentTests");