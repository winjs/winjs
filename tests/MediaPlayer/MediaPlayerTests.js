// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://Microsoft.WinJS.4.0/js/WinJS.js" />
// <reference path="ms-appx://Microsoft.WinJS.4.0/css/ui-dark.css" />
/// <reference path="../../typings/typings.d.ts" />
/// <reference path="../TestLib/liveToQ/liveToQ.d.ts" />
/// <reference path="../TestLib/winjs.dev.d.ts" />
var CorsicaTests;
(function (CorsicaTests) {

    // Helper functions

    // The one downside of using a fake MediaElement is that we can create conditions that aren't actually possible in reality.
    // While this is great for testing, calling depose on a test that does this will cause exceptions due to race conditions.
    // That's why we create a helper function to safely dispose the MediaPlayer control's resources.
    function safeDispose(mediaPlayer) {
        WinJS.Utilities.Scheduler.schedule(function () {
            try {
                mediaPlayer.dispose();
            } catch (ex) { }
        }, WinJS.Utilities.Scheduler.Priority.normal, this);
    };

    function runSetMediaPlayerPropertyCase(propertyName, propertyValue, isExceptionExpected) {
        var mediaPlayer = new WinJS.UI.MediaPlayer();
        var wasExceptionThrown = false;

        try {
            mediaPlayer[propertyName] = propertyValue;
        } catch (exception) {
            wasExceptionThrown = true;
        }

        if (isExceptionExpected) {
            LiveUnit.Assert.isTrue(wasExceptionThrown, "Setting mediaPlayer." + propertyName + "to " + propertyValue + " was supposed to throw an exception, but it didn't.");
        } else {
            LiveUnit.Assert.isFalse(wasExceptionThrown, "Setting mediaPlayer." + propertyName + "to " + propertyValue + " was not supposed to throw an exception, but it did.");
            LiveUnit.Assert.areEqual(propertyValue, mediaPlayer[propertyName], "mediaPlayer." + propertyName + " was not the expected value.");
        }
        safeDispose(mediaPlayer);
    };

    function runEnsureLegacyPropertyStillExistsTestCase(legacyPropertyName, newPropertyName, propertyValue) {
        var mediaPlayer = new WinJS.UI.MediaPlayer();
        mediaPlayer[legacyPropertyName] = propertyValue;
        LiveUnit.Assert.areEqual(propertyValue, mediaPlayer[legacyPropertyName], "mediaPlayer." + legacyPropertyName + " was not equal to the expected value: " + propertyValue + ", instead value was: " + mediaPlayer[legacyPropertyName]);
        LiveUnit.Assert.areEqual(propertyValue, mediaPlayer[newPropertyName], "mediaPlayer." + newPropertyName + " was not equal to the expected value: " + propertyValue + ", instead value was: " + mediaPlayer[newPropertyName]);
        safeDispose(mediaPlayer);
    };

    function runVerifyMediaCommandExecutedEventTest(mediaCommandEnum, methodName, testCompletedFunction, playbackRate) {
        var mediaPlayer = new WinJS.UI.MediaPlayer();
        var mediaElement = new Test.MockMediaElement();
        mediaPlayer.castButtonEnabled = true;
        mediaPlayer.castButtonVisible = true;
        mediaPlayer.zoomButtonEnabled = true;
        mediaPlayer.zoomButtonVisible = true;
        mediaElement.playbackRate = playbackRate || 1;
        mediaPlayer.mediaElementAdapter.mediaElement = mediaElement;
        mediaPlayer.addEventListener("mediacommandexecuted", function mediaCommandExecuted(ev) {
            mediaPlayer.removeEventListener("mediacommandexecuted", mediaCommandExecuted);
            LiveUnit.Assert.areEqual(mediaCommandEnum, ev.detail.mediaCommand);
            safeDispose(mediaPlayer);
            testCompletedFunction();
        }, false);
        mediaPlayer[methodName].call(mediaPlayer);
    };

    function runIsPlayAllowedTestCase(isPlayAllowedValue, isEventExpectedToFire, testCompletedFunction) {
        var mediaPlayer = new WinJS.UI.MediaPlayer();
        var mediaElement = new Test.MockMediaElement();
        mediaPlayer.mediaElementAdapter.mediaElement = mediaElement;
        mediaPlayer.mediaElementAdapter.playAllowed = isPlayAllowedValue;
        mediaElement.addEventListener("play", function play() {
            mediaElement.removeEventListener("play", play);
            if (isEventExpectedToFire) {
                safeDispose(mediaPlayer);
                testCompletedFunction();
            } else {
                LiveUnit.Assert.fail("Shouldn't be able to play.");
            }
        }, false);
        mediaElement.paused = true;
        mediaPlayer.play();
        if (!isEventExpectedToFire) {
            LiveUnit.Assert.isTrue(mediaElement.paused);
            safeDispose(mediaPlayer);
            testCompletedFunction();
        }
    };

    function runIsPauseAllowedTestCase(isPauseAllowedValue, isEventExpectedToFire, testCompletedFunction) {
        var mediaPlayer = new WinJS.UI.MediaPlayer();
        var mediaElement = new Test.MockMediaElement();
        mediaPlayer.mediaElementAdapter.mediaElement = mediaElement;
        mediaPlayer.mediaElementAdapter.pauseAllowed = isPauseAllowedValue;
        mediaElement.addEventListener("pause", function pause() {
            mediaElement.removeEventListener("pause", pause);
            if (isEventExpectedToFire) {
                safeDispose(mediaPlayer);
                testCompletedFunction();
            } else {
                LiveUnit.Assert.fail("Shouldn't be able to pause.");
            }
        }, false);
        mediaPlayer.pause();
        if (!isEventExpectedToFire) {
            safeDispose(mediaPlayer);
            testCompletedFunction();
        }
    };

    function runIsSeekAllowedTestCase(isSeekAllowedValue, isEventExpectedToFire, testCompletedFunction) {
        var mediaPlayer = new WinJS.UI.MediaPlayer();
        var mediaElement = new Test.MockMediaElement();
        mediaElement.autoplay = true;
        mediaElement.src = "notnull";
        mediaPlayer.mediaElementAdapter.mediaElement = mediaElement;
        mediaPlayer.mediaElementAdapter.seekAllowed = isSeekAllowedValue;
        mediaElement.addEventListener("seeked", function seek() {
            mediaElement.removeEventListener("seeked", seek);
            if (isEventExpectedToFire) {
                safeDispose(mediaPlayer);
                testCompletedFunction();
            } else {
                LiveUnit.Assert.fail("Shouldn't be able to seek.");
            }
        }, false);
        var oldCurrentTime = mediaElement.currentTime;
        mediaPlayer.seek(10);
        if (!isEventExpectedToFire) {
            LiveUnit.Assert.areEqual(oldCurrentTime, mediaElement.currentTime);
            safeDispose(mediaPlayer);
            testCompletedFunction();
        }
    };

    function compareArrays(array1, array2) {
        var arraysAreEqual = true;
        for (var propertyName in array1) {
            if (array1[propertyName] !== array2[propertyName]) {
                arraysAreEqual = false;
                break;
            }
        }
        return arraysAreEqual;
    };

    function runNullMediaElementTestCase(mediaCommand) {
        var wasExceptionThrown = false;
        var mediaPlayer = new WinJS.UI.MediaPlayer();
        mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
        mediaPlayer.mediaElementAdapter.mediaElement = null;

        try {
            mediaPlayer[mediaCommand].call(mediaPlayer);
        } catch (exception) {
            wasExceptionThrown = true;
        }

        LiveUnit.Assert.isFalse(wasExceptionThrown, mediaCommand + "was called on an invalid Media Element and an exception was thrown.");
        safeDispose(mediaPlayer);
    };

    function runNewMediaElementTestCase(mediaCommand, testCompletedFunction) {
        var mediaPlayer = new WinJS.UI.MediaPlayer();
        var mockMediaElement = new Test.MockMediaElement();
        mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
        mockMediaElement.autoplay = true;
        mockMediaElement.src = "notnull";
        try {
            mediaPlayer[mediaCommand].call(mediaPlayer);
        } catch (exception) {
            LiveUnit.Assert.fail("When calling the '" + mediaCommand + "' method an exception was thrown when it should not have been.");
            wasExceptionThrown = true;
        }
        safeDispose(mediaPlayer);
        testCompletedFunction();
    };

    function runNullMediaElementSrcTestCase(mediaCommand, wasExceptionExpected, testCompletedFunction) {
        var wasExceptionThrown = false;
        var mediaPlayer = new WinJS.UI.MediaPlayer();
        var mockMediaElement = new Test.MockMediaElement();
        mockMediaElement.src = null;

        try {
            mediaPlayer[mediaCommand].call(mediaPlayer);
        } catch (exception) {
            wasExceptionThrown = true;
        }

        LiveUnit.Assert.isFalse(wasExceptionThrown, mediaCommand + "was called on an invalid Media Element and an exception was thrown.");
        safeDispose(mediaPlayer);
        testCompletedFunction();
    };

    function runFastForwardTestCase(initialPlaybackRate, expectedPlaybackRateAfterFastForward, startPaused) {
        var mediaPlayer = new WinJS.UI.MediaPlayer();
        var mockMediaElement = new Test.MockMediaElement();
        if (!startPaused) {
            mockMediaElement.autoplay = true;
        }
        mockMediaElement.src = "notnull";
        mockMediaElement.playbackRate = initialPlaybackRate;
        mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
        mediaPlayer.fastForward();
        LiveUnit.Assert.isTrue(expectedPlaybackRateAfterFastForward, mockMediaElement.playbackRate);
        LiveUnit.Assert.isTrue(expectedPlaybackRateAfterFastForward, mediaPlayer.targetPlaybackRate);
        safeDispose(mediaPlayer);
    };

    function runRewindTestCase(initialPlaybackRate, expectedPlaybackRateAfterRewind, startPaused) {
        var mediaPlayer = new WinJS.UI.MediaPlayer();
        var mockMediaElement = new Test.MockMediaElement();
        if (!startPaused) {
            mockMediaElement.autoplay = true;
        }
        mockMediaElement.src = "notnull";
        mockMediaElement.playbackRate = initialPlaybackRate;
        mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
        mediaPlayer.rewind();
        LiveUnit.Assert.isTrue(expectedPlaybackRateAfterRewind, mockMediaElement.playbackRate);
        LiveUnit.Assert.isTrue(expectedPlaybackRateAfterRewind, mediaPlayer.targetPlaybackRate);
        safeDispose(mediaPlayer);
    };

    function runExitFastForwardOrRewindTest(mediaCommand) {
        var mediaPlayer = new WinJS.UI.MediaPlayer();
        var mockMediaElement = new Test.MockMediaElement();
        mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
        mockMediaElement.autoplay = true;
        mockMediaElement.src = "notnull";
        mediaPlayer.fastForward();
        mediaPlayer[mediaCommand].call(mediaPlayer);
        LiveUnit.Assert.isFalse(mockMediaElement.paused);
        LiveUnit.Assert.areEqual(1, mockMediaElement.playbackRate);
        safeDispose(mediaPlayer);
    };

    function runPlayPauseToggleIconTest(mediaCommand, icon, isPausedInitially) {
        var mediaPlayer = new WinJS.UI.MediaPlayer();
        var mockMediaElement = new Test.MockMediaElement();
        if (!isPausedInitially) {
            mockMediaElement.autoplay = true;
        }
        mockMediaElement.src = "notnull";
        mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
        mediaPlayer[mediaCommand].call(mediaPlayer);
        if (icon === "pauseicon") {
            LiveUnit.Assert.areEqual(mediaPlayer.element.querySelector(".win-mediaplayer-playpausebutton").winControl.icon, WinJS.UI.AppBarIcon.pause);
        } else {
            LiveUnit.Assert.areEqual(mediaPlayer.element.querySelector(".win-mediaplayer-playpausebutton").winControl.icon, WinJS.UI.AppBarIcon.play);
        }
        safeDispose(mediaPlayer);
    };

    function runGetButtonBySelectorTestCase(buttonSelector) {
        var mediaPlayer = new WinJS.UI.MediaPlayer();
        var button = mediaPlayer.element.querySelector(buttonSelector);
        LiveUnit.Assert.isNotNull(button, "UI element could not be retrieved: " + buttonSelector);
        safeDispose(mediaPlayer);
    };

    function runNoTransportBarButtonsTestCase(mediaCommand, parameter) {
        var mediaPlayer = new WinJS.UI.MediaPlayer();

        // Remove all the buttons
        var transportBarCommands = mediaPlayer.commands;
        for (var i = transportBarCommands.length - 1; i >= 0; i--) {
            command = transportBarCommands.pop();
            command.element.parentNode.removeChild(command.element);
        }

        try {
            mediaPlayer[mediaCommand].call(mediaPlayer, parameter);
        } catch (ex) {
            LiveUnit.Assert.fail("An exception was thrown trying to call mediaPlayer." + mediaCommand + "().");
        }
        safeDispose(mediaPlayer);
    };

    var MediaPlayerTests = (function () {
        function MediaPlayerTests() {
        }
        MediaPlayerTests.prototype.setUp = function () {
            // No-op
        };
        MediaPlayerTests.prototype.tearDown = function () {
            // No-op
        };

        // Property tests
        MediaPlayerTests.prototype.testWhenShowControlsThenControlsVisibleIsTrue = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer._skipAnimations = true;
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement.src = "notnullstring";
            mediaPlayer.addEventListener("aftershowcontrols", function aftershowcontrols() {
                mediaPlayer.removeEventListener("aftershowcontrols", aftershowcontrols);
                LiveUnit.Assert.isTrue(mediaPlayer.isControlsVisible);
                LiveUnit.Assert.isTrue(mediaPlayer.controlsVisible);
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mediaPlayer.showControls();
        };
        MediaPlayerTests.prototype.testWhenHideControlsThenControlsVisibleIsFalse = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer._skipAnimations = true;
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement.src = "notnullstring";
            mediaPlayer.addEventListener("aftershowcontrols", function aftershowcontrols() {
                mediaPlayer.removeEventListener("aftershowcontrols", aftershowcontrols);
                mediaPlayer.addEventListener("afterhidecontrols", function afterhidecontrols() {
                    LiveUnit.Assert.isFalse(mediaPlayer.isControlsVisible);
                    LiveUnit.Assert.isFalse(mediaPlayer.controlsVisible);
                    mediaPlayer.removeEventListener("afterhidecontrols", afterhidecontrols);
                    safeDispose(mediaPlayer);
                    complete();
                }, false);
                mediaPlayer.hideControls();
            }, false);
            mediaPlayer.showControls();
        };

        MediaPlayerTests.prototype.testWhenSetThumbnailEnabledToTrueThenThumbnailEnabledIsTrue = function () {
            runSetMediaPlayerPropertyCase("thumbnailEnabled", true, false);
        };
        MediaPlayerTests.prototype.testWhenSetThumbnailEnabledToFalseThenThumbnailEnabledIsFalse = function () {
            runSetMediaPlayerPropertyCase("thumbnailEnabled", false, false);
        };

        MediaPlayerTests.prototype.testWhenEndTimeNotSetThenEndTimeIsDuration = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mediaElement;
            mediaElement.src = "notnullstring";
            mediaElement.duration = 10;
            LiveUnit.Assert.areEqual(mediaPlayer.endTime, mediaElement.duration);
            safeDispose(mediaPlayer);
        };

        // EndTime
        MediaPlayerTests.prototype.testWhenSetEndTimeTo10ThenEndTimeIs10 = function () {
            runSetMediaPlayerPropertyCase("endTime", 10, false);
        };
        MediaPlayerTests.prototype.testWhenSetEndTimeThenCachedTotalTimeGetsUpdated = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mediaElement;
            mediaElement.src = "notnullstring";
            mediaElement.duration = 10;
            LiveUnit.Assert.areEqual(mediaElement.duration, mediaPlayer._totalTime);
            mediaElement.endTime = 8;
            LiveUnit.Assert.areEqual(mediaPlayer.endTime, mediaPlayer._totalTime);
            safeDispose(mediaPlayer);
        };

        // Custom buttons
        MediaPlayerTests.prototype.testWhenAddCustomButtonsDeclarativelyThenNewButtonsAreAdded = function () {
            var testPassed = false;
            var mediaPlayerDiv = document.createElement("div");
            mediaPlayerDiv["data-win-control"] = "WinJS.UI.MediaPlayer";
            mediaPlayerDiv.innerHTML = '<button data-win-control="WinJS.UI.Command" data-win-options="{ id: \'custom1\' }"></button>';
            var mediaPlayer = new WinJS.UI.MediaPlayer(mediaPlayerDiv);
            for (var i = 0, len = mediaPlayer.commands.length; i < len; i++) {
                if (mediaPlayer.commands.getAt(i).id === "custom1") {
                    testPassed = true;
                }
            }
            LiveUnit.Assert.isTrue(testPassed, "We added a custom button, but that button did not get added to the MediaPlayer's commands collection.");
            safeDispose(mediaPlayer);
        };
        MediaPlayerTests.prototype.testWhenAddCustomButtonsProgramaticallyThenNewButtonsAreAdded = function () {
            var testPassed = false;
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.commands.push(new WinJS.UI.Command(null, { id: "custom1" }));
            for (var i = 0, len = mediaPlayer.commands.length; i < len; i++) {
                if (mediaPlayer.commands.getAt(i).id === "custom1") {
                    testPassed = true;
                }
            }
            LiveUnit.Assert.isTrue(testPassed, "We added a custom button, but that button did not get added to the MediaPlayer's commands collection.");
            safeDispose(mediaPlayer);
        };
        MediaPlayerTests.prototype.testWhenSetCommandsThenNoExceptionIsThrown = function () {
            var wasExceptionThrown = false;
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            try {
                mediaPlayer.commands = new WinJS.Binding.List([]);
            } catch (ex) {
                wasExceptionThrown = true;
            }
            LiveUnit.Assert.isFalse(wasExceptionThrown, "An exception was thrown when replacing the commands property on the MediaPlayer.");
            safeDispose(mediaPlayer);
        };

        // Compact
        MediaPlayerTests.prototype.testWhenSetCompactToTrueThenCompactUpdates = function () {
            runSetMediaPlayerPropertyCase("compact", true, false);
        };
        MediaPlayerTests.prototype.testWhenSetCompactToFalseThenCompactUpdates = function () {
            runSetMediaPlayerPropertyCase("compact", false, false);
        };
        MediaPlayerTests.prototype.testWhenSetCompactToTrueThenMediaPlayerHasCorrectClasses = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.compact = true;
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(mediaPlayer.element, "win-mediaplayer-singlerow"), "MediaPlayer does not have the 'win-mediaplayer-singlerow' class.");
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(mediaPlayer.element, "win-mediaplayer-doublerow"), "MediaPlayer does not have the 'win-mediaplayer-doublerow' class.");
            if (document.body.querySelector(".win-toolbar-overflowarea")) {
                LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(document.body.querySelector(".win-toolbar-overflowarea"), "win-mediaplayer-doublerow"), "MediaPlayer does not have the 'win-mediaplayer-doublerow' class.");
            }
            safeDispose(mediaPlayer);
        };
        MediaPlayerTests.prototype.testWhenSetCompactToFalseThenMediaPlayerHasCorrectClasses = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.compact = false;
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(mediaPlayer.element, "win-mediaplayer-singlerow"), "MediaPlayer does not have the 'win-mediaplayer-singlerow' class.");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(mediaPlayer.element, "win-mediaplayer-doublerow"), "MediaPlayer does not have the 'win-mediaplayer-doublerow' class.");
            if (document.body.querySelector(".win-toolbar-overflowarea")) {
                LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(document.body.querySelector(".win-toolbar-overflowarea"), "win-mediaplayer-doublerow"), "MediaPlayer does not have the 'win-mediaplayer-doublerow' class.");
            }
            safeDispose(mediaPlayer);
        };

        // Full screen
        MediaPlayerTests.prototype.testWhenSetFullscreenToTrueThenFullscreenUpdates = function () {
            runSetMediaPlayerPropertyCase("fullscreen", true, false);
        };
        MediaPlayerTests.prototype.testWhenSetFullscreenToFalseThenFullscreenUpdates = function () {
            runSetMediaPlayerPropertyCase("fullscreen", false, false);
        };
        MediaPlayerTests.prototype.testWhenSetIsFullScreenLegacyProtpertynameThenCurrentPropertynameUpdatesValue = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            LiveUnit.Assert.isNotNull(mediaPlayer["isFullScreen"]);
            safeDispose(mediaPlayer);
        };
        MediaPlayerTests.prototype.testWhenSetFullScreenToTrueThenHasCorrectClasses = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.fullScreen = true;
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(mediaPlayer.element, "win-mediaplayer-fullscreen"), "MediaPlayer does not have the 'win-mediaplayer-fullscreen' class.");
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(mediaPlayer.element, "win-focusable"), "MediaPlayer has the 'win-focusable' class.");
            safeDispose(mediaPlayer);
        };
        MediaPlayerTests.prototype.testWhenSetFullScreenToFalseThenHasCorrectClasses = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.fullScreen = false;
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(mediaPlayer.element, "win-mediaplayer-fullscreen"), "MediaPlayer has the 'win-mediaplayer-fullscreen' class.");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(mediaPlayer.element, "win-focusable"), "MediaPlayer does not have the 'win-focusable' class.");
            safeDispose(mediaPlayer);
        };
        MediaPlayerTests.prototype.testWhenSetFullScreenToTrueThenToggleFullScreenIconUpdates = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.fullScreen = true;
            LiveUnit.Assert.areEqual(WinJS.UI.AppBarIcon.backtowindow, mediaPlayer.element.querySelector(".win-mediaplayer-fullscreenbutton").winControl.icon, "fullscreen toggle button icon is incorrect.");
            safeDispose(mediaPlayer);
        };
        MediaPlayerTests.prototype.testWhenSetFullScreenToFalseThenToggleFullScreenIconUpdates = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.fullScreen = false;
            LiveUnit.Assert.areEqual(WinJS.UI.AppBarIcon.fullscreen, mediaPlayer.element.querySelector(".win-mediaplayer-fullscreenbutton").winControl.icon, "fullscreen toggle button icon is incorrect.");
            safeDispose(mediaPlayer);
        };

        // thumbnailEnabled
        MediaPlayerTests.prototype.testWhenSetThumbnailEnabledToTrueThenPropertyUpdates = function () {
            runSetMediaPlayerPropertyCase("thumbnailEnabled", true, false);
        };
        MediaPlayerTests.prototype.testWhenSetThumbnailEnabledToFalseThenPropertyUpdates = function () {
            runSetMediaPlayerPropertyCase("thumbnailEnabled", false, false);
        };
        MediaPlayerTests.prototype.testWhenSetThumbnailEnabledToTrueThenHasCorrectClasses = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.thumbnailEnabled = true;
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(mediaPlayer._timeline, "win-mediaplayer-thumbnailmode"), "Does not have the correct classes.");
            safeDispose(mediaPlayer);
        };
        MediaPlayerTests.prototype.testWhenSetThumbnailEnabledToFalseThenHasCorrectClasses = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.thumbnailEnabled = false;
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(mediaPlayer._timeline, "win-mediaplayer-thumbnailmode"), "Does not have the correct classes.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSetIsThumbnailEnabledLegacyProtpertynameThenCurrentPropertynameUpdatesValue = function () {
            runEnsureLegacyPropertyStillExistsTestCase("isThumbnailEnabled", "thumbnailEnabled", true);
        };

        // markers
        MediaPlayerTests.prototype.testWhenAddMarkerThenMarkersContainsNewMarkerAndNewMarkerPropertiesAreCorrect = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            var newMarkerTime = 15;
            mediaPlayer.addMarker(newMarkerTime, WinJS.UI.MarkerType.chapter, "Hello World!", "win-displaynone");

            // Search for the marker we just added
            var markers = mediaPlayer._markers;
            var foundMarker = false;
            for (var i = 0; i < markers.length; i++) {
                if (markers[i].time === newMarkerTime) {
                    foundMarker = true;
                    LiveUnit.Assert.areEqual(newMarkerTime, markers[i].time, "The marker time did not match.");
                    LiveUnit.Assert.areEqual(WinJS.UI.MarkerType.chapter, markers[i].type, "The marker type did not match.");
                    LiveUnit.Assert.areEqual("Hello World!", markers[i].data, "The marker data field did not match.");
                    LiveUnit.Assert.areEqual("win-displaynone", markers[i].extraClass, "The marker extraClass field did not match.");
                }
            }

            if (!foundMarker) {
                LiveUnit.Assert.fail("Marker array does not contain the new marker.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenAddMarkerAndTypeIsChapterAndExtraClassIsNotSpecifiedThenMarkersContainsNewMarkerAndExtraClassIsDefaultChapterMarkerExtraClass = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            var newMarkerTime = 15;
            mediaPlayer.addMarker(newMarkerTime, WinJS.UI.MarkerType.chapter, "Hello World!");
            var markers = mediaPlayer._markers;
            var foundMarker = false;

            for (var i = 0; i < markers.length; i++) {
                if (markers[i].time === newMarkerTime) {
                    foundMarker = true;
                    LiveUnit.Assert.areEqual("win-mediaplayer-chaptermarker", markers[i].extraClass, "The marker extraClass field did not have the default chapter marker class.");
                }
            }

            if (!foundMarker) {
                LiveUnit.Assert.fail("Marker array does not contain the new marker.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenExistingMarkerAt1SecondWhenAddNewMarkerAt1SecondThenMarkersContainTheNewMarkerAndTheOldOneIsOverriden = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            mediaPlayer.addMarker(1, WinJS.UI.MarkerType.chapter, "Marker 1");
            mediaPlayer.addMarker(1, WinJS.UI.MarkerType.chapter, "Marker 2");
            LiveUnit.Assert.areNotEqual(2, mediaPlayer._markers.length, "The old marker did not get removed.");
            LiveUnit.Assert.areEqual("Marker 2", mediaPlayer._markers[0].data, "The old marker was not overriden.");
        };

        MediaPlayerTests.prototype.testGivenValidMarkerAtPoint5SecondsWhenCurrentTimeReachesPoint5SecondsThenMarkerReachedContainsCorrectProperties = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();

            var expectedTime = 0.5;
            var expectedType = WinJS.UI.MarkerType.chapter;
            var expectedData = "Some data";
            var expectedExtraClass = "win-displaynone";

            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.addMarker(expectedTime, expectedType, expectedData, expectedExtraClass);
            mediaPlayer.addEventListener("markerreached", function markerReached(ev) {
                mediaPlayer.removeEventListener("markerreached", markerReached);
                LiveUnit.Assert.areEqual(expectedTime, ev.detail.time, "Expected eventObj.time to be '" + expectedTime + "', but instead was: " + ev.detail.time + ".");
                LiveUnit.Assert.areEqual(expectedType, ev.detail.type, "Expected eventObj.type to be'" + expectedType + "', but instead was: " + ev.detail.type + ".");
                LiveUnit.Assert.areEqual(expectedData, ev.detail.data, "Expected eventObj.data to be '" + expectedData + "', but instead was: " + ev.detail.data + ".");
                LiveUnit.Assert.areEqual(expectedExtraClass, ev.detail.extraClass, "Expected eventObj.data to be '" + expectedExtraClass + "', but instead was: " + ev.detail.extraClass + ".");
                complete();
                safeDispose(mediaPlayer);
            }, false);
            mockMediaElement.src = "notnullstring";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.showControls();
            mockMediaElement.currentTime = expectedTime;
            mockMediaElement.fireEvent("timeupdate");
        };

        MediaPlayerTests.prototype.testGivenMarkerAt1SecondWhenCurrentTimeReaches1SecondThenMarkerReachedEventFires = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();

            var expectedTime = 1;
            var expectedType = WinJS.UI.MarkerType.chapter;
            var expectedData = "Some data";
            var expectedExtraClass = "win-displaynone";

            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.addMarker(expectedTime, expectedType, expectedData, expectedExtraClass);
            mediaPlayer.addEventListener("markerreached", function markerReached(ev) {
                mediaPlayer.removeEventListener("markerreached", markerReached);
                LiveUnit.Assert.areEqual(expectedTime, ev.detail.time, "Expected eventObj.time to be '" + expectedTime + "', but instead was: " + ev.detail.time + ".");
                LiveUnit.Assert.areEqual(expectedType, ev.detail.type, "Expected eventObj.type to be'" + expectedType + "', but instead was: " + ev.detail.type + ".");
                LiveUnit.Assert.areEqual(expectedData, ev.detail.data, "Expected eventObj.data to be '" + expectedData + "', but instead was: " + ev.detail.data + ".");
                LiveUnit.Assert.areEqual(expectedExtraClass, ev.detail.extraClass, "Expected eventObj.data to be '" + expectedExtraClass + "', but instead was: " + ev.detail.extraClass + ".");
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mockMediaElement.src = "notnullstring";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.showControls();
            mockMediaElement.currentTime = expectedTime;
            mockMediaElement.fireEvent("timeupdate");
        };

        MediaPlayerTests.prototype.testGivenMarkerAt0SecondsWhenCurrentTimeReaches0SecondsThenMarkerReachedEventFires = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();

            var expectedTime = 0;
            var expectedType = WinJS.UI.MarkerType.chapter;
            var expectedData = "Some data";
            var expectedExtraClass = "win-displaynone";

            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.addMarker(expectedTime, expectedType, expectedData, expectedExtraClass);
            mediaPlayer.addEventListener("markerreached", function markerReached(ev) {
                mediaPlayer.removeEventListener("markerreached", markerReached);
                LiveUnit.Assert.areEqual(expectedTime, ev.detail.time, "Expected eventObj.time to be '" + expectedTime + "', but instead was: " + ev.detail.time + ".");
                LiveUnit.Assert.areEqual(expectedType, ev.detail.type, "Expected eventObj.type to be'" + expectedType + "', but instead was: " + ev.detail.type + ".");
                LiveUnit.Assert.areEqual(expectedData, ev.detail.data, "Expected eventObj.data to be '" + expectedData + "', but instead was: " + ev.detail.data + ".");
                LiveUnit.Assert.areEqual(expectedExtraClass, ev.detail.extraClass, "Expected eventObj.data to be '" + expectedExtraClass + "', but instead was: " + ev.detail.extraClass + ".");
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mockMediaElement.src = "notnullstring";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.showControls();
            mockMediaElement.currentTime = expectedTime;
            mockMediaElement.fireEvent("timeupdate");
        };

        MediaPlayerTests.prototype.testGivenMarkerAtEndOfVideoWhenCurrentTimeReachesEndOfVideoThenMarkerReachedEventFires = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;

            var expectedTime = mockMediaElement.duration;
            var expectedType = WinJS.UI.MarkerType.chapter;
            var expectedData = "Some data";
            var expectedExtraClass = "win-displaynone";

            mediaPlayer.addMarker(expectedTime, expectedType, expectedData, expectedExtraClass);
            mediaPlayer.addEventListener("markerreached", function markerReached(ev) {
                mediaPlayer.removeEventListener("markerreached", markerReached);
                LiveUnit.Assert.areEqual(expectedTime, ev.detail.time, "Expected eventObj.time to be '" + expectedTime + "', but instead was: " + ev.detail.time + ".");
                LiveUnit.Assert.areEqual(expectedType, ev.detail.type, "Expected eventObj.type to be'" + expectedType + "', but instead was: " + ev.detail.type + ".");
                LiveUnit.Assert.areEqual(expectedData, ev.detail.data, "Expected eventObj.data to be '" + expectedData + "', but instead was: " + ev.detail.data + ".");
                LiveUnit.Assert.areEqual(expectedExtraClass, ev.detail.extraClass, "Expected eventObj.data to be '" + expectedExtraClass + "', but instead was: " + ev.detail.extraClass + ".");
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mockMediaElement.src = "notnullstring";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.showControls();
            mockMediaElement.currentTime = expectedTime;
            mockMediaElement.fireEvent("timeupdate");
        };

        MediaPlayerTests.prototype.testGivenMarkerAtPoint7SecondsWhenMarkerIsRemovedAndCurrentTimeReachesPoint7SecondsThenMarkerreachedEventDoesNotFire = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();

            var expectedTime = 0.7;
            var expectedType = WinJS.UI.MarkerType.chapter;
            var expectedData = "Some data";
            var expectedExtraClass = "win-displaynone";

            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.addMarker(expectedTime, expectedType, expectedData, expectedExtraClass);
            mediaPlayer.removeMarker(expectedTime);
            mediaPlayer.addEventListener("markerreached", function markerReached(ev) {
                LiveUnit.Assert.fail("markerreached event should not have fired.");
            }, false);
            mockMediaElement.src = "notnullstring";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.showControls();
            mockMediaElement.currentTime = expectedTime;
            mockMediaElement.fireEvent("timeupdate");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenExistingMarkerWhenRemoveMarkerThenMarkersDoesNotContainRemovedMarker = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            mediaPlayer.addMarker(11, WinJS.UI.MarkerType.chapter, {});
            var markers = mediaPlayer._markers;
            mediaPlayer.removeMarker(11);
            var markers = mediaPlayer._markers;
            var foundMarker = false;
            for (var i = 0; i < markers.length; i++) {
                if (markers[i].time === 10) {
                    foundMarker = true;
                }
            }

            if (foundMarker) {
                LiveUnit.Assert.fail("Marker array should not contain the old timeline marker, but it does.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.GivenNoSrcSetWhenAddMarkerThenDoesNotThrowException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            var threwException = false;
            try {
                mediaPlayer.addMarker(12, WinJS.UI.MarkerType.chapter, {});
            } catch (exception) {
                threwException = true;
            }

            if (threwException) {
                LiveUnit.Assert.fail("Calling addMarker on a Media Transport Control with no source threw an exception.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenaddMarkerAndTimeIsNotANumberThenThrowsAnException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();

            var threwException = false;
            try {
                mediaPlayer.addMarker("foo", WinJS.UI.MarkerType.chapter, {});
            } catch (exception) {
                threwException = true;
            }

            if (!threwException) {
                LiveUnit.Assert.fail("Calling addMarker on with a time value of 'foo' did not throw an exception.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenAddMarkerWithNegativeTimeFieldThenDoesNotThrowAnException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            var threwException = false;
            try {
                mediaPlayer.addMarker(-1, WinJS.UI.MarkerType.chapter, {});
            } catch (exception) {
                threwException = true;
            }

            if (threwException) {
                LiveUnit.Assert.fail("Calling addMarker on with a time value of '-1' threw an exception.");
            }
        };

        MediaPlayerTests.prototype.testWhenAddMarkerAndTimeIsGreaterThanEndTimeThenDoesNotThrowAnException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            var threwException = false;
            try {
                mediaPlayer.addMarker(mediaPlayer.endTime + 10, WinJS.UI.MarkerType.chapter, {});
            } catch (exception) {
                threwException = true;
            }

            if (threwException) {
                LiveUnit.Assert.fail("Calling addMarker on with a time value greater than the endTime of the media threw an exception.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenAddMarkerAndTimeIsLessThanStartTimeThenDoesNotThrowAnException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            var threwException = false;
            try {
                mediaPlayer.addMarker(mediaPlayer.startTime - 10, WinJS.UI.MarkerType.chapter, {});
            } catch (exception) {
                threwException = true;
            }

            if (threwException) {
                LiveUnit.Assert.fail("Calling addMarker on with a time value less than the startTime of the media threw an exception.");
            }
            safeDispose(mediaPlayer);
        };

        // Add two markers at the same time & it's fine
        MediaPlayerTests.prototype.testWhenAddMarkerAndTimeIsNullThenThrowException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            var threwException = false;
            try {
                mediaPlayer.addMarker(null, WinJS.UI.MarkerType.chapter, {});
            } catch (exception) {
                threwException = true;
            }

            if (!threwException) {
                LiveUnit.Assert.fail("Calling addMarker on with a time value of 'null' did not throw an exception.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenAddMarkerAndTypeIsNotValidEnumThenThrowException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            var threwException = false;
            try {
                mediaPlayer.addMarker(12, "invalidMarkerType", {});
            } catch (exception) {
                threwException = true;
            }

            if (!threwException) {
                LiveUnit.Assert.fail("Calling addMarker on with a markerType of 'invalidMarkerType' did not throw an exception.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenAddMarkerAndTypeIsNullThenDoesNotThrowException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            var threwException = false;
            try {
                mediaPlayer.addMarker(12, null, {});
            } catch (exception) {
                threwException = true;
            }

            if (threwException) {
                LiveUnit.Assert.fail("Calling addMarker on with a markerType of 'null' should not throw an exception.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenAddMarkerAndtypeIsNotspecifiedThenDefaultsToChapter = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            mediaPlayer.addMarker(12);
            LiveUnit.Assert.areEqual(WinJS.UI.MarkerType.chapter, mediaPlayer.markers[0].type);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenremoveMarker_called_on_non_existant_markerThenDoesNotThrowException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            var threwException = false;
            try {
                mediaPlayer.removeMarker(999);
            } catch (exception) {
                threwException = true;
            }

            if (threwException) {
                LiveUnit.Assert.fail("Calling removeMarker on a non-existant marker did not throw an exception.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenAddMarkerAndExtraClassIsNullThenDoesNotThrowException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = document.createElement("video");
            var threwException = false;
            try {
                mediaPlayer.addMarker(12, WinJS.UI.MarkerType.chapter, {}, null);
            } catch (exception) {
                threwException = true;
            }

            if (threwException) {
                LiveUnit.Assert.fail("Calling addMarker on with a extraClass of 'null' threw an exception even though it is an optional parameter.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGiven3ConsecutiveMarkersEachSepeartedByOneSecondWhenPlayThenMarkerreachedEventFiresForAllThreeMarkers = function (complete) {
            var expectedTime1 = 10;
            var expectedTime2 = 11;
            var expectedTime3 = 12;

            var marker1Reached = false;
            var marker2Reached = false;
            var marker3Reached = false;

            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;

            var expectedTime = mockMediaElement.duration;
            var expectedType = WinJS.UI.MarkerType.chapter;
            var expectedData = "Some data";
            var expectedExtraClass = "win-displaynone";

            mediaPlayer.addMarker(expectedTime1);
            mediaPlayer.addMarker(expectedTime2);
            mediaPlayer.addMarker(expectedTime3);

            mediaPlayer.addEventListener("markerreached", function markerReached(ev) {
                if (ev.detail.time === expectedTime1) {
                    marker1Reached = true;
                } else if (ev.detail.time === expectedTime2) {
                    marker2Reached = true;
                } else if (ev.detail.time === expectedTime3) {
                    marker3Reached = true;
                }
            }, false);

            mockMediaElement.addEventListener("timeupdate", function timeupdate() {
                if (mockMediaElement.currentTime === expectedTime3 + 1 &&
                    marker1Reached &&
                    marker2Reached &&
                    marker3Reached) {
                    mockMediaElement.removeEventListener("timeupdate", timeupdate);
                    safeDispose(mediaPlayer);
                    complete();
                }
            });

            mockMediaElement.src = "notnullstring";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.showControls();
            mockMediaElement.currentTime = expectedTime1;
            mockMediaElement.fireEvent("timeupdate");
            mockMediaElement.currentTime = expectedTime2;
            mockMediaElement.fireEvent("timeupdate");
            mockMediaElement.currentTime = expectedTime3;
            mockMediaElement.fireEvent("timeupdate");
            mockMediaElement.currentTime = expectedTime3 + 1;
            mockMediaElement.fireEvent("timeupdate");
        };

        MediaPlayerTests.prototype.testGivenExistingMarkerWhenSeekPastMarkerThenMarkerreachedEventDoesNotFire = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();

            var expectedTime = 1;
            var expectedType = WinJS.UI.MarkerType.chapter;
            var expectedData = "Some data";
            var expectedExtraClass = "win-displaynone";

            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.addMarker(expectedTime, expectedType, expectedData, expectedExtraClass);
            mediaPlayer.removeMarker(expectedTime);
            mediaPlayer.addEventListener("markerreached", function markerReached(ev) {
                LiveUnit.Assert.fail("markerreached event should not have fired.");
            }, false);
            mockMediaElement.src = "notnullstring";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.showControls();
            mockMediaElement.currentTime = expectedTime + 3;
            mockMediaElement.fireEvent("timeupdate");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenExistingMarkerWhenSeekToVeryCloseBeforeTheMarkerThenMarkerreachedEventFires = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();

            var expectedTime = 1;

            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.addMarker(expectedTime);
            mediaPlayer.addEventListener("markerreached", function markerReached(ev) {
                mediaPlayer.removeEventListener("markerreached", markerReached);
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mockMediaElement.src = "notnullstring";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.showControls();
            mockMediaElement.currentTime = expectedTime + 0.1;
            mockMediaElement.fireEvent("timeupdate");
        };

        MediaPlayerTests.prototype.testGivenExistingMarkerWhenSeekVeryCloseBeforeMarkerThenMarkerreachedEventFires = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            var expectedTime = 1;
            mediaPlayer.addMarker(expectedTime);
            mediaPlayer.addEventListener("markerreached", function markerReached(ev) {
                mediaPlayer.removeEventListener("markerreached", markerReached);
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mockMediaElement.src = "notnullstring";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.showControls();
            mockMediaElement.currentTime = expectedTime - 0.1;
            mockMediaElement.fireEvent("timeupdate");
        };

        MediaPlayerTests.prototype.testGivenExistingMarkersWhenVideoEmptiedEventThenoldMarkersAreRemoved = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();

            mediaPlayer.addMarker(1);
            mediaPlayer.addMarker(2);
            mediaPlayer.addMarker(3);

            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.fireEvent("ended");

            LiveUnit.Assert.areEqual(0, mediaPlayer.markers.length);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenExistingMarkersButMediaNotLoadedWhenMediaElementAdapterChangesThenOldMarkersNotRemoved = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;

            mediaPlayer.addMarker(0, WinJS.UI.MarkerType.chapter, {});
            mediaPlayer.addMarker(1, WinJS.UI.MarkerType.chapter, {});
            mediaPlayer.addMarker(2, WinJS.UI.MarkerType.chapter, {});
            mediaPlayer.mediaElementAdapter = {};
            LiveUnit.Assert.isTrue(mediaPlayer.markers.length > 0);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenDefaultChapterMarkersWhenCurrentTimePassesDefaultMarkerThenMarkerreachedEventDoesNotFire = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.addEventListener("markerreached", function markerReached(ev) {
                mediaPlayer.removeEventListener("markerreached", markerReached);
                LiveUnit.Assert.fail("markerreached event should not fire for default chapter markers");
            }, false);
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.autoplay = true;
            mediaPlayer.endTime = mediaPlayer._MINIMUM_MEDIA_LENGTH_FOR_DEFAULT_MARKERS + 1;
            mockMediaElement.src = "notnullstring";
            mockMediaElement.currentTime = mediaPlayer._defaultChapterMarkers[0].time;
            mockMediaElement.fireEvent("timeupdate");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenDefaultChapterMarkersWhenChapterMarkerAddedThenDefaultChapterMarkersAreCleared = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.autoplay = true;
            mediaPlayer.endTime = mediaPlayer._MINIMUM_MEDIA_LENGTH_FOR_DEFAULT_MARKERS + 1;
            mockMediaElement.src = "notnullstring";
            mediaPlayer.addMarker(10, WinJS.UI.MarkerType.chapter);
            LiveUnit.Assert.isFalse(mediaPlayer._defaultChapterMarkers.length);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenMediaUnder1MinuteWhenvideoIsLoadedThenDefaultChapterMarkersAreNotAdded = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.autoplay = true;
            mediaPlayer.endTime = mediaPlayer._MINIMUM_MEDIA_LENGTH_FOR_DEFAULT_MARKERS - 1;
            mockMediaElement.src = "notnullstring";
            LiveUnit.Assert.isFalse(mediaPlayer._defaultChapterMarkers.length);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenAddMarkerCalledAndMarkersAreInsertedOutOfOrderThenMarkersArrayIsSorted = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.addMarker(20, WinJS.UI.MarkerType.chapter, {});
            mediaPlayer.addMarker(10, WinJS.UI.MarkerType.chapter, {});
            var markers = mediaPlayer._markers;
            LiveUnit.Assert.areEqual(markers[0].time, 10, "The markers array was not sorted properly.");
            LiveUnit.Assert.areEqual(markers[1].time, 20, "The markers array was not sorted properly.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGiven3MarkersWithin200MilisecondsWhenCurrentTimeIsCloseToMarkersTheAllMarkerreachedEventsFire = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;

            var marker1Time = 3.21;
            var marker2Time = 3.2;
            var marker3Time = 3.23;

            var marker1Fired = false;
            var marker2Fired = false;
            var marker3Fired = false;

            mediaPlayer.addMarker(marker1Time);
            mediaPlayer.addMarker(marker2Time);
            mediaPlayer.addMarker(marker3Time);

            mediaPlayer.addEventListener("markerreached", function handleMarkerReached(ev) {
                if (ev.detail.time === marker1Time) {
                    marker1Fired = true;
                } else if (ev.detail.time === marker2Time) {
                    marker2Fired = true;
                } else if (ev.detail.time === marker3Time) {
                    marker3Fired = true;
                }
            }, false);
            mockMediaElement.addEventListener("timeupdate", function timeupdate() {
                if (mockMediaElement.currentTime === marker3Time + 1 &&
                    marker1Fired &&
                    marker2Fired &&
                    marker3Fired) {
                    mockMediaElement.removeEventListener("timeupdate", timeupdate);
                    safeDispose(mediaPlayer);
                    complete();
                }
            }, false);
            mockMediaElement.currentTime = marker2Time;
            mockMediaElement.fireEvent("timeupdate");
            mockMediaElement.currentTime = marker3Time + 1;
            mockMediaElement.fireEvent("timeupdate");
        };

        MediaPlayerTests.prototype.testGivenExistingMarkersWhenMediaLoadedThenMarkersAreGone = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "source";

            // Add some markers
            mediaPlayer.addMarker(1);
            mediaPlayer.addMarker(2);
            mediaPlayer.addMarker(3);

            // Set a new source
            mockMediaElement.fireEvent("emptied");
            mockMediaElement.src = "newsource";
            LiveUnit.Assert.isFalse(mediaPlayer.markers.length);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenNoMarkerAtTheSpecifiedTimeWhenRemoveMarkerAndNoMarkerIsRemovedThenNoExceptionIsThrown = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            var wasExceptionThrown = false;
            try {
                mediaPlayer.removeMarker(3);
            } catch (exception) {
                wasExceptionThrown = true;
            }
            LiveUnit.Assert.isFalse(wasExceptionThrown);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSetMarkersWithValidMarkersCollectionThenMarkersAreAdded = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var myMarkers = [
                { time: 1, type: WinJS.UI.MarkerType.chapter, data: {} },
                { time: 2, type: WinJS.UI.MarkerType.custom, data: {} },
                { time: 3, type: WinJS.UI.MarkerType.advertsing, data: {} }
            ];
            mediaPlayer.markers = myMarkers;
            LiveUnit.Assert.isTrue(compareArrays(myMarkers, mediaPlayer.markers), "MediaPlayer.markers does not contain the same values we added to it.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSetMarkersWithInvalidFirstMarkerThenExceptionIsNotThrown = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var wasExceptionThrown = false;

            var myMarkers = [
                { invalidFieldName: "invalid" },
                { bar: 1, foo: WinJS.UI.MarkerType.chapter, data: {} },
                { time: 2, type: WinJS.UI.MarkerType.custom }
            ];

            try {
                mediaPlayer.markers = myMarkers;
            } catch (exception) {
                wasExceptionThrown = true;
            }

            LiveUnit.Assert.isFalse(wasExceptionThrown, "Adding a markers collection with an invalid 1st marker throws an exception.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSetMarkersWithEmptyArrayThenDoesNotthrowAnException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var wasExceptionThrown = false;
            var myMarkers = [];
            try {
                mediaPlayer.markers = myMarkers;
            } catch (exception) {
                wasExceptionThrown = true;
            }
            LiveUnit.Assert.isFalse(wasExceptionThrown, "Setting the markers collection to an empty array did not throw an exception, but it should have.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenExistingMarkersWhenSetMarkersWithEmptyArrayThenPreviousMarkersAreCleared = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.markers = [
                { time: 1, type: WinJS.UI.MarkerType.chapter, data: {} },
                { time: 2, type: WinJS.UI.MarkerType.custom, data: {} },
                { time: 3, type: WinJS.UI.MarkerType.advertsing, data: {} }
            ];
            var myMarkers = [];
            mediaPlayer.markers = myMarkers;
            LiveUnit.Assert.areEqual(0, mediaPlayer.markers.length, "Setting the markers collection to an empty array did not clear the previous markers when it should have.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSetMarkersSetToNullThenDoesNotThrowAnException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var wasExceptionThrown = false;
            try {
                mediaPlayer.markers = null;
            } catch (exception) {
                wasExceptionThrown = true;
            }
            LiveUnit.Assert.isTrue(wasExceptionThrown, "Setting the MediaPlayer.markers collection to null did not throw an exception when it should have.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSetMarkersAnUnsortedMarkerCollectionThenMarkersAreSorted = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var myUnsortedMarkers = [
                { time: 3, type: WinJS.UI.MarkerType.chapter, data: {} },
                { time: 2, type: WinJS.UI.MarkerType.custom, data: {} },
                { time: 1, type: WinJS.UI.MarkerType.advertisement, data: {} }
            ];
            var mySortedMarkers = myUnsortedMarkers.sort(function (first, next) {
                return first.time - next.time;
            });
            mediaPlayer.markers = myUnsortedMarkers;
            LiveUnit.Assert.isTrue(compareArrays(mySortedMarkers, mediaPlayer.markers), "The MediaPlayer.markers collection was not sorted.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenExistingMarkersWhenSetMarkersThenOldMarkersAreRemoved = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.addMarker(1, WinJS.UI.MarkerType.chapter, {});
            mediaPlayer.markers = [];
            LiveUnit.Assert.areEqual(0, mediaPlayer.markers.length, "The old markers were not removed.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenMarkersArrayIsSetWhenVideoLoadedThenMarkersArrayIsPersisted = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            var markers = [
                { time: 3, type: WinJS.UI.MarkerType.chapter, data: {} },
                { time: 2, type: WinJS.UI.MarkerType.custom, data: {} },
                { time: 1, type: WinJS.UI.MarkerType.advertisement, data: {} }
            ];
            mediaPlayer.markers = markers;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnullstring";
            LiveUnit.Assert.isTrue(compareArrays(markers, mediaPlayer.markers), "The MediaPlayer.markers collection was not persisted.");
            safeDispose(mediaPlayer);
        };

        // Audio / video tag tests
        MediaPlayerTests.prototype.testGivenAudioTagWithControlsEnabledWhenMediaPlayerIsInstantiatedThenAudioTagHasNoControls = function () {
            var audio = document.createElement("audio");
            audio.controls = true;
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = audio;
            LiveUnit.Assert.isFalse(mediaPlayer.mediaElementAdapter.mediaElement.controls, "Audio tag has controls enabled, but it should not have.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenAudioTagWhenMediaPlayerIsInstantiatedThenItDtectsThatItIsinAudioMode = function () {
            var audio = document.createElement("audio");
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = audio;
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(mediaPlayer._controls, "win-mediaplayer-audio-full"), "MediaPlayer does not think it's in audio mode, because it doesn't have the expected CSS class.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenVideoTagWithControlsEnabledWhenMediaPlayerIsInstantiatedThenVideoTagHasNoControls = function () {
            var video = document.createElement("video");
            video.controls = true;
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = video;
            LiveUnit.Assert.isFalse(mediaPlayer.mediaElementAdapter.mediaElement.controls, "Video tag visible controls when it should not have.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenVideoTagWhenMediaPlayerIsinstantiatedThenItDetectsThatItIsInVideoMode = function () {
            var video = document.createElement("video");
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = video;
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(mediaPlayer._controls, "win-mediaplayer-video-full"), "MediaPlayer does not think it's in video mode, because it doesn't have the expected CSS class.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenVideoTagWithLoopAndEndTimeSetWhenCurrentTimeReachesEndTimeThenVideoStartsPlayingFromTheBeginning = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.loop = true;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnullstring";
            mediaPlayer.endTime = 10;
            mockMediaElement.addEventListener("play", function () {
                LiveUnit.Assert.areEqual(0, mockMediaElement.currentTime);
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mockMediaElement.currentTime = mediaPlayer.endTime + 1;
        };

        MediaPlayerTests.prototype.testGivenVideoTagWithAutoplayAndStartTimeSetWhenVideoIsloadedThenVideoStartsPlaying = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.autoplay = true;
            mockMediaElement.duration = 10;
            mediaPlayer.startTime = 1;
            // The MediaPlayer will seek to the startTime, but the readyState of the fake video tag needs to be 3 so that the seek will happen.
            mockMediaElement.readyState = 3;
            mockMediaElement.addEventListener("play", function () {
                LiveUnit.Assert.areEqual(1, mockMediaElement.currentTime);
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mockMediaElement.src = "notnullstring";
        };

        MediaPlayerTests.prototype.testGivenMediaElementIsSetToVideo1WhenMediaElementIsSetToNullThenVideo1DoesNotHaveCssClassesAddedByTheMediaPlayer = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var videoTag = document.createElement("video");
            mediaPlayer.mediaElementAdapter.mediaElement = videoTag;
            mediaPlayer.mediaElementAdapter.mediaElement = null;
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(videoTag, "win-mediaplayer-video"), "CSS classes added by the mediaPlayer are still present on the video tag even though it was swapped out for a new one.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenMediaElementIsSetToVideo1WhenMediaElementIsSetToNullThenVideo1DoesNotHaveTheEventListenersAddedByTheMediaPlayer = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var oldMediaElement = mediaPlayer.mediaElementAdapter.mediaElement;
            mediaPlayer.mediaElementAdapter.mediaElement = null;
            LiveUnit.Assert.isTrue(mediaPlayer._mediaEventSubscriptions.length === 0, "The events listeners added by the mediaPlayer as still attached to the old mediaElement, but should have been cleaned up.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenMediaElementIsSetToNewMediaElementThenNewMediaElementHasAppropriateClasses = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var video = document.createElement("video");
            mediaPlayer.mediaElementAdapter.mediaElement = video;
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(video, "win-mediaplayer-video"), "CSS class that was added by the mediaPlayer is not present.");
            safeDispose(mediaPlayer);
        };

        // Chapter skip tests
        MediaPlayerTests.prototype.testGiveninTheMiddleOfTheMediaWhenChapterSkipForwardThenCurrentTimeIsAtTheNextChapter = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 3;
            mockMediaElement.duration = 60;
            mockMediaElement.currentTime = mockMediaElement.duration / 2;
            var nextMarkerTime = mediaPlayer.mediaElementAdapter.mediaElement.duration * 0.6;
            mediaPlayer.addMarker(nextMarkerTime, WinJS.UI.MarkerType.chapter, "Next chapter");
            mediaPlayer.chapterSkipForward();
            LiveUnit.Assert.areEqual(nextMarkerTime, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenLessThanOneChapterFromTheEndWhenChapterSkipForwardThenPositionIsAtTheEndOfTheVideo = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 3;
            mockMediaElement.duration = 60;
            mockMediaElement.currentTime = mockMediaElement.duration - 0.1;
            mediaPlayer.chapterSkipForward();
            LiveUnit.Assert.areEqual(mockMediaElement.duration, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenAtTheEndWhenChapterSkipForwardThenPositionIsAtTheEnd = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 3;
            mockMediaElement.duration = 60;
            mockMediaElement.currentTime = mockMediaElement.duration;
            mediaPlayer.chapterSkipForward();
            LiveUnit.Assert.areEqual(mockMediaElement.duration, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenOnlySlightlyPastAnExistingMarkerWhenChapterSkipBackThenPositionJumpsBackTwoMarkersInsteadOfOne = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 3;
            mockMediaElement.src = "notnull";
            mockMediaElement.duration = 90;
            var slightlyPastSecondMarker = mediaPlayer.mediaElementAdapter.mediaElement.duration * 0.1 + 0.25;
            mockMediaElement.currentTime = slightlyPastSecondMarker;
            mediaPlayer.chapterSkipBack();
            LiveUnit.Assert.areEqual(0, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenInTheMiddleWhenChapterSkipBackThenPositionIsAtThePreviousChapter = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 3;
            mockMediaElement.src = "notnull";
            mockMediaElement.duration = 90;
            var middleOfMedia = mediaPlayer.mediaElementAdapter.mediaElement.duration / 2;
            mockMediaElement.currentTime = middleOfMedia;
            var previousMarkerTime = mediaPlayer.mediaElementAdapter.mediaElement.duration * 0.4;
            mediaPlayer.chapterSkipBack();
            LiveUnit.Assert.areEqual(previousMarkerTime, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenLessThanOneChapterFromTheBeginningWhenChapterSkipBackThenIsAtTheBeginningOfTheMedia = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 3;
            mockMediaElement.src = "notnull";
            mockMediaElement.duration = 90;
            var lessThanOneChapterAwayFromTheBeginning = mediaPlayer.mediaElementAdapter.mediaElement.duration * 0.1 - 5;
            mockMediaElement.currentTime = lessThanOneChapterAwayFromTheBeginning;
            mediaPlayer.chapterSkipBack();
            LiveUnit.Assert.areEqual(0, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenAtTheBeginningWhenChapterSkipBackThenPositionIsAtTheBeginning = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 3;
            mockMediaElement.src = "notnull";
            mockMediaElement.duration = 90;
            mockMediaElement.currentTime = 0;
            mediaPlayer.chapterSkipBack();
            LiveUnit.Assert.areEqual(0, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenOnlySlightlyBeforeAnExistingMarkerWhenChapterSkipForwardThenPositionJumpsForwardTwoMarkersInsteadOfOne = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 3;
            mockMediaElement.src = "notnull";
            mockMediaElement.duration = 90;
            var slightlyPastSecondMarker = mediaPlayer.mediaElementAdapter.mediaElement.duration * 0.1 - 0.25;
            mockMediaElement.currentTime = slightlyPastSecondMarker;
            var expectedNextMarkerTime = mediaPlayer.mediaElementAdapter.mediaElement.duration * 0.2;
            mediaPlayer.chapterSkipForward();
            LiveUnit.Assert.areEqual(expectedNextMarkerTime, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenMediaWithNoChapterMarkersWhenMediaPlayerIsinitializedThenCorrectNumberOfDefaultMarkersAreAdded = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 3;
            mockMediaElement.src = "notnull";
            mockMediaElement.duration = 90;
            LiveUnit.Assert.areEqual(11, mediaPlayer._defaultChapterMarkers.length);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenTextTrackWhereKindIsChaptersWhenInitializedThenDeafultChapterMarkersAreNotAdded = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mockMediaElement.textTracks = [{
                id: "control1",
                label: "chapter",
                src: "notnull",
                kind: "chapters",
                addEventListener: function () { }
            }];
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.autoplay = true;
            mockMediaElement.duration = 90;
            mockMediaElement.src = "notnull";
            LiveUnit.Assert.isFalse(mediaPlayer._defaultChapterMarkers.length);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGiventextTrackWhereKindIsNotChaptersWhenInitializedThenChapterMarkersAreNotAddedForThatTextTrack = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mockMediaElement.textTracks = [{
                id: "control1",
                label: "chapter",
                src: "notnull",
                kind: "custom",
                addEventListener: function () { }
            }];
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.autoplay = true;
            mockMediaElement.duration = 90;
            mockMediaElement.src = "notnull";
            LiveUnit.Assert.isFalse(mediaPlayer.markers.length);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenAMarkerPastTheEndTimeWhenMediaPlayerIsInitializedThenTheMarkerIsAdded = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.endTime = 10;
            mediaPlayer.addMarker(mockMediaElement.endTime + 1);
            LiveUnit.Assert.isTrue(mediaPlayer.markers.length);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenAtartTimeIsSetWhenMediaPlayerMarkerAddedBeforeStartTimeThenTheMarkerIsAdded = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.startTime = 10;
            mediaPlayer.addMarker(mockMediaElement.startTime - 1);
            LiveUnit.Assert.isTrue(mediaPlayer.markers.length);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenOnTheFirstChapterMarkerWhenChapterSkipBackThenCurrentTimeDdoesNotChange = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 90;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            firstChapterMarkerTime = mediaPlayer._defaultChapterMarkers[0].time;
            mockMediaElement.currentTime = firstChapterMarkerTime;
            mediaPlayer.chapterSkipBack();
            LiveUnit.Assert.areEqual(firstChapterMarkerTime, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenOnTheFirstChapterMarkerWhenChapterSkipBackThenCurrentTimeDoesNotChange = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 90;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            firstChapterMarkerTime = mediaPlayer._defaultChapterMarkers[0].time;
            mockMediaElement.currentTime = firstChapterMarkerTime;
            mediaPlayer.chapterSkipBack();
            LiveUnit.Assert.areEqual(firstChapterMarkerTime, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenOnTheLastChapterMarkerWhenChapterSkipForwardThenCurrentTimeDoesNotChange = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 90;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            lastChapterMarkerTime = mediaPlayer._defaultChapterMarkers[mediaPlayer._defaultChapterMarkers.length - 1].time;
            mockMediaElement.currentTime = lastChapterMarkerTime;
            mediaPlayer.chapterSkipForward();
            LiveUnit.Assert.areEqual(lastChapterMarkerTime, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenStartTimeAndEndTimeSetSuchThatTotalTimeIsLessThanMinimumTimeForChaptermarkersWhenMediaPlayerIsinitializedThenNoDefaultMarkersAreAdded = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 90;
            mediaPlayer.startTime = 1;
            mediaPlayer.endTime = 2;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            LiveUnit.Assert.isFalse(mediaPlayer._defaultChapterMarkers.length);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenNoChaptermarkersWhenMediaPlayerChapterSkipForwardThenCurrentTimeIsTheEndOfTheMedia = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.readyState = 3;
            mediaPlayer.chapterSkipForward();
            LiveUnit.Assert.areEqual(mockMediaElement.duration, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenNoChaptermarkersWhenMediaPlayerChapterSkipBackThenCurrentTimeIsTheBeginningOfTheMedia = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.currentTime = 10;
            mockMediaElement.readyState = 3;
            mediaPlayer.chapterSkipBack();
            LiveUnit.Assert.areEqual(0, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        // hideControls events
        MediaPlayerTests.prototype.testGivenControlsVisibleWhenVideControlsThenTheAfterHideControlsEventFiresAndControlsAreHidden = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.src = "notnull";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.showControls();
            mediaPlayer.addEventListener("afterhidecontrols", function afterhidecontrols() {
                mediaPlayer.removeEventListener("afterhidecontrols", afterhidecontrols);
                LiveUnit.Assert.isFalse(mediaPlayer.controlsVisible);
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mediaPlayer.hideControls();
        };

        MediaPlayerTests.prototype.testGivenControlsVisibleWhenBeforeHideControlsEventFiresAndPreventDefaultThenAndControlsAreVisible = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.src = "notnull";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.showControls();
            mediaPlayer.addEventListener("beforehidecontrols", function beforehidecontrols(ev) {
                mediaPlayer.removeEventListener("beforehidecontrols", beforehidecontrols);
                ev.preventDefault();
                LiveUnit.Assert.isTrue(mediaPlayer.controlsVisible);
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mediaPlayer.hideControls();
        };

        // showControls events
        MediaPlayerTests.prototype.testGivenControlsHiddenWhenBeforeShowcontrolsEventFiresAndPreventDefaultThenAndControlsAreHidden = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.src = "notnull";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.addEventListener("beforeshowcontrols", function beforeshowcontrols(ev) {
                mediaPlayer.removeEventListener("beforeshowcontrols", beforeshowcontrols);
                ev.preventDefault();
                LiveUnit.Assert.isFalse(mediaPlayer.controlsVisible);
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mediaPlayer.showControls();
        };

        MediaPlayerTests.prototype.testGivenControlsHiddenWhenShowControlsThenAfterShowcontrolsEventFiresAndControlsAreVisible = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.src = "notnull";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.addEventListener("aftershowcontrols", function aftershowcontrols(ev) {
                mediaPlayer.removeEventListener("aftershowcontrols", aftershowcontrols);
                LiveUnit.Assert.isTrue(mediaPlayer.controlsVisible);
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mediaPlayer.showControls();
        };

        MediaPlayerTests.prototype.testGivenControlsHiddenWhenHideControlsThenBeforehidecontrolsEventDoesNotFire = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.src = "notnull";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.addEventListener("beforehidecontrols", function beforeshowcontrols(ev) {
                mediaPlayer.removeEventListener("beforehidecontrols", beforeshowcontrols);
                LiveUnit.Assert.fail(mediaPlayer.controlsVisible);
            }, false);
            mediaPlayer.hideControls();
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenControlsVisibleWhenShowControlsThenBeforeshowcontrolsEventDoesNotFire = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.src = "notnull";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.showControls();
            mediaPlayer.addEventListener("beforeshowcontrols", function beforeshowcontrols(ev) {
                mediaPlayer.removeEventListener("beforeshowcontrols", beforeshowcontrols);
                LiveUnit.Assert.fail(mediaPlayer.controlsVisible);
            }, false);
            mediaPlayer.showControls();
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenControlsHiddenWhenShowControlsThenTheAfterShowcontrolsEventFiresAndcontrolsArevisible = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.src = "notnull";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.showControls();
            mediaPlayer.addEventListener("beforeshowcontrols", function beforeshowcontrols(ev) {
                mediaPlayer.removeEventListener("beforeshowcontrols", beforeshowcontrols);
                LiveUnit.Assert.fail(mediaPlayer.controlsVisible);
            }, false);
            mediaPlayer.showControls();
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenChapterSkipBackThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.chapterSkipBack, "chapterSkipBack", complete);
        };

        MediaPlayerTests.prototype.testWhenChapterSkipForwardThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.chapterSkipForward, "chapterSkipForward", complete);
        };

        MediaPlayerTests.prototype.testWhenFastForwardThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.fastForward, "fastForward", complete);
        };

        MediaPlayerTests.prototype.testWhenNextTrackThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.nextTrack, "nextTrack", complete);
        };

        MediaPlayerTests.prototype.testWhenPreviousTrackThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.previousTrack, "previousTrack", complete);
        };

        MediaPlayerTests.prototype.testWhenPlayThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.play, "play", complete);
        };

        MediaPlayerTests.prototype.testWhenPauseThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.pause, "pause", complete);
        };

        MediaPlayerTests.prototype.testWhenRewindThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.rewind, "rewind", complete);
        };

        MediaPlayerTests.prototype.testWhenSeekThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.src = "notnull";
            mediaPlayer.addEventListener("mediacommandexecuted", function mediacommandexecuted(ev) {
                mediaPlayer.removeEventListener("mediacommandexecuted", mediacommandexecuted);
                LiveUnit.Assert.areEqual("seek", ev.detail.mediaCommand);
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mediaPlayer.seek(10);
        };

        MediaPlayerTests.prototype.testWhenTimeSkipBackThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.timeSkipBack, "timeSkipBack", complete);
        };

        MediaPlayerTests.prototype.testWhenTimeSkipForwardThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.timeSkipForward, "timeSkipForward", complete);
        };

        MediaPlayerTests.prototype.testWhenAudioTracksThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.audioTracks, "_onAudioTracksCommandInvoked", complete);
        };

        MediaPlayerTests.prototype.testWhenCastThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            if (WinJS.Utilities.hasWinRT) {
                runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.cast, "_onCastCommandInvoked", complete);
            } else {
                complete();
            }
        };

        MediaPlayerTests.prototype.testWhenClosedCaptionsThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.closedCaptions, "_onClosedCaptionsCommandInvoked", complete);
        };

        MediaPlayerTests.prototype.testWhenPlaybackRateThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.playbackRate, "_onPlaybackRateCommandInvoked", complete);
        };

        MediaPlayerTests.prototype.testWhenVolumeThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.volume, "_onVolumeCommandInvoked", complete);
        };

        MediaPlayerTests.prototype.testWhenZoomThenMediaCommandExecutedEventFiresWithCorrectEventArguments = function (complete) {
            runVerifyMediaCommandExecutedEventTest(WinJS.UI.MediaCommand.zoom, "_onZoomCommandInvoked", complete);
        };

        MediaPlayerTests.prototype.testGivenPausedAndIsPlayAllowedIsTrueWhenPlayThenMediaIsPlaying = function (complete) {
            runIsPlayAllowedTestCase(true, true, complete);
        };

        MediaPlayerTests.prototype.testGivenPausedAndIsPlayAllowedIsFalseWhenPlayThenMediaIsPaused = function (complete) {
            runIsPlayAllowedTestCase(false, false, complete);
        };

        MediaPlayerTests.prototype.testGivenPausedAndIsPlayAllowedIsNullWhenPlayThenMediaIsPaused = function (complete) {
            runIsPlayAllowedTestCase(null, false, complete);
        };

        MediaPlayerTests.prototype.testGivenPausedAndIsPlayAllowedIsInvalidStringWhenPlayThenMediaIsPlaying = function (complete) {
            runIsPlayAllowedTestCase("invalidValue", true, complete);
        };

        MediaPlayerTests.prototype.testGivenPlayingAndIsPauseAllowedIsTrueWhenPauseThenMediaIsPaused = function (complete) {
            runIsPauseAllowedTestCase(true, true, complete);
        };

        MediaPlayerTests.prototype.testGivenPlayingAndIsPauseAllowedIsFalseWhenPauseThenMediaIsPlaying = function (complete) {
            runIsPauseAllowedTestCase(false, false, complete);
        };

        MediaPlayerTests.prototype.testGivenPlayingAndIsPauseAllowedIsNullWhenPauseThenMediaIsPlaying = function (complete) {
            runIsPauseAllowedTestCase(null, false, complete);
        };

        MediaPlayerTests.prototype.testGivenPlayingAndIsPauseAllowedIsInvalidValueWhenPauseThenMediaIsPaused = function (complete) {
            runIsPauseAllowedTestCase("invalidValue", true, complete);
        };

        MediaPlayerTests.prototype.testGivenPausedAndIsSeekAllowedIsTrueWhenSeekThenMediaSeeked = function (complete) {
            runIsSeekAllowedTestCase(true, true, complete);
        };

        MediaPlayerTests.prototype.testGivenPlayingAndIsSeekAllowedIsfalseWhenSeekThenMediaDidNotSeek = function (complete) {
            runIsSeekAllowedTestCase(false, false, complete);
        };

        MediaPlayerTests.prototype.testGivenPlayingAndIsSeekAllowedIsNullWhenSeekThenMediaDidNotSeek = function (complete) {
            runIsSeekAllowedTestCase(null, false, complete);
        };

        MediaPlayerTests.prototype.testGivenPlayingAndIsSeekAllowedIsinvalidValueWhenSeekThenMediaSeeked = function (complete) {
            runIsSeekAllowedTestCase("invalidValue", true, complete);
        };

        MediaPlayerTests.prototype.testGivenNullMediaElementWhenChapterSkipBackThenDoesNotThrowAnException = function () {
            runNullMediaElementTestCase("chapterSkipBack");
        };

        MediaPlayerTests.prototype.testGivenNullMediaElementWhenChapterSkipForwardThenDoesNotThrowAnException = function () {
            runNullMediaElementTestCase("chapterSkipForward");
        };

        MediaPlayerTests.prototype.testGivenNullMediaElementWhenFastForwardThenDoesNotThrowAnException = function () {
            runNullMediaElementTestCase("fastForward");
        };

        MediaPlayerTests.prototype.testGivenNullMediaElementWhengoToLiveThenDoesNotThrowAnException = function () {
            runNullMediaElementTestCase("goToLive");
        };

        MediaPlayerTests.prototype.testGivenNullMediaElementWhenPlayThenDoesNotThrowAnException = function () {
            runNullMediaElementTestCase("play");
        };

        MediaPlayerTests.prototype.testGivenNullMediaElementWhenPauseThenDoesNotThrowAnException = function () {
            runNullMediaElementTestCase("pause");
        };

        MediaPlayerTests.prototype.testGivenNullMediaElementWhenRewindThenDoesNotThrowAnException = function () {
            runNullMediaElementTestCase("rewind");
        };

        MediaPlayerTests.prototype.testGivenNullMediaElementWhenSeekThenDoesNotThrowAnException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.mediaElementAdapter.mediaElement = null;
            try {
                mediaPlayer.seek(10);
            } catch (ex) {
                LiveUnit.Assert.fail("Seeking with a null MediaPlayer.mediaElementAdapter.mediaElement threw an exception.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenNullMediaElementWhenTimeSkipBackThenDoesNotThrowAnException = function () {
            runNullMediaElementTestCase("timeSkipBack");
        };

        MediaPlayerTests.prototype.testGivenNullMediaElementWhenTimeSkipForwardThenDoesNotThrowAnException = function () {
            runNullMediaElementTestCase("timeSkipForward");
        };

        // New media element test cases
        MediaPlayerTests.prototype.testGivenNewMediaElementWhenChapterSkipBackThenDoesNotThrowAnException = function (complete) {
            runNewMediaElementTestCase("chapterSkipBack", complete);
        };

        MediaPlayerTests.prototype.testGivenNewMediaElementWhenChapterSkipForwardThenDoesNotThrowAnException = function (complete) {
            runNewMediaElementTestCase("chapterSkipForward", complete);
        };

        MediaPlayerTests.prototype.testGivenNewMediaElementWhenFastForwardThenDoesNotThrowAnException = function (complete) {
            runNewMediaElementTestCase("fastForward", complete);
        };

        MediaPlayerTests.prototype.testGivenNewMediaElementWhengoToLiveThenDoesNotThrowAnException = function (complete) {
            runNewMediaElementTestCase("goToLive", complete);
        };

        MediaPlayerTests.prototype.testGivenNewMediaElementWhenPlayThenDoesNotThrowAnException = function (complete) {
            runNewMediaElementTestCase("play", complete);
        };

        MediaPlayerTests.prototype.testGivenNewMediaElementWhenPauseThenDoesNotThrowAnException = function (complete) {
            runNewMediaElementTestCase("pause", complete);
        };

        MediaPlayerTests.prototype.testGivenNewMediaElementWhenRewindThenDoesNotThrowAnException = function (complete) {
            runNewMediaElementTestCase("rewind", complete);
        };

        MediaPlayerTests.prototype.testGivenNewMediaElementWhenSeekThenDoesNotThrowAnException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            try {
                mediaPlayer.seek(10);
            } catch (ex) {
                LiveUnit.Assert.fail("Seeking with a null MediaPlayer.mediaElementAdapter.mediaElement threw an exception.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenNewMediaElementWhenTimeSkipBackThenDoesNotThrowAnException = function (complete) {
            runNewMediaElementTestCase("timeSkipBack", complete);
        };

        MediaPlayerTests.prototype.testGivenNewMediaElementWhenTimeSkipForwardThenDoesNotThrowAnException = function (complete) {
            runNewMediaElementTestCase("timeSkipForward", complete);
        };

        MediaPlayerTests.prototype.testGivenMediaElementSrcIsNullWhenChapterSkipBackThenThrowsAnException = function (complete) {
            runNullMediaElementSrcTestCase("chapterSkipBack", true, complete);
        };

        MediaPlayerTests.prototype.testGivenMediaElementSrcIsNullWhenChapterSkipForwardThenThrowsAnException = function (complete) {
            runNullMediaElementSrcTestCase("chapterSkipForward", true, complete);
        };

        MediaPlayerTests.prototype.testGivenMediaElementSrcIsNullWhenFastForwardThenThrowsAnException = function (complete) {
            runNullMediaElementSrcTestCase("fastForward", false, complete);
        };

        MediaPlayerTests.prototype.testGivenMediaElementSrcIsNullWhengoToLiveThenThrowsAnException = function (complete) {
            runNullMediaElementSrcTestCase("goToLive", true, complete);
        };

        MediaPlayerTests.prototype.testGivenMediaElementSrcIsNullWhenPlayThenThrowsAnException = function (complete) {
            runNullMediaElementSrcTestCase("play", false, complete);
        };

        MediaPlayerTests.prototype.testGivenMediaElementSrcIsNullWhenPauseThenThrowsAnException = function (complete) {
            runNullMediaElementSrcTestCase("pause", false, complete);
        };

        MediaPlayerTests.prototype.testGivenMediaElementSrcIsNullWhenRewindThenThrowsAnException = function (complete) {
            runNullMediaElementSrcTestCase("rewind", false, complete);
        };

        MediaPlayerTests.prototype.testGivenMediaElementSrcIsNullWhenSeekThenDoesNotThrowsAnException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.src = null;
            try {
                mediaPlayer.seek(10);
            } catch (ex) {
                LiveUnit.Assert.fail("Seeking with a null MediaPlayer.mediaElementAdapter.mediaElement threw an exception.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenMediaElementSrcIsNullWhenTimeSkipBackThenThrowsAnException = function (complete) {
            runNullMediaElementSrcTestCase("timeSkipBack", true, complete);
        };

        MediaPlayerTests.prototype.testGivenMediaElementSrcIsNullWhenTimeSkipForwardThenThrowsAnException = function (complete) {
            runNullMediaElementSrcTestCase("timeSkipForward", true, complete);
        };

        MediaPlayerTests.prototype.testGivenInvalidMediaElementWhenPlayThenThrowsAnException = function () {
            var wasExceptionThrown = false;
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            try {
                mediaPlayer.mediaElementAdapter.mediaElement = "foobar";
                mediaPlayer.play();
            } catch (exception) {
                wasExceptionThrown = true;
            }
            LiveUnit.Assert.isTrue(wasExceptionThrown, "Play() was called on an invalid Media Element and an exception did not get thrown.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenNewMediaPlayerWithInnerHTMLElementsWhenConstructedThenInnerHTMLElementsArePreserved = function () {
            var mediaElementDiv = document.createElement("div");
            mediaElementDiv.innerHTML = "<div id='customDiv'></div>";
            var mediaPlayer = new WinJS.UI.MediaPlayer(mediaElementDiv);
            LiveUnit.Assert.isNotNull(mediaPlayer.element.querySelector("#customDiv"), "InnerHTML was not preserved.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenMediaElementWhenSrcSetToNewSrcThenEndTimeIsUpdated = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mockMediaElement.duration = 10;
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 20;
            LiveUnit.Assert.areEqual(mockMediaElement.duration, mediaPlayer.endTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenMediaElementWithMetadataAlreadyLoadedWhenSetMediaPlayerMediaElementThenStartTimeAndEndTimeAreCorrectlyUpdated = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement1 = new Test.MockMediaElement();
            mockMediaElement1.initialTime = 1;
            mockMediaElement1.duration = 2;
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement1;
            var mockMediaElement2 = new Test.MockMediaElement();
            mockMediaElement2.autoplay = true;
            mockMediaElement2.src = "notnull";
            mockMediaElement2.duration = 10;
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement2;
            LiveUnit.Assert.areEqual(0, mediaPlayer.startTime);
            LiveUnit.Assert.areEqual(mockMediaElement2.duration, mediaPlayer.endTime);
            safeDispose(mediaPlayer);
        };

        // Playback tests
        MediaPlayerTests.prototype.testGivenMediaPlayerPlayingWhenPauseThenPlaybackRateIsPaused = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.pause();
            LiveUnit.Assert.isTrue(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenMediaPlayerPausedWhenPlayThenPlaybackRateIsPlaying = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mockMediaElement.src = "notnull";
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.play();
            LiveUnit.Assert.isFalse(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenMediaPlayerPausedWhenFastForwardThenPlaybackRateIsFFPoint5X = function () {
            runFastForwardTestCase(1, 0.5, true);
        };

        MediaPlayerTests.prototype.testGivenPlayingWhenFastForwardThenPlaybackRateIsFF2X = function () {
            runFastForwardTestCase(1, 2);
        };

        MediaPlayerTests.prototype.testGivenFF2XWhenFastForwardThenPlaybackRateIsFF4X = function () {
            runFastForwardTestCase(2, 4);
        };

        MediaPlayerTests.prototype.testGivenFF4XWhenFastForwardThenPlaybackRateIsFF8X = function () {
            runFastForwardTestCase(4, 8);
        };

        MediaPlayerTests.prototype.testGivenFF8XWhenFastForwardThenPlaybackRateIsFF16X = function () {
            runFastForwardTestCase(8, 16);
        };

        MediaPlayerTests.prototype.testGivenFF16XWhenFastForwardThenPlaybackRateIsFF32X = function () {
            runFastForwardTestCase(16, 32);
        };

        MediaPlayerTests.prototype.testGivenFF32XWhenFastForwardThenPlaybackRateIsFF64X = function () {
            runFastForwardTestCase(32, 64);
        };

        MediaPlayerTests.prototype.testGivenFF64XWhenFastForwardThenPlaybackRateIsFFMaxRate = function () {
            runFastForwardTestCase(64, 128);
        };

        MediaPlayerTests.prototype.testGivenFFMaxRateWhenFastForwardThenPlaybackRateIsFFMaxRate = function () {
            runFastForwardTestCase(128, 128);
        };

        MediaPlayerTests.prototype.testGivenFF128XWhenRewindThenPlaybackRateIsFF64X = function () {
            runRewindTestCase(128, 64);
        };

        MediaPlayerTests.prototype.testGivenFF64XWhenRewindThenPlaybackRateIsFF32X = function () {
            runRewindTestCase(64, 32);
        };

        MediaPlayerTests.prototype.testGivenFF32XWhenRewindThenPlaybackRateIsFF16X = function () {
            runRewindTestCase(32, 16);
        };

        MediaPlayerTests.prototype.testGivenFF16XWhenRewindThenPlaybackRateIsFF8X = function () {
            runRewindTestCase(16, 8);
        };

        MediaPlayerTests.prototype.testGivenFF8XWhenRewindThenPlaybackRateIsFF4X = function () {
            runRewindTestCase(8, 4);
        };

        MediaPlayerTests.prototype.testGivenFF4XWhenRewindThenPlaybackRateIsFF2X = function () {
            runRewindTestCase(4, 2);
        };

        MediaPlayerTests.prototype.testGivenFF2XWhenRewindThenPlaybackRateIsPlaying = function () {
            runRewindTestCase(2, 1);
        };

        MediaPlayerTests.prototype.testGivenMediaPlayerPausedWhenRewindThenPlaybackRateIsnegativePoint5 = function () {
            runRewindTestCase(1, -0.5, true);
        };

        MediaPlayerTests.prototype.testGivenPlayingWhenRewindThenPlaybackRateIsRR2X = function () {
            runRewindTestCase(1, -2);
        };

        MediaPlayerTests.prototype.testGivenPlaybackRateOfnegative1WhenRewindThenPlaybackRateIsRR2X = function () {
            runRewindTestCase(-1, -2);
        };

        MediaPlayerTests.prototype.testGivenRR2XWhenRewindThenPlaybackRateIsRR4X = function () {
            runRewindTestCase(-2, -4);
        };

        MediaPlayerTests.prototype.testGivenRR4XWhenRewindThenPlaybackRateIsRR8X = function () {
            runRewindTestCase(-4, -8);
        };

        MediaPlayerTests.prototype.testGivenRR8XWhenRewindThenPlaybackRateIsRR16X = function () {
            runRewindTestCase(-8, -16);
        };

        MediaPlayerTests.prototype.testGivenRR16XWhenRewindThenPlaybackRateIsRR32X = function () {
            runRewindTestCase(-16, -32);
        };

        MediaPlayerTests.prototype.testGivenRR32XWhenRewindThenPlaybackRateIsRR64X = function () {
            runRewindTestCase(-32, -64);
        };

        MediaPlayerTests.prototype.testGivenRR64XWhenRewindThenPlaybackRateIsRRMaxRate = function () {
            runRewindTestCase(-64, -128);
        };

        MediaPlayerTests.prototype.testGivenRRMaxRateWhenRewindThenPlaybackRateIsRRMaxRate = function () {
            runRewindTestCase(-128, -128);
        };

        MediaPlayerTests.prototype.testGivenRR128XWhenFastForwardThenPlaybackRateIsRR64X = function () {
            runFastForwardTestCase(-128, -64);
        };

        MediaPlayerTests.prototype.testGivenRR64XWhenFastForwardThenPlaybackRateIsRR32X = function () {
            runFastForwardTestCase(-64, -32);
        };

        MediaPlayerTests.prototype.testGivenRR32XWhenFastForwardThenPlaybackRateIsRR16X = function () {
            runFastForwardTestCase(-32, -16);
        };

        MediaPlayerTests.prototype.testGivenRR16XWhenFastForwardThenPlaybackRateIsRR8X = function () {
            runFastForwardTestCase(-16, -8);
        };

        MediaPlayerTests.prototype.testGivenRR8XWhenFastForwardThenPlaybackRateIsRR4X = function () {
            runFastForwardTestCase(-8, -4);
        };

        MediaPlayerTests.prototype.testGivenRR4XWhenFastForwardThenPlaybackRateIsRR2X = function () {
            runFastForwardTestCase(-4, -2);
        };

        MediaPlayerTests.prototype.testGivenRR2XWhenFastForwardThenPlaybackRateIsPlaying = function () {
            runFastForwardTestCase(-2, 1);
        };

        MediaPlayerTests.prototype.testGivenFastforwardWhenPauseThenPause = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mockMediaElement.src = "notnull";
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.fastForward();
            mediaPlayer.pause();
            LiveUnit.Assert.isTrue(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenRewindWhenPauseThenPause = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mockMediaElement.src = "notnull";
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.rewind();
            mediaPlayer.pause();
            LiveUnit.Assert.isTrue(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenPlaybackRateIsFractionalValueLessThanOneWhenFastForwardThenPlaying = function () {
            runFastForwardTestCase(0.9, 1);
        };

        MediaPlayerTests.prototype.testGivenPlaybackRateIsrewindSlowMotionRateWhenFastForwardThenPlaying = function () {
            runFastForwardTestCase(-0.5, 1);
        };

        MediaPlayerTests.prototype.testGivenPlaybackRateIsFractionalValueLessThanRewindSlowMotionRateWhenFastForwardThenPlaying = function () {
            runFastForwardTestCase(-0.49, 1);
        };

        MediaPlayerTests.prototype.testGivenPlaybackRateIsFractionalValueGreaterThanRewindSlowMotionRateWhenFastForwardThenPlaying = function () {
            runFastForwardTestCase(-0.51, 1);
        };

        MediaPlayerTests.prototype.testGivenPlaybackRateIsFractionalValueGreaterThanOneWhenFastForwardThenFF2X = function () {
            runFastForwardTestCase(1.1, 2);
        };

        MediaPlayerTests.prototype.testGivenPlayingAndPlaybackRateIsfastForwardSlowMotionRateWhenRewindThenRR2X = function () {
            runRewindTestCase(0.5, -2);
        };

        MediaPlayerTests.prototype.testGivenPlaybackRateIsFractionalValueGreaterThan_fastForwardSlowMotionRateWhenRewindThenRR2X = function () {
            runRewindTestCase(0.51, -2);
        };

        MediaPlayerTests.prototype.testGivenPlayingAndplaybackRateIsFractionalValueLessThan_fastForwardSlowMotionRateWhenRewindThenPlaying = function () {
            runRewindTestCase(0.49, 1);
        };

        MediaPlayerTests.prototype.testGivenPlaybackRateIsPlayingWhenRewindThenRR2X = function () {
            runRewindTestCase(1, -2);
        };

        MediaPlayerTests.prototype.testGivenPausedAndplaybackRateIsFractionalValueGreaterThanRewindSlowMotionRateWhenRewindThenRR2X = function () {
            runRewindTestCase(-0.51, -2, true);
        };

        MediaPlayerTests.prototype.testGivenPlayingAndplaybackRateIsFractionalValueGreaterThanRewindSlowMotionRateWhenRewindThenRR2X = function () {
            runRewindTestCase(-0.51, -2);
        };

        MediaPlayerTests.prototype.testGivenPlaybackRateIsFractionalValueLessThanRewindSlowMotionRateWhenRewindThenRR2X = function () {
            runRewindTestCase(-0.49, -2);
        };

        MediaPlayerTests.prototype.testGivenFastforwardWhenFastForwardingThenControlsRemainVisible = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mockMediaElement.src = "notnull";
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.fastForward();
            mediaPlayer.hideControls();
            LiveUnit.Assert.isTrue(mediaPlayer.controlsVisible);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenRewindWhenRewindingThenControlsRemainVisible = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mockMediaElement.src = "notnull";
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.rewind();
            mediaPlayer.hideControls();
            LiveUnit.Assert.isTrue(mediaPlayer.controlsVisible);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenInFastForwardOrRewindModeWhenChapterSkipBackThenNotInFastForwardOrRewindMode = function () {
            runExitFastForwardOrRewindTest("chapterSkipBack");
        };

        MediaPlayerTests.prototype.testGivenInFastForwardOrRewindModeWhenChapterSkipForwardThenNotInFastForwardOrRewindMode = function () {
            runExitFastForwardOrRewindTest("chapterSkipForward");
        };

        MediaPlayerTests.prototype.testGivenInFastForwardOrRewindModeWhenPlayThenNotInFastForwardOrRewindMode = function () {
            runExitFastForwardOrRewindTest("play");
        };

        MediaPlayerTests.prototype.testGivenInFastForwardOrRewindModeWhenTimeSkipBackThenNotInFastForwardOrRewindMode = function () {
            runExitFastForwardOrRewindTest("timeSkipBack");
        };

        MediaPlayerTests.prototype.testGivenInFastForwardOrRewindModeWhenTimeSkipForwardThenNotInFastForwardOrRewindMode = function () {
            runExitFastForwardOrRewindTest("timeSkipForward");
        };

        MediaPlayerTests.prototype.testGivenPlayingWhenPauseThenPlaypauseToggleIsPlayicon = function () {
            runPlayPauseToggleIconTest("pause", "playicon");
        };

        MediaPlayerTests.prototype.testGivenPlayingWhenFastForwardThenPlaypauseToggleIsPlayicon = function () {
            runPlayPauseToggleIconTest("fastForward", "playicon");
        };

        MediaPlayerTests.prototype.testGivenPlayingWhenRewindThenPlaypauseToggleIsPlayicon = function () {
            runPlayPauseToggleIconTest("rewind", "playicon");
        };

        MediaPlayerTests.prototype.testGivenPlayingWhenTimeSkipBackThenPlaypauseToggleIsPauseicon = function () {
            runPlayPauseToggleIconTest("timeSkipBack", "pauseicon");
        };

        MediaPlayerTests.prototype.testGivenPlayingWhenTimeSkipForwardThenPlaypauseToggleIsPauseicon = function () {
            runPlayPauseToggleIconTest("timeSkipForward", "pauseicon");
        };

        MediaPlayerTests.prototype.testGivenPlayingWhenChapterSkipBackThenPlaypauseToggleIsPauseicon = function () {
            runPlayPauseToggleIconTest("chapterSkipBack", "pauseicon");
        };

        MediaPlayerTests.prototype.testGivenPlayingWhenChapterSkipForwardThenPlaypauseToggleIsPauseicon = function () {
            runPlayPauseToggleIconTest("chapterSkipForward", "pauseicon");
        };

        MediaPlayerTests.prototype.testGivenPausedWhenPlayThenPlaypauseToggleIsPauseicon = function () {
            runPlayPauseToggleIconTest("play", "pauseicon", true);
        };

        MediaPlayerTests.prototype.testGivenPausedWhenFastForwardThenPlaypauseToggleIsPlayicon = function () {
            runPlayPauseToggleIconTest("fastForward", "playicon", true);
        };

        MediaPlayerTests.prototype.testGivenPausedWhenRewindThenPlaypauseToggleIsPlayicon = function () {
            runPlayPauseToggleIconTest("rewind", "playicon", true);
        };

        MediaPlayerTests.prototype.testGivenPausedWhenTimeSkipBackThenPlaypauseToggleIsPlayicon = function () {
            runPlayPauseToggleIconTest("timeSkipBack", "playicon", true);
        };

        MediaPlayerTests.prototype.testGivenPausedWhenTimeSkipForwardThenPlaypauseToggleIsPlayicon = function () {
            runPlayPauseToggleIconTest("timeSkipForward", "playicon", true);
        };

        MediaPlayerTests.prototype.testGivenPausedWhenChapterSkipBackThenPlaypauseToggleIsPlayicon = function () {
            runPlayPauseToggleIconTest("chapterSkipBack", "playicon", true);
        };

        MediaPlayerTests.prototype.testGivenPausedWhenChapterSkipForwardThenPlaypauseToggleIsPlayicon = function () {
            runPlayPauseToggleIconTest("chapterSkipForward", "playicon", true);
        };

        MediaPlayerTests.prototype.testGivenPlayingWhenPauseIsCalledOnTheVideoTagThenPlaypauseToggleIsPlayicon = function () {
            runPlayPauseToggleIconTest("pause", "playicon");
        };

        MediaPlayerTests.prototype.testGivenPausedWhenPlayIsCalledOnTheVideoTagThenPlaypauseToggleIsPauseicon = function () {
            runPlayPauseToggleIconTest("play", "pauseicon", true);
        };

        MediaPlayerTests.prototype.testGivenPausedWhenPlaybackRateIsincreasedToGreaterThanTheDefaultPlaybackRateOnTheVideoTagThenPlaypauseToggleIsPlayIcon = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mockMediaElement.playbackRate = 2;
            LiveUnit.Assert.areEqual(mediaPlayer.element.querySelector(".win-mediaplayer-playpausebutton").winControl.icon, WinJS.UI.AppBarIcon.play);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSetLayoutToFullThenLayoutIsFull = function () {
            runSetMediaPlayerPropertyCase("layout", WinJS.UI.Layout.full, false);
        };

        MediaPlayerTests.prototype.testWhenSetLayoutTopartialThenLayoutIsPartial = function () {
            runSetMediaPlayerPropertyCase("layout", WinJS.UI.Layout.partial, false);
        };

        MediaPlayerTests.prototype.testWhenSetLayoutToInvalidValueThenThrowsAnException = function () {
            runSetMediaPlayerPropertyCase("layout", "invalid value", true);
        };

        MediaPlayerTests.prototype.testWhenSetLayoutToNullThenThrowsAnException = function () {
            runSetMediaPlayerPropertyCase("layout", null, true);
        };

        MediaPlayerTests.prototype.testWhenSeekToBeginningThenCurrentTimeIsZero = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 4;
            mediaPlayer.seek(0);
            LiveUnit.Assert.areEqual(0, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSeekToEndThenCurrentTimeIsEqualToDuration = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 4;
            mockMediaElement.duration = 10;
            mediaPlayer.seek(mockMediaElement.duration);
            LiveUnit.Assert.areEqual(mockMediaElement.duration, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSeekToMiddleThenCurrentTimeIsEqualHalfOfDuration = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 4;
            mockMediaElement.duration = 10;
            mediaPlayer.seek(mockMediaElement.duration / 2);
            LiveUnit.Assert.areEqual(mockMediaElement.duration / 2, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSeekToFractionalValueThenSeekIsSuccessful = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 4;
            mockMediaElement.duration = 20;
            mediaPlayer.seek(10.525);
            LiveUnit.Assert.areEqual(10.525, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSeekToNegativeTimeThenCurrentTimeIsEqualToZero = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 4;
            mediaPlayer.seek(-1);
            LiveUnit.Assert.areEqual(0, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSeekToPastTheEndOfTheMediaThenCurrentTimeIsEqualToTheMediaDuration = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 4;
            mockMediaElement.duration = 10;
            mediaPlayer.seek(mockMediaElement.duration + 1);
            LiveUnit.Assert.areEqual(mockMediaElement.duration, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenInvalidParameterPassedToSeekThenDoesNotThrowAnException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;

            try {
                mediaPlayer.seek("invalid parameter");
            } catch (ex) {
                LiveUnit.Assert.fail("seek called with invalid parameter and should not throw exception.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenNullPassedToSeekThenDoesNotThrowAnException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;

            try {
                mediaPlayer.seek(null);
            } catch (ex) {
                LiveUnit.Assert.fail("seek called with invalid parameter and should not throw exception.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenPausedWhenSeekThenPaused = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mediaPlayer.seek(5);
            LiveUnit.Assert.isTrue(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenPlayingWhenSeekThenPlaying = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.seek(5);
            LiveUnit.Assert.isFalse(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };
        MediaPlayerTests.prototype.testGivenFastforwardingWhenSeekThenPlaying = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.fastForward();
            mediaPlayer.seek(5);
            LiveUnit.Assert.isFalse(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenRewindingWhenSeekThenPlaying = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.rewind();
            mediaPlayer.seek(5);
            LiveUnit.Assert.isFalse(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSeekToBeforeStartTimeThenCurrentTimeIsStartTime = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.startTime = 1;
            mediaPlayer.seek(mediaPlayer.startTime - 1);
            LiveUnit.Assert.areEqual(mediaPlayer.startTime, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSeekToAfterEndTimeThenCurrentTimeIsEndTime = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.endTime = 5;
            mediaPlayer.seek(mediaPlayer.endTime + 1);
            LiveUnit.Assert.areEqual(mediaPlayer.endTime, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenStartTimeIsSetToNullThenDoesNotThrowAnException = function () {
            var wasExceptionThrown = false;
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            try {
                mediaPlayer.startTime = null;
            } catch (exception) {
                wasExceptionThrown = true;
            }
            LiveUnit.Assert.isFalse(wasExceptionThrown, "startTime was set to 'null' and an exception was thrown.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenStartTimeSetToInvalidValueThenThrowsAnException = function () {
            var wasExceptionThrown = false;
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            try {
                mediaPlayer.startTime = "invalid value";
            } catch (exception) {
                wasExceptionThrown = true;
            }
            LiveUnit.Assert.isTrue(wasExceptionThrown, "startTime was set to 'invalid value' and an exception was not thrown.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenStartTimeSetToNegativeValueThenThrowsAnException = function () {
            var wasExceptionThrown = false;
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            try {
                mediaPlayer.startTime = -10;
            } catch (exception) {
                wasExceptionThrown = true;
            }
            LiveUnit.Assert.isTrue(wasExceptionThrown, "startTime was set to a negative number and an exception was not thrown.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenEndTimeIsSetToNullThenDoesNotThrowsAnException = function () {
            var wasExceptionThrown = false;
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            try {
                mediaPlayer.startTime = null;
            } catch (exception) {
                wasExceptionThrown = true;
            }
            LiveUnit.Assert.isFalse(wasExceptionThrown, "startTime was set to 'null' and an exception was not thrown.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenEndTimeSetToInvalidValueThenThrowsAnException = function () {
            var wasExceptionThrown = false;
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            try {
                mediaPlayer.startTime = "invalid value";
            } catch (exception) {
                wasExceptionThrown = true;
            }
            LiveUnit.Assert.isTrue(wasExceptionThrown, "startTime was set to 'invalid value' and an exception was thrown.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenendTimeSetToNegativeValueThenThrowsAnException = function () {
            var wasExceptionThrown = false;
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            try {
                mediaPlayer.startTime = -10;
            } catch (exception) {
                wasExceptionThrown = true;
            }
            LiveUnit.Assert.isTrue(wasExceptionThrown, "startTime was set to a negative number and an exception was not thrown.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenStartTimeIsSetWhenTimeSkipBackThenCurrentTimeAtThestartTime = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.startTime = 5;
            mediaPlayer.currentTime = mediaPlayer.startTime;
            mediaPlayer.timeSkipBack();
            LiveUnit.Assert.areEqual(mediaPlayer.startTime, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenAtTheEndOfTheMediaWhenTimeSkipForwardThenCurrentTimeIsTheEndOfTheMedia = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.endTime = 5;
            mediaPlayer.currentTime = mediaPlayer.endTime;
            mediaPlayer.timeSkipForward();
            LiveUnit.Assert.areEqual(mediaPlayer.endTime, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenStartTimeIsSetAndFirstChaptermarkerIsBeforeTheStartTimeWhenChapterSkipBackThenDoesNotskipToTheMarkerBeforeTheStartTime = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.startTime = 5;
            mediaPlayer.addMarker(mediaPlayer.startTime - 1, WinJS.UI.MarkerType.chapter, {});
            mediaPlayer.currentTime = mediaPlayer.startTime;
            mediaPlayer.chapterSkipBack();
            LiveUnit.Assert.areEqual(mediaPlayer.startTime, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenEndTimeIsSetAndLastChapterMarkerIsafterTheEndTimeWhenChapterSkipForwardThenDoesNotskipToTheMarkerPastTheEndTime = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.endTime = 5;
            mediaPlayer.addMarker(mediaPlayer.endTime + 1, WinJS.UI.MarkerType.chapter, {});
            mediaPlayer.currentTime = mediaPlayer.endTime;
            mediaPlayer.chapterSkipForward();
            LiveUnit.Assert.areEqual(mediaPlayer.endTime, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenEndTimeIsSetWhenAttmeptToFastForwardPastTheEndTimeThenDoesNotFastForwardPastEndTime = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.endTime = 5;
            mediaPlayer.currentTime = mediaPlayer.endTime;
            mediaPlayer.fastForward();
            // We inject a fake time delay so we can simulate time passing during a fastforward and the test doesn't have to wait
            mediaPlayer._lastFastForwardOrRewindTimerTime = new Date().getTime() - 9000000;
            mediaPlayer._onFastForwardRewindTimerTick();
            LiveUnit.Assert.isTrue(Math.abs(mediaPlayer.endTime - mediaPlayer.targetCurrentTime) < 0.2);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenStartTimeIsSetWhenAttmeptToRewindBeforeTheStartTimeThenDoesNotRewindBeforeStartTime = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.startTime = 5;
            mediaPlayer.currentTime = mediaPlayer.startTime;
            mediaPlayer.rewind();
            // We inject a fake time delay so we can simulate time passing during a fastforward and the test doesn't have to wait
            mediaPlayer._lastFastForwardOrRewindTimerTime = new Date().getTime() - 9000000;
            mediaPlayer._onFastForwardRewindTimerTick();
            LiveUnit.Assert.isTrue(Math.abs(mediaPlayer.startTime - mediaPlayer.targetCurrentTime) < 0.2);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenDefaultChapterMarkersWhenStartTimeIsSetThenFirstDefaultChapterMarkerIsNowAtTheStartTime = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 90;
            mockMediaElement.autoplay = true;
            mediaPlayer.startTime = 5;
            mockMediaElement.src = "notnull";
            LiveUnit.Assert.areEqual(mediaPlayer.startTime, mediaPlayer._defaultChapterMarkers[0].time);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenDefaultChapterMarkersWhenEndTimeIsSetThenLastDefaultChapterMarkerIsNowAtTheEndTime = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 90;
            mockMediaElement.autoplay = true;
            mediaPlayer.endTime = 80;
            mockMediaElement.src = "notnull";
            LiveUnit.Assert.areEqual(mediaPlayer.endTime, mediaPlayer._defaultChapterMarkers[mediaPlayer._defaultChapterMarkers.length - 1].time);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.test_GIVENTotalVideoDurationLongEnoughForDefaultChaptermarkersWhenEndTimeSetSoDurationIsTooShortThenNodefaultChapterMarkers = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 90;
            mockMediaElement.autoplay = true;
            mediaPlayer.endTime = 10;
            mockMediaElement.src = "notnull";
            LiveUnit.Assert.isFalse(mediaPlayer._defaultChapterMarkers.length);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenStartTimeIsSetWhenMediaCurrentTimeIsSetToBeforeStartTimeThenCurrentTimeIsStartTime = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mediaPlayer.startTime = 5;
            mockMediaElement.src = "notnull";
            mockMediaElement.currentTime = mediaPlayer.startTime - 1;
            LiveUnit.Assert.isTrue(Math.abs(mediaPlayer.startTime - mockMediaElement.currentTime) < 0.2);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenEndTimeIsSetWhenMediaCurrentTimeIsSetToAfterEndTimeThenCurrentTimeIsEndTime = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mediaPlayer.endTime = 5;
            mockMediaElement.src = "notnull";
            mockMediaElement.currentTime = mediaPlayer.endTime + 1;
            LiveUnit.Assert.isTrue(Math.abs(mediaPlayer.endTime - mockMediaElement.currentTime) < 0.2);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenStartTimeIsSetWhenhideControlsThenStillSubscribedToTimeupdates = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mediaPlayer.startTime = 5;
            mockMediaElement.src = "notnull";

            // Search for the timeupdate event listener
            var isSubscribedToTimeUpdates = false;
            var mediaEventSubscriptions = mediaPlayer._mediaEventSubscriptions;
            for (var i = 0; i < mediaEventSubscriptions.length; i++) {
                if (mediaEventSubscriptions[i].eventName === "timeupdate") {
                    isSubscribedToTimeUpdates = true;
                }
            }

            if (!isSubscribedToTimeUpdates) {
                LiveUnit.Assert.fail("The mediaplayer is not subscribed to timeupdate");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenStartTimeIsSetWhenVideoLoadedThenStartTimeIsPersisted = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mediaPlayer.startTime = 5;
            mockMediaElement.src = "notnull";
            LiveUnit.Assert.areEqual(5, mediaPlayer.startTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenEndTimeIsSetWhenvideoLoadedThenendTimeIsPersisted = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mediaPlayer.endTime = 5;
            mockMediaElement.src = "notnull";
            LiveUnit.Assert.areEqual(5, mediaPlayer.endTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenStartTimeIsSetWhenMediaElementSourceChangesTheNoldstartTimeIscleared = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.startTime = 5;
            mockMediaElement.src = "differentSource";
            LiveUnit.Assert.areNotEqual(5, mediaPlayer.startTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenEndTimeIsSetWhenMediaElementSourceChangesThenOldEndTimeIsCleared = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.endTime = 5;
            mockMediaElement.src = "differentSource";
            LiveUnit.Assert.areNotEqual(5, mediaPlayer.endTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenFastforwardingWhenTimePassesThenTargetCurrentTimeUpdates = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.currentTime = 0;
            var oldTime = mediaPlayer.targetCurrentTime;
            mediaPlayer.fastForward();
            // We inject a fake time delay so we can simulate time passing during a fastforward and the test doesn't have to wait
            mediaPlayer._lastFastForwardOrRewindTimerTime = new Date().getTime() - 9000000;
            mediaPlayer._onFastForwardRewindTimerTick();
            LiveUnit.Assert.areNotEqual(oldTime, mediaPlayer.targetCurrentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenRewindingWhenTimePassesThenTargetCurrentTimeUpdates = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.currentTime = mediaPlayer.duration;
            var oldTime = mediaPlayer.targetCurrentTime;
            mediaPlayer.rewind();
            // We inject a fake time delay so we can simulate time passing during a fastforward and the test doesn't have to wait
            mediaPlayer._lastFastForwardOrRewindTimerTime = new Date().getTime() - 9000000;
            mediaPlayer._onFastForwardRewindTimerTick();
            LiveUnit.Assert.areNotEqual(oldTime, mediaPlayer.targetCurrentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenNullTimeFormatterFunctionWhenShowControlsThenTimeFormatterFunctionIsNotnull = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.timeFormatter = null;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.showControls();
            LiveUnit.Assert.isNotNull(mediaPlayer.timeFormatter);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenValidTimeFormatterFunctionWhenShowControlsThenDoesNotThrowException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.timeFormatter = function (time) { return "Custom Text." };
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer._skipAnimations = true;
            mediaPlayer.showControls();
            LiveUnit.Assert.isNotNull(mediaPlayer.timeFormatter);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGiventTimeFormatterThatIsNotAFunctionWhenShowControlsThenThrowsAnException = function () {
            var wasExceptionThrown = false;
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.timeFormatter = 1;
            try {
                mediaPlayer._updateTimeDisplay();
            } catch (exception) {
                wasExceptionThrown = true;
            }
            if (!wasExceptionThrown) {
                LiveUnit.Assert.fail("An exception should have been thrown, but wasn't.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenDefaultTimeFormatterWhenTimeFormatterIspassedAValueThatIsNotANumberThenReturnsAnEmptyString = function () {
            var wasExceptionThrown = false;
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var returnValue = mediaPlayer.timeFormatter("notANumber");
            LiveUnit.Assert.areEqual("", returnValue);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenTimeSkipForwardThenCurrentTimeIsIncremented = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            var oldCurrentTime = mockMediaElement.currentTime;
            mockMediaElement.readyState = 4;
            mediaPlayer.timeSkipForward();
            LiveUnit.Assert.isTrue(mockMediaElement.currentTime > oldCurrentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenTimeSkipBackThenCurrentTimeIsDecremented = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 4;
            mockMediaElement.duration = 10;
            mockMediaElement.currentTime = mockMediaElement.duration;
            var oldCurrentTime = mockMediaElement.currentTime;
            mediaPlayer.timeSkipBack();
            LiveUnit.Assert.isTrue(mockMediaElement.currentTime < oldCurrentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenCurrentTimeIslessThan30SecondsFromTheEndWhenTimeSkipForwardThenCurrentTimeIsAtTheEndOfTheMedia = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 4;
            mockMediaElement.duration = 10;
            mockMediaElement.currentTime = mockMediaElement.duration - (mediaPlayer._SKIP_FORWARD_INTERVAL - 1);
            mediaPlayer.timeSkipForward();
            LiveUnit.Assert.areEqual(mockMediaElement.duration, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenCurrentTimeIsLessThanTheskipBackAmountFromTheBeginningWhenTimeSkipBackThenCurrentTimeIsAtBeginningOfTheMedia = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 4;
            mockMediaElement.currentTime = mediaPlayer._SKIP_BACK_INTERVAL - 1;
            mediaPlayer.timeSkipBack();
            LiveUnit.Assert.areEqual(0, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenPlayingWhenTimeSkipBackThenPlaying = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.timeSkipBack();
            LiveUnit.Assert.isFalse(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenPausedWhenTimeSkipBackThenPaused = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.src = "notnull";
            mediaPlayer.timeSkipBack();
            LiveUnit.Assert.isTrue(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenFastforwardingWhenTimeSkipBackThenPlaying = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.fastForward();
            mediaPlayer.timeSkipBack();
            LiveUnit.Assert.isFalse(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenRewindingWhenTimeSkipBackThenPlaying = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.rewind();
            mediaPlayer.timeSkipBack();
            LiveUnit.Assert.isFalse(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenPlayingWhenTimeSkipForwardThenPlaying = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.timeSkipForward();
            LiveUnit.Assert.isFalse(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenPausedWhenTimeSkipForwardThenPaused = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.src = "notnull";
            mediaPlayer.timeSkipForward();
            LiveUnit.Assert.isTrue(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenFastforwardingWhenTimeSkipForwardThenPlaying = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.fastForward();
            mediaPlayer.timeSkipForward();
            LiveUnit.Assert.isFalse(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenRewindingWhenTimeSkipForwardThenPlaying = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.rewind();
            mediaPlayer.timeSkipForward();
            LiveUnit.Assert.isFalse(mockMediaElement.paused);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenAtTheBeginningOfTheMediaWhenTimeSkipBackThenCurrentTimeIstheBeginningOfTheMedia = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.readyState = 4;
            mediaPlayer.timeSkipBack();
            LiveUnit.Assert.areEqual(0, mockMediaElement.currentTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenGetCcontainerElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-controls");
        };

        MediaPlayerTests.prototype.testWhenGetTimelineElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-timeline");
        };

        MediaPlayerTests.prototype.testWhenGetPlayfrombeginningbuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-playfrombeginningbutton");
        };

        MediaPlayerTests.prototype.testWhenGetChapterskipbackbuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-chapterskipbackbutton");
        };

        MediaPlayerTests.prototype.testWhenGetRewindbuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-rewindbutton");
        };

        MediaPlayerTests.prototype.testWhenGetTimeskipbackbuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-timeskipbackbutton");
        };

        MediaPlayerTests.prototype.testWhenGetPlaypausebuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-playpausebutton");
        };

        MediaPlayerTests.prototype.testWhenGetTimeSkipforwardbuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-timeskipforwardbutton");
        };

        MediaPlayerTests.prototype.testWhenGetFastforwardbuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-fastforwardbutton");
        };

        MediaPlayerTests.prototype.testWhenGetChapterskipforwardbuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-chapterskipforwardbutton");
        };

        MediaPlayerTests.prototype.testWhenGetZoombuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-zoombutton");
        };

        MediaPlayerTests.prototype.testWhenGetLivebuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-livebutton");
        };

        MediaPlayerTests.prototype.testWhenGetZoombuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-zoombutton");
        };

        MediaPlayerTests.prototype.testWhenGetPlayonremotedevicebuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-playonremotedevicebutton");
        };

        MediaPlayerTests.prototype.testWhenGetClosedcaptionsbuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-closedcaptionsbutton");
        };

        MediaPlayerTests.prototype.testWhenGetVolumebuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-volumebutton");
        };

        MediaPlayerTests.prototype.testWhenGetAudiotracksbuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-audiotracksbutton");
        };

        MediaPlayerTests.prototype.testWhenGetFullscreenbuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-fullscreenbutton");
        };

        MediaPlayerTests.prototype.testWhenGetPlaybackratebuttonElementByClassNameThenReturnsTheElement = function () {
            runGetButtonBySelectorTestCase(".win-mediaplayer-playbackratebutton");
        };

        MediaPlayerTests.prototype.testGivenNoTransportBarButttonsWhenAddMarkerThenDoesNotThrowAnException = function () {
            runNoTransportBarButtonsTestCase("addMarker", 10);
        };

        MediaPlayerTests.prototype.testGivenNoTransportBarButttonsWhenChapterSkipBackThenDoesNotThrowAnException = function () {
            runNoTransportBarButtonsTestCase("chapterSkipBack");
        };

        MediaPlayerTests.prototype.testGivenNoTransportBarButttonsWhenChapterSkipForwardThenDoesNotThrowAnException = function () {
            runNoTransportBarButtonsTestCase("chapterSkipForward");
        };

        MediaPlayerTests.prototype.testGivenNoTransportBarButttonsWhenFastForwardThenDoesNotThrowAnException = function () {
            runNoTransportBarButtonsTestCase("fastForward");
        };

        MediaPlayerTests.prototype.testGivenNoTransportBarButttonsWhenGoToLiveThenDoesNotThrowAnException = function () {
            runNoTransportBarButtonsTestCase("goToLive");
        };

        MediaPlayerTests.prototype.testGivenNoTransportBarButttonsWhenTimeSkipBackThenDoesNotThrowAnException = function () {
            runNoTransportBarButtonsTestCase("hidecontrols");
        };

        MediaPlayerTests.prototype.testGivenNoTransportBarButttonsWhenPlayThenDoesNotThrowAnException = function () {
            runNoTransportBarButtonsTestCase("play");
        };

        MediaPlayerTests.prototype.testGivenNoTransportBarButttonsWhenPauseThenDoesNotThrowAnException = function () {
            runNoTransportBarButtonsTestCase("pause");
        };

        MediaPlayerTests.prototype.testGivenNoTransportBarButttonsWhenSeekThenDoesNotThrowAnException = function () {
            runNoTransportBarButtonsTestCase("seek", 10);
        };

        MediaPlayerTests.prototype.testGivenNoTransportBarButttonsWhenTimeSkipBackThenDoesNotThrowAnException = function () {
            runNoTransportBarButtonsTestCase("setContentMetadata");
        };

        MediaPlayerTests.prototype.testGivenNoTransportBarButttonsWhenTimeSkipBackThenDoesNotThrowAnException = function () {
            runNoTransportBarButtonsTestCase("showcontrols");
        };

        MediaPlayerTests.prototype.testGivenNoTransportBarButttonsWhenTimeSkipBackThenDoesNotThrowAnException = function () {
            runNoTransportBarButtonsTestCase("stop");
        };

        MediaPlayerTests.prototype.testGivenNoTransportBarButttonsWhenTimeSkipBackThenDoesNotThrowAnException = function () {
            runNoTransportBarButtonsTestCase("timeSkipBack");
        };

        MediaPlayerTests.prototype.testGivenNoTransportBarButttonsWhenTimeSkipForwardThenDoesNotThrowAnException = function () {
            runNoTransportBarButtonsTestCase("timeSkipForward");
        };

        MediaPlayerTests.prototype.testWhenWindowResizeThenDoesNotThrowException = function () {
            var wasExceptionThrown = false;
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.mediaElementAdapter.mediaElement = new Test.MockMediaElement();
            try {
                mediaPlayer._windowResizeCallback();
            } catch (exception) {
                wasExceptionThrown = true;
            }
            LiveUnit.Assert.isFalse(wasExceptionThrown, "An exception was thrown when calling the mediaPlayer's resize handler.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGiveNWinjsWhenMediaPlayerIsInstantiatedProgramaticallyWithNoVideoThenDefaultValuesForMediaPlayerPropertiesAreCorrect = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            LiveUnit.Assert.isNotNull(mediaPlayer.mediaElementAdapter, "MediaPlayer.mediaElementAdapter was null.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenWinjsWhenMediaPlayerIsInstantiatedProgramaticallyWithVideoWithValidSourceThenDefaultValuesForMediaPlayerPropertiesAreCorrect = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var video = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = video;
            video.src = "http://lizard.dns.microsoft.com/WMV/Halo4TrailerSmall.wmv";
            video.autoplay = true;
            LiveUnit.Assert.isFalse(mediaPlayer.fullScreen, "mediaPlayer.fullScreen did not default to 'false'.");
            LiveUnit.Assert.isNotNull(mediaPlayer.mediaElementAdapter, "MediaPlayer.mediaElementAdapter was null.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenWinjsWhenMediaPlayerIsInstantiatedDeclarativelyThenAValidMediaPlayerIsCreated = function () {
            var containerDiv = document.createElement("div");
            containerDiv.innerHTML = '<div data-win-control="WinJS.UI.MediaPlayer">' +
                                        '   <video></video>' +
                                        '</div>';
            WinJS.UI.processAll(containerDiv);
            var mediaPlayer = containerDiv.querySelector(".win-mediaplayer").winControl;
            LiveUnit.Assert.isFalse(mediaPlayer.fullScreen, "mediaPlayer.fullScreen did not default to 'false'.");
            LiveUnit.Assert.isNotNull(mediaPlayer.mediaElementAdapter, "MediaPlayer.mediaElementAdapter was null.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenWinJSWhenMediaPlayerConstructorIsCalledWithANullElementThenAMediaPlayerControlIsCreated = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer(null);
            LiveUnit.Assert.isNotNull(mediaPlayer.mediaElementAdapter, "MediaPlayer.mediaElementAdapter was null.");
            LiveUnit.Assert.areEqual(true, mediaPlayer.thumbnailEnabled, "mediaPlayer.thumbnailEnabled was not 'true'.");
            LiveUnit.Assert.isNotNull(mediaPlayer.mediaElementAdapter, "mediaPlayer.mediaElementAdapter was null.");
            LiveUnit.Assert.areEqual(WinJS.UI.Layout.full, mediaPlayer.layout, "mediaPlayer.layout was not 'WinJS.UI.Layout.full'.");
            LiveUnit.Assert.areEqual(0, mediaPlayer.startTime, "mediaPlayer.startTime was not 0.");
            LiveUnit.Assert.areEqual(0, mediaPlayer.startTime, "mediaPlayer.startTime was not 0.");
            LiveUnit.Assert.isNotNull(mediaPlayer.timeFormatter, "mediaPlayer.timeFormatter was was null.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenWinJSWhenMediaPlayerConstructorIsCalledWithAnElementThatIsNotInTheDOMThenAMediaPlayerControlIsCreated = function () {
            var element = document.createElement("div");
            var mediaPlayer = new WinJS.UI.MediaPlayer(element);
            LiveUnit.Assert.areEqual(element, mediaPlayer.element, "MediaPlayer.element was not the element we used to instantiate it with.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenWinJSWhenMediaPlayerConstructorIsCalledWiThAnElementThatIsInTheDOMThenAMediaPlayerControlIsCreated = function () {
            var element = document.createElement("div");
            document.body.appendChild(element);
            var mediaPlayer = new WinJS.UI.MediaPlayer(element);
            LiveUnit.Assert.areEqual(element, mediaPlayer.element, "MediaPlayer.element was not the element we used to instantiate it with.");
            // Clean up the element
            element.parentNode.removeChild(element);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenWinJSWhenMediaPlayerConstructorIscalledWithANonDivElementThatIsInTheDOMThenAMediaPlayeControlIsCreated = function () {
            var element = document.createElement("img");
            document.body.appendChild(element);
            var mediaPlayer = new WinJS.UI.MediaPlayer(element);
            LiveUnit.Assert.areEqual(element, mediaPlayer.element, "MediaPlayer.element was not the element we used to instantiate it with.");
            // Clean up the element
            element.parentNode.removeChild(element);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenWinJSWhenMediaPlayerConstructorIsCalledWithOptionsThenOptionsAreSet = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer(null, { foo: "bar" });
            LiveUnit.Assert.areEqual("bar", mediaPlayer.foo, "We were able to set the options on the element.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenWinJSWhenMediaPlayer_constructorIscalledThenexpected_DOM_methodsAreadded = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            LiveUnit.Assert.isNotNull(mediaPlayer.addEventListener, "The mediaPlayer control does not have all the expected DOM methods.");
            LiveUnit.Assert.isNotNull(mediaPlayer.dispatchEvent, "The mediaPlayer control does not have all the expected DOM methods.");
            LiveUnit.Assert.isNotNull(mediaPlayer.removeEventListener, "The mediaPlayer control does not have all the expected DOM methods.");
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenWinJSWhenMediaPlayerDisposeIsCalledTwiceThenNoExceptionIsThrown = function () {
            var wasExceptionThrown = false;
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            mediaPlayer.dispose();
            try {
                mediaPlayer.dispose();
            } catch (Exception) {
                wasExceptionThrown = true;
            }
            LiveUnit.Assert.isFalse(wasExceptionThrown, "Exception was thrown when MediaPlayer.dispose was called twice.");
            safeDispose(mediaPlayer);
        };

        // Thumbnail events
        MediaPlayerTests.prototype.testGivenWinJSWhenFastFowardingAndThumbnailEnabledThenRaiseThumbnailrequestEvent = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.thumbnailEnabled = true;
            mediaPlayer.addEventListener("thumbnailrequest", function thumbnailrequest() {
                mediaPlayer.removeEventListener("thumbnailrequest", thumbnailrequest);
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mediaPlayer.fastForward();
            mediaPlayer._onFastForwardRewindTimerTick();
        };

        MediaPlayerTests.prototype.testGivenWinJSWhenRewindingAndthumbnailEnabledThenRaiseThumbnailrequestEvent = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.addEventListener("thumbnailrequest", function thumbnailrequest() {
                mediaPlayer.removeEventListener("thumbnailrequest", thumbnailrequest);
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mediaPlayer.rewind();
            mediaPlayer._onFastForwardRewindTimerTick();
        };

        MediaPlayerTests.prototype.testGivenWinJSWhenFastFowardingAndnotThumbnailEnabledThenNothumbnailrequestEvent = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.thumbnailEnabled = false;
            mediaPlayer.addEventListener("thumbnailrequest", function thumbnailRequest() {
                mediaPlayer.removeEventListener("thumbnailrequest", thumbnailRequest);
                LiveUnit.Assert.fail("The thumbnailRequest event should not have been raised.");
            }, false);
            mediaPlayer.fastForward();
            mediaPlayer._onFastForwardRewindTimerTick();
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testGivenWinJSWhenRewindingAndNotThumbnailEnabledThenNoThumbnailrequestEvent = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.thumbnailEnabled = false;
            mediaPlayer.addEventListener("thumbnailrequest", function thumbnailRequest() {
                mediaPlayer.removeEventListener("thumbnailrequest", thumbnailRequest);
                LiveUnit.Assert.fail("The thumbnailRequest event should not have been raised.");
            }, false);
            mediaPlayer.rewind();
            mediaPlayer._onFastForwardRewindTimerTick();
            safeDispose(mediaPlayer);
        };

        // targetratechange event
        MediaPlayerTests.prototype.testGivenWinJSWhenFastForwardThenTargetratechangedEvent = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.addEventListener("targetratechange", function targetratechange() {
                mediaPlayer.removeEventListener("targetratechange", targetratechange);
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mediaPlayer.fastForward();
            mediaPlayer.fastForward();
        };

        // targettimeupdate event
        MediaPlayerTests.prototype.testGivenWinJSWhenFastForwardThenTargettimeupdateEvent = function (complete) {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.duration = 10;
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.addEventListener("targettimeupdate", function targettimeupdate() {
                mediaPlayer.removeEventListener("targettimeupdate", targettimeupdate);
                safeDispose(mediaPlayer);
                complete();
            }, false);
            mediaPlayer.fastForward();
            mediaPlayer.fastForward();
        };

        // Regression test cases - all the following test cases are based on real bugs found in production
        MediaPlayerTests.prototype.testWhenSrcSetToNullThenStartTimeAndEndTimeUpdate = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mockMediaElement.autoplay = true;
            mockMediaElement.duration = 10;
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mockMediaElement.src = "notnull";
            mediaPlayer.startTime = 1;
            mediaPlayer.endTime = 2;
            mockMediaElement.src = null;
            LiveUnit.Assert.areNotEqual(1, mediaPlayer.startTime);
            LiveUnit.Assert.areNotEqual(2, mediaPlayer.endTime);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSetButtonsToDisabledAndSrcSetThenDisabledButtonStatePreserved = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mockMediaElement.autoplay = true;
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            mediaPlayer.element.querySelector(".win-mediaplayer-playpausebutton").disabled = true;
            mockMediaElement.src = "notnull";
            LiveUnit.Assert.isTrue(mediaPlayer.element.querySelector(".win-mediaplayer-playpausebutton").disabled);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenFocusInOverlayAndSpaceOrGamepadAThenControlsDontShowControls = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            var overlay = document.createElement("button");
            mockMediaElement.autoplay = true;
            mockMediaElement.src = "notnull";
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            WinJS.Utilities.addClass(overlay, ".win-overlay");
            document.body.appendChild(overlay);
            overlay.focus();
            mediaPlayer._onInputHandlerKeyDown({ keyCode: WinJS.Utilities.space });
            mediaPlayer._onInputHandlerKeyDown({ keyCode: WinJS.Utilities.gamepadA });
            LiveUnit.Assert.isFalse(mediaPlayer.controlsVisible);
            document.body.removeChild(overlay);
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenaddMarkerWithTimeZeroThenDoesNotThrowException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            var mockMediaElement = new Test.MockMediaElement();
            mediaPlayer.mediaElementAdapter.mediaElement = mockMediaElement;
            try {
                mediaPlayer.addMarker(0);
            } catch (ex) {
                LiveUnit.Assert.fail("Adding a marker with time 0 should not throw an exception.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenCallSetContentMetadataWithEmptyObjectsThenDoesNotThrowException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            try {
                mediaPlayer.setContentMetadata({}, {});
            } catch (ex) {
                LiveUnit.Assert.fail("Calling setContentMetadata with null should not throw an exception.");
            }
            safeDispose(mediaPlayer);
        };

        MediaPlayerTests.prototype.testWhenSuspendThenDoesNotThrowException = function () {
            var mediaPlayer = new WinJS.UI.MediaPlayer();
            try {
                mediaPlayer._handleCheckpointCallback();
            } catch (ex) {
                LiveUnit.Assert.fail("Suspending the MediaPlayer should not throw an exception.");
            }
            safeDispose(mediaPlayer);
        };

        return MediaPlayerTests;
    })();
    CorsicaTests.MediaPlayerTests = MediaPlayerTests;
})(CorsicaTests || (CorsicaTests = {}));
LiveUnit.registerTestClass("CorsicaTests.MediaPlayerTests");