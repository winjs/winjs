// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
///<reference path="../../bin/typings/tsd.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {

    "use strict";

    var testData;

    export class Download {

        setUp() {
            var holder = document.createElement('div');
            holder.innerHTML =
            '<div class="download"><div class="progress"></div><div class="cancel"></div><div class="ok"></div></div>';

            WinJS.UI.Fragments.clearCache(<HTMLElement>holder.firstChild);
            var cloned = document.createElement("div");
            WinJS.UI.Fragments.renderCopy(<HTMLElement>holder.firstChild).
                then(function (docfrag) { cloned.appendChild(docfrag); });

            var ok = <HTMLDivElement>cloned.querySelector('.ok');
            var cancel = <HTMLDivElement>cloned.querySelector('.cancel');
            var progress = <HTMLDivElement>cloned.querySelector('.progress');
            var count = 0;

            var intervalId;
            var promise = new WinJS.Promise(function (c, e, p) {
                ok.addEventListener('click', function () {
                    intervalId = setInterval(function () {
                        count++;
                        progress.innerHTML = count.toString();

                        LiveUnit.Assert.isTrue(count <= 10, 'Count should never be more than 10.');

                        p(count);

                        if (count === 10) {
                            progress.innerHTML = 'done!';
                            clearInterval(intervalId);
                            c();
                        }
                    }, 16);
                }, false);

            }, function () {
                    clearInterval(intervalId);
                });

            cancel.addEventListener('click', function () {
                promise.cancel();
            }, false);

            testData = {
                promise: promise,
                content: holder,
                progress: progress,
                ok: ok,
                cancel: cancel
            };
        }

        testDownloadProgress(complete) {

            testData.promise.then(function () {
                LiveUnit.Assert.areEqual(testData.progress.innerHTML, 'done!');
            }, null, function (count) {
                    LiveUnit.Assert.areEqual(testData.progress.innerHTML, count.toString());
                }).then(function () {
                    WinJS.UI.Fragments.clearCache(testData.content.firstChild);
                }).then(null, function (e) {
                    LiveUnit.Assert.fail('There was an unknown failure: ' + e);
                }).then(complete, complete);
            testData.ok.click();
        }

        testDownloadProgressCancel(complete) {
            var iter = 5;

            testData.promise
                .then(
                function () {
                    LiveUnit.Assert.fail('The promise should not have completed.');
                },
                null,
                function (count) {
                    if (count === iter) { testData.cancel.click(); }
                })
                .then(null, function (e) {
                    WinJS.UI.Fragments.clearCache(testData.content.firstChild);
                    LiveUnit.Assert.areEqual(testData.progress.innerHTML, iter.toString());
                })
                .then(null, function (e) {
                    LiveUnit.Assert.fail('There was an unknown failure: ' + e);
                })
                .then(complete, complete);
            testData.ok.click();
        }

        testDownloadProgressCancelAfterComplete(complete) {
            var completed = false;

            testData.promise.then(function () {
                LiveUnit.Assert.areEqual(testData.progress.innerHTML, 'done!');
                complete = true;
            }, null, function () {
                    if (completed) { LiveUnit.Assert.fail("We shouldn't update after complete!"); }
                }).then(function () {
                    testData.cancel.click();
                }).then(null, function () {
                    LiveUnit.Assert.fail('Promise is completed; should not move to the error state.');
                }).then(function () {
                    WinJS.UI.Fragments.clearCache(testData.content.firstChild);
                }).then(null, function (e) {
                    LiveUnit.Assert.fail('There was an unknown failure: ' + e);
                }).then(complete, complete);
            testData.ok.click();
        }
    }

}
LiveUnit.registerTestClass("CorsicaTests.Download");