// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//-----------------------------------------------------------------------------
//
//  Abstract:
//
//      Various utilities used by the Rating Control tests.
//
//  Author: sehume
//
//-----------------------------------------------------------------------------
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/util.ts" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>
/// <reference path="RatingUtils.js"/>

function RatingUtils() {
}
RatingUtils.prototype = (function () {
    "use strict";
    var commonUtils = CommonUtilities;

    // Public functions
    return {
        //-----------------------------------------------------------------------------------
        // List of exceptions the rating control throws.
        exceptions: {
            elementIsInvalid: "Invalid argument: Rating control expects a valid DOM element as the first argument.",
            tooltipsInvalid: "Invalid argument: tooltipStrings must be null or an array of strings."
        },

        //-----------------------------------------------------------------------------------
        // List of css parts defined for rating control.
        parts: {
            overallControl: "win-rating",
            averageEmpty: "win-star win-average win-empty",
            averageFull: "win-star win-average win-full",
            userEmpty: "win-star win-empty win-user",
            userFull: "win-star win-user win-full",
            tentativeEmpty: "win-star win-tentative win-empty",
            tentativeFull: "win-star win-tentative win-full",
            disabledEmpty: "win-star win-empty win-disabled",
            disabledFull: "win-star win-full win-disabled"
        },

        //-----------------------------------------------------------------------------------
        // List of localized strings.
        localizedStrings: {
            "en-US": {
                userLabel: "User Rating",
                averageLabel: "Average Rating",
                tentativeLabel: "Tentative Rating",
                clearYourRating: "Clear your rating",
                unrated: "Unrated"
            }
        },

        //-----------------------------------------------------------------------------------
        // TODO: Make this dynamically figure out the current language... and add the strings to localizedStrings array.
        currentLanguage: "en-US",

        //-----------------------------------------------------------------------------------
        // List of default star glyph colors for each class coming from designer comps
        defaultColors: {
            dark: {
                averageEmpty: "rgba(255, 255, 255, 0.35)",
                averageFull: "rgb(255, 255, 255)",
                userEmpty: "rgba(255, 255, 255, 0.35)",
                userFull: "rgb(91, 46, 197)",
                tentativeEmpty: "rgba(255, 255, 255, 0.35)",
                tentativeFull: "rgb(129, 82, 239)",
                disabledEmpty: "rgba(255, 255, 255, 0.35)",
                disabledFull: "rgb(255, 255, 255)"
            },
            light: {
                averageEmpty: "rgba(0, 0, 0, 0.35)",
                averageFull: "rgb(0, 0, 0)",
                userEmpty: "rgba(0, 0, 0, 0.35)",
                userFull: "rgb(70, 23, 180)",
                tentativeEmpty: "rgba(0, 0, 0, 0.35)",
                tentativeFull: "rgb(114, 65, 228)",
                disabledEmpty: "rgba(0, 0, 0, 0.35)",
                disabledFull: "rgb(0, 0, 0)"
            }
        },

        //-----------------------------------------------------------------------------------
        // Default values for rating control parts.
        defaultMaxRating: 5,
        defaultUserRating: 0,
        defaultAverageRating: 0,
        defaultDisabled: false,
        defaultEnableClear: true,
        defaultTooltipStrings: null,
        currentTheme: "dark",

        //-----------------------------------------------------------------------------------
        // Handles to event listeners we will hang off each instantiated control.
        previewchangeListener: null,
        changeListener: null,
        cancelListener: null,

        //-----------------------------------------------------------------------------------
        setUp: function () {
            /// <summary>
            ///  Test setup to run prior to every test case.
            /// </summary>
            LiveUnit.LoggingCore.logComment("In setup");
            commonUtils.addTag("div", "rating");

            //WinBlue:280045
            var element = document.getElementById("rating");
            window.oldReleasePointerCapture = element.releasePointerCapture;
            element.releasePointerCapture = function (id) {
                try {
                    oldReleasePointerCapture.call(document.getElementById("rating"), id);
                } catch (e) {
                    LiveUnit.LoggingCore.logComment("Caught exception for WinBlue:280045 ... " + e.message);
                }
            };

            return WinJS.Promise.wrap();
        },

        //-----------------------------------------------------------------------------------
        cleanUp: function () {
            /// <summary>
            ///  Test cleanup to run prior to every test case.
            /// </summary>
            LiveUnit.LoggingCore.logComment("In cleanUp");
            commonUtils.removeElementById("rating");

            delete window.oldReleasePointerCapture;
        },

        //-----------------------------------------------------------------------------------
        addTag: function (tagName, tagId, attributes) {
            /// <summary>
            ///  Add a tag of type tagName to the document with id set to tagId and other HTML attributes set to attributes
            /// </summary>
            /// <param name="tagName" type="string">
            ///  String specifying type of tag to create
            /// </param>
            /// <param name="tagId" type="string">
            ///  String specifying HTML id to give to created tag
            /// </param>
            /// <param name="attributes" type="object">
            ///  JavaScript object containing list of attributes to set on HTML tag (note that tagId takes precedence for "id" attribute)
            /// </param>
            return commonUtils.addTag(tagName, tagId, attributes);
        },

        //-----------------------------------------------------------------------------------
        getClientRect: function (elem) {
            /// <summary>
            ///  Get the client rectangle for the given element
            /// <param name="elem" type="object">
            ///  Handle to element to get the client rectangle for
            /// </param>
            /// <returns type="object" />
            /// </summary>
            return commonUtils.getClientRect(elem);
        },

        //-----------------------------------------------------------------------------------
        removeElementById: function (tagId) {
            /// <summary>
            ///  Remove an existing tag from the DOM
            /// </summary>
            /// <param name="tagId" type="string">
            ///  String specifying the tag to remove.
            /// </param>
            var element = commonUtils.removeElementById(tagId);
            LiveUnit.Assert.isNotNull(element, "removeElementById: Couldn't find element " + tagId);
            return element;
        },

        classesMatch: function (expected, actual) {
            var result = true,
                expectedClasses = String(expected).split(" ");

            for (var i = 0; i < expectedClasses.length; ++i) {
                if (-1 == actual.indexOf(expectedClasses[i])) {
                    result = false;
                }
            }

            return result;
        },

        //-----------------------------------------------------------------------------------
        instantiate: function (element, options, expectFailure) {
            /// <summary>
            ///  Instantiate a ratings control out of the element specified by element with given options.
            ///   and verify expected result (success when all inputs valid, exception otherwise) and that
            ///   all options set correctly in success case.
            /// </summary>
            /// <param name="element" type="string">
            ///  String specifying the tag to create a ratings control out of, or the element itself.
            ///   If "null" is passed, the code will create a new element and add the rating control to that.
            /// </param>
            /// <param name="options" type="object">
            ///  JavaScript object containing a list of options to set on rating control.
            /// </param>
            /// <param name="expectFailure" type="boolean">
            ///  Explictly declare whether this call to instantiate expected to pass or fail
            ///  Note we use "expectFailure" rather than "expectSuccess" so that the caller can leave the
            ///   parameter off in the more common "expectSuccess" case
            /// </param>
            /// <returns type="object" />
            if (typeof (expectFailure) !== "boolean") {
                expectFailure = false;
            }

            LiveUnit.LoggingCore.logComment("Instantiating rating on element '" + element + "' with options = \"" + commonUtils.getOptionsAsString(options) + "\"");

            if (typeof (element) === "string") {
                element = document.getElementById(element);
            }

            var maxRatingInit = this.defaultMaxRating,
                userRatingInit = this.defaultUserRating,
                averageRatingInit = this.defaultAverageRating,
                disabledInit = this.defaultDisabled,
                enableClearInit = this.defaultEnableClear,
                tooltipStringsInit = this.defaultTooltipStrings;

            var rating = null;

            // Check if rating control already instantiated if so, save off initial options values so we can verify they don't update
            if (element) {
                rating = this.getControl(element);

                if (rating) {
                    maxRatingInit = rating.maxRating;
                    userRatingInit = rating.userRating;
                    averageRatingInit = rating.averageRating;
                    disabledInit = rating.enableClear;
                    disabledInit = rating.disabled;
                }
            }

            // Many tests use "Math.random()" to generate data, causing us to sometimes run into false positive failures due to
            //  rounding problems.  Rather than re-author the tests, limit all floating point values to just 10 digits precision
            if (options && "averageRating" in options && typeof (options.averageRating) === "number" && options.averageRating !== 0) {
                options.averageRating = Number(String(Number(options.averageRating).toPrecision(10)).replace(/0*$/, '').replace(/\.*$/, ''));
            }

            // Make the call to WinJS.UI.Rating, catching any exceptions to verify later
            var exception = null;
            try {
                rating = new WinJS.UI.Rating(element, options);
            } catch (e) {
                exception = e;
                LiveUnit.LoggingCore.logComment(exception.message);
            }

            // Verify WinJS.UI.Rating did the expected thing
            if (rating) {
                // rating is not null, means call to WinJS.UI.Rating succeeded
                LiveUnit.Assert.areEqual(false, expectFailure, "Rating control instantiation succeeded, verify expectFailure=false.");

                // Verify DOM attributes for rating control are enumerated and of the proper JavaScript type
                LiveUnit.Assert.areNotEqual(Number.NaN, Number(rating.maxRating), "Verify maxRating is a number.");
                LiveUnit.Assert.areNotEqual(Number.NaN, Number(rating.userRating), "Verify userRating is a number.");
                LiveUnit.Assert.areNotEqual(Number.NaN, Number(rating.averageRating), "Verify averageRating is a number");
                LiveUnit.Assert.areEqual("boolean", typeof (rating.disabled), "Verify disabled is of correct type.");
                LiveUnit.Assert.areEqual("object", typeof (rating.tooltipStrings), "Verify tooltipStrings is of correct type.");

                // Verify options handled correctly
                if (options && "maxRating" in options && !isNaN(options.maxRating)) {
                    if (options.maxRating < 1) {
                        LiveUnit.Assert.areEqual(maxRatingInit, rating.maxRating, "Verify maxRating cannot be set less than 1.");
                    } else {
                        LiveUnit.Assert.areEqual(Number(options.maxRating), rating.maxRating, "Verify maxRating set properly on instantiation.");
                    }
                } else {
                    LiveUnit.Assert.areEqual(maxRatingInit, rating.maxRating, "Verify default value used for maxRating when not set via options.");
                }

                if (options && "userRating" in options && !isNaN(options.userRating)) {
                    if (options.userRating < 0) {
                        LiveUnit.Assert.areEqual(0, rating.userRating, "Verify userRating cannot be set less than 0.");
                    } else if (options.userRating > rating.maxRating) {
                        LiveUnit.Assert.areEqual(rating.maxRating, rating.userRating, "Verify userRating coerced to maxRating if greater than max.");
                    } else {
                        LiveUnit.Assert.areEqual(Math.floor(options.userRating), rating.userRating, "Verify userRating set properly on instantiation.");
                    }
                } else {
                    LiveUnit.Assert.areEqual(userRatingInit, rating.userRating, "Verify default value used for userRating when not set (or improperly set) via options.");
                }

                if (options && "averageRating" in options && !isNaN(options.averageRating)) {
                    if (options.averageRating < 1) {
                        LiveUnit.Assert.areEqual(0, rating.averageRating, "Verify any averageRating less than 1 coerced to 0.");
                    } else if (options.averageRating > rating.maxRating) {
                        LiveUnit.Assert.areEqual(rating.maxRating, rating.averageRating, "Verify averageRating coerced to maxRating if greater than max.");
                    } else {
                        LiveUnit.Assert.areEqual(Number(options.averageRating), rating.averageRating, "Verify averageRating set properly on instantiation.");
                    }
                } else {
                    LiveUnit.Assert.areEqual(averageRatingInit, rating.averageRating, "Verify default value used for averageRating when not set (or improperly set) via options.");
                }

                if (options && "disabled" in options) {
                    LiveUnit.Assert.areEqual(!!options.disabled, rating.disabled, "Verify disabled set properly on instantiation.");
                } else {
                    LiveUnit.Assert.areEqual(disabledInit, rating.disabled, "Verify default value used for disabled when not set (or improperly set) via options.");
                }

                if (options && "enableClear" in options) {
                    LiveUnit.Assert.areEqual(!!options.enableClear, rating.enableClear, "Verify enableClear set properly on instantiation.");
                } else {
                    LiveUnit.Assert.areEqual(enableClearInit, rating.enableClear, "Verify default value used for enableClear when not set (or improperly set) via options.");
                }

                if (options && "tooltipStrings" in options) {
                    if (options.tooltipStrings === null) {
                        for (var i = 0; i < rating.maxRating; ++i) {
                            LiveUnit.Assert.areEqual(i + 1, rating.tooltipStrings[i], "Verify tooltipStrings uses default tooltips when set to null.");
                        }
                        LiveUnit.Assert.areEqual(this.localizedStrings[this.currentLanguage].clearYourRating, rating.tooltipStrings[rating.maxRating], "Verify tooltipStrings uses default clear rating tooltip when set to null.");
                    } else {
                        var tooltipIndex;
                        for (tooltipIndex = 0; tooltipIndex < options.tooltipStrings.length && tooltipIndex <= rating.maxRating; ++tooltipIndex) {
                            LiveUnit.Assert.areEqual(options.tooltipStrings[tooltipIndex], rating.tooltipStrings[tooltipIndex], "Verify tooltipStrings set properly on instantiation.");
                        }

                        if (tooltipIndex < options.tooltipStrings.length) {
                            // test provided too many tooltips, verify rest of rating.tooltipStrings undefined
                            for (; tooltipIndex < options.tooltipStrings.length; ++tooltipIndex) {
                                LiveUnit.Assert.areEqual(undefined, rating.tooltipStrings[tooltipIndex], "Verify tooltipStrings only allows setting of up to maxRating tooltips.  The rest are left undefined.");
                            }
                        } else if (tooltipIndex < rating.tooltipStrings.length) {
                            // test provided too few tooltips, verify default used for rest
                            for (; tooltipIndex < rating.maxRating; ++tooltipIndex) {
                                LiveUnit.Assert.areEqual(tooltipIndex + 1, rating.tooltipStrings[tooltipIndex], "Verify tooltipStrings uses default tooltips when test did not provide enough.");
                            }
                            LiveUnit.Assert.areEqual(this.localizedStrings[this.currentLanguage].clearYourRating, rating.tooltipStrings[rating.maxRating], "Verify tooltipStrings uses default clear rating tooltip when test did not provide enough.");
                        }
                    }
                } else {
                    for (var i = 0; i < rating.maxRating; ++i) {
                        LiveUnit.Assert.areEqual(i + 1, rating.tooltipStrings[i], "Verify tooltipStrings uses default tooltips when test did not provide them.");
                    }
                    LiveUnit.Assert.areEqual(this.localizedStrings[this.currentLanguage].clearYourRating, rating.tooltipStrings[rating.maxRating], "Verify tooltipStrings uses default clear rating tooltip when set to null.");
                }

                // Validating Layout and ARIA requires control added to page.
                if (null === element) {
                    document.body.appendChild(rating.element);
                    rating.element.id = "rating2";
                }

                // Only validate layout if element actually on page, otherwise a number of CSS styles wont resolve and it will look broken
                if (rating.element.parentNode) {
                    this.verifyLayout(rating.element);
                }

                this.verifyARIA(rating.element);

                // In some cases, internal ratings code should be calling setPointerCapture on touch down to block panning.
                //  Since touch tests send synthasized touch events rather than the real thing, in order to validate the control
                //  blocks panning in the proper instances, overwrite the internal call with our own validation method that we can
                //  use to track the number of calls made to the method.
                // Note that there is also a by-design exception thrown by setPointerCapture when a synthasized MSPointer event
                //  object is passed to it, so if we don't overwrite setPointerCapture, internal IE code will throw an exception
                //  during our touch tests, making it impossible to validate touch via synthasized events (so overwriting this is a win-win).
                rating.element.setPointerCapture =
                    function (pointerId) {
                        // hang an attribute off the element tracking the number of times pointer capture has been called on it
                        rating.element.setAttribute("controlSetPointerCapture", Number(rating.element.getAttribute("controlSetPointerCapture")) + 1);
                    };

                LiveUnit.LoggingCore.logComment("Rating has been instantiated.");
            } else {
                // Call to WinJS.UI.Controls.Rating failed, let's diagnose whether this was expected
                LiveUnit.Assert.areEqual(true, expectFailure, "Rating control instantiation failed with error: " + exception.message + ", verify expectFailure=true.");
                // Since element was not null, only valid reason we failed was due to options-related exception.
                //  Check to see if proper exception was thrown.

                if (options && "tooltipStrings" in options &&
                        (
                        typeof (options.tooltipStrings) !== "object"                              // tooltipStrings must be an object
                        )
                    ) {
                    LiveUnit.Assert.areEqual(this.exceptions.tooltipsInvalid, exception.message);

                    // All options valid, no reason for the call to have failed.
                    LiveUnit.Assert.fail("Rating instantiation failed when element referenced a valid element and all options valid! " + ((exception) ? "Exception: " + exception.message : ""));

                } else {
                    // Instantiation failed because element was NULL
                    LiveUnit.LoggingCore.logComment("Rating instantiation failed as expected since elmentId does not reference a valid element.");
                    LiveUnit.Assert.areEqual(this.exceptions.elementIsInvalid, exception.message);
                }
            }

            // Register generic event handlers on the newly created control
            if (rating && LiveUnit.GetWrappedCallback) {
                try {
                    this.previewchangeListener = LiveUnit.GetWrappedCallback(this.verifyEvent);
                    rating.addEventListener("previewchange", this.previewchangeListener, false);
                    this.changeListener = LiveUnit.GetWrappedCallback(this.verifyEvent);
                    rating.addEventListener("change", this.changeListener, false);
                    this.cancelListener = LiveUnit.GetWrappedCallback(this.verifyEvent);
                    rating.addEventListener("cancel", this.cancelListener, false);
                } catch (e) {
                    LiveUnit.Assert.fail("rating.addEventListener threw exception: " + e.message);
                }
            }

            return rating;
        },

        getControl: function (element) {
            /// <summary>
            ///  Get a handle to a previously created Rating Control
            /// </summary>
            /// <param name="element" type="string">
            ///  String specifying id of element rating control previously created out of, or element itself.
            /// </param>
            /// <returns type="object" />
            var rating = null;

            if (typeof (element) === "string") {
                element = document.getElementById(element);
            }

            try {
                rating = element.winControl;
            } catch (e) {
                LiveUnit.Assert.fail("Failed to get a handle to the rating control with exception: " + e);
            }

            return rating;
        },

        //-----------------------------------------------------------------------------------
        setOptionsAndVerify: function (element, options, expectFailure, useProperties) {
            /// <summary>
            ///  Call WinJS.UI.setOptions(rating, options) on a rating control built out of element and verify handled
            ///  correctly by rating control(set proper values, threw exceptions when expected, didn't alter unset values)
            /// </summary>
            /// <param name="element" type="string">
            ///  String specifying element rating control previously created out of, or element itself.
            /// </param>
            /// <param name="options" type="object">
            ///  JavaScript object containing a list of options to set on rating control.
            /// </param>
            /// <param name="expectFailure" type="boolean">
            ///  Explictly declare whether this call to WinJS.UI.setOptions(rating, ) expected to pass or fail.
            ///  Note we use "expectFailure" rather than "expectSuccess" so that the caller can leave the
            ///   parameter off in the more common "expectSuccess" case
            /// </param>
            /// <param name="useProperties" type="boolean">
            ///  Set the supplied options directly on the rating control via its DOM attributes.
            /// </param>
            /// <returns type="object" />
            if (typeof (expectFailure) !== "boolean") {
                expectFailure = false;
            }

            if (typeof (useProperties) !== "boolean") {
                useProperties = false;
            }

            if (typeof (element) === "string") {
                element = document.getElementById(element);
            }

            // Get a handle to the (supposedly existing) rating control.
            var rating = this.getControl(element);

            LiveUnit.Assert.isNotNull(rating, "Verify ratings control exists.");

            //  Store off the initial values for each option so we can verify they got updated (or didn't) later on
            var maxRatingInit = rating.maxRating,
                userRatingInit = rating.userRating,
                averageRatingInit = rating.averageRating,
                disabledInit = rating.disabled,
                enableClearInit = rating.enableClear,
                tooltipsInit = rating.tooltipStrings;

            LiveUnit.LoggingCore.logComment("Current options: \"{maxRating: " + maxRatingInit + ", userRating: " + userRatingInit + ", averageRating: " + averageRatingInit + ", disabled: " + disabledInit + "}\".");

            LiveUnit.LoggingCore.logComment("Setting options to: \"" + commonUtils.getOptionsAsString(options) + "\".");

            // Many tests use "Math.random()" to generate data, causing us to sometimes run into false positive failures due to
            //  rounding problems.  Rather than re-author the tests, limit all floating point values to just 10 digits precision
            if (options && "averageRating" in options && typeof (options.averageRating) === "number" && options.averageRating !== 0) {
                options.averageRating = Number(String(Number(options.averageRating).toPrecision(10)).replace(/0*$/, '').replace(/\.*$/, ''));
            }

            // Set the options, catching any exceptions and saving them for later verification.
            var exception = null;
            try {
                if (useProperties) {
                    for (var opt in options) {
                        if (typeof (rating[opt]) !== "undefined") {
                            rating[opt] = options[opt];
                        }
                    }
                } else {
                    WinJS.UI.setOptions(rating, options);
                }
            } catch (e) {
                exception = e;
                LiveUnit.LoggingCore.logComment(exception.message);
            }

            if (exception) {
                // Since we got an exception, verify it was expected and gave us the correct exception message.
                if (useProperties) {
                    LiveUnit.Assert.areEqual(true, expectFailure, "Setting rating properties to " + commonUtils.getOptionsAsString(options) + ") threw exception: " + exception.message + ", verify expectFailure=true.");
                } else {
                    LiveUnit.Assert.areEqual(true, expectFailure, "Call to WinJS.UI.setOptions(rating, " + commonUtils.getOptionsAsString(options) + ") threw exception: " + exception.message + ", verify expectFailure=true.");
                }

                LiveUnit.Assert.isNotNull(options, "Exception shouldn't be thrown when options null, exception.message: " + exception.message);

                if (options && "tooltipStrings" in options && typeof (options.tooltipStrings) !== "object") {
                    LiveUnit.Assert.areEqual(this.exceptions.tooltipsInvalid, exception.message);
                } else {
                    // All options valid and DOM element valid, no reason for us to fail.
                    if (useProperties) {
                        LiveUnit.Assert.fail("Unexpected exception thrown when setting rating properties to " + commonUtils.getOptionsAsString(options) + ": " + exception.message);
                    } else {
                        LiveUnit.Assert.fail("Unexpected exception thrown by WinJS.UI.setOptions(rating, " + commonUtils.getOptionsAsString(options) + "): " + exception.message);
                    }
                }

                // Since we got an exception, all values should have been left un-updated
                LiveUnit.Assert.areEqual(maxRatingInit, rating.maxRating, "Verify maxRating not changed when exception thrown while setting rating options to " + commonUtils.getOptionsAsString(options));
                LiveUnit.Assert.areEqual(userRatingInit, rating.userRating, "Verify userRating not changed when exception thrown while setting rating options to " + commonUtils.getOptionsAsString(options));
                LiveUnit.Assert.areEqual(averageRatingInit, rating.averageRating, "Verify averageRating not changed when exception thrown while setting rating options to " + commonUtils.getOptionsAsString(options));
                LiveUnit.Assert.areEqual(disabledInit, rating.disabled, "Verify disabled not changed when exception thrown while setting rating options to " + commonUtils.getOptionsAsString(options));

                if (tooltipsInit) {
                    for (var i = 0; i < rating.maxRating; ++i) {
                        LiveUnit.Assert.areEqual(tooltipsInit[i], rating.tooltipStrings[i], "Verify tooltipStrings not changed when exception thrown while setting rating options to " + commonUtils.getOptionsAsString(options));
                    }
                } else {
                    LiveUnit.Assert.areEqual(null, rating.tooltipStrings, "Verify tooltipStrings not changed from null when exceptiong thrown while setting rating options to " + commonUtils.getOptionsAsString(options));
                }

            } else {
                // No exception means function must have succeeded (as all failures should throw an exception)
                if (useProperties) {
                    LiveUnit.Assert.areEqual(false, expectFailure, "Setting rating properties to " + commonUtils.getOptionsAsString(options) + " succeeded, verify expectFailure=false.");
                } else {
                    LiveUnit.Assert.areEqual(false, expectFailure, "Call to WinJS.UI.setOptions(rating, " + commonUtils.getOptionsAsString(options) + ") succeeded, verify expectFailure=false.");
                }

                // Verify options handled correctly

                if (options && "maxRating" in options && !isNaN(options.maxRating)) {
                    if (options.maxRating <= 0) {
                        LiveUnit.Assert.areEqual(maxRatingInit, rating.maxRating, "Verify maxRating cannot be set less than maxRating, gets coerced back to input value.");
                    } else {
                        LiveUnit.Assert.areEqual(Math.floor(options.maxRating), rating.maxRating, "Verify maxRating set properly.");

                        for (var i = 0; i < rating.maxRating; ++i) {
                            tooltipsInit[i] = i + 1;
                        }
                        tooltipsInit[rating.maxRating] = this.localizedStrings[this.currentLanguage].clearYourRating;
                    }
                } else {
                    LiveUnit.Assert.areEqual(maxRatingInit, rating.maxRating, "Verify default value used for maxRating when not set (or improperly set) via options.");
                }

                if (options && "userRating" in options && !isNaN(options.userRating)) {
                    if (options.userRating < 0) {
                        LiveUnit.Assert.areEqual(0, rating.userRating, "Verify userRating cannot be set less than 0.");
                    } else if (options.userRating > rating.maxRating) {
                        LiveUnit.Assert.areEqual(rating.maxRating, rating.userRating, "Verify userRating coerced to maxRating if greater than max.");
                    } else {
                        LiveUnit.Assert.areEqual(Math.floor(options.userRating), rating.userRating, "Verify userRating set properly.");
                    }
                } else {
                    LiveUnit.Assert.areEqual(userRatingInit, rating.userRating, "Verify default value used for userRating when not set (or improperly set) via options.");
                }

                if (options && "averageRating" in options && !isNaN(options.averageRating)) {
                    if (options.averageRating < 1) {
                        LiveUnit.Assert.areEqual(0, rating.averageRating, "Verify setting averageRating less than 1 is coerced to 0.");
                    } else if (options.averageRating > rating.maxRating) {
                        LiveUnit.Assert.areEqual(rating.maxRating, rating.averageRating, "Verify averageRating coerced to maxRating if greater than max.");
                    } else {
                        LiveUnit.Assert.areEqual(Number(options.averageRating), rating.averageRating, "Verify averageRating set properly.");
                    }
                } else {
                    LiveUnit.Assert.areEqual(averageRatingInit, rating.averageRating, "Verify default value used for averageRating when not set (or improperly set) via options.");
                }

                if (options && "disabled" in options) {
                    LiveUnit.Assert.areEqual(!!options.disabled, rating.disabled, "Verify disabled set properly.");
                } else {
                    LiveUnit.Assert.areEqual(disabledInit, rating.disabled, "Verify default value used for disabled when not set (or improperly set) via options.");
                }

                if (options && "enableClear" in options) {
                    LiveUnit.Assert.areEqual(!!options.enableClear, rating.enableClear, "Verify enableClear set properly.");
                } else {
                    LiveUnit.Assert.areEqual(enableClearInit, rating.enableClear, "Verify default value used for enableClear when not set (or improperly set) via options.");
                }

                if (options && "tooltipStrings" in options) {
                    if (options.tooltipStrings === null) {
                        for (var i = 0; i < rating.maxRating; ++i) {
                            LiveUnit.Assert.areEqual(i + 1, rating.tooltipStrings[i], "Verify tooltipStrings uses default tooltips when set as part of setting rating options to " + commonUtils.getOptionsAsString(options));
                        }
                        LiveUnit.Assert.areEqual(this.localizedStrings[this.currentLanguage].clearYourRating, rating.tooltipStrings[rating.maxRating], "Verify tooltipStrings uses default clear rating tooltip when set to null.");
                    } else {
                        var tooltipIndex;
                        for (tooltipIndex = 0; tooltipIndex < options.tooltipStrings.length && tooltipIndex <= rating.maxRating; ++tooltipIndex) {
                            LiveUnit.Assert.areEqual(options.tooltipStrings[tooltipIndex], rating.tooltipStrings[tooltipIndex], "Verify tooltipStrings set properly while setting rating options to " + commonUtils.getOptionsAsString(options));
                        }

                        if (tooltipIndex < options.tooltipStrings.length) {
                            // test provided too many tooltips, verify rest of rating.tooltipStrings undefined
                            for (; tooltipIndex < options.tooltipStrings.length; ++tooltipIndex) {
                                LiveUnit.Assert.areEqual(undefined, rating.tooltipStrings[tooltipIndex], "Verify tooltipStrings only allows setting of up to maxRating tooltips when tooltipStrings supplied more than maxRating tooltips as part of" + commonUtils.getOptionsAsString(options));
                            }
                        } else if (tooltipIndex < rating.tooltipStrings.length) {
                            // test provided too few tooltips, verify default used for rest
                            for (; tooltipIndex < rating.maxRating; ++tooltipIndex) {
                                LiveUnit.Assert.areEqual(tooltipIndex + 1, rating.tooltipStrings[tooltipIndex], "Verify tooltipStrings uses default tooltips when tooltipStrings was not supplied enough tooltips as part of " + commonUtils.getOptionsAsString(options));
                            }
                            LiveUnit.Assert.areEqual(this.localizedStrings[this.currentLanguage].clearYourRating, rating.tooltipStrings[rating.maxRating], "Verify tooltipStrings uses default clear rating tooltip when tooltipStrings was not supplied enough tooltips as part of  " + commonUtils.getOptionsAsString(options));
                        }
                    }
                } else {
                    if (tooltipsInit) {
                        for (var i = 0; i < rating.maxRating; ++i) {
                            LiveUnit.Assert.areEqual(tooltipsInit[i], rating.tooltipStrings[i], "Verify tooltipStrings not changed from initial value while setting rating options to " + commonUtils.getOptionsAsString(options));
                        }
                        LiveUnit.Assert.areEqual(this.localizedStrings[this.currentLanguage].clearYourRating, rating.tooltipStrings[rating.maxRating], "Verify clear rating tooltip not changed from initial value when setting rating options to " + commonUtils.getOptionsAsString(options));
                    } else {
                        LiveUnit.Assert.areEqual(null, rating.tooltipStrings, "Verify tooltipStrings not changed from null while setting rating options to " + commonUtils.getOptionsAsString(options));
                    }
                }
            }

            if (element) {
                this.verifyLayout(element);
                this.verifyARIA(element);
            }
        },

        //-----------------------------------------------------------------------------------
        verifyLayout: function (element, styleExpected, clearRatingTooltipExpected) {
            /// <summary>
            ///  Verify the layout of the rating control by verifying each div contains the proper child elements in the proper order.
            /// </summary>
            /// <param name="element" type="string">
            ///  String id of the rating control's element, or the element itself.
            /// </param>
            /// <param name="styleExpected" type="string">
            ///  Optional string telling verifyLayout to explicitly expect a particular styling of the control, rather than
            ///  dynamically figuring out which styling the control is using based off its option values.
            /// </param>
            /// <param name="clearRatingTooltipExpected" type="boolean">
            ///  Specifies whether the special "clear your rating" tooltip is expected to be showing.
            /// </param>

            if (typeof (element) === "string") {
                element = commonUtils.getElementById(element);
            }

            // Get a handle to the (supposedly existing) ratings control
            var rating = this.getControl(element);

            // Figure out what type of rating we expect the control to be displaying
            var expect = null;
            if (typeof (styleExpected) !== "undefined") {
                expect = styleExpected;
            } else if (rating.disabled) {
                expect = "disabled";
            } else if (rating.averageRating && !rating.userRating) {
                expect = "average";
            } else {
                expect = "user";
            }

            LiveUnit.LoggingCore.logComment("verifyLayout: Expect '" + expect + "' styles");

            var numStars = element.querySelectorAll(".win-star").length;
            LiveUnit.Assert.areEqual(rating.maxRating + 1, numStars, "Verify there are a total of maxRating+1 " + expect + "-rating stars under the element rating was created out of.");

            // Make sure the styles for the overall control are set correctly
            var ratingControlStyle = window.getComputedStyle(element);

            LiveUnit.Assert.areEqual(Helper.translateCSSValue("display", "inline-flex"), ratingControlStyle.getPropertyValue("display"), "Overall element should be a flex box");

            // Don't test touch action if it isn't supported
            var touchActionSupported = "touchAction" in document.documentElement.style ||
                                       "msTouchAction" in document.documentElement.style

            if (touchActionSupported) {
                LiveUnit.Assert.areEqual("auto", ratingControlStyle.getPropertyValue(Helper.translateCSSProperty("touch-action")), "Rating control should not block panning at its root element.");
            }

            // Walk through the divs, verifying the proper number of star divs in the proper ratio of userRating/averageRating full stars followed by empty stars up to maxRating
            var rectElem = this.getClientRect(element);
            var overallWidth = 0;
            var hitExtraAverageFullDiv = false;
            for (var i = 0; i < rating.maxRating + 1; ++i) {
                var star = element.childNodes[i];

                var rectStar = this.getClientRect(star);

                var starStyle = window.getComputedStyle(star),
                    starBeforePartStyle = window.getComputedStyle(star, ":before");

                // Verify star uses a font glyph
                if (starStyle.display !== "none") {
                    LiveUnit.Assert.isTrue("\ue082" === starBeforePartStyle.getPropertyValue("content") || "\"\ue082\"" === starBeforePartStyle.getPropertyValue("content"),
                                           "Verify star " + (i + 1) + " uses the proper glyph by default.");
                }

                // Check to see if we are showing a floating-point average rating, and, if so, whether we are
                //  currently looking at what we expect to be the partially-filled star
                if ((expect === "average" || expect === "disabled" && rating.averageRating && !rating.userRating) &&
                    (
                      rating.averageRating === Math.floor(rating.averageRating) && i === Math.floor(rating.averageRating) - 1 ||
                      rating.averageRating !== Math.floor(rating.averageRating) && i === Math.floor(rating.averageRating)
                    )
                   ) {
                    // Sitting on the partially filled in star
                    hitExtraAverageFullDiv = true;

                    // Verify current star is a partially displayed averageFull
                    if (expect === "disabled") {
                        LiveUnit.Assert.isTrue(this.classesMatch(this.parts.disabledFull, star.getAttribute("class")),
                            "Verify correct class used for partial star " + (i + 1) + ". Expected: '" + this.parts.disabledFull + "', Actual: '" + star.getAttribute("class") + "'");
                        if (touchActionSupported) {
                            LiveUnit.Assert.areEqual("auto", starStyle.getPropertyValue(Helper.translateCSSProperty("touch-action")), "Disabled rating control should *not* block panning.  Verify star " + (i + 1) + " uses -ms-touch-action: auto.");
                        }
                    } else if (touchActionSupported) {
                        LiveUnit.Assert.areEqual("none", starStyle.getPropertyValue(Helper.translateCSSProperty("touch-action")), "Rating control should block panning at each star.  Verify star " + (i + 1) + " uses -ms-touch-action: none.");
                    }

                    LiveUnit.Assert.isTrue(this.classesMatch(this.parts.averageFull, star.getAttribute("class")),
                        "Verify correct class used for partial star " + (i + 1) + ". Expected: '" + this.parts.averageFull + "', Actual: '" + star.getAttribute("class") + "'");

                    Helper.Assert.areColorsEqual(this.defaultColors[this.currentTheme].averageFull, starBeforePartStyle.getPropertyValue("color"), "Verify help star uses the correct color by default in " + this.currentTheme + " theme.");

                    var percentFull = rating.averageRating - Math.floor(rating.averageRating);

                    if (Math.floor(rating.averageRating) === rating.averageRating) {
                        LiveUnit.Assert.areEqual("1 1 auto", Helper.getCSSPropertyValue(starStyle, "flex"), "Verify the averageRating star (child # " + (i + 1) + ") with class \"" + star.getAttribute("class") + "\" has flex: 1;");
                    } else {
                        // We are sitting on the partial-full star for a floating point averageRating.
                        //  Validate flex is the proper percentage, allowing for 1% numerical imprecision.
                        if (Math.abs(percentFull - parseFloat(Helper.getCSSPropertyValue(starStyle, "flex"))) > 0.01) {
                            LiveUnit.Assert.areEqual(percentFull + " " + percentFull + " auto", Helper.getCSSPropertyValue(starStyle, "flex"), "Verify the averageRating star (child # " + (i + 1) + ") with class \"" + star.getAttribute("class") + "\" has correct ms-flex;");
                        }
                    }

                    overallWidth += rectStar.width;

                    // Verify next star is averageEmpty and takes up the rest of the space for the partially filled star
                    star = element.childNodes[++i];
                    rectStar = this.getClientRect(star);
                    starStyle = window.getComputedStyle(star),
                    starBeforePartStyle = window.getComputedStyle(star, ":before");

                    // Verify star uses a font glyph
                    LiveUnit.Assert.isTrue("\ue082" === starBeforePartStyle.getPropertyValue("content") || "\"\ue082\"" === starBeforePartStyle.getPropertyValue("content"),
                                           "Verify star " + (i + 1) + " uses the proper glyph by default.");

                    if (Math.floor(rating.averageRating) === rating.averageRating) {
                        LiveUnit.Assert.areEqual("0 0 auto", Helper.getCSSPropertyValue(starStyle, "flex"), "Verify the extra star (child # " + (i + 1) + ") with class \"" + star.getAttribute("class") + "\" has flex: 0;");
                    } else {
                        if (expect === "disabled") {
                            LiveUnit.Assert.isTrue(this.classesMatch(this.parts.disabledEmpty, star.getAttribute("class")),
                                "Verify correct class used for partial star " + (i + 1) + ". Expected: '" + this.parts.disabledEmpty + "', Actual: '" + star.getAttribute("class") + "'");
                            if (touchActionSupported) {
                                LiveUnit.Assert.areEqual("auto", starStyle.getPropertyValue(Helper.translateCSSProperty("touch-action")), "Disabled rating control should *not* block panning.  Verify star " + (i + 1) + " uses -ms-touch-action: auto.");
                            }
                        } else if (touchActionSupported) {
                            LiveUnit.Assert.areEqual("none", starStyle.getPropertyValue(Helper.translateCSSProperty("touch-action")), "Rating control should block panning at each star.  Verify star " + (i + 1) + " uses -ms-touch-action: none.");
                        }


                        LiveUnit.Assert.isTrue(this.classesMatch(this.parts.averageEmpty, star.getAttribute("class")),
                            "Verify correct class used for partial star " + (i + 1) + ". Expected: '" + this.parts.averageEmpty + "', Actual: '" + star.getAttribute("class") + "'");

                        Helper.Assert.areColorsEqual(this.defaultColors[this.currentTheme].averageEmpty, starBeforePartStyle.getPropertyValue("color"), "Verify next star after help star uses the correct color by default in " + this.currentTheme + " theme.");

                        if (Math.abs((1 - percentFull) - Helper.getCSSPropertyValue(starStyle, "flex")) > 0.1) {
                            LiveUnit.Assert.areEqual((1 - percentFull) + " " + (1 - percentFull) + " auto", Helper.getCSSPropertyValue(starStyle, "flex"), "Verify the helper star (child # " + (i + 1) + ") with class \"" + star.getAttribute("class") + "\" has correct ms-flex;");
                        }
                    }
                } else {

                    // Workaround for extra average-full <div> used for floating-point averageRatings hanging around (Windows 8 Bug 69883, wont fix)
                    if ("none" === window.getComputedStyle(star, null).display) {

                        //  If we are not expecting average to display, then for sure this is the extra star.
                        //  OR If we ARE expecting average to display, see if we aren't expecting a partial star (aka
                        //     averageRating is an Integer) AND then see if this average-full star is beyond where
                        //     we would expect it in the control (not part of the first averageRating # of stars)
                        if (expect !== "average"
                            || (
                                   Math.floor(rating.averageRating) === rating.averageRating
                                && i >= rating.averageRating
                               )
                           ) {
                            // We found a spurious extra average-full star.  Make sure it is hidden ("display: none;").
                            LiveUnit.Assert.areEqual("none", starStyle.display, "Verify the extra star (child # " + (i + 1) + ") with class \"" + star.getAttribute("class") + "\" has display: 'none';");
                            LiveUnit.Assert.areEqual("0 0 auto", Helper.getCSSPropertyValue(starStyle, "flex"), "Verify the extra star (child # " + (i + 1) + ") with class \"" + star.getAttribute("class") + "\" has flex: 0;");

                            // For thoroughness, make sure we don't run into more than one of these
                            LiveUnit.Assert.isFalse(hitExtraAverageFullDiv, "Verify we only run into the extra " + this.parts.averageFull + " star 1 time");
                            hitExtraAverageFullDiv = true;

                            continue;
                        }
                    }

                    // Verify current star offset expected amount from left side of control
                    if (element.getAttribute("dir") === "ltr" || window.getComputedStyle(element, false).direction === "ltr") {
                        // Switching to flexbox yielded a +/- 1 cumulative error in this calculation, allow for the error
                        if (rectElem.left + overallWidth < rectStar.left - (i + 1) ||
                            rectElem.left + overallWidth > rectStar.left + (i + 1)) {
                            LiveUnit.Assert.areEqual(rectElem.left + overallWidth, rectStar.left, "Verify the left side of star " + (i + 1) + " is offset the correct distance from the left of the control.");
                        }
                    } else {
                        // Switching to flexbox yielded a +/- 1 cumulative error in this calculation, allow for the error
                        if (rectElem.left + rectElem.width - overallWidth < rectStar.left + rectStar.width - (i + 1) ||
                            rectElem.left + rectElem.width - overallWidth > rectStar.left + rectStar.width + (i + 1)) {
                            LiveUnit.Assert.areEqual(rectElem.left + rectElem.width - overallWidth, rectStar.left + rectStar.width, "Verify the right side of star " + (i + 1) + " is offset the correct distance from the right of the control.");
                        }
                    }

                    // Now verify the current star has the expected class (and by extension, is using the correct styles)
                    //  Note that there is a possibility that we already ran into the non-displayed, extra average-full prior to
                    //  running through all the normal "full" divs, hence the second check after the || in each if statement below.
                    var expectedClassName = "";
                    var expectedColor = "";
                    switch (expect) {
                        case "user":
                            if (i < rating.userRating || hitExtraAverageFullDiv && i === rating.userRating) {
                                expectedClassName = this.parts.userFull;
                                expectedColor = this.defaultColors[this.currentTheme].userFull;
                            } else {
                                expectedClassName = this.parts.userEmpty;
                                expectedColor = this.defaultColors[this.currentTheme].userEmpty;
                            }
                            break;
                        case "average":
                            if (i < rating.averageRating || hitExtraAverageFullDiv && i === rating.averageRating) {
                                expectedClassName = this.parts.averageFull;
                                expectedColor = this.defaultColors[this.currentTheme].averageFull;
                            } else {
                                expectedClassName = this.parts.averageEmpty;
                                expectedColor = this.defaultColors[this.currentTheme].averageEmpty;
                            }
                            break;
                        case "tentative":
                            if (i < element.tentativeRatingLast || hitExtraAverageFullDiv && i === element.tentativeRatingLast) {
                                expectedClassName = this.parts.tentativeFull;
                                expectedColor = this.defaultColors[this.currentTheme].tentativeFull;
                            } else {
                                expectedClassName = this.parts.tentativeEmpty;
                                expectedColor = this.defaultColors[this.currentTheme].tentativeEmpty;
                            }
                            break;
                        case "disabled":
                            if (rating.userRating || !rating.averageRating) {
                                if (i < rating.userRating || hitExtraAverageFullDiv && i === rating.userRating) {
                                    expectedClassName = this.parts.userFull;
                                    expectedColor = this.defaultColors[this.currentTheme].userFull;
                                } else {
                                    expectedClassName = this.parts.userEmpty;
                                    expectedColor = this.defaultColors[this.currentTheme].userEmpty;
                                }
                            } else {
                                if (i < rating.averageRating || hitExtraAverageFullDiv && i === rating.averageRating) {
                                    expectedClassName = this.parts.averageFull;
                                    expectedColor = this.defaultColors[this.currentTheme].averageFull;
                                } else {
                                    expectedClassName = this.parts.averageEmpty;
                                    expectedColor = this.defaultColors[this.currentTheme].averageEmpty;
                                }

                                expectedClassName += " win-disabled";
                            }
                            break;
                    }

                    // Verify disabled stars enable panning
                    if (touchActionSupported) {
                        if (expect === "disabled") {
                            LiveUnit.Assert.areEqual("auto", starStyle.getPropertyValue(Helper.translateCSSProperty("touch-action")), "Disabled rating control should *not* block panning.  Verify star " + (i + 1) + " uses -ms-touch-action: auto.");
                        } else {
                            LiveUnit.Assert.areEqual("none", starStyle.getPropertyValue(Helper.translateCSSProperty("touch-action")), "Rating control should block panning at each star.  Verify star " + (i + 1) + " uses -ms-touch-action.");
                        }
                    }

                    LiveUnit.Assert.isTrue(this.classesMatch(expectedClassName, star.getAttribute("class")),
                        "Verify correct class used for star " + (i + 1) + ". Expected: '" + expectedClassName + "', Actual: '" + star.getAttribute("class") + "'");

                    Helper.Assert.areColorsEqual(expectedColor, starBeforePartStyle.getPropertyValue("color"),
                        "Verify correct color used for star " + (i + 1) + " in " + this.currentTheme + " theme.");

                    LiveUnit.Assert.areEqual("1 1 auto", Helper.getCSSPropertyValue(starStyle, "flex"), "Verify star " + (i + 1) + " has flex: 1;");
                }

                overallWidth += rectStar.width;
            }

            // Switching to flexbox yielded a +/- 1 error per star in this calculation, allow for the error
            if (rectElem.width < overallWidth - rating.maxRating ||
                rectElem.width > overallWidth + rating.maxRating) {
                LiveUnit.Assert.areEqual(rectElem.width, overallWidth, "Verify width of overall control is the sum of the widths of each star in the control.");
            }
        },

        //-----------------------------------------------------------------------------------
        verifyARIA: function (element, ariaExpected, ariaValueExpected, ariaTextExpected) {
            /// <summary>
            ///  Verify ARIA information for the input ratings control
            /// </summary>
            /// <param name="element" type="string">
            ///  String id of the rating control's element, or the element itself
            /// </param>
            /// <param name="ariaExpected" type="string">
            ///   Optional string telling verifyARIA to explicitly expect a particular ARIA state for the control to be in,
            ///   rather than dynamically figuring out which state the control is using based off its option values.
            /// </param>
            /// <param name="ariaValueExpected" type="string">
            ///   Optional string telling verifyARIA to explicitly expect a particular ariaValueExpected.
            ///   This isonly used for mitigating wont fix dev code bugs.
            /// </param>
            /// <param name="ariaTextExpected" type="string">
            ///   Optional string telling verifyARIA to explicitly expect a particular ariaValueExpected.
            ///   This is only used for mitigating wont fix dev code bugs.
            /// </param>

            if (typeof (element) === "string") {
                element = commonUtils.getElementById(element);
            }

            // Get a handle to the (supposedly existing) ratings control
            var rating = this.getControl(element);


            // Verify ARIA info that will be true regardless of current state of the control
            LiveUnit.Assert.areEqual("slider", element.getAttribute("role"), "Verify ARIA role set correctly.");

            LiveUnit.Assert.areEqual((rating.enableClear) ? "0" : "1", element.getAttribute("aria-valuemin"), "Verify aria-valuemin set correctly given that enableClear set to " + rating.enableClear + ".");

            LiveUnit.Assert.areEqual(rating.maxRating.toString(), element.getAttribute("aria-valuemax"), "Verify aria-valuemax set correctly.");

            LiveUnit.Assert.areEqual(rating.disabled.toString(), element.getAttribute("aria-readonly"), "Verify aria-readonly set correctly.");


            // Verify ARIA info that is dependent on current state (label, valuenow, and valuetext)

            var expectedValueNow, expectedValueText, expectedLabel;

            if ("tentative" === ariaExpected) {

                expectedLabel = this.localizedStrings[this.currentLanguage].tentativeLabel;

                expectedValueNow = element.tentativeRatingLast; // tentativeRatingLast is not part of Rating API, it is hung off element for test purposes

                if (expectedValueNow === 0) {
                    // Expect "clear your rating".  See if we should use default tooltip or if it is overridden
                    if (rating.tooltipStrings && rating.tooltipStrings[rating.maxRating]) {
                        expectedValueText = rating.tooltipStrings[rating.maxRating]; // Clear your rating tooltip
                    } else {
                        expectedValueText = this.localizedStrings[this.currentLanguage].clearYourRating;
                    }

                    expectedValueNow = this.localizedStrings[this.currentLanguage].unrated;
                }
            } else if ("user" === ariaExpected || rating.userRating) {

                expectedLabel = this.localizedStrings[this.currentLanguage].userLabel;

                expectedValueNow = rating.userRating;

                if (rating.userRating === 0) {
                    expectedValueNow = this.localizedStrings[this.currentLanguage].unrated;

                    expectedValueText = this.localizedStrings[this.currentLanguage].unrated;
                }

            } else if ("average" === ariaExpected || rating.averageRating) {

                expectedLabel = this.localizedStrings[this.currentLanguage].averageLabel;

                expectedValueNow = rating.averageRating;

            } else {

                expectedLabel = this.localizedStrings[this.currentLanguage].userLabel;

                expectedValueNow = this.localizedStrings[this.currentLanguage].unrated;

                expectedValueText = this.localizedStrings[this.currentLanguage].unrated;
            }

            LiveUnit.LoggingCore.logComment("verifyARIA: Expect '" + expectedLabel + "' labels.");

            // If we haven't set expectedValueText yet, grab it from either rating.tooltipStrings or set it to the value
            if (!expectedValueText) {

                if (rating.tooltipStrings && rating.tooltipStrings[expectedValueNow - 1]) {
                    expectedValueText = rating.tooltipStrings[expectedValueNow - 1];
                } else {
                    expectedValueText = expectedValueNow;
                }
            }

            if (typeof (ariaValueExpected) !== "undefined") {
                expectedValueNow = ariaValueExpected;
            }
            if (typeof (ariaTextExpected) !== "undefined") {
                expectedValueText = ariaTextExpected;
            }

            // Now validate all three are set correctly.
            LiveUnit.Assert.areEqual(String(expectedValueNow), element.getAttribute("aria-valuenow"), "Verify aria-valuenow set correctly.");

            LiveUnit.Assert.areEqual(String(expectedValueText), element.getAttribute("aria-valuetext"), "Verify aria-valuetext set correctly.");

            LiveUnit.Assert.areEqual(String(expectedLabel), element.getAttribute("aria-label"), "Verify aria-label set correctly.");
        },

        //-----------------------------------------------------------------------------------
        randomString: function (maxLength) {
            /// <summary>
            ///  Create a string of random chars of a random length up to maxLength
            /// </summary>
            /// <param name="maxLength" type="integer">
            ///  Number specifying maximum length for created string.
            /// </param>
            /// <returns type="string" />
            return commonUtils.randomString(maxLength);
        },

        //-----------------------------------------------------------------------------------
        randomHTML: function (totalElements, returnString) {
            /// <summary>
            ///  Create a random block of HTML as either an element or a string
            /// </summary>
            /// <param name="totalElements" type="integer">
            ///  Number specifying total number of elements to add.
            /// </param>
            /// <param name="returnString" type="boolean">
            /// </param>
            /// <returns type="object" />
            return commonUtils.randomHTML(totalElements, returnString);
        },

        //-----------------------------------------------------------------------------------
        random: function (min, max) {
            /// <summary>
            ///  Generate a random number between min and max
            /// </summary>
            /// <param name="min" type="number">
            ///  Minimum value for random number
            /// </param>
            /// <param name="max" type="number">
            ///  Maximum value for random number
            /// </param>
            /// <returns type="number" />
            return Number(min + Math.random() * (max - min)).toFixed(5);
        },

        //-----------------------------------------------------------------------------------
        randomInt: function (min, max) {
            /// <summary>
            ///  Generate a random number between min and max
            /// </summary>
            /// <param name="min" type="number">
            ///  Minimum value for random number
            /// </param>
            /// <param name="max" type="number">
            ///  Maximum value for random number
            /// </param>
            /// <returns type="number" />
            return Math.round(this.random(min, max));
        },

        randomNewMaxRating: function (limit, current) {
            /// <summary>
            ///  Randomly generate a new maxRating between 2 and limit, guaranteeing we don't set the current rating
            /// </summary>
            /// <param name="limit" type="integer">
            ///  Max limit for the new maxRating
            /// </param>
            /// <param name="current" type="integer">
            ///  Current maxRating we guarantee to not return
            /// </param>
            /// <returns type="number" />
            var newMax;
            do {
                newMax = Math.round(this.random(2, limit));
            } while (newMax === current);
            return newMax;
        },

        //-----------------------------------------------------------------------------------
        verifyFunction: function (rating, functionName) {
            /// <summary>
            ///  Verify given function is defined on rating control.
            /// </summary>
            /// <param name="rating" type="object">
            ///  Handle to actual rating control.
            /// </param>
            /// <param name="functionName" type="string">
            ///  Name of function to verify is on control.
            /// </param>
            LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
            if (rating[functionName] === undefined) {
                LiveUnit.Assert.fail(functionName + " missing from rating API.");
            }

            LiveUnit.Assert.isNotNull(rating[functionName]);
            LiveUnit.Assert.areEqual("function", typeof (rating[functionName]), functionName + " exists on rating, but it isn't a function");
        },

        //-----------------------------------------------------------------------------------
        // ASYNC Event Test Helper Code

        timeBetweenActions: 0,
        nextAction: null,

        //-----------------------------------------------------------------------------------
        startAsyncEventTest: function (signalTestCaseCompleted, actions) {
            /// <summary>
            ///  Start running an Event test
            /// </summary>
            /// <param name="signalTestCaseCompleted" type="function">
            ///  Callback function to call when all actions have occurred and all events verified.
            /// </param>

            if (typeof (actions) === "undefined" || typeof (actions[1]) === "undefined") {
                LiveUnit.Assert.fail("startEventTest called with no actions defined.");
            }

            window.async = {
                actions: actions,
                actionNum: 0,
                signalTestCaseCompleted: signalTestCaseCompleted,
                ratingUtils: this
            };

            window.async.ratingUtils.nextAction = setTimeout(LiveUnit.GetWrappedCallback(window.async.ratingUtils.invokeNextAction), window.async.ratingUtils.timeBetweenActions);
        },

        //-----------------------------------------------------------------------------------
        invokeNextAction: function () {
            /// <summary>
            ///  Invoke the next action in the window.async.actions array
            /// </summary>

            if (window.async.actionNum !== 0) {
                var action = window.async.actions[window.async.actionNum];
                for (var event in action.expectedEvents) {
                    if (action.expectedEvents[event] > 0) {
                        if (typeof (action.actualEvents) === "undefined" || typeof (action.actualEvents[event]) === "undefined") {
                            LiveUnit.Assert.areEqual(action.expectedEvents[event], 0, "Action " + window.async.actionNum + " did not receive any callbacks for \"" + event + "\".");
                        } else {
                            LiveUnit.Assert.areEqual(action.expectedEvents[event], action.actualEvents[event], "Action " + window.async.actionNum + " did not receive proper number of callbacks for \"" + event + "\".");
                        }
                    }
                }
            }

            window.async.actionNum++;

            if (typeof (window.async.actions[window.async.actionNum]) === "undefined") {
                LiveUnit.LoggingCore.logComment("No more actions to invoke, test complete!");

                clearTimeout(window.async.ratingUtils.nextAction); // Make 100% certain we wont have any additional actions come through after the test
                window.async.signalTestCaseCompleted();

                return;
            }

            LiveUnit.LoggingCore.logComment(window.async.actionNum + ": " + window.async.actions[window.async.actionNum].action);

            window.async.actions[window.async.actionNum].action();

            // Wait between each action for events to go through.
            window.async.ratingUtils.nextAction = setTimeout(LiveUnit.GetWrappedCallback(window.async.ratingUtils.invokeNextAction), window.async.ratingUtils.timeBetweenActions);
        },

        //-----------------------------------------------------------------------------------
        verifyEvent: function (event) {
            /// <summary>
            ///  Generic event handler to register for all events
            /// </summary>
            /// <param name="event" type="object">
            ///  Event object built by Ratings control
            /// </param>
            if (typeof (window.async) === "undefined" ||
                typeof (window.async.actions) === "undefined") {
                // callback in async test that isn't using infrastructure.
                return;
            }

            LiveUnit.LoggingCore.logComment("Received callback for: \"" + event.type + "\" on control with id: \"" + event.target.id + "\" and tentativeRating: " + event.detail.tentativeRating);

            var action = null;

            if (typeof (window.async.actions[window.async.actionNum]) !== "undefined") {
                action = window.async.actions[window.async.actionNum];
            }

            if (!action || !action.expectedEvents) {
                LiveUnit.Assert.fail("Received unexpected event from control '" + event.target.id + "': " + event.type);
            }

            // March through all the events we expect for the current action
            for (var eventType in action.expectedEvents) {
                if (typeof (action.expectedEvents[eventType]) === "undefined") {
                    // Got an event we don't expect to receive from control
                    LiveUnit.Assert.fail("Received unexpected event from control '" + event.target.id + "': " + event.type + " after invoking: '" + action.action + "'.");
                } else if (eventType === event.type) {
                    // event is expected type, let's make sure we haven't gotten too many.
                    if (action.expectedEvents[eventType] > 0) {
                        if (typeof (action.actualEvents) === "undefined") {
                            action.actualEvents = new Array();
                        }

                        if (typeof (action.actualEvents[eventType]) === "undefined") {
                            action.actualEvents[eventType] = 1;
                        } else {
                            action.actualEvents[eventType]++;
                        }
                    } else {
                        LiveUnit.Assert.fail("Received too many events for " + event.type + " after invoking: '" + action.action + "'.");
                    }
                }
            }

            // We've verified this is a valid event, verify various attributes are what we expected

            if (typeof (action.targetExpected) === "undefined") {
                action.targetExpected = document.getElementById("rating");
            }

            LiveUnit.Assert.areEqual(action.targetExpected, event.target, "Verify target set as expected after invoking " + action.action);

            if (typeof (action.tentativeRatingExpected) !== "undefined") {
                LiveUnit.Assert.areEqual(action.tentativeRatingExpected, event.detail.tentativeRating, "Verify tentativeRating set as expected after invoking " + action.action);
            }
            event.target.tentativeRatingLast = event.detail.tentativeRating;

            if (typeof (action.userRatingExpected) !== "undefined") {
                LiveUnit.Assert.areEqual(action.userRatingExpected, window.async.ratingUtils.getControl(event.target).userRating, "Verify userRating set as expected after invoking " + action.action);
            }

            // Verify layout and ARIA info for the control is correct

            // If test case didn't define action.styleExpected or action.ariaExpected, figure out what style and ARIA state
            //  the control should be in based on the event type and the option values for the control.
            // Note that the only reason a test case would set styleExpected or ariaExpected is because there is a "wont fix" or
            //  "by design" reason the current event would leave the control in a slightly different state than one we can predict
            //  based simply off the event and option values.  For example, when the control is first focused, a previewchange
            //  is thrown and the visual style updates to tentative, but the ARIA state doesn't update so that an accessibility
            //  user can still check the value by tabbing to the control.  It would be expensive and make the code more complex
            //  for this code to determine each of these differing states one-by-one, so as a simplifying measure, the test cases
            //  hitting these scenarios explicitly provide the states we expect.
            if ("previewchange" === event.type) {
                if (typeof (action.styleExpected) === "undefined") {
                    action.styleExpected = "tentative";
                }
                if (typeof (action.ariaExpected) === "undefined") {
                    action.ariaExpected = "tentative";
                }
            } else {
                var ratingControl = window.async.ratingUtils.getControl(event.target);
                if (typeof (action.styleExpected) === "undefined") {
                    action.styleExpected = (ratingControl.userRating || !ratingControl.averageRating) ? "user" : "average";
                }
                if (typeof (action.ariaExpected) === "undefined") {
                    action.ariaExpected = (ratingControl.userRating || !ratingControl.averageRating) ? "user" : "average";
                }
            }

            window.async.ratingUtils.verifyLayout(event.target.id, action.styleExpected, action.clearRatingTooltipExpected);
            window.async.ratingUtils.verifyARIA(event.target.id, action.ariaExpected, action.ariaValueExpected, action.ariaTextExpected);
        },

        mouseOver: function (fromElement, toElement) {
            commonUtils.mouseOverUsingMiP(fromElement, toElement);
        },

        mouseDown: function (element) {
            commonUtils.mouseDownUsingMiP(element);
        },

        mouseUp: function (element) {
            commonUtils.mouseUpUsingMiP(element);
        },

        click: function (element) {
            commonUtils.clickUsingMiP(element);
        },

        touchOver: function (fromElement, toElement) {
            commonUtils.touchOver(fromElement, toElement);
        },

        touchDown: function (element) {
            // Rating tests are expected to be touching down on the star of a rating control, check that the parent is a rating control.
            if (element && element.parentNode.winControl && typeof element.parentNode.winControl.userRating !== "undefined") {

                //  If the control is *not* disabled, expect a call to setPointerCapture to occur when the touch down happens
                if (!element.parentNode.winControl.disabled) {
                    element.parentNode.setAttribute("callsToPointerCaptureExpected", Number(element.parentNode.getAttribute("callsToPointerCaptureExpected")) + 1);
                }

                commonUtils.touchDown(element);

                if (element.setPointerCapture) {
                    LiveUnit.Assert.areEqual(
                        element.parentNode.getAttribute("callsToPointerCaptureExpected"),
                        element.parentNode.getAttribute("controlSetPointerCapture"),
                        "Total calls of setPointerCapture should match expected if the rating control is properly" +
                            (!element.parentNode.winControl.disabled) ? " blocking panning when enabled." : " allowing panning when disabled.");
                }
            } else {
                commonUtils.touchDown(element);
            }
        },

        touchUp: function (element) {
            commonUtils.touchUp(element);
        },

        touchCancel: function (element) {
            commonUtils.touchCancel(element);
        },

        tap: function (element) {
            commonUtils.tap(element);
        },

        keyDown: function (element, keyCode) {
            //  Would like to use createEvent/initKeyboardEvent, but those don't initialize
            //  the "keyCode" property which the rating control uses.  Instead, directly call
            //  the rating's keyDown handler, providing values for the properties it checks.
            var rating = element.winControl;

            rating._onKeyDown({
                keyCode: keyCode,
                stopPropagation: function () { },
                preventDefault: function () { }
            });
        },

        focus: function (element) {
            commonUtils.focus(element);
        },

        blur: function (element) {
            commonUtils.blur(element);
        },

        //-----------------------------------------------------------------------------------

        generateMouseHoverActions: function (starElement, tentativeRatingExpected, userRatingExpected) {
            /// <summary>
            ///  Returns an "actions" array containing the actions necessary to hover over and off the input star.
            /// </summary>
            /// <param name="starElement" type="element">
            ///  Element to hover over
            /// </param>
            /// <param name="tentativeRatingExpected" type="number">
            ///  tentativeRating we expect to have set while hovering the input star.
            /// </param>
            /// <param name="userRatingExpected" type="number">
            ///  userRating we expect to have set during/after hovering the input star.
            /// </param>
            /// <returns type="object" />
            return {
                1: {
                    action: function (element) { return function () { window.async.ratingUtils.mouseOver(null, element); }; }(starElement),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: tentativeRatingExpected,
                    userRatingExpected: userRatingExpected
                },
                2: {
                    action: function (element) { return function () { window.async.ratingUtils.mouseOver(element, null); }; }(starElement),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 1 },
                    tentativeRatingExpected: null,
                    userRatingExpected: userRatingExpected
                }
            };
        },

        //-----------------------------------------------------------------------------------

        generateClickActions: function (starElement, newRating, initialRating) {
            /// <summary>
            ///  Returns an "actions" array containing the actions necessary to hover over, click, and then hover off an input star.
            /// </summary>
            /// <param name="starElement" type="element">
            ///  Element to click
            /// </param>
            /// <param name="newRating" type="number">
            ///  Rating we expect to set when clicking the star.
            /// </param>
            /// <param name="initialRating" type="number">
            ///  Current rating value we expect to see prior to clicking the star.
            /// </param>
            /// <returns type="object" />
            return {
                1: {
                    action: function (element) { return function () { window.async.ratingUtils.mouseOver(null, element); }; }(starElement),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: newRating,
                    userRatingExpected: initialRating
                },
                2: {
                    action: function (element) { return function () { window.async.ratingUtils.mouseDown(element); }; }(starElement),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                },
                3: {
                    action: function (element) { return function () { window.async.ratingUtils.mouseUp(element); }; }(starElement),
                    expectedEvents: { previewchange: 0, change: (initialRating === newRating) ? 0 : 1, cancel: 0 },
                    tentativeRatingExpected: newRating,
                    userRatingExpected: newRating
                },
                4: {
                    action: function (element) { return function () { window.async.ratingUtils.mouseOver(element, null); }; }(starElement),
                    expectedEvents: { previewchange: 0, change: 0, cancel: (initialRating === newRating) ? 1 : 0 },
                    tentativeRatingExpected: null,
                    userRatingExpected: newRating
                }
            };
        },

        //-----------------------------------------------------------------------------------

        generateTapActions: function (starElement, newRating, initialRating) {
            /// <summary>
            ///  Returns an "actions" array containing the actions necessary to tap a star in the rating control.
            /// </summary>
            /// <param name="starElement" type="element">
            ///  Element to tap
            /// </param>
            /// <param name="newRating" type="number">
            ///  Rating we expect to set when tapping the star.
            /// </param>
            /// <param name="initialRating" type="number">
            ///  Current rating value we expect to see prior to tapping the star.
            /// </param>
            /// <returns type="object" />
            return {
                1: {
                    action: function (element) { return function () { window.async.ratingUtils.touchOver(null, element); }; }(starElement),
                    expectedEvents: { previewchange: 0, change: 0, cancel: 0 }
                },
                2: {
                    action: function (element) { return function () { window.async.ratingUtils.touchDown(element); }; }(starElement),
                    expectedEvents: { previewchange: 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: newRating,
                    userRatingExpected: initialRating
                },
                3: {
                    action: function (element) { return function () { window.async.ratingUtils.touchUp(element); }; }(starElement),
                    expectedEvents: { previewchange: 0, change: (initialRating === newRating) ? 0 : 1, cancel: 0 },
                    tentativeRatingExpected: newRating,
                    userRatingExpected: newRating
                },
                4: {
                    action: function (element) { return function () { window.async.ratingUtils.touchOver(element, null); }; }(starElement),
                    expectedEvents: { previewchange: 0, change: 0, cancel: (initialRating === newRating) ? 1 : 0 },
                    tentativeRatingExpected: null,
                    userRatingExpected: newRating
                }
            };
        },

        //-----------------------------------------------------------------------------------

        generateKeydownActions: function (ratingElement, key) {
            /// <summary>
            ///  Returns an "actions" array containing the actions necessary to send a particular key to the rating control.
            /// </summary>
            /// <param name="ratingElement" type="element">
            ///  Element to send the input key to
            /// </param>
            /// <param name="key" type="number">
            ///  Identifier for the key to send
            /// </param>
            /// <returns type="object" />

            var rating = this.getControl(ratingElement);
            LiveUnit.Assert.isNotNull(rating, "Validate ratingElement passed to generateKeydownActions is a valid rating control");

            LiveUnit.LoggingCore.logComment("Sending key: '" + key + "' to control");

            var actions = {
                1: {
                    action: function () { window.async.ratingUtils.focus(ratingElement); },
                    expectedEvents: { previewchange: (rating.disabled) ? 0 : 1, change: 0, cancel: 0 },
                    tentativeRatingExpected: rating.userRating,
                    userRatingExpected: rating.userRating,
                    styleExpected: (rating.userRating > 0) ? "user" : "tentative",
                    ariaExpected: (rating.userRating > 0 || rating.averageRating === 0) ? "user" : "average"
                },
                2: {
                    action: function () { window.async.ratingUtils.keyDown(ratingElement, key); },
                    expectedEvents: { previewchange: 0, change: 0, cancel: 0 },
                    tentativeRatingExpected: rating.userRating,
                    userRatingExpected: rating.userRating,
                    styleExpected: "tentative",
                    ariaExpected: "tentative"
                }
            };

            switch (key) {
                case WinJS.Utilities.Key.rightArrow:
                    if (window.getComputedStyle(ratingElement, false).direction === "ltr") {
                        actions[2].tentativeRatingExpected = (rating.userRating === rating.maxRating) ? rating.maxRating : rating.userRating + 1;
                    } else {
                        actions[2].tentativeRatingExpected = (rating.userRating === 0) ? 0 : rating.userRating - 1;
                    }
                    break;

                case WinJS.Utilities.Key.upArrow:
                    actions[2].tentativeRatingExpected = (rating.userRating === rating.maxRating) ? rating.maxRating : rating.userRating + 1;
                    break;

                case WinJS.Utilities.Key.end:
                    actions[2].tentativeRatingExpected = rating.maxRating;
                    break;

                case WinJS.Utilities.Key.leftArrow:
                    if (window.getComputedStyle(ratingElement, false).direction === "ltr") {
                        actions[2].tentativeRatingExpected = (rating.userRating === 0) ? 0 : rating.userRating - 1;
                    } else {
                        actions[2].tentativeRatingExpected = (rating.userRating === rating.maxRating) ? rating.maxRating : rating.userRating + 1;
                    }
                    break;

                case WinJS.Utilities.Key.downArrow:
                    actions[2].tentativeRatingExpected = (rating.userRating === 0) ? 0 : rating.userRating - 1;
                    break;

                case WinJS.Utilities.Key.home:
                    actions[2].tentativeRatingExpected = 0;
                    break;

                default:
                    var tentativeExpected = -1;
                    if ((key >= WinJS.Utilities.Key.num0) && (key <= WinJS.Utilities.Key.num9)) {
                        tentativeExpected = key - WinJS.Utilities.Key.num0;
                    }
                    if ((key >= WinJS.Utilities.Key.numPad0) && (key <= WinJS.Utilities.Key.numPad9)) {
                        tentativeExpected = key - WinJS.Utilities.Key.numPad0;
                    }
                    if (tentativeExpected >= 0 && tentativeExpected <= 9) {
                        actions[2].tentativeRatingExpected = (tentativeExpected >= rating.maxRating) ? rating.maxRating : tentativeExpected;
                    }

                    break;
            }

            if (actions[2].tentativeRatingExpected === 0) {
                if (rating.enableClear) {
                    if (!rating.disabled) {
                        actions[2].clearRatingTooltipExpected = true;
                    }
                } else {
                    actions[2].clearRatingTooltipExpected = false;
                    actions[2].tentativeRatingExpected = 1;
                }
            }

            if (actions[2].tentativeRatingExpected !== rating.userRating && !rating.disabled) {
                actions[2].expectedEvents.previewchange = 1;
            }

            return actions;
        },

        //-----------------------------------------------------------------------------------

        generateKeydownThenBlurActions: function (ratingElement, key) {
            /// <summary>
            ///  Returns an "actions" array containing the actions necessary to send a particular key to the rating control, and then blurs the control.
            /// </summary>
            /// <param name="ratingElement" type="element">
            ///  Element to send the input key to
            /// </param>
            /// <param name="key" type="number">
            ///  Identifier for the key to send
            /// </param>
            /// <returns type="object" />

            var rating = this.getControl(ratingElement);
            LiveUnit.Assert.isNotNull(rating, "Validate ratingElement passed to generateKeydownThenBlurActions is a valid rating control");

            var actions = this.generateKeydownActions(ratingElement, key);

            // if disabled or we didn't expect a preview from the first key, expect a cancel event, or nothing
            if (rating.disabled || !actions[2].expectedEvents.previewchange) {
                actions[3] = {
                    action: function () { window.async.ratingUtils.blur(ratingElement); },
                    expectedEvents: { previewchange: 0, change: 0, cancel: (rating.disabled) ? 0 : 1 },
                    tentativeRatingExpected: null,
                    userRatingExpected: rating.userRating
                };
            } else {
                // we got a preview and we aren't disabled, so expect a change event
                actions[3] = {
                    action: function () { window.async.ratingUtils.blur(ratingElement); },
                    expectedEvents: { previewchange: 0, change: 1, cancel: 0 },
                    tentativeRatingExpected: actions[2].tentativeRatingExpected,
                    userRatingExpected: actions[2].tentativeRatingExpected
                };
            }
            return actions;
        },

        //-----------------------------------------------------------------------------------

        generateKeydownThenEscapeActions: function (ratingElement, key) {
            /// <summary>
            ///  Returns an "actions" array containing the actions necessary to send a particular key to the rating control, and then sends "Escape" to the control.
            /// </summary>
            /// <param name="ratingElement" type="element">
            ///  Element to send the input key to
            /// </param>
            /// <param name="key" type="number">
            ///  Identifier for the key to send
            /// </param>
            /// <returns type="object" />

            var rating = this.getControl(ratingElement);
            LiveUnit.Assert.isNotNull(rating, "Validate ratingElement passed to generateKeydownThenEscapeActions is a valid rating control");

            var actions = this.generateKeydownActions(ratingElement, key);

            actions[3] = {
                action: function () { window.async.ratingUtils.keyDown(ratingElement, WinJS.Utilities.Key.escape); },
                expectedEvents: { previewchange: 0, change: 0, cancel: (rating.disabled) ? 0 : 1 },
                tentativeRatingExpected: null,
                userRatingExpected: rating.userRating
            };

            return actions;
        },

        //-----------------------------------------------------------------------------------

        generateKeydownThenEnterActions: function (ratingElement, key) {
            /// <summary>
            ///  Returns an "actions" array containing the actions necessary to focus a rating control and send a particular key to it
            /// </summary>
            /// <param name="ratingElement" type="element">
            ///  Element to send the input key to
            /// </param>
            /// <param name="key" type="number">
            ///  Identifier for the key to send
            /// </param>
            /// <returns type="object" />

            var rating = this.getControl(ratingElement);
            LiveUnit.Assert.isNotNull(rating, "Validate ratingElement passed to generateKeydownThenEnterActions is a valid rating control");

            var actions = this.generateKeydownActions(ratingElement, key);

            actions[3] = {
                action: function () { window.async.ratingUtils.keyDown(document.getElementById("rating"), WinJS.Utilities.Key.enter); },
                expectedEvents: { previewchange: 0, change: (!actions[2].expectedEvents.previewchange || rating.disabled) ? 0 : 1, cancel: 0 },
                tentativeRatingExpected: actions[2].tentativeRatingExpected,
                userRatingExpected: actions[2].tentativeRatingExpected
            };
            actions[4] = {
                action: function () { window.async.ratingUtils.blur(document.getElementById("rating")); },
                expectedEvents: { previewchange: 0, change: 0, cancel: (rating.disabled) ? 0 : (!actions[3].expectedEvents.change) ? 1 : 0 },
                tentativeRatingExpected: null,
                userRatingExpected: rating.userRating
            }

            return actions;
        },

        //-----------------------------------------------------------------------------------

        generateKeydownThenTabActions: function (ratingElement, key) {
            /// <summary>
            ///  Returns an "actions" array containing the actions necessary to send a particular key to the rating control, followed by "tab" to commit.
            /// </summary>
            /// <param name="ratingElement" type="element">
            ///  Element to send the input key to
            /// </param>
            /// <param name="key" type="number">
            ///  Identifier for the key to send
            /// </param>
            /// <returns type="object" />

            var rating = this.getControl(ratingElement);
            LiveUnit.Assert.isNotNull(rating, "Validate ratingElement passed to generateKeydownThenBlurActions is a valid rating control");

            var actions = this.generateKeydownActions(ratingElement, key);

            actions[3] = {
                action: function () { window.async.ratingUtils.keyDown(document.getElementById("rating"), WinJS.Utilities.Key.tab); },
                expectedEvents: { previewchange: 0, change: (!actions[2].expectedEvents.previewchange || rating.disabled) ? 0 : 1, cancel: 0 },
                tentativeRatingExpected: actions[2].tentativeRatingExpected,
                userRatingExpected: actions[2].tentativeRatingExpected
            };
            actions[4] = {
                action: function () { window.async.ratingUtils.blur(document.getElementById("rating")); },
                expectedEvents: { previewchange: 0, change: 0, cancel: (rating.disabled) ? 0 : (!actions[3].expectedEvents.change) ? 1 : 0 },
                tentativeRatingExpected: null,
                userRatingExpected: rating.userRating
            }

            return actions;
        }
    };
})();