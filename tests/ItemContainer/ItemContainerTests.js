// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

var WinJSTests = WinJSTests || {};

WinJSTests.ItemContainerTests = function () {
    "use strict";

    var utilities = WinJS.Utilities;

    // This is the setup function that will be called at the beginning of each test function.
    this.setUp = function () {
        LiveUnit.LoggingCore.logComment("In setup");

        var newNode = document.createElement("div");
        newNode.id = "host";
        document.body.appendChild(newNode);
        this._element = newNode;

        this.oldHasWinRT = WinJS.Utilities.hasWinRT;
        this.oldRenderSelection = WinJS.UI._ItemEventsHandler.renderSelection;
        WinJS.Utilities._setHasWinRT(false);
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");

        if (this._element) {
            WinJS.Utilities.disposeSubTree(this._element);
            document.body.removeChild(this._element);
            this._element = null;
        }

        WinJS.Utilities._setHasWinRT(this.oldHasWinRT);
        WinJS.UI._ItemEventsHandler.renderSelection = this.oldRenderSelection;
    };

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

    function createEvent(element, key, shiftKey, ctrlKey) {
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

    this.testElementProperty = function (complete) {
        var element = document.getElementById("host");
        var control = new WinJS.UI.ItemContainer(element);
        LiveUnit.Assert.areEqual(WinJS.Utilities._uniqueID(element), WinJS.Utilities._uniqueID(control.element), "Invalid element returned by the control's element property");
        complete();
    };

    if (!utilities.isPhone) {
        this.testDraggableProperty = function (complete) {
            var element = document.getElementById("host");
            var control = new WinJS.UI.ItemContainer(element);
            LiveUnit.Assert.isFalse(control.draggable, "The control should not be draggable by default");
            LiveUnit.Assert.isNull(element.getAttribute("draggable"));

            control.draggable = true;

            var itemBox = element.querySelector(".win-itembox");
            LiveUnit.Assert.areEqual("true", itemBox.getAttribute("draggable"));

            complete();
        };
    }

    this.testSelectedProperty = function (complete) {
        var element = document.getElementById("host");
        var control = new WinJS.UI.ItemContainer(element);
        LiveUnit.Assert.isFalse(control.selected, "The control should not be selected by default");
        LiveUnit.Assert.isFalse(utilities.hasClass(element, WinJS.UI._selectedClass));

        control.selected = true;
        LiveUnit.Assert.isTrue(control.selected, "The control's selected property setter is not working");
        verifySelectionVisual(element, true);

        complete();
    };

    this.testSwipeOrientationProperty = function (complete) {
        var element = document.getElementById("host");
        var control = new WinJS.UI.ItemContainer(element);
        var itemBox = element.querySelector(".win-itembox");

        LiveUnit.Assert.areEqual(control.swipeOrientation, WinJS.UI.Orientation.vertical, "The default swipe orientation should be vertical");
        LiveUnit.Assert.isTrue(utilities.hasClass(element, WinJS.UI.ItemContainer._ClassName.vertical));
        LiveUnit.Assert.isFalse(utilities.hasClass(element, WinJS.UI.ItemContainer._ClassName.horizontal));

        if (getComputedStyle(itemBox).touchAction) {
            var crossSlideYIndex = getComputedStyle(itemBox).touchAction.toLowerCase().indexOf("cross-slide-y");
            var crossSlideXIndex = getComputedStyle(itemBox).touchAction.toLowerCase().indexOf("cross-slide-x");
            LiveUnit.Assert.isTrue(utilities.isPhone ? crossSlideYIndex === -1 : crossSlideYIndex > 0);
            LiveUnit.Assert.isTrue(crossSlideXIndex === -1);

            control.swipeOrientation = WinJS.UI.Orientation.horizontal;
            LiveUnit.Assert.isFalse(utilities.hasClass(element, WinJS.UI.ItemContainer._ClassName.vertical));
            LiveUnit.Assert.isTrue(utilities.hasClass(element, WinJS.UI.ItemContainer._ClassName.horizontal));

            crossSlideYIndex = getComputedStyle(itemBox).touchAction.toLowerCase().indexOf("cross-slide-y");
            crossSlideXIndex = getComputedStyle(itemBox).touchAction.toLowerCase().indexOf("cross-slide-x");
            LiveUnit.Assert.isTrue(utilities.isPhone ? crossSlideYIndex === -1 : crossSlideXIndex > 0);
            LiveUnit.Assert.isTrue(crossSlideYIndex === -1);
        }

        complete();
    };

    this.testSelectionDisabledProperty = function (complete) {
        var element = document.getElementById("host");

        var control = new WinJS.UI.ItemContainer(element);

        LiveUnit.Assert.isFalse(control.selectionDisabled, "The default selectionDisabled should be false");
        LiveUnit.Assert.areEqual(control._selectionMode, WinJS.UI.SelectionMode.single);
        control.selectionDisabled = true;
        LiveUnit.Assert.isTrue(control.selectionDisabled);
        LiveUnit.Assert.areEqual(control._selectionMode, WinJS.UI.SelectionMode.none);

        complete();
    };

    this.testTapBehaviorProperty = function (complete) {
        var element = document.getElementById("host");
        var control = new WinJS.UI.ItemContainer(element);

        LiveUnit.Assert.areEqual(WinJS.UI.TapBehavior.invokeOnly, control.tapBehavior, "The control's tabBehavior property should default to invokeOnly");

        complete();
    };

    this.testSwipeBehaviorProperty = function (complete) {
        var element = document.getElementById("host");
        var control = new WinJS.UI.ItemContainer(element);

        LiveUnit.Assert.areEqual(WinJS.UI.SwipeBehavior.select, control.swipeBehavior, "The control's swipeBehavior property should default to select");
        LiveUnit.Assert.isTrue(!utilities.isPhone === utilities.hasClass(element, WinJS.UI._swipeableClass));

        control.swipeBehavior = WinJS.UI.SwipeBehavior.none;
        LiveUnit.Assert.isFalse(utilities.hasClass(element, WinJS.UI._swipeableClass));

        complete();
    };

    this.testInvokedEvent = function (complete) {
        var element = document.getElementById("host");
        var control = new WinJS.UI.ItemContainer(element);
        var listener1Called = false;
        var listener2Called = false;
        control.addEventListener("invoked", function (ev) {
            listener1Called = true;
            LiveUnit.Assert.areEqual(WinJS.Utilities._uniqueID(element), WinJS.Utilities._uniqueID(ev.target));
        });
        control.oninvoked = function (ev) {
            listener2Called = true;
            LiveUnit.Assert.areEqual(WinJS.Utilities._uniqueID(element), WinJS.Utilities._uniqueID(ev.target));
        };

        click(control, { target: element });

        LiveUnit.Assert.isTrue(listener1Called);
        LiveUnit.Assert.isTrue(listener2Called);

        complete();
    };

    this.testInvokedEventWithTabBehaviorNone = function (complete) {
        var element = document.getElementById("host");
        var control = new WinJS.UI.ItemContainer(element);
        control.tapBehavior = 'none';
        
        control.addEventListener("invoked", function (ev) {
            LiveUnit.Assert.fail("invoked event should not be called when tabBehavior is none");
        });

        click(control, { target: element });

        WinJS.Utilities._setImmediate(complete);
    };

    this.testSelectionChangingEventCalled = function (complete) {
        var invoked = false;
        var element = document.getElementById("host");

        function selectionChanging(ev) {
            invoked = true;
            LiveUnit.Assert.areEqual(WinJS.Utilities._uniqueID(element), WinJS.Utilities._uniqueID(ev.target));
        }

        var control = new WinJS.UI.ItemContainer(element, { onselectionchanging: selectionChanging });

        LiveUnit.Assert.isFalse(invoked);

        rightClick(control, { target: element });

        LiveUnit.Assert.isTrue(invoked, "Selectionchanging event should have been called");

        complete();
    };

    this.testSelectionChangingEventPrevented = function (complete) {
        var element = document.getElementById("host");

        function selectionChanging(ev) {
            ev.preventDefault();
        }

        var control = new WinJS.UI.ItemContainer(element, { onselectionchanging: selectionChanging });
        control.onselectionchanged = function () {
            LiveUnit.Assert.fail("Selectionchanged should not be called because it was prevented on selectionchanging");
        };
        rightClick(control, { target: element });

        complete();
    };

    this.testSelectionChangedEventCalled = function (complete) {
        var invoked = false;
        var element = document.getElementById("host");

        function selectionChanged(ev) {
            invoked = true;
            LiveUnit.Assert.areEqual(WinJS.Utilities._uniqueID(element), WinJS.Utilities._uniqueID(ev.target));
        }

        var control = new WinJS.UI.ItemContainer(element, { onselectionchanged: selectionChanged });

        LiveUnit.Assert.isFalse(invoked);

        rightClick(control, { target: element });

        LiveUnit.Assert.isTrue(invoked, "Selectionchanged event should have been called");

        complete();
    };

    this.testKeyboardFocusBlur = function (complete) {
        var element = document.getElementById("host");

        var control = new WinJS.UI.ItemContainer(element);
        WinJS.UI._keyboardSeenLast = false;

        LiveUnit.Assert.areEqual(0, element.querySelectorAll("." + WinJS.UI._itemFocusOutlineClass).length);
        control._onFocusIn({ target: element });
        LiveUnit.Assert.areEqual(0, element.querySelectorAll("." + WinJS.UI._itemFocusOutlineClass).length);
        WinJS.UI._keyboardSeenLast = true;
        control._onFocusIn({ target: element });
        LiveUnit.Assert.areEqual(1, element.querySelectorAll("." + WinJS.UI._itemFocusOutlineClass).length);
        WinJS.UI._keyboardSeenLast = null;
        control._onFocusOut({ target: element });
        LiveUnit.Assert.areEqual(0, element.querySelectorAll("." + WinJS.UI._itemFocusOutlineClass).length);

        complete();
    };

    this.testTabIndex = function (complete) {
        var element = document.getElementById("host");
        var control = new WinJS.UI.ItemContainer(element);
        LiveUnit.Assert.areEqual("0", element.getAttribute("tabindex"), "The control should set tabindex to 0 if a tabindex was not provided");

        var element2 = document.createElement("div");
        document.body.appendChild(element2);
        element2.setAttribute("tabindex", "3");
        var control2 = new WinJS.UI.ItemContainer(element2);
        LiveUnit.Assert.areEqual("3", element2.getAttribute("tabindex"), "The control should not set tabindex if one was provided");
        element2.parentNode.removeChild(element2);

        complete();
    };

    this.testItemEventsHandlerIntegration = function (complete) {
        var element = document.getElementById("host");
        var control = new WinJS.UI.ItemContainer(element);
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

    this.testDispose = function (complete) {
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
        var control = new WinJS.UI.ItemContainer(element);
        LiveUnit.Assert.isFalse(!!control._disposed);
        LiveUnit.Assert.isFalse(childDisposed);
        control.dispose();
        LiveUnit.Assert.isTrue(control._disposed);
        LiveUnit.Assert.isTrue(childDisposed);

        complete();
    };

    this.testForceLayout = function (complete) {
        var element = document.getElementById("host");
        var control = new WinJS.UI.ItemContainer(element);
        LiveUnit.Assert.isFalse(utilities.hasClass(element, "win-rtl"));
        element.style.direction = "rtl";
        control.forceLayout();
        LiveUnit.Assert.isTrue(utilities.hasClass(element, "win-rtl"));
        complete();
    };

    this.testSetupInternalTree = function (complete) {
        var element = document.getElementById("host");
        var child1 = document.createElement("div");
        child1.className = "child1";
        var child2 = document.createElement("div2");
        child2.className = "child2";
        element.appendChild(child1);
        element.appendChild(child2);

        var control = new WinJS.UI.ItemContainer(element);
        LiveUnit.Assert.isTrue(element, WinJS.UI.ItemContainer._ClassName.itemContainer);
        LiveUnit.Assert.isTrue(utilities.hasClass(element, WinJS.UI._containerClass));

        // The main element should now have two children (the itembox + the captureProxy)
        LiveUnit.Assert.areEqual(2, element.children.length);
        var itemBox = element.children[0];
        LiveUnit.Assert.isTrue(utilities.hasClass(itemBox, WinJS.UI._itemBoxClass));

        LiveUnit.Assert.areEqual(1, itemBox.children.length);
        var itemElement = itemBox.children[0];
        LiveUnit.Assert.isTrue(itemElement, WinJS.UI._itemClass);

        LiveUnit.Assert.areEqual(2, itemElement.children.length);
        LiveUnit.Assert.isTrue(utilities.hasClass(itemElement.children[0], "child1"));
        LiveUnit.Assert.isTrue(utilities.hasClass(itemElement.children[1], "child2"));

        complete();
    };

    this.testSpaceBarSelection = function (complete) {
        var element = document.getElementById("host");
        element.textContent = "my item";
        var control = new WinJS.UI.ItemContainer(element);
        LiveUnit.Assert.isFalse(control.selected);
        control._onKeyDown(createEvent(element, utilities.Key.space));
        LiveUnit.Assert.isTrue(control.selected);
        control._onKeyDown(createEvent(element, utilities.Key.space));
        LiveUnit.Assert.isFalse(control.selected)

        complete();
    };

    this.testToggleSelect = function (complete) {
        var element = document.getElementById("host");
        element.textContent = "my item";
        var control = new WinJS.UI.ItemContainer(element);
        control.tapBehavior = WinJS.UI.TapBehavior.toggleSelect;

        LiveUnit.Assert.isFalse(control.selected);
        click(control, { target: element });
        verifySelectionVisual(element, true);

        LiveUnit.Assert.isTrue(control.selected);
        click(control, { target: element });
        verifySelectionVisual(element, false);

        complete();
    };

    this.testSetAriaRole = function (complete) {
        var control1 = new WinJS.UI.ItemContainer(document.getElementById("host"));
        LiveUnit.Assert.areEqual(control1.element.getAttribute("role"), "option", "By default selection/tap is enabled, so the default role should be option");

        var element2 = document.createElement("div");
        document.body.appendChild(element2);
        var control2 = new WinJS.UI.ItemContainer(element2, {
            tapBehavior: WinJS.UI.TapBehavior.none
        });
        LiveUnit.Assert.areEqual(control2.element.getAttribute("role"), "option", "By default selection is enabled, so the default role should be option");
        element2.parentNode.removeChild(element2);

        var element3 = document.createElement("div");
        document.body.appendChild(element3);
        var control3 = new WinJS.UI.ItemContainer(element3, {
            selectionDisabled: true
        });
        LiveUnit.Assert.areEqual(control3.element.getAttribute("role"), "option", "By default tap is enabled, so the default role should be option");
        element3.parentNode.removeChild(element3);

        var element4 = document.createElement("div");
        document.body.appendChild(element4);
        var control4 = new WinJS.UI.ItemContainer(element4, {
            selectionDisabled: true,
            tapBehavior: WinJS.UI.TapBehavior.none
        });
        LiveUnit.Assert.areEqual(control4.element.getAttribute("role"), "listitem", "Selection and Tap are disabled, the default role should be listitem");
        element4.parentNode.removeChild(element4);


        var elementWithRole = document.createElement("div");
        elementWithRole.setAttribute("role", "listbox");
        document.body.appendChild(elementWithRole);
        var control5 = new WinJS.UI.ItemContainer(elementWithRole);
        LiveUnit.Assert.areEqual(control5.element.getAttribute("role"), "listbox", "A role was already specified. The control should not change it");
        elementWithRole.parentNode.removeChild(elementWithRole);

        var element6 = document.createElement("div");
        document.body.appendChild(element6);
        var control6 = new WinJS.UI.ItemContainer(element6);
        LiveUnit.Assert.areEqual(control6.element.getAttribute("role"), "option", "By default selection/tap is enabled, so the default role should be option");
        control6.tapBehavior = WinJS.UI.TapBehavior.none;
        LiveUnit.Assert.areEqual(control6.element.getAttribute("role"), "option", "By default selection is enabled, so the default role should be option");
        control6.selectionDisabled = true;
        LiveUnit.Assert.areEqual(control6.element.getAttribute("role"), "listitem", "Selection is disabled and TapBehavior is none, the default role should be listitem");
        element6.parentNode.removeChild(element6);

        complete();
    };

    this.testUIASelect = function (complete) {
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
            var itemContainer = new WinJS.UI.ItemContainer(document.getElementById("host"));

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
    };
};

LiveUnit.registerTestClass("WinJSTests.ItemContainerTests");
