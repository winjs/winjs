// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

module CorsicaTests {

    "use strict";

    export class RatingTests {

        // Initial setup for each test to create the anchor element
        setUp() {
            LiveUnit.LoggingCore.logComment("Create Rating Element");

            var newNode = document.createElement("div");
            newNode.id = "ratingTestDiv";
            newNode.innerHTML =
            "<div id='rating'></div>";
            document.body.appendChild(newNode);
        }

        tearDown() {
            var ratingElement = document.getElementById("ratingTestDiv");
            if (ratingElement) {
                WinJS.Utilities.disposeSubTree(ratingElement);
                document.body.removeChild(ratingElement);
            }
        }
        
        testSimpleRating = function () {
            var rating = new WinJS.UI.Rating();
            LiveUnit.Assert.areEqual(5, rating.maxRating, "default should be 5");
            rating.userRating = 10;
            LiveUnit.Assert.areEqual(5, rating.userRating, "userRating should be clamped to max");
            rating.averageRating = 10;
            LiveUnit.Assert.areEqual(5, rating.averageRating, "averageRating should be clamped to max");
        }

        // Test Rating Instantiation
        testRatingInstantiation() {
            // Get the rating element from the DOM
            LiveUnit.LoggingCore.logComment("Getting the rating element by id");
            var ratingElement = document.getElementById("rating");

            // Test rating insantiation
            LiveUnit.LoggingCore.logComment("Attempt to Insantiate the rating element");
            var rating = new WinJS.UI.Rating(ratingElement);
            LiveUnit.LoggingCore.logComment("Rating has been insantiated.");
            LiveUnit.Assert.isNotNull(rating, "Rating element should not be null when insantiated.");

            verifyFunction("addEventListener");
            verifyFunction("removeEventListener");

            function verifyFunction(functionName) {
                LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
                if (rating[functionName] === undefined) {
                    LiveUnit.Assert.fail(functionName + " missing from rating");
                }

                LiveUnit.Assert.isNotNull(rating[functionName]);
                LiveUnit.Assert.isTrue(typeof (rating[functionName]) === "function", functionName + " exists on rating, but it isn't a function");
            }
        }

        // Test Rating Instatiation with null element
        testRatingNullInstatiation() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the rating with null element");
            var rating = null;

            try {
                rating = "attempting";
                rating = new WinJS.UI.Rating(null);
            }
            catch (e) {
                rating = null;
            }
            LiveUnit.Assert.isNotNull(rating, "Rating instatiation correctly handled a null element.");
        }

        // Test rating parameters
        testRatingParams() {
            function testGoodInitOption(paramName, value) {
                LiveUnit.LoggingCore.logComment("Testing creating a rating using good parameter " + paramName + "=" + value);

                var options = {};
                options[paramName] = value;
                var rating = new WinJS.UI.Rating(null, options);
                LiveUnit.Assert.isNotNull(rating);

            }

            testGoodInitOption("userRating", 3);
            testGoodInitOption("averageRating", 4.5);
            testGoodInitOption("disabled", true);
            testGoodInitOption("averageRating", 2.5);
            testGoodInitOption("userRating", null);
            testGoodInitOption("averageRating", "Bogdan Radakovic"/*, averageRatingIsInvalid*/);
            testGoodInitOption("disabled", 10/*, disabedIsInvalid*/);
            testGoodInitOption("userRating", 2.5/*, userRatingIsInvalid*/);
            testGoodInitOption("averageRating", 0/*, averageRatingIsInvalid*/);
        }

        // Test maxRating,userRating & averageRating updates during runtime
        testRatingPropertiesUpdate(complete) {
            var ratingElement = <HTMLElement>document.getElementById('ratingTestDiv');
            var ratingControl = new WinJS.UI.Rating(ratingElement, { averageRating: 5.5, maxRating: 10 });
            var verifyRatingProperties = function (userRating, averageRating, maxRating, enableClear) {
                LiveUnit.Assert.areEqual(userRating, ratingControl.userRating, "Check userRating");
                LiveUnit.Assert.areEqual(averageRating, ratingControl.averageRating, "Check averageRating");
                LiveUnit.Assert.areEqual(maxRating, ratingControl.maxRating, "Check maxRating");
                LiveUnit.Assert.areEqual(enableClear, ratingControl.enableClear, "Check enableClear");
            };

            ratingElement.setAttribute("aria-valuenow", "3");
            WinJS.Utilities._setImmediate(function () {
                verifyRatingProperties(3, 5.5, 10, true);

                ratingElement.setAttribute("aria-valuenow", "0");
                WinJS.Utilities._setImmediate(function () {
                    verifyRatingProperties(0, 5.5, 10, true);

                    //update maxRating = 7
                    ratingControl.maxRating = 7;
                    verifyRatingProperties(0, 5.5, 7, true);

                    //update maxRating to less than averageRating (5)
                    ratingControl.maxRating = 5;
                    verifyRatingProperties(0, 5, 5, true);

                    //update enableClear=false
                    ratingControl.enableClear = false;
                    verifyRatingProperties(0, 5, 5, false);

                    ratingElement.setAttribute("aria-valuenow", "4");
                    WinJS.Utilities._setImmediate(function () {
                        verifyRatingProperties(4, 5, 5, false);

                        //update userRating = 3
                        ratingControl.userRating = 3;
                        verifyRatingProperties(3, 5, 5, false);

                        //update averageRating = 4
                        ratingControl.averageRating = 4;
                        verifyRatingProperties(3, 4, 5, false);

                        //update maxRating = 3
                        ratingControl.maxRating = 3;
                        verifyRatingProperties(3, 3, 3, false);

                        complete();
                    });
                });
            });
        }

        // Tests for dispose members and requirements
        testRatingDispose() {
            var rating = <WinJS.UI.PrivateRating> new WinJS.UI.Rating();
            LiveUnit.Assert.isTrue(rating.dispose);
            LiveUnit.Assert.isTrue(rating.element.classList.contains("win-disposable"));
            LiveUnit.Assert.isFalse(rating._disposed);

            rating.averageRating = 5;
            rating._ensureTooltips();
            var tooltips = rating._toolTips;
            LiveUnit.Assert.areEqual(tooltips.length, rating.averageRating);
            for (var i = 0; i < tooltips.length; i++) {
                LiveUnit.Assert.isFalse(tooltips[i]._disposed);
            }

            rating.dispose();
            LiveUnit.Assert.isTrue(rating._disposed);
            for (var i = 0; i < tooltips.length; i++) {
                LiveUnit.Assert.isTrue(tooltips[i]._disposed);
            }
            rating.dispose();
        }

        testChangingRatingViaKeysWithoutCommitingCanReverseDirections = function () {
            var rating = <WinJS.UI.PrivateRating> new WinJS.UI.Rating();

            Helper.keydown(rating.element, WinJS.Utilities.Key.rightArrow); // 1
            Helper.keydown(rating.element, WinJS.Utilities.Key.rightArrow); // 2
            Helper.keydown(rating.element, WinJS.Utilities.Key.leftArrow);  // 1
            Helper.keydown(rating.element, WinJS.Utilities.Key.enter);
            LiveUnit.Assert.areEqual(1, rating.userRating);
        }
    }
    var disabledTestRegistry = {
        testRatingPropertiesUpdate: Helper.Browsers.ie10
    };
    Helper.disableTests(RatingTests, disabledTestRegistry);
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.RatingTests");
