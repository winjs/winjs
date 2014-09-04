// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="FlipperUtils.js"/>
/// <reference path="../TestLib/TestDataSource.ts"/>

var PropertyTests = null;

(function() {

    // Create PropertyTests object
    PropertyTests = function() {
        var flipperUtils = new FlipperUtils();
        var commonUtils = CommonUtilities;

        //
        // Function: SetUp
        // This is the setup function that will be called at the beginning of each test function.
        //
        this.setUp = function() {
            LiveUnit.LoggingCore.logComment("In setup");
            commonUtils.getIEInfo();

            // We want to recreate the flipper element between each test so we start fresh.
            flipperUtils.addFlipperDom();
        }

        //
        // Function: tearDown
        //
        this.tearDown = function() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            flipperUtils.removeFlipperDom();
        }

        //
        // Test: testFlipperCount
        //
        this.testFlipperCount = function(signalTestCaseCompleted) {
            var numOfItems = 10;
            var error = false;
            var countCompleted = LiveUnit.GetWrappedCallback(function (count) {
                LiveUnit.LoggingCore.logComment("Count of items: " + count);
                LiveUnit.Assert.areEqual(numOfItems, count, "Expected count to be: " + numOfItems);
                signalTestCaseCompleted();
            });

            var countError = LiveUnit.GetWrappedCallback(function (err) {
                LiveUnit.LoggingCore.logComment("Unable to determine count.");
                error = true;
                LiveUnit.Assert.fail(err);
                signalTestCaseCompleted();
            });

            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID(), {
                itemDataSource: commonUtils.simpleArrayDataSource(numOfItems),
                itemTemplate: commonUtils.simpleArrayRenderer
            });
            flipper.count().then(countCompleted, countError).
                            then(null, countError);
        }


        //
        // Test: testFlipperItemSpacingProperty
        //
        this.testFlipperItemSpacingProperty = function() {
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());

            // Retrieve default itemSpacing
            var amount = flipper.itemSpacing;
            LiveUnit.LoggingCore.logComment("itemSpacing Default: " + amount);
            LiveUnit.Assert.isFalse(isNaN(amount), "Default itemSpacing should be a number.");

            // Set new itemsSpacing amount and test that it was set correctly.
            var setAmount = 5;
            flipper.itemSpacing = setAmount;
            var newAmount = flipper.itemSpacing;
            LiveUnit.LoggingCore.logComment("flipper.itemSpacing after set: " + newAmount);
            LiveUnit.Assert.isTrue(newAmount == setAmount, "flipper.itemSpacing was set to " +
                setAmount + " but is " + newAmount);
        }

        //
        // Test: testFlipperDataSourceProperty
        //
        this.testFlipperDataSourceProperty = function(signalTestCaseCompleted) {
            // This function will create an array datasource with data based on text passed into it.
            function SimpleDataSource(itemText) {
                var testData = [];
                for (var i  = 0; i < 10; i++)
                {
                    testData.push({ text: itemText + i });
                }
                return new WinJS.Binding.List(testData).dataSource;
            }

            function SimpleRenderer(itemPromise) {
                return itemPromise.then(function(item) {
                    var result = document.createElement("div");
                    result.setAttribute("id", item.data.text);
                    result.textContent = item.data.text;
                    return result;
                });
            }

            var firstSource = "FirstSource";
            var firstPage = 0;
            var secondSource = "SecondSource";
            var secondPage = 9;
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID(), {
                currentPage: firstPage,
                itemDataSource: SimpleDataSource(firstSource),
                itemTemplate: SimpleRenderer
            });
            var currentPageCompleted = LiveUnit.GetWrappedCallback(function() {
                flipper.itemDataSource = SimpleDataSource(secondSource);
                flipper.itemTemplate = SimpleRenderer;
                setTimeout(LiveUnit.GetWrappedCallback(function() {
                    VerifyCurrentPageTextFromFlipper(flipper, secondSource + firstPage);
                    flipperUtils.ensureCurrentPage(flipper, secondPage, LiveUnit.GetWrappedCallback(function() {
                        setTimeout(LiveUnit.GetWrappedCallback(function() {
                            VerifyCurrentPageTextFromFlipper(flipper, secondSource + secondPage);
                            signalTestCaseCompleted();
                        }), NAVIGATION_TIMEOUT);
                    }));
                }), NAVIGATION_TIMEOUT);
            });

            VerifyCurrentPageTextFromFlipper(flipper, firstSource + firstPage);
            flipperUtils.ensureCurrentPage(flipper, secondPage, currentPageCompleted)

            function VerifyCurrentPageTextFromFlipper(flipper, text) {
                LiveUnit.LoggingCore.logComment("Verify that " + text + " matches the flipper's currentPage textContent.");
                var element = flipper._pageManager._currentPage.element.firstElementChild;
                var currentPageText = element.textContent;
                var elementId = element.id;
                LiveUnit.LoggingCore.logComment("Flipper object's currentPage textContent: " + currentPageText);
                LiveUnit.Assert.isTrue(text === currentPageText, "Text wasn't found in flipper object's currentPage.");
                LiveUnit.LoggingCore.logComment("Verify that '" + text + "' matches what's in the DOM.");
                LiveUnit.Assert.isTrue(text === document.getElementById(elementId).textContent, "Text wasn't found in the DOM.");
            }
        }

        //
        // Test: testFlipperCurrentPageProperty
        //
        this.testFlipperCurrentPageProperty = function() {
            var flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());

            // Retrieve default currentPage
            var amount = flipper.currentPage;
            LiveUnit.LoggingCore.logComment("currentPage Default: " + amount);
            LiveUnit.Assert.isFalse(isNaN(amount), "Default currentPage should be a number.");

            var setAmount = 5;
            flipper.currentPage = setAmount;
            var newAmount = flipper.currentPage;
            LiveUnit.LoggingCore.logComment("flipper.currentPage after set: " + newAmount);
            LiveUnit.Assert.isTrue(newAmount == setAmount, "flipper.currentPage was set to " + setAmount +
                " but is " + newAmount);
        }
    }

    // Register the object as a test class by passing in the name
    LiveUnit.registerTestClass("PropertyTests");
} ());
