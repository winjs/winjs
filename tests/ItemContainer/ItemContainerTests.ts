// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
///<reference path="../../bin/typings/tsd.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module WinJSTests {

    "use strict";

    var utilities = WinJS.Utilities;

    var _element: HTMLDivElement;
    var oldHasWinRT;
    var oldRenderSelection;

    var ItemContainer = <typeof WinJS.UI.PrivateItemContainer> WinJS.UI.ItemContainer;

    function eventOnElement(element) {
        var rect = element.getBoundingClientRect();
        // Simulate clicking the middle of the element
        return {
            target: element,
            clientX: (rect.left + rect.right) / 2,
            clientY: (rect.top + rect.bottom) / 2,
            defaultPrevented: false,
            preventDefault: function () {
                this.defaultPrevented = true;
            }
        };
    }

    function click(control, eventObject) {
        var target = eventObject.target,
            elementCoords;

        if (typeof eventObject.button !== "number") {
            eventObject.button = WinJS.UI._LEFT_MSPOINTER_BUTTON;
        }

        target.scrollIntoView(false);
        elementCoords = eventOnElement(target);
        eventObject.clientX = elementCoords.clientX;
        eventObject.clientY = elementCoords.clientY;
        eventObject.preventDefault = function () { };

        control._onPointerDown(eventObject);
        control._onPointerUp(eventObject);
        control._onClick();
    }

    function rightClick(control, eventObject) {
        eventObject.button = WinJS.UI._RIGHT_MSPOINTER_BUTTON;
        click(control, eventObject);
    }

    function createEvent(element, key, shiftKey = false, ctrlKey = false) {
        return {
            keyCode: key,
            shiftKey: shiftKey,
            ctrlKey: ctrlKey,
            target: element,
            stopPropagation: function () { },
            preventDefault: function () { }
        };
    }

    function verifySelectionVisual(element, selected) {
        var parts = element.querySelectorAll(WinJS.Utilities._selectionPartsSelector);
        if (selected) {
            LiveUnit.Assert.isTrue(utilities.hasClass(element, WinJS.UI._selectedClass));
            LiveUnit.Assert.areEqual(4, parts.length, "The control's container should have 4 selection parts");
        } else {
            LiveUnit.Assert.isFalse(utilities.hasClass(element, WinJS.UI._selectedClass));
            LiveUnit.Assert.areEqual(0, parts.length, "The control's container should not have selection parts");
        }
    }

    export class ItemContainerTests {

        // This is the setup function that will be called at the beginning of each test function.
        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            var newNode = document.createElement("div");
            newNode.id = "host";
            document.body.appendChild(newNode);
            _element = newNode;

            oldHasWinRT = WinJS.Utilities.hasWinRT;
            oldRenderSelection = WinJS.UI._ItemEventsHandler.renderSelection;
            WinJS.Utilities._setHasWinRT(false);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");

            if (_element) {
                WinJS.Utilities.disposeSubTree(_element);
                document.body.removeChild(_element);
                _element = null;
            }

            WinJS.Utilities._setHasWinRT(oldHasWinRT);
            WinJS.UI._ItemEventsHandler.renderSelection = oldRenderSelection;
        }

        

        testElementProperty(complete) {
            var element = document.getElementById("host");
            var control = new ItemContainer(element);
            LiveUnit.Assert.areEqual(WinJS.Utilities._uniqueID(element), WinJS.Utilities._uniqueID(control.element), "Invalid element returned by the control's element property");
            complete();
        }

        
        testDraggableProperty(complete) {
            if (utilities.isPhone) {
                complete();
                return;
            }

            var element = document.getElementById("host");
            var control = new ItemContainer(element);
            LiveUnit.Assert.isFalse(control.draggable, "The control should not be draggable by default");
            LiveUnit.Assert.isNull(element.getAttribute("draggable"));

            control.draggable = true;

            var itemBox = element.querySelector(".win-itembox");
            LiveUnit.Assert.areEqual("true", itemBox.getAttribute("draggable"));

            complete();
        }
        

        testSelectedProperty(complete) {
            var element = document.getElementById("host");
            var control = new ItemContainer(element);
            LiveUnit.Assert.isFalse(control.selected, "The control should not be selected by default");
            LiveUnit.Assert.isFalse(utilities.hasClass(element, WinJS.UI._selectedClass));

            control.selected = true;
            LiveUnit.Assert.isTrue(control.selected, "The control's selected property setter is not working");
            verifySelectionVisual(element, true);

            complete();
        }

        testSwipeOrientationProperty(complete) {
            var element = document.getElementById("host");
            var control = new ItemContainer(element);
            var itemBox = element.querySelector(".win-itembox");

            LiveUnit.Assert.areEqual(control.swipeOrientation, WinJS.UI.Orientation.vertical, "The default swipe orientation should be vertical");
            LiveUnit.Assert.isTrue(utilities.hasClass(element, ItemContainer._ClassName.vertical));
            LiveUnit.Assert.isFalse(utilities.hasClass(element, ItemContainer._ClassName.horizontal));

            if (WinJS.Utilities._supportsTouchActionCrossSlide) {
                var crossSlideYIndex = getComputedStyle(itemBox).touchAction.toLowerCase().indexOf("cross-slide-y");
                var crossSlideXIndex = getComputedStyle(itemBox).touchAction.toLowerCase().indexOf("cross-slide-x");
                LiveUnit.Assert.isTrue(utilities.isPhone ? crossSlideYIndex === -1 : crossSlideYIndex > 0);
                LiveUnit.Assert.isTrue(crossSlideXIndex === -1);

                control.swipeOrientation = WinJS.UI.Orientation.horizontal;
                LiveUnit.Assert.isFalse(utilities.hasClass(element, ItemContainer._ClassName.vertical));
                LiveUnit.Assert.isTrue(utilities.hasClass(element, ItemContainer._ClassName.horizontal));

                crossSlideYIndex = getComputedStyle(itemBox).touchAction.toLowerCase().indexOf("cross-slide-y");
                crossSlideXIndex = getComputedStyle(itemBox).touchAction.toLowerCase().indexOf("cross-slide-x");
                LiveUnit.Assert.isTrue(utilities.isPhone ? crossSlideYIndex === -1 : crossSlideXIndex > 0);
                LiveUnit.Assert.isTrue(crossSlideYIndex === -1);
            }

            complete();
        }

        testSelectionDisabledProperty(complete) {
            var element = document.getElementById("host");

            var control = new ItemContainer(element);

            LiveUnit.Assert.isFalse(control.selectionDisabled, "The default selectionDisabled should be false");
            LiveUnit.Assert.areEqual(control._selectionMode, WinJS.UI.SelectionMode.single);
            control.selectionDisabled = true;
            LiveUnit.Assert.isTrue(control.selectionDisabled);
            LiveUnit.Assert.areEqual(control._selectionMode, WinJS.UI.SelectionMode.none);

            complete();
        }

        testTapBehaviorProperty(complete) {
            var element = document.getElementById("host");
            var control = new ItemContainer(element);

            LiveUnit.Assert.areEqual(WinJS.UI.TapBehavior.invokeOnly, control.tapBehavior, "The control's tabBehavior property should default to invokeOnly");

            complete();
        }

        testSwipeBehaviorProperty(complete) {
            var element = document.getElementById("host");
            var control = new ItemContainer(element);

            LiveUnit.Assert.areEqual(WinJS.UI.SwipeBehavior.select, control.swipeBehavior, "The control's swipeBehavior property should default to select");
            LiveUnit.Assert.isTrue(!utilities.isPhone === utilities.hasClass(element, WinJS.UI._swipeableClass));

            control.swipeBehavior = WinJS.UI.SwipeBehavior.none;
            LiveUnit.Assert.isFalse(utilities.hasClass(element, WinJS.UI._swipeableClass));

            complete();
        }

        testInvokedEvent(complete) {
            var element = document.getElementById("host");
            var control = new ItemContainer(element);
            var listener1Called = false;
            var listener2Called = false;
            control.addEventListener("invoked", function (ev) {
                listener1Called = true;
                LiveUnit.Assert.areEqual(WinJS.Utilities._uniqueID(element), WinJS.Utilities._uniqueID(ev.target));
            });
            control.oninvoked = function (ev) {
                listener2Called = true;
                LiveUnit.Assert.areEqual(WinJS.Utilities._uniqueID(element), WinJS.Utilities._uniqueID(<HTMLElement>ev.target));
            };

            click(control, { target: element });

            LiveUnit.Assert.isTrue(listener1Called);
            LiveUnit.Assert.isTrue(listener2Called);

            complete();
        }

        testInvokedEventWithTabBehaviorNone(complete) {
            var element = document.getElementById("host");
            var control = new ItemContainer(element);
            control.tapBehavior = WinJS.UI.TapBehavior.none;

            control.addEventListener("invoked", function (ev) {
                LiveUnit.Assert.fail("invoked event should not be called when tabBehavior is none");
            });

            click(control, { target: element });

            WinJS.Utilities._setImmediate(complete);
        }

        testSelectionChangingEventCalled(complete) {
            var invoked = false;
            var element = document.getElementById("host");

            function selectionChanging(ev) {
                invoked = true;
                LiveUnit.Assert.areEqual(WinJS.Utilities._uniqueID(element), WinJS.Utilities._uniqueID(ev.target));
            }

            var control = new ItemContainer(element, { onselectionchanging: selectionChanging });

            LiveUnit.Assert.isFalse(invoked);

            rightClick(control, { target: element });

            LiveUnit.Assert.isTrue(invoked, "Selectionchanging event should have been called");

            complete();
        }

        testSelectionChangingEventPrevented(complete) {
            var element = document.getElementById("host");

            function selectionChanging(ev) {
                ev.preventDefault();
            }

            var control = new ItemContainer(element, { onselectionchanging: selectionChanging });
            control.onselectionchanged = function () {
                LiveUnit.Assert.fail("Selectionchanged should not be called because it was prevented on selectionchanging");
            };
            rightClick(control, { target: element });

            complete();
        }

        testSelectionChangedEventCalled(complete) {
            var invoked = false;
            var element = document.getElementById("host");

            function selectionChanged(ev) {
                invoked = true;
                LiveUnit.Assert.areEqual(WinJS.Utilities._uniqueID(element), WinJS.Utilities._uniqueID(ev.target));
            }

            var control = new ItemContainer(element, { onselectionchanged: selectionChanged });

            LiveUnit.Assert.isFalse(invoked);

            rightClick(control, { target: element });

            LiveUnit.Assert.isTrue(invoked, "Selectionchanged event should have been called");

            complete();
        }

        testKeyboardFocusBlur(complete) {
            var element = document.getElementById("host");

            var control = new ItemContainer(element);
            WinJS.UI._keyboardSeenLast = false;

            LiveUnit.Assert.areEqual(0, element.querySelectorAll("." + WinJS.UI._itemFocusOutlineClass).length);
            control._onFocusIn();
            LiveUnit.Assert.areEqual(0, element.querySelectorAll("." + WinJS.UI._itemFocusOutlineClass).length);
            WinJS.UI._keyboardSeenLast = true;
            control._onFocusIn();
            LiveUnit.Assert.areEqual(1, element.querySelectorAll("." + WinJS.UI._itemFocusOutlineClass).length);
            WinJS.UI._keyboardSeenLast = null;
            control._onFocusOut();
            LiveUnit.Assert.areEqual(0, element.querySelectorAll("." + WinJS.UI._itemFocusOutlineClass).length);

            complete();
        }

        testTabIndex(complete) {
            var element = document.getElementById("host");
            var control = new ItemContainer(element);
            LiveUnit.Assert.areEqual("0", element.getAttribute("tabindex"), "The control should set tabindex to 0 if a tabindex was not provided");

            var element2 = document.createElement("div");
            document.body.appendChild(element2);
            element2.setAttribute("tabindex", "3");
            var control2 = new ItemContainer(element2);
            LiveUnit.Assert.areEqual("3", element2.getAttribute("tabindex"), "The control should not set tabindex if one was provided");
            element2.parentNode.removeChild(element2);

            complete();
        }

        testItemEventsHandlerIntegration(complete) {
            var element = document.getElementById("host");
            var control = new ItemContainer(element);
            var handler = control._itemEventsHandler;
            var site = handler._site;
            LiveUnit.Assert.isNotNull(handler);
            LiveUnit.Assert.areEqual(site.containerFromElement(null), element);
            LiveUnit.Assert.areEqual(site.indexForItemElement(null), 1);
            LiveUnit.Assert.areEqual(site.itemBoxAtIndex(0), control._itemBox);
            LiveUnit.Assert.areEqual(site.itemAtIndex(0), element);
            LiveUnit.Assert.areEqual(site.containerAtIndex(0), element);
            LiveUnit.Assert.areEqual(site.swipeBehavior, WinJS.UI.SwipeBehavior.select);
            control.swipeBehavior = WinJS.UI.SwipeBehavior.none;
            LiveUnit.Assert.areEqual(site.swipeBehavior, WinJS.UI.SwipeBehavior.none);
            LiveUnit.Assert.areEqual(site.selectionMode, WinJS.UI.SelectionMode.single);
            LiveUnit.Assert.areEqual(site.tapBehavior, WinJS.UI.TapBehavior.invokeOnly);
            control.tapBehavior = WinJS.UI.TapBehavior.toggleSelect;
            LiveUnit.Assert.areEqual(site.tapBehavior, WinJS.UI.TapBehavior.toggleSelect);
            LiveUnit.Assert.isFalse(site.draggable);
            LiveUnit.Assert.isTrue(site.skipPreventDefaultOnPointerDown);
            if (!utilities.isPhone) {
                control.draggable = true;
                LiveUnit.Assert.isTrue(site.draggable);
            }
            LiveUnit.Assert.isFalse(site.selection.selected);
            control.selected = true;
            LiveUnit.Assert.isTrue(site.selection.selected);
            LiveUnit.Assert.isTrue(site.horizontal);
            control.swipeOrientation = WinJS.UI.Orientation.horizontal;
            LiveUnit.Assert.isFalse(site.horizontal);
            LiveUnit.Assert.isNull(site.customFootprintParent);

            complete();
        }

    testDispose(complete) {
            var element = document.getElementById("host");
            var child = document.createElement("div");
            WinJS.Utilities.addClass(child, "win-disposable");
            element.appendChild(child);
            var childDisposed = false;
            child.winControl = {
                dispose: function () {
                    childDisposed = true;
                }
            };
            var control = new ItemContainer(element);
            LiveUnit.Assert.isFalse(!!control._disposed);
            LiveUnit.Assert.isFalse(childDisposed);
            control.dispose();
            LiveUnit.Assert.isTrue(control._disposed);
            LiveUnit.Assert.isTrue(childDisposed);

            complete();
        }

        testForceLayout(complete) {
            var element = document.getElementById("host");
            var control = new ItemContainer(element);
            LiveUnit.Assert.isFalse(utilities.hasClass(element, "win-rtl"));
            element.style.direction = "rtl";
            control.forceLayout();
            LiveUnit.Assert.isTrue(utilities.hasClass(element, "win-rtl"));
            complete();
        }

        testSetupInternalTree(complete) {
            var element = document.getElementById("host");
            var child1 = document.createElement("div");
            child1.className = "child1";
            var child2 = document.createElement("div2");
            child2.className = "child2";
            element.appendChild(child1);
            element.appendChild(child2);

            var control = new ItemContainer(element);
            LiveUnit.Assert.isTrue(element, ItemContainer._ClassName.itemContainer);
            LiveUnit.Assert.isTrue(utilities.hasClass(element, WinJS.UI._containerClass));

            // The main element should now have two children (the itembox + the captureProxy)
            LiveUnit.Assert.areEqual(2, element.children.length);
            var itemBox = <HTMLElement>element.children[0];
            LiveUnit.Assert.isTrue(utilities.hasClass(itemBox, WinJS.UI._itemBoxClass));

            LiveUnit.Assert.areEqual(1, itemBox.children.length);
            var itemElement = <HTMLElement>itemBox.children[0];
            LiveUnit.Assert.isTrue(itemElement, WinJS.UI._itemClass);

            LiveUnit.Assert.areEqual(2, itemElement.children.length);
            LiveUnit.Assert.isTrue(utilities.hasClass(<HTMLElement>itemElement.children[0], "child1"));
            LiveUnit.Assert.isTrue(utilities.hasClass(<HTMLElement>itemElement.children[1], "child2"));

            complete();
        }

        testSpaceBarSelection(complete) {
            var element = document.getElementById("host");
            element.textContent = "my item";
            var control = new ItemContainer(element);
            LiveUnit.Assert.isFalse(control.selected);
            control._onKeyDown(createEvent(element, utilities.Key.space));
            LiveUnit.Assert.isTrue(control.selected);
            control._onKeyDown(createEvent(element, utilities.Key.space));
            LiveUnit.Assert.isFalse(control.selected)

        complete();
        }

        testToggleSelect(complete) {
            var element = document.getElementById("host");
            element.textContent = "my item";
            var control = new ItemContainer(element);
            control.tapBehavior = WinJS.UI.TapBehavior.toggleSelect;

            LiveUnit.Assert.isFalse(control.selected);
            click(control, { target: element });
            verifySelectionVisual(element, true);

            LiveUnit.Assert.isTrue(control.selected);
            click(control, { target: element });
            verifySelectionVisual(element, false);

            complete();
        }

        testSetAriaRole(complete) {
            var control1 = new ItemContainer(document.getElementById("host"));
            LiveUnit.Assert.areEqual(control1.element.getAttribute("role"), "option", "By default selection/tap is enabled, so the default role should be option");

            var element2 = document.createElement("div");
            document.body.appendChild(element2);
            var control2 = new ItemContainer(element2, {
                tapBehavior: WinJS.UI.TapBehavior.none
            });
            LiveUnit.Assert.areEqual(control2.element.getAttribute("role"), "option", "By default selection is enabled, so the default role should be option");
            element2.parentNode.removeChild(element2);

            var element3 = document.createElement("div");
            document.body.appendChild(element3);
            var control3 = new ItemContainer(element3, {
                selectionDisabled: true
            });
            LiveUnit.Assert.areEqual(control3.element.getAttribute("role"), "option", "By default tap is enabled, so the default role should be option");
            element3.parentNode.removeChild(element3);

            var element4 = document.createElement("div");
            document.body.appendChild(element4);
            var control4 = new ItemContainer(element4, {
                selectionDisabled: true,
                tapBehavior: WinJS.UI.TapBehavior.none
            });
            LiveUnit.Assert.areEqual(control4.element.getAttribute("role"), "listitem", "Selection and Tap are disabled, the default role should be listitem");
            element4.parentNode.removeChild(element4);


            var elementWithRole = document.createElement("div");
            elementWithRole.setAttribute("role", "listbox");
            document.body.appendChild(elementWithRole);
            var control5 = new ItemContainer(elementWithRole);
            LiveUnit.Assert.areEqual(control5.element.getAttribute("role"), "listbox", "A role was already specified. The control should not change it");
            elementWithRole.parentNode.removeChild(elementWithRole);

            var element6 = document.createElement("div");
            document.body.appendChild(element6);
            var control6 = new ItemContainer(element6);
            LiveUnit.Assert.areEqual(control6.element.getAttribute("role"), "option", "By default selection/tap is enabled, so the default role should be option");
            control6.tapBehavior = WinJS.UI.TapBehavior.none;
            LiveUnit.Assert.areEqual(control6.element.getAttribute("role"), "option", "By default selection is enabled, so the default role should be option");
            control6.selectionDisabled = true;
            LiveUnit.Assert.areEqual(control6.element.getAttribute("role"), "listitem", "Selection is disabled and TapBehavior is none, the default role should be listitem");
            element6.parentNode.removeChild(element6);

            complete();
        }

        testUIASelect(complete) {
            function blockSelection(eventObject) {
                eventObject.preventDefault();
            }

            function test() {
                var prevSelection;
                function verifySelection(expectedSelection) {
                    prevSelection = expectedSelection;
                    LiveUnit.Assert.areEqual(expectedSelection, itemContainer.selected, "ItemContainer should be selected");
                    LiveUnit.Assert.areEqual(expectedSelection, WinJS.Utilities.hasClass(itemContainer.element, WinJS.UI._selectedClass), "ItemContainer selected class is in the wrong state");
                    LiveUnit.Assert.areEqual(expectedSelection, itemContainer.element.getAttribute("aria-selected") === "true", "ItemContainer aria-selected is incorrect");
                }
                var itemContainer = new ItemContainer(document.getElementById("host"));

                return WinJS.Promise.timeout().then(function () {
                    // Simulate UIA SelectionItem.Select changes
                    verifySelection(false);
                    itemContainer.element.setAttribute("aria-selected", "false");
                    return WinJS.Promise.timeout();
                }).then(function () {
                        verifySelection(false);
                        itemContainer.element.setAttribute("aria-selected", "true");
                        return WinJS.Promise.timeout();
                    }).then(function () {
                        verifySelection(true);
                        itemContainer.element.setAttribute("aria-selected", "false");
                        return WinJS.Promise.timeout();
                    }).then(function () {
                        verifySelection(false);
                        itemContainer.selected = true;
                        return WinJS.Promise.timeout();
                    }).then(function () {
                        // Simulate UIA SelectionItem.Select with blocked selection
                        itemContainer.addEventListener("selectionchanging", blockSelection, false);
                        itemContainer.element.setAttribute("aria-selected", "false");
                        return WinJS.Promise.timeout();
                    }).then(function () {
                        verifySelection(true);
                        itemContainer.removeEventListener("selectionchanging", blockSelection, false);
                        itemContainer.selected = false;
                        return WinJS.Promise.timeout();
                    }).then(function () {
                        // Simulate UIA SelectionItem.Select on item with selectionDisabled = true
                        itemContainer.selectionDisabled = true;
                        itemContainer.element.setAttribute("aria-selected", "true");
                        return WinJS.Promise.timeout();
                    }).then(function () {
                        verifySelection(false);
                    });
            }

            test().done(complete);
        }
    };
}
LiveUnit.registerTestClass("WinJSTests.ItemContainerTests");
