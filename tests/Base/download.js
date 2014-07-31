// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.Download = function () {
    "use strict";

    function setup() {
        var holder = document.createElement('div');
        holder.innerHTML =
            '<div class="download"><div class="progress"></div><div class="cancel"></div><div class="ok"></div></div>';

        WinJS.UI.Fragments.clearCache(holder.firstChild);
        var cloned = document.createElement("div");
        WinJS.UI.Fragments.renderCopy(holder.firstChild).
            then(function (docfrag) { cloned.appendChild(docfrag); });
        
        var ok = cloned.querySelector('.ok');
        var cancel = cloned.querySelector('.cancel');
        var progress = cloned.querySelector('.progress');
        var count = 0;
        
        var intervalId;
        var promise = new WinJS.Promise(function(c,e,p) {
            ok.addEventListener('click', function() {
                intervalId = setInterval(function() {
                    count++;
                    progress.innerHTML = count;

                    LiveUnit.Assert.isTrue(count <= 10, 'Count should never be more than 10.');

                    p(count);

                    if (count === 10) {
                        progress.innerHTML = 'done!';
                        clearInterval(intervalId);
                        c();
                    }
                }, 16);
            }, false);
        
        }, function() {
            clearInterval(intervalId);
        });

        cancel.addEventListener('click', function() {
            promise.cancel();
        }, false);

        return {
            promise: promise,
            content: holder,
            progress: progress,
            ok: ok,
            cancel: cancel
        }
    }

    this.testDownloadProgress = function (complete) {
        var d = setup();
        
        d.promise.then(function() {
            LiveUnit.Assert.areEqual(d.progress.innerHTML, 'done!');
        }, null, function(count) {
            LiveUnit.Assert.areEqual(d.progress.innerHTML, count.toString());
        }).then(function() {
            WinJS.UI.Fragments.clearCache(d.content.firstChild);
        }).then(null, function(e) {
            LiveUnit.Assert.fail('There was an unknown failure: ' + e);
        }).then(complete, complete);
        d.ok.click();
    }

    this.testDownloadProgressCancel = function (complete) {
        var d = setup();
        var iter = 5;
        
        d.promise
            .then(
                function() {
                    LiveUnit.Assert.fail('The promise should not have completed.');
                },
                null,
                function(count) {
                    if (count === iter) { d.cancel.click(); }
                })
            .then(null, function(e) {
                WinJS.UI.Fragments.clearCache(d.content.firstChild);
                LiveUnit.Assert.areEqual(d.progress.innerHTML, iter.toString());
            })
            .then(null, function(e) {
                LiveUnit.Assert.fail('There was an unknown failure: ' + e);
            })
            .then(complete, complete);
        d.ok.click();
    }

    this.testDownloadProgressCancelAfterComplete = function (complete) {
        var d = setup();
        var completed = false;
        
        d.promise.then(function() {
            LiveUnit.Assert.areEqual(d.progress.innerHTML, 'done!');
            complete = true;
        }, null, function() {
            if (completed) { LiveUnit.Assert.fail("We shouldn't update after complete!"); }
        }).then(function() {
            d.cancel.click();
        }).then(null, function() {
            LiveUnit.Assert.fail('Promise is completed; should not move to the error state.');
        }).then(function() {
            WinJS.UI.Fragments.clearCache(d.content.firstChild);
        }).then(null, function(e) {
            LiveUnit.Assert.fail('There was an unknown failure: ' + e);
        }).then(complete, complete);
        d.ok.click();
    }
}

LiveUnit.registerTestClass("CorsicaTests.Download");