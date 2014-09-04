// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="../TestLib/TestDataSource.ts" />
/// <reference path="../TestLib/UnitTestsCommon.ts" />
/// <reference path="vds-tracing.js" />

var StatusTests = function () {
    "use strict";

    var previousTracingOptions;

    this.setUp = function () {
        previousTracingOptions = VDSLogging.options;
        VDSLogging.options = {
            log: function (message) { LiveUnit.Assert.fail(message); },
            include: /createListBinding|_retainItem|_releaseItem|release/,
            handleTracking: true,
            logVDS: true,
            stackTraceLimit: 0 // set this to 100 to get good stack traces if you run into a failure.
        };
        VDSLogging.on();
    }

    this.tearDown = function () {
        VDSLogging.off();
        VDSLogging.options = previousTracingOptions;
    }

    // define a class to handle statusHandler and number of expected failures

    function handlerClass(failureCount, signalTestCaseCompleted) {
        var _failureCount = failureCount;
        this.statusHandler = function (eventInfo) {
            if (eventInfo.detail === WinJS.UI.DataSourceStatus.failure) {
                _failureCount--;
                LiveUnit.LoggingCore.logComment("failure notice received.");
            }
            if (_failureCount === 0) {
                signalTestCaseCompleted();
            }
        }
    }

    // VDS has three status: ready, waiting and failure. Among them, only failure status notice always trigger statuschanged event.
    // Failure happens when one of the three errors occurs: UI.CountError.noResponse, UI.EditError.noResponse and UI.FetchError.noResponse.

    // This test verifies failure notification from VDS when UI.CountError.noResponse happens
     function testCountNoResponseFailureStatus(signalTestCaseCompleted, synchronous) {

         var myhandler = new handlerClass(1, signalTestCaseCompleted);

         var dataSource = TestComponents.simpleAsynchronousDataSource(100),
             handler = TestComponents.simpleListNotificationHandler(),
             listBinding = dataSource.createListBinding(handler);
         if (synchronous) {
             dataSource.testDataAdapter.directives.callMethodsSynchronously = true;
         } else {
             TestComponents.ensureAllAsynchronousRequestsFulfilled(dataSource);
         }

         dataSource.addEventListener("statuschanged", myhandler.statusHandler);
         dataSource.testDataAdapter.setProperty("count_NoResponse", true);

         //perform getCount to trigger UI.CountError.noResponse
         dataSource.getCount().done();


    };


     this.xtestCountNoResponseFailureStatusAsynchronous = function (signalTestCaseCompleted) {
         testCountNoResponseFailureStatus(signalTestCaseCompleted, false);
    };

     this.xtestCountNoResponseFailureStatusSynchronous = function (signalTestCaseCompleted) {
         testCountNoResponseFailureStatus(signalTestCaseCompleted, true);
     };

    // This test verifies failure notification from VDS when UI.FetchError.noResponse happens
     function testFetchNoResponseFailureStatus(signalTestCaseCompleted, synchronous) {

         var myhandler = new handlerClass(1, signalTestCaseCompleted);

         var dataSource = TestComponents.simpleAsynchronousDataSource(100),
             handler = TestComponents.simpleListNotificationHandler(),
             listBinding = dataSource.createListBinding(handler);
         if (synchronous) {
             dataSource.testDataAdapter.directives.callMethodsSynchronously = true;
         } else {
             TestComponents.ensureAllAsynchronousRequestsFulfilled(dataSource);
         }

         dataSource.addEventListener("statuschanged", myhandler.statusHandler);
         dataSource.testDataAdapter.setProperty("communicationFailure", true);

         // Perform itemFromIndex to trigger UI.FetchError.noResponse
         // Error handler function is needed to avoid unhandled errors. However, no test is performed in these functions.
         dataSource.itemFromIndex(0).done(function fetchSuccess() {
             },
             function fetchError(e) {
             }
                );
     };


     this.xtestFetchNoResponseFailureStatusAsynchronous = function (signalTestCaseCompleted) {
         testFetchNoResponseFailureStatus(signalTestCaseCompleted, false);
     };

     this.xtestFetchNoResponseFailureStatusSynchronous = function (signalTestCaseCompleted) {
         testFetchNoResponseFailureStatus(signalTestCaseCompleted, true);
     };

    // This test verifies failure notification from VDS when UI.EditError.noResponse happens
    // This cannot run due to bug 976459
     function testEditNoResponseFailureStatus(signalTestCaseCompleted, synchronous) {

         var myhandler = new handlerClass(1, signalTestCaseCompleted);

         var dataSource = TestComponents.simpleAsynchronousDataSource(100),
             handler = TestComponents.simpleListNotificationHandler(),
             listBinding = dataSource.createListBinding(handler);
         if (synchronous) {
             dataSource.testDataAdapter.directives.callMethodsSynchronously = true;
         } else {
             TestComponents.ensureAllAsynchronousRequestsFulfilled(dataSource);
         }

         dataSource.addEventListener("statuschanged", myhandler.statusHandler);
         dataSource.testDataAdapter.setProperty("countUnknown", true); // this one won't trigger failure notification
         dataSource.testDataAdapter.setProperty("communicationFailure", true); // this one triggers failure notification

         //perform getCount to trigger UI.CountError.noResponse
         dataSource.getCount().done(function countSuccess(count) {
             LiveUnit.Assert.fail("countSuccess handler should not be called when error is returned from the data adapter");
         },
         function countError(e) {
             LiveUnit.Assert.areEqual(WinJS.UI.CountResult.unknown, e.name, "Wrong  Error code.");
             var newData = "NewData0"
             dataSource.change("0", newData).done();
         });
     };

    // TODO: turn on these tests when bug 976459 is resolved.
     this.xtestEditNoResponseFailureStatusAsynchronous = function (signalTestCaseCompleted) {
         testEditNoResponseFailureStatus(signalTestCaseCompleted, false);
     };

     this.xtestEditNoResponseFailureStatusSynchronous = function (signalTestCaseCompleted) {
         testEditNoResponseFailureStatus(signalTestCaseCompleted, true);
     };
};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("StatusTests");
