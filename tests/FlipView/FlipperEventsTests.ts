// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>
/// <reference path="FlipperUtils.ts"/>
/// <reference path="../TestLib/TestDataSource.ts"/>


module WinJSTests {
    "use strict";

    var flipperUtils = FlipperUtils;
    var commonUtils = Helper;

    // This object stores validation information used to determine if the specific event test passed
    var eventValidationObject:any = {};

    // Events
    var pageVisibilityEvent = "pagevisibilitychanged";
    var datasourceCountChangedEvent = "datasourcecountchanged";
    var pageSelectedEvent = "pagecompleted";

    // Setup expected counts for events
    function setExpectedIteration(pageVisible, pageInvisible, pageSelected, datasourceCountChanged) {
        eventValidationObject.pageVisible.expectedIteration = pageVisible;
        eventValidationObject.pageInvisible.expectedIteration = pageInvisible;
        eventValidationObject.pageSelected.expectedIteration = pageSelected;
        eventValidationObject.datasourceCountChanged.eventCount = datasourceCountChanged;
    }

    export class EventTests  {

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            // Define and reset event test information to determine if the event test passed.
            eventValidationObject = {
                pageVisible: {
                    event: false,               // Set to true if pagevisibilitychanged event is detected for page that is visible.
                    pass: false,                // Set to true if the event contains correct information.
                    passId: false,              // Set to true if the event contains correct id (used for simpler validation).
                    iteration: 0,               // Incremented each time this event is fired.
                    expectedIteration: 0,       // Expected number of time this event is fired.
                    id: null                    // Expected element ID setup by test for the visible item.
                },
                pageInvisible: {
                    event: false,               // Set to true if pagevisibilitychanged event is detected for page that is visible.
                    pass: false,                // Set to true if the event contains correct information.
                    passId: false,              // Set to true if the event contains correct id (used for simpler validation).
                    iteration: 0,               // Incremented each time this event is fired.
                    expectedIteration: 0,       // Expected number of time this event is fired.
                    id: null                    // Expected element ID setup by test for the visible item.
                },
                pageSelected: {
                    event: false,               // Set to true if pagevisibilitychanged event is detected for page that is visible.
                    pass: false,                // Set to true if the event contains correct information.
                    passId: false,              // Set to true if the event contains correct id (used for simpler validation).
                    iteration: 0,               // Incremented each time this event is fired.
                    expectedIteration: 0,       // Expected number of time this event is fired.
                    id: null                    // Expected element ID setup by test for the visible item.
                },
                datasourceCountChanged: {
                    eventCount: 0,              // Incremented each time by test when an event should occur.
                    expectedIteration: 0,       // Expected number of time this event is fired.
                    callbackCount: 0            // Incremented each time by the event callback when event is actually fired.
                }
            };
            commonUtils.getIEInfo();
            // We want to recreate the flipper element between each test so we start fresh.
            flipperUtils.addFlipperDom();
        }


        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");

            // Remove event handlers
            var flipperDiv = document.getElementById(flipperUtils.basicFlipperID());

            flipperDiv.removeEventListener(pageVisibilityEvent, this.pageVisibilityEventHandler, false);
            flipperDiv.removeEventListener(datasourceCountChangedEvent, this.datasourceCountChangedEventHandler, false);
            flipperDiv.removeEventListener(pageSelectedEvent, this.pageselectedEventHandler, false);

            // We want to tear town the flipper element between each test so we start fresh.
            flipperUtils.removeFlipperDom();
        }

        //---------------------------------------------------------------------
        // Test Functions
        //---------------------------------------------------------------------

        //
        // Test: testFlipperEventsInstantiation
        //
        testFlipperEventsInstantiation(signalTestCaseCompleted) {
            setExpectedIteration(1,0,1,0);
            this.setVerifyPageVisibilityInfoObject(null, "page1");
            this.setVerifyPageSelectedInfoObject("page1");
            this.setEventHandlers(flipperUtils.basicFlipperID());
            var flipperDiv = document.getElementById(flipperUtils.basicFlipperID()),
                flipper;

            flipperDiv.addEventListener(pageSelectedEvent, LiveUnit.GetWrappedCallback((ev) => {
                this.verifyEventObject();
                signalTestCaseCompleted();
            }));
            flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());
        }

        //
        // Test: testFlipperEventsGetControl
        //
        testFlipperEventsGetControl(signalTestCaseCompleted) {
            setExpectedIteration(1,0,1,0);
            LiveUnit.LoggingCore.logComment("Attaching to an existing flipper object via getControl should not fire new events.");
            this.setVerifyPageVisibilityInfoObject(null, "page1");
            this.setVerifyPageSelectedInfoObject("page1");
            this.setEventHandlers(flipperUtils.basicFlipperID());
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());
            LiveUnit.Assert.isNotNull(flipper, "Flipper element should not be null when instantiated.");

            // Test getControl upon instantiated flipper - it should not fire new events.
            LiveUnit.LoggingCore.logComment("Attempt to attach to existing flipper object via getControl.");
            var flipper2 = document.getElementById(flipperUtils.basicFlipperID()).winControl;
            LiveUnit.Assert.isNotNull(flipper2, "Flipper2 element should not be null when instantiated.");

            // Need a setTimeout to confirm that events are not fired
            setTimeout(LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject();
                signalTestCaseCompleted();
            }), FlipperUtils.NAVIGATION_TIMEOUT);
        }

        testFlipperEventsChangeTemplate(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,0);
            this.setVerifyPageVisibilityInfoObject("page1", "page1");
            this.setVerifyPageSelectedInfoObject("page1");
            this.setEventHandlers(flipperUtils.basicFlipperID());
            var newClass = "newTemplate",
                flipper,
                flipperDiv = document.getElementById(flipperUtils.basicFlipperID()),
                verifyObject = { currentPage: 0, newID: "page1" };

            var newTemplate = function (itemPromise) {
                return itemPromise.then(function (item) {
                    var div = document.createElement("div");
                    div.setAttribute("id", item.data.id);
                    div.setAttribute("class", newClass);
                    div.style.width = item.data.width;
                    div.style.height = item.data.height;
                    div.textContent = item.data.content;
                    return div;
                });
            };

            var verify = LiveUnit.GetWrappedCallback(() => {
                flipper.removeEventListener(pageSelectedEvent, verify);

                flipper.addEventListener(pageSelectedEvent, LiveUnit.GetWrappedCallback(() => {
                    // Verify the new template
                    if (flipper) {
                        LiveUnit.LoggingCore.logComment("Flipper currentPage is: " + flipper.currentPage);
                        LiveUnit.Assert.isTrue(flipper.currentPage === verifyObject.currentPage,
                            "Flipper currentPage is not " + verifyObject.currentPage);

                        var element = flipper._pageManager._currentPage.element.firstElementChild;
                        LiveUnit.LoggingCore.logComment("currentPage.id: " + element.id);
                        LiveUnit.Assert.isTrue(element.id === verifyObject.newID,
                            "Flipper pageManager is not showing data at current position.");
                        LiveUnit.Assert.isTrue(element.className === newClass,
                            "Flipper item doesn't have the expected class applied to it.");
                    }
                    else {
                        LiveUnit.Assert.fail("Flipper is in a bad state");
                    }

                    // Verify events
                    this.verifyEventObject(true);
                    signalTestCaseCompleted();
                }));
                flipper.itemTemplate = newTemplate;
            });
            flipperDiv.addEventListener(pageSelectedEvent, verify);

            flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());
        }

        //
        // Test: testFlipperEventsFlipToNext
        //
        testFlipperEventsFlipToNext(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,0);
            this.setVerifyPageVisibilityInfoObject("page1", "page2");
            this.setVerifyPageSelectedInfoObject("page2");
            this.setEventHandlers(flipperUtils.basicFlipperID());
            var flipper,
                flipperDiv = document.getElementById(flipperUtils.basicFlipperID());

            var nextCompleted = LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject();
                signalTestCaseCompleted();
            });

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                if (!flipperUtils.ensureNext(flipper, nextCompleted)) {
                    LiveUnit.Assert.fail("Unable to flip to Next.");
                }
            });
            flipperDiv.addEventListener(pageSelectedEvent, verify);

            flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());
        }

        //
        // Test: testFlipperEventsFlipToPrevious
        //
        testFlipperEventsFlipToPrevious(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,0);
            this.setVerifyPageVisibilityInfoObject("page3", "page2");
            this.setVerifyPageSelectedInfoObject("page2");
            this.setEventHandlers(flipperUtils.basicFlipperID());
            var flipper,
                flipperDiv = document.getElementById(flipperUtils.basicFlipperID());

            var previousCompleted = LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject();
                signalTestCaseCompleted();
            });

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                if (!flipperUtils.ensurePrevious(flipper, previousCompleted)) {
                    LiveUnit.Assert.fail("Unable to flipToPrevious.");
                }
            });
            flipperDiv.addEventListener(pageSelectedEvent, verify);

            flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID(), { currentPage: 2 });
        }

        //
        // Test: testFlipperEventsFlipToPage via setting currentPage
        //
        testFlipperEventsFlipToPage(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,0);
            this.setVerifyPageVisibilityInfoObject("page1", "page6");
            this.setVerifyPageSelectedInfoObject("page6");
            this.setEventHandlers(flipperUtils.basicFlipperID());
            var flipper,
                flipperDiv = document.getElementById(flipperUtils.basicFlipperID());

            var currentPageCompleted = LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject();
                signalTestCaseCompleted();
            });

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                flipperUtils.ensureCurrentPage(flipper, 5, currentPageCompleted);
            });
            flipperDiv.addEventListener(pageSelectedEvent, verify);

            flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());
        }

        //
        // Test: testFlipperEventsFlipToSamePage via setting currentPage
        //
        testFlipperEventsFlipToSamePage(signalTestCaseCompleted) {
            setExpectedIteration(1, 0, 1, 0);
            this.setVerifyPageVisibilityInfoObject(null, "page1");
            this.setVerifyPageSelectedInfoObject("page1");
            this.setEventHandlers(flipperUtils.basicFlipperID());
            var flipper,
                flipperDiv = document.getElementById(flipperUtils.basicFlipperID());

            var currentPageEventFired = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, currentPageEventFired);

                var currentPage = flipper.currentPage;
                LiveUnit.LoggingCore.logComment("Attempting to flipToPage (same as current): " + currentPage);
                flipper.currentPage = currentPage;
            });
            flipperDiv.addEventListener(pageSelectedEvent, currentPageEventFired);

            flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());

            // Need a setTimeout as we need to confirm that events are not fired
            setTimeout(LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject();
                signalTestCaseCompleted();
            }), FlipperUtils.NAVIGATION_TIMEOUT);
        }

        //
        // Test: testFlipperEventsFlipToNextBorder
        //
        testFlipperEventsFlipToNextBorder(signalTestCaseCompleted) {
            setExpectedIteration(1, 0, 1, 0);
            this.setVerifyPageVisibilityInfoObject(null, "page7");
            this.setVerifyPageSelectedInfoObject("page7");
            this.setEventHandlers(flipperUtils.basicFlipperID());
            var flipper,
                flipperDiv = document.getElementById(flipperUtils.basicFlipperID());

            var nextCompleted = LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject();
                signalTestCaseCompleted();
            });

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                if (flipper.currentPage != 6) {
                    LiveUnit.Assert.fail("Unable to instantiate to last page to stage for border test");
                }
                flipperUtils.ensureNext(flipper, nextCompleted);
            });
            flipperDiv.addEventListener(pageSelectedEvent, verify);

            flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID(), { currentPage: 6 });
        }

        //
        // Test: testFlipperEventsFlipToPreviousBorder
        //
        testFlipperEventsFlipToPreviousBorder(signalTestCaseCompleted) {
            setExpectedIteration(1, 0, 1, 0);
            this.setVerifyPageVisibilityInfoObject(null, "page1");
            this.setVerifyPageSelectedInfoObject("page1");
            this.setEventHandlers(flipperUtils.basicFlipperID());
            var flipper,
                flipperDiv = document.getElementById(flipperUtils.basicFlipperID());

            var previousCompleted = LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject();
                signalTestCaseCompleted();
            });

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                flipperUtils.ensurePrevious(flipper, previousCompleted);
            });
            flipperDiv.addEventListener(pageSelectedEvent, verify);

            flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());
        }

        //
        // Test: testFlipperEventsInvalidFlipToPage via currentPage
        //
        testFlipperEventsInvalidFlipToPage(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,0);
            this.setVerifyPageVisibilityInfoObject("page1", "page7");
            this.setVerifyPageSelectedInfoObject("page7");
            this.setEventHandlers(flipperUtils.basicFlipperID());
            var flipper,
                flipperDiv = document.getElementById(flipperUtils.basicFlipperID()),
                page = 500;

            var currentPageCompleted = LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject();
                signalTestCaseCompleted();
            });

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                LiveUnit.LoggingCore.logComment("Attempt to set currentPage: " + page);
                flipperUtils.ensureCurrentPage(flipper, page, currentPageCompleted);
            });
            flipperDiv.addEventListener(pageSelectedEvent, verify);

            flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());
        }

        //
        // Test: testFlipperEventsInsertAtStart
        //
        testFlipperEventsInsertAtStart(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,1);
            this.setVerifyPageVisibilityInfoObject("Title0", "InsertAtStart");
            this.setVerifyPageSelectedInfoObject("InsertAtStart");
            var onSuccess = LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject(true);
                signalTestCaseCompleted();
            });
            var onError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Errors detected.");
                LiveUnit.Assert.fail(error);
            });
            flipperUtils.insertItem("InsertAtStart", onSuccess, onError, this.setEventHandlers);
        }

        //
        // Test: testFlipperEventsInsertAtEnd
        //
        testFlipperEventsInsertAtEnd(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,1);
            this.setVerifyPageVisibilityInfoObject("Title0", "InsertAtEnd");
            this.setVerifyPageSelectedInfoObject("InsertAtEnd");
            var onSuccess = LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject(true);
                signalTestCaseCompleted();
            });
            var onError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Errors detected.");
                LiveUnit.Assert.fail(error);
            });
            flipperUtils.insertItem("InsertAtEnd", onSuccess, onError, this.setEventHandlers);
        }

        //
        // Test: testFlipperEventsInsertBefore
        //
        testFlipperEventsInsertBefore(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,1);
            this.setVerifyPageVisibilityInfoObject("Title0", "InsertBefore");
            this.setVerifyPageSelectedInfoObject("InsertBefore");
            var onSuccess = LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject(true);
                signalTestCaseCompleted();
            });
            var onError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Errors detected.");
                LiveUnit.Assert.fail(error);
            });
            flipperUtils.insertItem("InsertBefore", onSuccess, onError, this.setEventHandlers);
        }

        //
        // Test: testFlipperEventsInsertAfter
        //
        testFlipperEventsInsertAfter(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,1);
            this.setVerifyPageVisibilityInfoObject("Title0", "InsertAfter");
            this.setVerifyPageSelectedInfoObject("InsertAfter");
            var onSuccess = LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject(true);
                signalTestCaseCompleted();
            });
            var onError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Errors detected.");
                LiveUnit.Assert.fail(error);
            });
            flipperUtils.insertItem("InsertAfter", onSuccess, onError, this.setEventHandlers);
        }

        //
        // Test: testFlipperEventsMoveToStart using array data source
        //
        testFlipperEventsMoveToStart(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,0);
            this.setVerifyPageVisibilityInfoObject("Title0", "Title5");
            this.setVerifyPageSelectedInfoObject("Title5");
            var onSuccess = LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject(true);
                signalTestCaseCompleted();
            });
            var onError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Errors detected.");
                LiveUnit.Assert.fail(error);
            });
            flipperUtils.moveItem("MoveToStart", onSuccess, onError, this.setEventHandlers);
        }

        //
        // Test: testFlipperEventsMoveToEnd using array data source
        //
        testFlipperEventsMoveToEnd(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,0);
            this.setVerifyPageVisibilityInfoObject("Title0", "Title5");
            this.setVerifyPageSelectedInfoObject("Title5");
            var onSuccess = LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject(true);
                signalTestCaseCompleted();
            });
            var onError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Errors detected.");
                LiveUnit.Assert.fail(error);
            });
            flipperUtils.moveItem("MoveToEnd", onSuccess, onError, this.setEventHandlers);
        }

        //
        // Test: testFlipperEventsMoveBefore using array data source
        //
        testFlipperEventsMoveBefore(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,0);
            this.setVerifyPageVisibilityInfoObject("Title0", "Title5");
            this.setVerifyPageSelectedInfoObject("Title5");
            var onSuccess = LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject(true);
                signalTestCaseCompleted();
            });
            var onError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Errors detected.");
                LiveUnit.Assert.fail(error);
            });
            flipperUtils.moveItem("MoveBefore", onSuccess, onError, this.setEventHandlers);
        }

        //
        // Test: testFlipperEventsMoveAfter using array data source
        //
        testFlipperEventsMoveAfter(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,0);
            this.setVerifyPageVisibilityInfoObject("Title0", "Title5");
            this.setVerifyPageSelectedInfoObject("Title5");
            var onSuccess = LiveUnit.GetWrappedCallback(() => {
                this.verifyEventObject(true);
                signalTestCaseCompleted();
            });
            var onError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Errors detected.");
                LiveUnit.Assert.fail(error);
            });
            flipperUtils.moveItem("MoveAfter", onSuccess, onError, this.setEventHandlers);
        }

        /* Disabling these tests as they have to be updated to account for the new event pagecompleted and change
         * 806940
        //
        // Test: testFlipperEventsRemoveFromStart using array data source
        //
        this.testFlipperEventsRemoveFromStart = function (signalTestCaseCompleted) {
            // As per BUG: 613122, pagevisibilitychanged visibility = false won't be fired for the deleted item
            setExpectedIteration(2,0,2,1);
            this.setVerifyPageVisibilityInfoObject(null, "Title1");
            this.setVerifyPageSelectedInfoObject("Title1");
            var onSuccess = LiveUnit.GetWrappedCallback(function() {
                eventTestsObject.verifyEventObject(true);
                signalTestCaseCompleted();
            });
            var onError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Errors detected.");
                LiveUnit.Assert.fail(error);
            });
            flipperUtils.removeItem("RemoveFromStart", onSuccess, onError, this.setEventHandlers);
        }

        //
        // Test: testFlipperEventsRemoveFromEnd using array data source
        //
        this.testFlipperEventsRemoveFromEnd = function(signalTestCaseCompleted) {
            setExpectedIteration(1,0,1,1);
            this.setVerifyPageVisibilityInfoObject(null, "Title0");
            this.setVerifyPageSelectedInfoObject("Title0");
            var onSuccess = LiveUnit.GetWrappedCallback(function() {
                eventTestsObject.verifyEventObject(true);
                signalTestCaseCompleted();
            });
            var onError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Errors detected.");
                LiveUnit.Assert.fail(error);
            });
            flipperUtils.removeItem("RemoveFromEnd", onSuccess, onError, this.setEventHandlers);
        }

        //
        // Test: testFlipperEventsRemoveFromMiddle using array data source
        //
        this.testFlipperEventsRemoveFromMiddle = function(signalTestCaseCompleted) {
            setExpectedIteration(1,0,1,1);
            this.setVerifyPageVisibilityInfoObject(null, "Title0");
            this.setVerifyPageSelectedInfoObject("Title0");
            var onSuccess = LiveUnit.GetWrappedCallback(function() {
                eventTestsObject.verifyEventObject(true);
                signalTestCaseCompleted();
            });
            var onError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Errors detected.");
                LiveUnit.Assert.fail(error);
            });
            flipperUtils.removeItem("RemoveFromMiddle", onSuccess, onError, this.setEventHandlers);
        }

        //
        // Test: testFlipperEventsChangeAtStart using array data source
        //
        this.testFlipperEventsChangeAtStart = function(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,0);
            this.setVerifyPageVisibilityInfoObject("Title0", "ChangeAtStart");
            this.setVerifyPageSelectedInfoObject("ChangeAtStart");
            var onSuccess = LiveUnit.GetWrappedCallback(function() {
                eventTestsObject.verifyEventObject(true);
                signalTestCaseCompleted();
            });
            var onError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Errors detected.");
                LiveUnit.Assert.fail(error);
            });
            flipperUtils.changeItem("ChangeAtStart", onSuccess, onError, this.setEventHandlers);
        }

        //
        // Test: testFlipperEventsChangeAtEnd using array data source
        //
        this.testFlipperEventsChangeAtEnd = function(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,0);
            this.setVerifyPageVisibilityInfoObject("Title0", "ChangeAtEnd");
            this.setVerifyPageSelectedInfoObject("ChangeAtEnd");
            var onSuccess = LiveUnit.GetWrappedCallback(function() {
                eventTestsObject.verifyEventObject(true);
                signalTestCaseCompleted();
            });
            var onError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Errors detected.");
                LiveUnit.Assert.fail(error);
            });
            flipperUtils.changeItem("ChangeAtEnd", onSuccess, onError, this.setEventHandlers);
        }

        //
        // Test: testFlipperEventsChangeAtMiddle using array data source
        //
        this.testFlipperEventsChangeAtMiddle = function(signalTestCaseCompleted) {
            setExpectedIteration(2,1,2,0);
            this.setVerifyPageVisibilityInfoObject("Title0", "ChangeAtMiddle");
            this.setVerifyPageSelectedInfoObject("ChangeAtMiddle");
            var onSuccess = LiveUnit.GetWrappedCallback(function() {
                eventTestsObject.verifyEventObject(true);
                signalTestCaseCompleted();
            });
            var onError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Errors detected.");
                LiveUnit.Assert.fail(error);
            });
            flipperUtils.changeItem("ChangeAtMiddle", onSuccess, onError, this.setEventHandlers);
        }

        //
        // Test: testFlipperEventsChangeInvalid using array data source
        //
        this.testFlipperEventsChangeInvalid = function(signalTestCaseCompleted) {
            setExpectedIteration(1,0,1,0);
            this.setVerifyPageVisibilityInfoObject(null, "page1");
            this.setVerifyPageSelectedInfoObject("page1");
            var onUnexpectedSuccess = LiveUnit.GetWrappedCallback(function() {
                LiveUnit.Assert.fail("Invalid Change detected success when it should have failed.");
            });
            var onExpectedError = LiveUnit.GetWrappedCallback(function(error) {
                LiveUnit.LoggingCore.logComment("Errors detected as expected.");
                LiveUnit.LoggingCore.logComment(error);
                signalTestCaseCompleted();
            });
            flipperUtils.changeItem("ChangeInvalid", onUnexpectedSuccess, onExpectedError, this.setEventHandlers);
        }
        */

        //---------------------------------------------------------------------
        // Test Helper Functions
        //---------------------------------------------------------------------

        // Setup eventValidationObject for pagevisibilitychanged event to expected results
        setVerifyPageVisibilityInfoObject = function (pageInvisible, pageVisible) {
            if (pageInvisible) {
                eventValidationObject.pageInvisible.id = pageInvisible;
            }
            if (pageVisible) {
                eventValidationObject.pageVisible.id = pageVisible;
            }
        };

        // Setup eventValidationObject for pageselected event to expected results
        // Since the pageselected event only fires after 250ms after the flip occurs,
        // test need to account for this when instantiating a flipper and you set event handlers after
        // the pageselected event will still fire.
        setVerifyPageSelectedInfoObject = function (page) {
            eventValidationObject.pageSelected.id = page;
        };

        // Setup the Event Handlers that each test will use
        setEventHandlers = (flipperItem) => {
            // Add event listener for pagevisibilitychanged and datasourceCountChanged events.
            LiveUnit.LoggingCore.logComment("Setting up event handlers for:");
            LiveUnit.LoggingCore.logComment(pageVisibilityEvent);
            LiveUnit.LoggingCore.logComment(datasourceCountChangedEvent);
            LiveUnit.LoggingCore.logComment(pageSelectedEvent);

            // If flipperItem is a string, assume it is a DOM element that you are adding listeners to.
            if (typeof flipperItem === 'string') {
                flipperItem = document.getElementById(flipperItem);
            }
            flipperItem.addEventListener(pageVisibilityEvent, this.pageVisibilityEventHandler, false);
            flipperItem.addEventListener(datasourceCountChangedEvent, this.datasourceCountChangedEventHandler, false);
            flipperItem.addEventListener(pageSelectedEvent, this.pageselectedEventHandler, false);
            LiveUnit.LoggingCore.logComment("Event handlers are setup.");
        }

        // Event handler for "pagevisibility" which tests that the event contains the correct information.
        pageVisibilityEventHandler = (eventInfo) => {
            var validateObject;
            LiveUnit.LoggingCore.logComment("Event detected: " + pageVisibilityEvent);
            LiveUnit.LoggingCore.logComment("Page visible: " + eventInfo.detail.visible);
            if (eventInfo.detail.visible) {
                validateObject = eventValidationObject.pageVisible;
            }
            else {
                validateObject = eventValidationObject.pageInvisible;
            }
            this.verifyEventInfo(eventInfo, validateObject);
        }

        verifyEventInfo(eventInfo, validateObject) {
            LiveUnit.LoggingCore.logComment("Verifying event contains correct info...");
            validateObject.event = true;
            validateObject.iteration++;
            validateObject.passId = true;
            validateObject.pass = true;

            /*
            // Verify srcElement.id
            LiveUnit.Assert.isTrue(validateObject.id !== "undefined", "verifyInfo.id is undefined");
            LiveUnit.LoggingCore.logComment("verifyInfo.id: " + validateObject.id);
            LiveUnit.Assert.isTrue(eventInfo.target.firstElementChild.id !== "undefined",
                    "eventInfo.target.id is undefined");
            LiveUnit.LoggingCore.logComment("eventInfo.target.id: " + eventInfo.target.firstElementChild.id);

            // Simple id check
            if (eventInfo.target.firstElementChild.id === validateObject.id) {
                validateObject.passId = true;
            }

            // srcElement check
            var srcElement = document.getElementById(validateObject.id);
            if (eventInfo.target.firstElementChild === srcElement) {
                validateObject.pass = true;
            } else {
                LiveUnit.LoggingCore.logComment("The srcElement from the DOM is not same as eventInfo.target");
            }
            */
        }

        // Event handler for "datasourceCountChanged" which tests that the event was fired when the datasource was changed.
        datasourceCountChangedEventHandler(eventInfo) {
            LiveUnit.LoggingCore.logComment("Event detected: " + datasourceCountChangedEvent);
            eventValidationObject.datasourceCountChanged.callbackCount++;
        }

        pageselectedEventHandler = (eventInfo) => {
            LiveUnit.LoggingCore.logComment("Event detected: " + pageSelectedEvent);
            LiveUnit.LoggingCore.logComment("Page selected: " + eventInfo.target.id);
            var validateObject = eventValidationObject.pageSelected;
            this.verifyEventInfo(eventInfo, validateObject);
        }

        // Verify event validation objects contain expected information.
        verifyEventObject(simpleIdCheck?) {
            LiveUnit.LoggingCore.logComment("Verifying '" + pageVisibilityEvent + "' event...");

            // Validate invisible pagevisibilitychanged event.
            if (eventValidationObject.pageInvisible.id) {
                var expectedIteration = eventValidationObject.pageInvisible.expectedIteration;
                LiveUnit.LoggingCore.logComment("'" + pageVisibilityEvent + "' event expected to fire for an invisible page...");
                LiveUnit.Assert.isTrue(eventValidationObject.pageInvisible.event, "Did not detect the '" +
                    pageVisibilityEvent + "' event for the invisible page.");
                LiveUnit.Assert.isTrue(eventValidationObject.pageInvisible.passId, "Event verification for '" +
                    pageVisibilityEvent + "' failed for invisible page.");
                if (!simpleIdCheck) {
                    LiveUnit.Assert.isTrue(eventValidationObject.pageInvisible.pass, "Event verification for '" +
                        pageVisibilityEvent + "' failed for invisible page.");
                }
                LiveUnit.Assert.isTrue(eventValidationObject.pageInvisible.iteration === expectedIteration,
                    pageVisibilityEvent + " event was detected " + eventValidationObject.pageInvisible.iteration +
                    " times for invisible page. It should have fired exactly once.");
            }
            else {
                LiveUnit.LoggingCore.logComment("'" + pageVisibilityEvent + "' event NOT expected to fire for invisible page...");
                LiveUnit.Assert.isFalse(eventValidationObject.pageInvisible.event, "'" + pageVisibilityEvent +
                    "' event was detected and shouldn't have been.");
            }

            // Validate visible pagevisibilitychanged event.
            if (eventValidationObject.pageVisible.id) {
                var expectedIteration = eventValidationObject.pageVisible.expectedIteration;
                LiveUnit.LoggingCore.logComment("'" + pageVisibilityEvent + "' event expected to fire for a visible page...");
                LiveUnit.Assert.isTrue(eventValidationObject.pageVisible.event, "Did not detect the '" +
                    pageVisibilityEvent + "' event for the visible page.");
                LiveUnit.Assert.isTrue(eventValidationObject.pageVisible.passId, "Event verification for '" +
                    pageVisibilityEvent + "' failed for visible page.");
                if (!simpleIdCheck) {
                    LiveUnit.Assert.isTrue(eventValidationObject.pageVisible.pass, "Event verification for '" +
                        pageVisibilityEvent + "' failed for visible page.");
                }
                LiveUnit.Assert.isTrue(eventValidationObject.pageVisible.iteration === expectedIteration,
                    pageVisibilityEvent + " event was detected " + eventValidationObject.pageVisible.iteration +
                    " times for visible page. It should have fired exactly once.");
            }
            else {
                LiveUnit.LoggingCore.logComment("'" + pageVisibilityEvent + "' event NOT expected to fire for visible page...");
                LiveUnit.Assert.isFalse(eventValidationObject.pageVisible.event, "'" + pageVisibilityEvent +
                    "' event was detected and shouldn't have been.");
            }
            LiveUnit.LoggingCore.logComment("Done verifying '" + pageVisibilityEvent + "' event.");

            // Validate datasourcecountchanged event
            LiveUnit.LoggingCore.logComment("Verifying '" + datasourceCountChangedEvent + "' event...");
            if (eventValidationObject.datasourceCountChanged.eventCount > 0) {
                LiveUnit.LoggingCore.logComment("datasourceCountChanged event should have occurred.  Validating that it did.");
                LiveUnit.LoggingCore.logComment("Times event should have been fired: " +
                    eventValidationObject.datasourceCountChanged.eventCount);
                LiveUnit.LoggingCore.logComment("Times event actually fired: " +
                    eventValidationObject.datasourceCountChanged.callbackCount);

                var expected = eventValidationObject.datasourceCountChanged.eventCount,
                    actual = eventValidationObject.datasourceCountChanged.callbackCount;

                LiveUnit.Assert.isTrue(actual === expected, datasourceCountChangedEvent + " event was not fired " +
                    " expected number of times: " + expected);
            }
            else if (eventValidationObject.datasourceCountChanged.callbackCount > 0) {
                LiveUnit.LoggingCore.logComment("'" + datasourceCountChangedEvent + "' event NOT expected to fire.");
                LiveUnit.Assert.fail("'" + datasourceCountChangedEvent + "' event was detected " +
                    eventValidationObject.datasourceCountChanged.callbackCount + " times and shouldn't have been.");
            }
            else {
                LiveUnit.LoggingCore.logComment(datasourceCountChangedEvent + " event wasn't expected to occur and it did not occur.");
            }
            LiveUnit.LoggingCore.logComment("Done verifying '" + datasourceCountChangedEvent + "' event.");

            // Validate pageselected event
            LiveUnit.LoggingCore.logComment("Verifying pageselected event...");
            var expectedIteration = eventValidationObject.pageSelected.expectedIteration;
            if (eventValidationObject.pageSelected.id) {
                LiveUnit.LoggingCore.logComment("'" + pageSelectedEvent + "' event expected to fire...");
                LiveUnit.Assert.isTrue(eventValidationObject.pageSelected.event, "Did not detect the '" +
                    pageSelectedEvent + "' event.");
                LiveUnit.Assert.isTrue(eventValidationObject.pageSelected.passId, "Event verification for '" +
                    pageSelectedEvent + "' failed.");
                if (!simpleIdCheck) {
                    LiveUnit.Assert.isTrue(eventValidationObject.pageSelected.pass, "Event verification for '" +
                        pageSelectedEvent + "' failed.");
                }
                var actualIteration = eventValidationObject.pageSelected.iteration;
                LiveUnit.Assert.isTrue(actualIteration === expectedIteration, "'" + pageSelectedEvent +
                    "' event was detected " + actualIteration + " times. Expected times to fire: " + expectedIteration);
            }
            else {
                LiveUnit.LoggingCore.logComment("'" + pageSelectedEvent + "' event NOT expected to fire...");
                LiveUnit.Assert.isFalse(eventValidationObject.pageSelected.event, "'" + pageSelectedEvent +
                    "' event was detected and shouldn't have been.");
            }

            LiveUnit.LoggingCore.logComment("Done verifying '" + pageSelectedEvent + "'  event.");
        }
     }
     var disabledTestRegistry = {
         testFlipperEventsInsertBefore: Helper.Browsers.safari,
         testFlipperEventsInsertAtStart: Helper.Browsers.safari,
         testFlipperEventsInsertAtEnd: Helper.Browsers.safari,
         testFlipperEventsMoveToStart: Helper.Browsers.safari,
         testFlipperEventsGetControl: Helper.Browsers.safari,
		 testFlipperEventsInsertAfter: Helper.Browsers.safari
     };
     Helper.disableTests(EventTests, disabledTestRegistry);
}

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.EventTests");