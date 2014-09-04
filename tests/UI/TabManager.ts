// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />

module CorsicaTests {

    "use strict";
    var realYieldForEvents = WinJS.Utilities._yieldForEvents;

    var simpleItemHTML =
        "    <div tabindex='0'>" +
        "        <div>Unfocusable div</div>" +
        "        <a href='http://www.microsoft.com/' class='firstFocusableElementInItem'>Simple link</a>" +
        "        <button disabled='true'>Disabled button</button>" +
        "        <div>" +
        "            <div tabindex='0' class='lastFocusableElementInItem'>Focusable div</div>" +
        "        </div>" +
        "    </div>";


    function getFirstInItemTabOrder(item) {
        return item.querySelector(".firstFocusableElementInItem");
    }

    function getLastInItemTabOrder(item) {
        return item.querySelector(".lastFocusableElementInItem");
    }

    function fakeFocusEvent(target) {
        var fakeEvent = <UIEvent>document.createEvent("UIEvents");
        fakeEvent.initUIEvent("focus", false, false, window, 0);
        target.dispatchEvent(fakeEvent);
    }

    function fakeBlurEvent(target) {
        var fakeEvent = <UIEvent>document.createEvent("UIEvents");
        fakeEvent.initUIEvent("blur", false, false, window, 0);
        target.dispatchEvent(fakeEvent);
    }

    function fakeTabKeyEvent(target, shiftKey) {
        // Chrome won't let us stick a keyCode and shiftKey onto a UIEvent, so just use a custom event named keydown.
        var fakeEvent = <CustomEvent>document.createEvent("CustomEvent");
        fakeEvent.initCustomEvent("keydown", true, true, {});
        (<any>fakeEvent).keyCode = WinJS.Utilities.Key.tab;
        (<any>fakeEvent).shiftKey = shiftKey;
        target.dispatchEvent(fakeEvent);
    }

    export class TabManager {
        
        setUp(complete) {
            LiveUnit.LoggingCore.logComment("In setup");
            var newNode = document.createElement("div");
            newNode.id = "TabManagerTest";
            document.body.appendChild(newNode);
            WinJS.Utilities._require(['WinJS/Core/_BaseUtils'], function (_BaseUtils) {
                _BaseUtils._yieldForEvents = function (callback) {
                    callback(); // Avoid async for these tests by making _yieldForEvents synchronous
                }
        });

            complete();
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            WinJS.Utilities._require(['WinJS/Core/_BaseUtils'], function (_BaseUtils) {
                _BaseUtils._yieldForEvents = realYieldForEvents;
            });
            var element = document.getElementById("TabManagerTest");
            if (element) {
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
            }
        }

        testGetTabIndex() {
            var root = document.getElementById("TabManagerTest");
            WinJS.Utilities.setInnerHTMLUnsafe(root, "<div>Not focusable</div>"
                + "<div tabindex='-1'>Not focusable</div>"
                + "<div tabindex='0'>Focusable</div>"
                + "<div tabindex='1'>Focusable</div>"
                + "<button>Focusable</button>"
                + "<button tabindex='1'>Focusable</button>"
                + "<button tabindex='-1'>Not focusable</button>"
                + "<a>Not focusable</a>"
                + "<a tabindex='-1'>Not focusable</a>"
                + "<a href='http://www.microsoft.com/'>Focusable</a>"
                + "<a href='http://www.microsoft.com/' tabindex='1'>Focusable</a>"
                + "<a href='http://www.microsoft.com/' tabindex='-1'>Not focusable</a>"
                + "<button disabled='true'>Not focusable</button>"
                + "<input>Focusable</input>"
                + "<object>Focusable</object>"
                + "<select>Focusable</select>"
                + "<textarea>Focusable</textarea>"
                + "<command>Focusable</command>"
                + "<area href='http://www.microsoft.com/'>Focusable</button>"
                + "<link href='http://www.microsoft.com/'>Focusable</button>");
            var getTabIndex = WinJS.Utilities.getTabIndex;
            var expectedTabIndices = [-1, -1, 0, 1, 0, 1, -1, -1, -1, 0, 1, -1, -1, 0, 0, 0, 0, 0, 0, 0];
            var curr = <HTMLElement>root.firstElementChild,
                index = 0;
            while (curr) {
                LiveUnit.Assert.areEqual(expectedTabIndices[index], getTabIndex(curr));
                index++;
                curr = <HTMLElement>curr.nextElementSibling;
            }
        }

        testTabContainerInitialization() {
            var root = document.getElementById("TabManagerTest");
            root.innerHTML = "<div></div>";
            var tabContainedElement = <HTMLElement>root.firstElementChild;

            LiveUnit.Assert.isNull(tabContainedElement.previousElementSibling);
            LiveUnit.Assert.isNull(tabContainedElement.nextElementSibling);
            // This test needs to make sure that the root had no tabIndex set before tabContainer initialization, and had it set to -1
            // after initialization, so use getAttribute instead of getTabIndex for these assertions.
            LiveUnit.Assert.isNull(tabContainedElement.getAttribute("tabindex"));

            var tabContainer = <WinJS.UI.PrivateTabContainer> new WinJS.UI.TabContainer(tabContainedElement);
            LiveUnit.Assert.areEqual(tabContainer._elementTabHelper._catcherBegin, tabContainedElement.previousElementSibling);
            LiveUnit.Assert.areEqual(tabContainer._elementTabHelper._catcherEnd, tabContainedElement.nextElementSibling);
            LiveUnit.Assert.areEqual("-1", tabContainedElement.getAttribute("tabindex"));
        }

        testTabIndexProperty() {
            var root = document.getElementById("TabManagerTest");
            root.innerHTML = "<div></div>";

            var getTabIndex = WinJS.Utilities.getTabIndex;
            var tabContainedElement = <HTMLElement>root.firstElementChild,
                tabContainer = <WinJS.UI.PrivateTabContainer> new WinJS.UI.TabContainer(tabContainedElement);

            LiveUnit.Assert.areEqual(-1, getTabIndex(tabContainedElement));
            LiveUnit.Assert.areEqual(0, getTabIndex(tabContainer._elementTabHelper._catcherBegin));
            LiveUnit.Assert.areEqual(0, getTabIndex(tabContainer._elementTabHelper._catcherEnd));
            tabContainer.tabIndex = 2;
            LiveUnit.Assert.areEqual(-1, getTabIndex(tabContainedElement));
            LiveUnit.Assert.areEqual(2, getTabIndex(tabContainer._elementTabHelper._catcherBegin));
            LiveUnit.Assert.areEqual(2, getTabIndex(tabContainer._elementTabHelper._catcherEnd));
        }

        testHasMoreElementsInSimpleTree() {
            var root = document.getElementById("TabManagerTest");
            root.innerHTML =
            "<div>" +
            simpleItemHTML +
            simpleItemHTML +
            "</div>";

            var tabContainedElement = <HTMLElement>root.firstElementChild,
                firstChildFocus = <HTMLElement>tabContainedElement.firstElementChild,
                secondChildFocus = <HTMLElement>firstChildFocus.nextElementSibling,
                tabContainer = <WinJS.UI.PrivateTabContainer> new WinJS.UI.TabContainer(tabContainedElement);

            tabContainer.childFocus = firstChildFocus;
            LiveUnit.Assert.isTrue(tabContainer._hasMoreElementsInTabOrder(firstChildFocus, true));
            LiveUnit.Assert.isTrue(tabContainer._hasMoreElementsInTabOrder(getFirstInItemTabOrder(firstChildFocus), true));
            LiveUnit.Assert.isFalse(tabContainer._hasMoreElementsInTabOrder(getLastInItemTabOrder(firstChildFocus), true));
            LiveUnit.Assert.isTrue(tabContainer._hasMoreElementsInTabOrder(getLastInItemTabOrder(firstChildFocus), false));
            LiveUnit.Assert.isTrue(tabContainer._hasMoreElementsInTabOrder(getFirstInItemTabOrder(firstChildFocus), false));
            LiveUnit.Assert.isFalse(tabContainer._hasMoreElementsInTabOrder(firstChildFocus, false));

            tabContainer.childFocus = null;
            LiveUnit.Assert.isFalse(tabContainer._hasMoreElementsInTabOrder(firstChildFocus, true));
            LiveUnit.Assert.isFalse(tabContainer._hasMoreElementsInTabOrder(getFirstInItemTabOrder(firstChildFocus), true));
            LiveUnit.Assert.isFalse(tabContainer._hasMoreElementsInTabOrder(getLastInItemTabOrder(firstChildFocus), true));
            LiveUnit.Assert.isFalse(tabContainer._hasMoreElementsInTabOrder(getLastInItemTabOrder(firstChildFocus), false));
            LiveUnit.Assert.isFalse(tabContainer._hasMoreElementsInTabOrder(getFirstInItemTabOrder(firstChildFocus), false));
            LiveUnit.Assert.isFalse(tabContainer._hasMoreElementsInTabOrder(firstChildFocus, false));

            tabContainer.childFocus = secondChildFocus;
            LiveUnit.Assert.isTrue(tabContainer._hasMoreElementsInTabOrder(secondChildFocus, true));
            LiveUnit.Assert.isTrue(tabContainer._hasMoreElementsInTabOrder(getFirstInItemTabOrder(secondChildFocus), true));
            LiveUnit.Assert.isFalse(tabContainer._hasMoreElementsInTabOrder(getLastInItemTabOrder(secondChildFocus), true));
            LiveUnit.Assert.isTrue(tabContainer._hasMoreElementsInTabOrder(getLastInItemTabOrder(secondChildFocus), false));
            LiveUnit.Assert.isTrue(tabContainer._hasMoreElementsInTabOrder(getFirstInItemTabOrder(secondChildFocus), false));
            LiveUnit.Assert.isFalse(tabContainer._hasMoreElementsInTabOrder(secondChildFocus, false));
        }

        testHasMoreElementsNestedTabContainerTree() {
            var root = document.getElementById("TabManagerTest");
            root.innerHTML =
            "<div>" +
            "    <div>" +
            simpleItemHTML +
            "        <div>" +
            simpleItemHTML +
            "        </div>" +
            simpleItemHTML +
            "    </div>" +
            "</div>";

            var outerTabContainerElement = <HTMLElement>root.firstElementChild,
                rootChildFocus = <HTMLElement>outerTabContainerElement.firstElementChild,
                itemBeforeInnerContainer = <HTMLElement>rootChildFocus.firstElementChild,
                innerTabContainerElement = <HTMLElement>itemBeforeInnerContainer.nextElementSibling,
                innerContainerItem = <HTMLElement>innerTabContainerElement.firstElementChild,
                itemAfterInnerContainer = <HTMLElement>innerTabContainerElement.nextElementSibling,
                outerTabContainer = <WinJS.UI.PrivateTabContainer> new WinJS.UI.TabContainer(outerTabContainerElement),
                innerTabContainer = <WinJS.UI.PrivateTabContainer> new WinJS.UI.TabContainer(innerTabContainerElement);

            // Nothing should be tabbable while no childFocus is set on the tabContainers
            LiveUnit.Assert.isFalse(outerTabContainer._hasMoreElementsInTabOrder(itemBeforeInnerContainer, true));
            LiveUnit.Assert.isFalse(outerTabContainer._hasMoreElementsInTabOrder(itemBeforeInnerContainer, false));
            LiveUnit.Assert.isFalse(outerTabContainer._hasMoreElementsInTabOrder(innerContainerItem, true));
            LiveUnit.Assert.isFalse(outerTabContainer._hasMoreElementsInTabOrder(innerContainerItem, false));
            LiveUnit.Assert.isFalse(innerTabContainer._hasMoreElementsInTabOrder(innerContainerItem, true));
            LiveUnit.Assert.isFalse(innerTabContainer._hasMoreElementsInTabOrder(innerContainerItem, false));
            LiveUnit.Assert.isFalse(outerTabContainer._hasMoreElementsInTabOrder(itemAfterInnerContainer, true));
            LiveUnit.Assert.isFalse(outerTabContainer._hasMoreElementsInTabOrder(itemAfterInnerContainer, false));

            outerTabContainer.childFocus = rootChildFocus;
            LiveUnit.Assert.isTrue(outerTabContainer._hasMoreElementsInTabOrder(itemBeforeInnerContainer, true));
            LiveUnit.Assert.isFalse(outerTabContainer._hasMoreElementsInTabOrder(itemBeforeInnerContainer, false));
            LiveUnit.Assert.isTrue(outerTabContainer._hasMoreElementsInTabOrder(getFirstInItemTabOrder(itemBeforeInnerContainer), true));
            LiveUnit.Assert.isTrue(outerTabContainer._hasMoreElementsInTabOrder(getFirstInItemTabOrder(itemBeforeInnerContainer), false));
            LiveUnit.Assert.isTrue(outerTabContainer._hasMoreElementsInTabOrder(getLastInItemTabOrder(itemBeforeInnerContainer), true));
            LiveUnit.Assert.isTrue(outerTabContainer._hasMoreElementsInTabOrder(getLastInItemTabOrder(itemBeforeInnerContainer), false));
            LiveUnit.Assert.isTrue(outerTabContainer._hasMoreElementsInTabOrder(itemAfterInnerContainer, true));
            LiveUnit.Assert.isTrue(outerTabContainer._hasMoreElementsInTabOrder(itemAfterInnerContainer, false));
            LiveUnit.Assert.isTrue(outerTabContainer._hasMoreElementsInTabOrder(getFirstInItemTabOrder(itemAfterInnerContainer), true));
            LiveUnit.Assert.isTrue(outerTabContainer._hasMoreElementsInTabOrder(getFirstInItemTabOrder(itemAfterInnerContainer), false));
            LiveUnit.Assert.isFalse(outerTabContainer._hasMoreElementsInTabOrder(getLastInItemTabOrder(itemAfterInnerContainer), true));
            LiveUnit.Assert.isTrue(outerTabContainer._hasMoreElementsInTabOrder(getLastInItemTabOrder(itemAfterInnerContainer), false));

            innerTabContainer.childFocus = innerContainerItem;
            LiveUnit.Assert.isTrue(innerTabContainer._hasMoreElementsInTabOrder(innerContainerItem, true));
            LiveUnit.Assert.isTrue(innerTabContainer._hasMoreElementsInTabOrder(getFirstInItemTabOrder(innerContainerItem), true));
            LiveUnit.Assert.isTrue(innerTabContainer._hasMoreElementsInTabOrder(getLastInItemTabOrder(innerContainerItem), false));

            // The inner tab container isn't aware of the DOM outside of its own tree, so _hasMoreElementsInTabOrder should return false in these next couple of edge tests.
            // These same tests should return true when we call _hasMoreElementsInTabOrder on the outerTabContainer, since it knows the inner container
            // is surrounded by two tabbable items.
            LiveUnit.Assert.isFalse(innerTabContainer._hasMoreElementsInTabOrder(innerContainerItem, false));
            LiveUnit.Assert.isFalse(innerTabContainer._hasMoreElementsInTabOrder(getLastInItemTabOrder(innerContainerItem), true));
            LiveUnit.Assert.isTrue(outerTabContainer._hasMoreElementsInTabOrder(innerContainerItem, false));
            LiveUnit.Assert.isTrue(outerTabContainer._hasMoreElementsInTabOrder(getLastInItemTabOrder(innerContainerItem), true));
        }

        testTabEnterBehavior() {
            var root = document.getElementById("TabManagerTest");
            root.innerHTML =
            "<div>" +
            simpleItemHTML +
            "</div>";

            var tabContainedElement = <HTMLElement> root.firstElementChild,
                firstChildFocus = <HTMLElement> tabContainedElement.firstElementChild,
                tabContainer = <WinJS.UI.PrivateTabContainer> new WinJS.UI.TabContainer(tabContainedElement);

            tabContainer.childFocus = firstChildFocus;
            var gotFocusEvent = false,
                gotTabEnterEvent = false;

            tabContainedElement.addEventListener("onTabEnter", function (e) {
                gotTabEnterEvent = true;
            });
            firstChildFocus.focus = function () {
                gotFocusEvent = true;
            };

            fakeFocusEvent(tabContainer._elementTabHelper._catcherBegin);
            LiveUnit.Assert.isTrue(gotFocusEvent);
            LiveUnit.Assert.isTrue(gotTabEnterEvent);
            gotFocusEvent = false;
            gotTabEnterEvent = false;
            fakeFocusEvent(tabContainer._elementTabHelper._catcherEnd);
            LiveUnit.Assert.isTrue(gotFocusEvent);
            LiveUnit.Assert.isTrue(gotTabEnterEvent);

            tabContainer.childFocus = null;
            firstChildFocus.focus = function () {
                LiveUnit.Assert.fail("shouldn't receive focus");
            };
            tabContainedElement.focus = function () {
                gotFocusEvent = true;
            };
            gotFocusEvent = false;
            gotTabEnterEvent = false;
            fakeFocusEvent(tabContainer._elementTabHelper._catcherBegin);
            LiveUnit.Assert.isTrue(gotFocusEvent);
            LiveUnit.Assert.isTrue(gotTabEnterEvent);
        }

        testTabEnteredBehavior() {
            var root = document.getElementById("TabManagerTest");
            root.innerHTML =
            "<div>" +
            simpleItemHTML +
            "</div>";

            var tabContainedElement = <HTMLElement> root.firstElementChild,
                firstChildFocus = <HTMLElement> tabContainedElement.firstElementChild,
                tabContainer = <WinJS.UI.PrivateTabContainer> new WinJS.UI.TabContainer(tabContainedElement);

            tabContainer.childFocus = firstChildFocus;
            var gotFocusEvent = false,
                gotTabEnterEvent = false,
                gotTabEnteredEvent = false,
                preventDefaultOnTabEntered = true;

            tabContainedElement.addEventListener("onTabEnter", function (e) {
                gotTabEnterEvent = true;
            });
            firstChildFocus.focus = function () {
                gotFocusEvent = true;
            };
            tabContainedElement.addEventListener("onTabEntered", function (e) {
                gotTabEnteredEvent = true;
                if (preventDefaultOnTabEntered) {
                    e.preventDefault();
                }
            });
            fakeFocusEvent(tabContainer._elementTabHelper._catcherBegin);
            LiveUnit.Assert.isFalse(gotFocusEvent);
            LiveUnit.Assert.isTrue(gotTabEnterEvent);
            LiveUnit.Assert.isTrue(gotTabEnteredEvent);
            gotFocusEvent = false;
            gotTabEnterEvent = false;
            gotTabEnteredEvent = false;
            preventDefaultOnTabEntered = false;
            fakeFocusEvent(tabContainer._elementTabHelper._catcherBegin);
            LiveUnit.Assert.isTrue(gotFocusEvent);
            LiveUnit.Assert.isTrue(gotTabEnterEvent);
            LiveUnit.Assert.isTrue(gotTabEnteredEvent);
        }

        testTabExitBehavior() {
            var root = document.getElementById("TabManagerTest");
            root.innerHTML =
            "<div>" +
            simpleItemHTML +
            "</div>";

            var getTabIndex = WinJS.Utilities.getTabIndex;
            var tabContainedElement = <HTMLElement>root.firstElementChild,
                firstChildFocus = <HTMLElement>tabContainedElement.firstElementChild,
                tabContainer = <WinJS.UI.PrivateTabContainer> new WinJS.UI.TabContainer(tabContainedElement);

            tabContainer.childFocus = firstChildFocus;
            var gotTabExitEvent = false;

            tabContainedElement.addEventListener("onTabExit", function (e) {
                gotTabExitEvent = true;
            });

            LiveUnit.Assert.areEqual(0, getTabIndex(firstChildFocus));
            LiveUnit.Assert.areEqual(0, getTabIndex(getFirstInItemTabOrder(firstChildFocus)));
            LiveUnit.Assert.areEqual(0, getTabIndex(getLastInItemTabOrder(firstChildFocus)));

            fakeTabKeyEvent(getLastInItemTabOrder(firstChildFocus), false);
            LiveUnit.Assert.areEqual(-1, getTabIndex(firstChildFocus));
            LiveUnit.Assert.areEqual(-1, getTabIndex(getFirstInItemTabOrder(firstChildFocus)));
            LiveUnit.Assert.areEqual(-1, getTabIndex(getLastInItemTabOrder(firstChildFocus)));
            LiveUnit.Assert.isTrue(gotTabExitEvent);
            fakeBlurEvent(getLastInItemTabOrder(firstChildFocus));
            LiveUnit.Assert.areEqual(0, getTabIndex(firstChildFocus));
            LiveUnit.Assert.areEqual(0, getTabIndex(getFirstInItemTabOrder(firstChildFocus)));
            LiveUnit.Assert.areEqual(0, getTabIndex(getLastInItemTabOrder(firstChildFocus)));

            gotTabExitEvent = false;
            fakeTabKeyEvent(getFirstInItemTabOrder(firstChildFocus), false);
            LiveUnit.Assert.isFalse(gotTabExitEvent);

            fakeTabKeyEvent(firstChildFocus, true);
            LiveUnit.Assert.areEqual(-1, getTabIndex(firstChildFocus));
            LiveUnit.Assert.areEqual(-1, getTabIndex(getFirstInItemTabOrder(firstChildFocus)));
            LiveUnit.Assert.areEqual(-1, getTabIndex(getLastInItemTabOrder(firstChildFocus)));
            LiveUnit.Assert.isTrue(gotTabExitEvent);
            fakeBlurEvent(firstChildFocus);
            LiveUnit.Assert.areEqual(0, getTabIndex(firstChildFocus));
            LiveUnit.Assert.areEqual(0, getTabIndex(getFirstInItemTabOrder(firstChildFocus)));
            LiveUnit.Assert.areEqual(0, getTabIndex(getLastInItemTabOrder(firstChildFocus)));
        }

        testTabExitingBehavior() {
            var root = document.getElementById("TabManagerTest");
            root.innerHTML =
            "<div>" +
            simpleItemHTML +
            "</div>";

            var getTabIndex = WinJS.Utilities.getTabIndex;
            var tabContainedElement = <HTMLElement> root.firstElementChild,
                firstChildFocus = <HTMLElement> tabContainedElement.firstElementChild,
                tabContainer = <WinJS.UI.PrivateTabContainer> new WinJS.UI.TabContainer(tabContainedElement);

            tabContainer.childFocus = firstChildFocus;
            var gotTabExitEvent = false,
                gotTabExitingEvent = false,
                preventDefaultOnTabExiting = true;

            tabContainedElement.addEventListener("onTabExit", function (e) {
                gotTabExitEvent = true;
            });
            tabContainedElement.addEventListener("onTabExiting", function (e) {
                gotTabExitingEvent = true;
                if (preventDefaultOnTabExiting) {
                    e.preventDefault();
                }
            });
            LiveUnit.Assert.areEqual(0, getTabIndex(firstChildFocus));
            LiveUnit.Assert.areEqual(0, getTabIndex(getFirstInItemTabOrder(firstChildFocus)));
            LiveUnit.Assert.areEqual(0, getTabIndex(getLastInItemTabOrder(firstChildFocus)));

            fakeTabKeyEvent(getLastInItemTabOrder(firstChildFocus), false);
            LiveUnit.Assert.areEqual(0, getTabIndex(firstChildFocus));
            LiveUnit.Assert.areEqual(0, getTabIndex(getFirstInItemTabOrder(firstChildFocus)));
            LiveUnit.Assert.areEqual(0, getTabIndex(getLastInItemTabOrder(firstChildFocus)));
            LiveUnit.Assert.isTrue(gotTabExitingEvent);
            LiveUnit.Assert.isFalse(gotTabExitEvent);
            gotTabExitEvent = false;
            gotTabExitingEvent = false;
            preventDefaultOnTabExiting = false;
            fakeTabKeyEvent(getLastInItemTabOrder(firstChildFocus), false);
            LiveUnit.Assert.areEqual(-1, getTabIndex(firstChildFocus));
            LiveUnit.Assert.areEqual(-1, getTabIndex(getFirstInItemTabOrder(firstChildFocus)));
            LiveUnit.Assert.areEqual(-1, getTabIndex(getLastInItemTabOrder(firstChildFocus)));
            LiveUnit.Assert.isTrue(gotTabExitingEvent);
            LiveUnit.Assert.isTrue(gotTabExitEvent);
        }
    }

}
LiveUnit.registerTestClass("CorsicaTests.TabManager");

