// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="FlipperUtils.ts"/>
/// <reference path="../TestLib/TestDataSource.ts"/>

module WinJSTests {

    "use strict";

    var pageSelectedEvent = "pagecompleted";

    function pixelToInt(val) {
        return parseInt(val, 10);
    }

    function smallContentCentered(orientation) {
        var smallRenderer = function (itemPromise) {
            var renderer = basicInstantRenderer(itemPromise);
            renderer.element.style.width = "100px";
            renderer.element.style.height = "100px";
            renderer.element.classList.add("rootElement");
            return renderer;
        }

            var options = { itemTemplate: smallRenderer, orientation: orientation };
        var flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID(), options);
        var element = flipper.element;
        var templateRoot = <HTMLElement>element.querySelector(".rootElement");

        var flipViewHeight = pixelToInt(getComputedStyle(element).height);
        var flipViewWidth = pixelToInt(getComputedStyle(element).width);
        var itemHeight = pixelToInt(getComputedStyle(templateRoot).height);
        var itemWidth = pixelToInt(getComputedStyle(templateRoot).width);
        var itemTop = templateRoot.offsetTop;
        var itemLeft = templateRoot.offsetLeft;

        var shorter = itemHeight < flipViewHeight;
        var thinner = itemWidth < flipViewWidth;

        LiveUnit.Assert.isTrue(shorter && thinner, "content should be smaller than the FlipView");

        var centerTop = (flipViewHeight - itemHeight) / 2;
        var centerLeft = (flipViewWidth - itemWidth) / 2;

        LiveUnit.Assert.areEqual(centerTop, itemTop, "content is not vertically centered");
        LiveUnit.Assert.areEqual(centerLeft, itemLeft, "content is not horizontally centered");
    }

    // Create LayoutTests object
    export class LayoutTests {


        //
        // Function: SetUp
        //
        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            CommonUtilities.getIEInfo();
            // We want to recreate the flipper element between each test so we start fresh.
            FlipperUtils.addFlipperDom("200");
        }

        //
        // Function: tearDown
        //
        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            FlipperUtils.removeFlipperDom();
        }

        //
        // Test: testFlipperSmallContentCentered
        // Ensure that the small content is centered in the flipper region.
        //

        testFlipperSmallContentCentered_horizontal() {
            smallContentCentered("horizontal");
        }

        testFlipperSmallContentCentered_vertical() {
            smallContentCentered("vertical");
        }

        //
        // Test: testFlipperLargeContent
        // Ensure the large content is cropped, not centered.
        //
        /*
        this.testFlipperLargeContent = function (signalTestCaseCompleted) {
            var flipperDiv = document.getElementById(flipperUtils.basicFlipperID()),
                flipperHeight = flipperDiv.offsetHeight,
                flipperWidth = flipperDiv.offsetWidth,
                foundLarge = false,
                basicIds = flipperUtils.basicFlipperHtmlIDs(),
                currentIndex = 0,
                flipper;

            LiveUnit.LoggingCore.logComment("Flipper Height: " + flipperHeight);
            LiveUnit.LoggingCore.logComment("Flipper Width: " + flipperWidth);

            var callback = LiveUnit.GetWrappedCallback(function () {
                verifyLayout(currentIndex);
                currentIndex++;
                if (currentIndex < basicIds.length) {
                    flipperUtils.ensureCurrentPage(flipper, currentIndex, callback);
                }
            });

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                callback();
            });
            flipperDiv.addEventListener(pageSelectedEvent, verify);

            flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());

            var verifyLayout = function (index) {
                var pageID = basicIds[index];
                var pageDiv = document.getElementById(pageID);
                LiveUnit.Assert.isNotNull(pageDiv, "Unable to find basic html element ID: " + pageID);

                // find a page that is larger than the flipper
                if (pageDiv.offsetHeight > flipperHeight && pageDiv.offsetWidth > flipperWidth) {
                    foundLarge = true;
                    LiveUnit.LoggingCore.logComment("Found large page: " + pageID);
                    var largeHeight = pageDiv.offsetHeight;
                    var largeWidth = pageDiv.offsetWidth;
                    LiveUnit.LoggingCore.logComment("Large Height: " + largeHeight);
                    LiveUnit.LoggingCore.logComment("Large Width: " + largeWidth);

                    // Ensure that the the div is not centered (top-left justified)
                    var largeLeft = pageDiv.offsetLeft;
                    var largeTop = pageDiv.offsetTop;
                    LiveUnit.LoggingCore.logComment("Large Left: " + largeLeft);
                    LiveUnit.LoggingCore.logComment("Large Top: " + largeTop);
                    LiveUnit.Assert.isTrue(largeLeft === 0, "left style should be 0 but is " + largeLeft);
                    LiveUnit.Assert.isTrue(largeTop === 0, "top style should be 0 but is " + largeTop);

                    // Need to compare the element's dimension with panningDivContainer's dimensions
                    var parentNode = flipper._panningDivContainer;
                    var parentHeight = parentNode.offsetHeight;
                    var parentWidth = parentNode.offsetWidth;
                    LiveUnit.LoggingCore.logComment("Parent Height: " + parentHeight);
                    LiveUnit.LoggingCore.logComment("Parent Width: " + parentWidth);
                    LiveUnit.Assert.isTrue(parentHeight === flipperHeight, "Parent height of large item should " +
                        " be the same as flipper height but is not.");
                    LiveUnit.Assert.isTrue(parentWidth === flipperWidth, "Parent width of large item should be " +
                        " the same as flipper width but is not.");
                }

                if ((index + 1) === basicIds.length) {
                    // We are at the last page of flipper
                    // Ensure that a large item was found otherwise throw an assert.
                    LiveUnit.Assert.isTrue(foundLarge, "Unable to find an item larger than the flipper.  Check HTML.");
                    signalTestCaseCompleted();
                }
            };
        }
        */
    }


}

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.LayoutTests");