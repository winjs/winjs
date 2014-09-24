// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

module CorsicaTests {

    "use strict";

    var BackButton = <typeof WinJS.UI.PrivateBackButton> WinJS.UI.BackButton;

    var nav = WinJS.Navigation;
    var outerButton; // BackButton Control attached to the <button> element that is outside of the fragment loader.
    var innerButton; // BackButton control attached to the <button> element that is inside of a fragment.
    var setupPromise;

    function simulateNavigation() {
        var date = new Date(); // Use date to simulate a unique navigation location
        return nav.navigate(date.getTime());
    }

    function navigatingHandler() {

        var innerButtonElement = document.getElementById('innerButton');
        var contentHost = document.getElementById('contentHost');

        LiveUnit.LoggingCore.logComment("cleaning up the current mock 'page'...");
        // clean up the current "page"
        if (innerButtonElement && innerButtonElement.winControl) {
            innerButtonElement.winControl.dispose();
            contentHost.innerHTML = "";
        }

        // load new "page"
        LiveUnit.LoggingCore.logComment("rendering mock 'page' of new location...");
        innerButtonElement = document.createElement('button');
        innerButtonElement.id = "innerButton";
        innerButton = new WinJS.UI.BackButton(innerButtonElement, {}); // Create a BackButton control inside of the fragment loader.
        contentHost.appendChild(innerButtonElement);
    }

    function isDisabled(buttonElement) {
        return buttonElement.disabled === true;
    }
    function isVisible(buttonElement) {
        return getComputedStyle(buttonElement).visibility === "visible";
    }

    export class BackButtonTests {


        // Initial setup for each test to create the two backbuttons.
        // This function creates a BackButton element and an div contentHost to act as a fake fragment loader.
        // A call is made to simulate navigation which then fakes loading a new fragment into the contentHost,
        // this fragment contains only one additional BackButton control.
        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            // Set up navigation handler.
            nav.addEventListener('navigating', navigatingHandler, false);

            // Create BackButton Controls
            LiveUnit.LoggingCore.logComment("Create Outer BackButton");
            var outerButtonElement = document.createElement('button');
            outerButtonElement.id = "outerButton";
            outerButton = new WinJS.UI.BackButton(outerButtonElement); // Create a BackButton control outside of the fragment loader.
            document.body.appendChild(outerButtonElement);

            // Create Mock fragment loader
            var contentHost = document.createElement('div');
            contentHost.id = "contentHost";
            document.body.appendChild(contentHost);

            LiveUnit.LoggingCore.logComment("Simulate initial navigation to homepage:");
            //return simulateNavigation();
            setupPromise = simulateNavigation();
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            var backButtons = document.body.querySelectorAll(".win-navigation-backbutton");
            for (var i = 0; i < backButtons.length; i++) {
                (<HTMLElement>backButtons[i]).winControl.dispose();
                (<HTMLElement>backButtons[i]).parentElement.removeChild(backButtons[i]);
            }

            var contentHost = document.getElementById("contentHost");
            if (contentHost) {
                WinJS.Utilities.disposeSubTree(contentHost);
                document.body.removeChild(contentHost);
            }

            // Unsubscribe
            nav.removeEventListener('navigating', navigatingHandler, false);

            // Reset history object
            nav.history = {
                backStack: [],
                current: { location: "", initialPlaceholder: true },
                forwardStack: []
            };
        }



        // Test Back Button Instantiation
        testBackButtonInstantiation = function (complete) {
            setupPromise.then(function () {

                LiveUnit.LoggingCore.logComment("Outer backbutton has been insantiated.");
                LiveUnit.LoggingCore.logComment("Inner backbutton has been insantiated.");

                // Test backbutton insantiation
                LiveUnit.Assert.isNotNull(outerButton, "Outer BackButton element should not be null when insantiated.");
                LiveUnit.Assert.isNotNull(innerButton, "Inner BackButton element should not be null when insantiated.");
                complete();
            });
        }






    // Test BackButton's Automatic Visibility Updates
    testBackButtonAutomaticVisibilityUpdates = function (complete) {
            setupPromise.then(function () {

                LiveUnit.LoggingCore.logComment("Outer backbutton has been insantiated.");
                LiveUnit.LoggingCore.logComment("Inner backbutton has been insantiated.");

                // Get the Button elements from each BackButton control
                var outerButtonElement = outerButton.element;
                var innerButtonElement = innerButton.element;

                // Test backbutton's visibility
                LiveUnit.LoggingCore.logComment("Buttons should be disabled and invisible when home page first loads.");
                LiveUnit.Assert.isTrue(isDisabled(outerButtonElement) === true, "Outer BackButton should be disabled on Home page");
                LiveUnit.Assert.isTrue(isVisible(outerButtonElement) === false, "Outer BackButton should be hidden while disabled");
                LiveUnit.Assert.isTrue(isDisabled(innerButtonElement) === true, "Inner BackButton should be disabled on Home page");
                LiveUnit.Assert.isTrue(isVisible(innerButtonElement) === false, "Inner BackButton should be hidden while disabled");

                // Perform Manual refresh, ensure state hasn't changed.
                LiveUnit.LoggingCore.logComment("Manually refresh the Buttons' Visibility");
                outerButtonElement.winControl.refresh();
                innerButtonElement.winControl.refresh();

                // Test backbutton's visibility
                LiveUnit.Assert.isTrue(isDisabled(outerButtonElement) === true, "Even after a manual refresh, Outer BackButton should be disabled on Home page");
                LiveUnit.Assert.isTrue(isVisible(outerButtonElement) === false, "Even after a manual refresh, Outer BackButton should be hidden while disabled");
                LiveUnit.Assert.isTrue(isDisabled(innerButtonElement) === true, "Even after a manual refresh, Inner BackButton should be disabled on Home page");
                LiveUnit.Assert.isTrue(isVisible(innerButtonElement) === false, "Even after a manual refresh, Inner BackButton should be hidden while disabled");

                // Navigate forward, grab reference to new instance of inner button.
                LiveUnit.LoggingCore.logComment("Navigate away from Home page.");
                simulateNavigation().then(function () {
                    innerButtonElement = document.getElementById("innerButton");

                    // Ensure state for both buttons has changed
                    LiveUnit.Assert.isTrue(isDisabled(outerButtonElement) === false, "Outer BackButton should be enabled after navigating away from Home page");
                    LiveUnit.Assert.isTrue(isVisible(outerButtonElement) === true, "Outer BackButton should be visible after navigating away from Home page");
                    LiveUnit.Assert.isTrue(isDisabled(innerButtonElement) === false, "Inner BackButton should be enabled after navigating away from Home page");
                    LiveUnit.Assert.isTrue(isVisible(innerButtonElement) === true, "Inner BackButton should be visible after navigating away from Home page");

                    // Perform Manual refresh, ensure state hasn't changed.
                    LiveUnit.LoggingCore.logComment("Manually refresh the Visibility of each button");
                    outerButtonElement.winControl.refresh();
                    innerButtonElement.winControl.refresh();

                    // Ensure state for both buttons is the same
                    LiveUnit.Assert.isTrue(isDisabled(outerButtonElement) === false, "Even after a manual refresh, Outer BackButton should still be enabled after navigating away from Home page");
                    LiveUnit.Assert.isTrue(isVisible(outerButtonElement) === true, "Even after a manual refresh, Outer BackButton should still be visible after navigating away from Home page");
                    LiveUnit.Assert.isTrue(isDisabled(innerButtonElement) === false, "Even after a manual refresh, Inner BackButton should still be enabled after navigating away from Home page");
                    LiveUnit.Assert.isTrue(isVisible(innerButtonElement) === true, "Even after a manual refresh, Inner BackButton should still be visible after navigating away from Home page");

                    LiveUnit.LoggingCore.logComment("Navigate back to Home page.");
                    nav.back().then(function () {
                        innerButtonElement = document.getElementById("innerButton");

                        // Ensure state for both buttons has changed
                        LiveUnit.Assert.isTrue(isDisabled(outerButtonElement) === true, "Outer BackButton should be disabled after navigating back to Home page");
                        LiveUnit.Assert.isTrue(isVisible(outerButtonElement) === false, "Outer BackButton should be invisible after navigating back to Home page");
                        LiveUnit.Assert.isTrue(isDisabled(innerButtonElement) === true, "Inner BackButton should be disabled after navigating back to Home page");
                        LiveUnit.Assert.isTrue(isVisible(innerButtonElement) === false, "Inner BackButton should be invisible after navigating back to Home page");

                        LiveUnit.LoggingCore.logComment("Manually refresh the Visibility of each button");
                        outerButtonElement.winControl.refresh();
                        innerButtonElement.winControl.refresh();

                        // Ensure state for both buttons is the same
                        LiveUnit.Assert.isTrue(isDisabled(outerButtonElement) === true, "Even after a manual refresh, Outer BackButton should be disabled after navigating back to Home page");
                        LiveUnit.Assert.isTrue(isVisible(outerButtonElement) === false, "Even after a manual refresh, Outer BackButton should be invisible after navigating back to Home page");
                        LiveUnit.Assert.isTrue(isDisabled(innerButtonElement) === true, "Even after a manual refresh, Inner BackButton should be disabled after navigating back to Home page");
                        LiveUnit.Assert.isTrue(isVisible(innerButtonElement) === false, "Even after a manual refresh, Inner BackButton should be invisible after navigating back to Home page");
                        complete();
                    });

                });

            });
        }


    // Test BackButton's refresh method.
    testBackButtonRefreshMethod = function (complete) {
            setupPromise.then(function () {

                LiveUnit.LoggingCore.logComment("Test BackButton refresh method after manually altering the history backstack");
                // Push an object into the history backstack without calling WinJS.Navigation.Navigate()
                nav.history.backStack.push({});

                outerButton.refresh();
                innerButton.refresh();

                LiveUnit.Assert.isTrue(isDisabled(outerButton.element) === false, "Outer BackButton element should be enabled after updating visibility on its winControl when the WinJS.Navigation.history object's back stack is empty");
                LiveUnit.Assert.isTrue(isDisabled(innerButton.element) === false, "Inner BackButton element should be enabled after updating visibility on its winControl when the WinJS.Navigation.history object's back stack is empty");
                LiveUnit.Assert.isTrue(isVisible(outerButton.element) === true, "Outer BackButton element should be visible after updating visibility on its winControl when the WinJS.Navigation.history object's back stack isn't empty");
                LiveUnit.Assert.isTrue(isVisible(innerButton.element) === true, "Inner BackButton element should be visible after updating visibility on its winControl when the WinJS.Navigation.history object's back stack isn't empty");

                complete();
            });
        }






    // Test BackButton's aria-label attribute.
    testBackButtonAriaLabel = function (complete) {
            setupPromise.then(function () {

                // Get the <button> elements from the each BackButton control.
                var outerButtonElement = outerButton.element;
                var innerButtonElement = innerButton.element;

                LiveUnit.LoggingCore.logComment("Test the BackButtons aria labels");

                LiveUnit.Assert.isTrue(outerButtonElement.getAttribute("aria-label") != "", "Aria label on Outer BackButton element should be set");
                LiveUnit.Assert.isTrue(innerButtonElement.getAttribute("aria-label") != "", "Aria label on Inner BackButton element should be set");
                complete();
            });
        }







    // Test BackButton's singleton reference count used in dispose model
    testBackButtonReferenceCount = function (complete) {

            setupPromise.then(function () {

                LiveUnit.LoggingCore.logComment("Test the BackButton Singleton reference count after construction");
                LiveUnit.Assert.isTrue(BackButton._getReferenceCount() === 2, "Reference count should be 2, after constructing 2 BackButtons.");

                LiveUnit.LoggingCore.logComment("Test the BackButton Singleton reference count after navigation");
                simulateNavigation().then(function () {
                    // When navigating: the BackButton control inside the old fragment is disposed, and a new BackButton is created inside the new fragment.
                    LiveUnit.Assert.isTrue(BackButton._getReferenceCount() === 2, "After navigating the reference count should still be 2.");

                    LiveUnit.LoggingCore.logComment("Test the Singleton reference count after dispose");
                    innerButton.dispose();
                    LiveUnit.Assert.isTrue(BackButton._getReferenceCount() === 1, "After disposing the BackButton inside the fragment, the reference count should be 1.");

                    LiveUnit.LoggingCore.logComment("Test how calling dispose() multiple times on the same BackButton effects the reference count.");
                    innerButton.dispose();
                    LiveUnit.Assert.isTrue(BackButton._getReferenceCount() === 1, "Calling dispose on a BackButton control more than once should not effect the reference count.");

                    LiveUnit.LoggingCore.logComment("Test the Singleton reference count after navigating again.");
                    simulateNavigation().then(function () {
                        LiveUnit.Assert.isTrue(BackButton._getReferenceCount() === 2, "After navigating again, the reference count should be back at 2.");

                        LiveUnit.LoggingCore.logComment("Test disposing both BackButtons.");
                        innerButton.dispose();
                        outerButton.dispose();
                        LiveUnit.Assert.isTrue(BackButton._getReferenceCount() === 0, "Calling dispose on all BackButtons should reduce the count to 0.");

                        LiveUnit.LoggingCore.logComment("Test that the Singleton reference count can still accumulate after being reset to 0");
                        var backButton = new BackButton();
                        document.body.appendChild(backButton.element);
                        LiveUnit.Assert.isTrue(BackButton._getReferenceCount() === 1, "Creating a new button should increase the singleton reference count from 0.");
                        complete();
                    });
                });
            });
        }
    }
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.BackButtonTests");
