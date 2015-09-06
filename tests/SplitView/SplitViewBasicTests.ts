// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="SplitViewUtilities.ts" />
// <reference path="SplitViewStyles.less.css" />
/// <deploy src="../TestData/" />

/// <reference path="../../typings/winjs/winjs.d.ts" />

module SplitViewTests {
    "use strict";

    // Horizontal (placement left/right)
    var defaultHiddenPaneWidth = 48;
    var defaultShownPaneWidth = 320;
    // Vertical (placement top/bottom)
    var defaultHiddenPaneHeight = 24;
    var defaultShownPaneHeight = 60;

    var defaultOptions: ISplitViewOptions = {
        panePlacement: SplitView.PanePlacement.left,
        closedDisplayMode: SplitView.OpenedDisplayMode.inline,
        openedDisplayMode: SplitView.OpenedDisplayMode.overlay,
        paneOpened: false
    };
    var defaultLayoutConfig = WinJS.Utilities._merge(defaultOptions, {
        //rootWidth: ,
        //rootHeight: ,
        hiddenPaneWidth: defaultHiddenPaneWidth,
        hiddenPaneHeight: defaultHiddenPaneHeight,
        shownPaneWidth: defaultShownPaneWidth,
        shownPaneHeight: defaultShownPaneHeight,
        rtl: false
    });

    var testRoot: HTMLElement;
    var Utils = SplitViewTests.Utilities;
    var createSplitView: (options?: any) => WinJS.UI.PrivateSplitView;

    interface IRect {
        left: number;
        top: number;
        width: number;
        height: number;
    }

    function measureMarginBox(element: HTMLElement, relativeTo: HTMLElement): IRect {
        var style = getComputedStyle(element);
        var position = WinJS.Utilities._getPositionRelativeTo(element, relativeTo);
        var marginLeft = parseInt(style.marginLeft, 10);
        var marginTop = parseInt(style.marginTop, 10);
        return {
            left: position.left - marginLeft,
            top: position.top - marginTop,
            width: WinJS.Utilities.getContentWidth(element),
            height: WinJS.Utilities.getContentHeight(element),
        };
    }

    function assertAreRectsEqual(expectedRect: IRect, actualRect: IRect, context: string): void {
        LiveUnit.Assert.areEqual(expectedRect.left, actualRect.left, context + ": incorrect left");
        LiveUnit.Assert.areEqual(expectedRect.top, actualRect.top, context + ": incorrect top");
        LiveUnit.Assert.areEqual(expectedRect.width, actualRect.width, context + ": incorrect width");
        LiveUnit.Assert.areEqual(expectedRect.height, actualRect.height, context + ": incorrect height");
    }
    
    function verifyTabIndicesWithoutCarousel(splitView: WinJS.UI.PrivateSplitView) {
        var startPaneTab = splitView._dom.startPaneTab;
        var endPaneTab = splitView._dom.endPaneTab;
        
        LiveUnit.Assert.isFalse(startPaneTab.hasAttribute("x-ms-aria-flowfrom"), "startPaneTab shouldn't have x-ms-aria-flowfrom");
        LiveUnit.Assert.areEqual(-1, startPaneTab.tabIndex, "startPaneTab should have tabIndex -1");
        LiveUnit.Assert.isFalse(endPaneTab.hasAttribute("aria-flowfrom"), "endPaneTab shouldn't have aria-flowto");
        LiveUnit.Assert.areEqual(-1, endPaneTab.tabIndex, "endPaneTab should have tabIndex -1");
    }
    
    function verifyTabIndicesWithCarousel(splitView: WinJS.UI.PrivateSplitView, lowestTabIndex: number, highestTabIndex: number) {
        var startPaneTab = splitView._dom.startPaneTab;
        var endPaneTab = splitView._dom.endPaneTab;
        
        LiveUnit.Assert.areEqual(endPaneTab.id, startPaneTab.getAttribute("x-ms-aria-flowfrom"),
            "startPaneTab has wrong value for x-ms-aria-flowfrom");
        LiveUnit.Assert.areEqual(lowestTabIndex, startPaneTab.tabIndex,
            "startPaneTab doesn't match content's lowest tab index");
            
        LiveUnit.Assert.areEqual(startPaneTab.id, endPaneTab.getAttribute("aria-flowto"),
            "endPaneTab has wrong value for aria-flowto");
        LiveUnit.Assert.areEqual(highestTabIndex, splitView._dom.endPaneTab.tabIndex,
            "endPaneTab doesn't match content's highest tab index");
    }

    interface ILayoutConfig {
        rootWidth: number;
        rootHeight: number;
        hiddenPaneWidth: number;
        shownPaneWidth: number;
        hiddenPaneHeight: number;
        shownPaneHeight: number;
        panePlacement: string;
        closedDisplayMode: string;
        openedDisplayMode: string;
        paneOpened: boolean;
        rtl: boolean;
    }

    function expectedPaneRect(config: ILayoutConfig): IRect {
        if (!config.paneOpened && config.closedDisplayMode === "none") {
            return {
                left: 0,
                top: 0,
                width: 0,
                height: 0
            };
        }

        var placementLeft = config.rtl ? SplitView.PanePlacement.right : SplitView.PanePlacement.left;
        var placementRight = config.rtl ? SplitView.PanePlacement.left : SplitView.PanePlacement.right;

        var paneWidth = config.paneOpened ? config.shownPaneWidth : config.hiddenPaneWidth;
        var paneHeight = config.paneOpened ? config.shownPaneHeight : config.hiddenPaneHeight;

        var horizontal = config.panePlacement === placementLeft || config.panePlacement === placementRight;
        var size = horizontal ? {
            width: paneWidth,
            height: config.rootHeight
        } : {
            width: config.rootWidth,
            height: paneHeight
        };

        var pos: { left: number; top: number; }
        switch (config.panePlacement) {
            case placementLeft:
            case SplitView.PanePlacement.top:
                pos = { left: 0, top: 0 };
                break;
            case placementRight:
                pos = {
                    left: config.rootWidth - paneWidth,
                    top: 0
                };
                break;
            case SplitView.PanePlacement.bottom:
                pos = {
                    left: 0,
                    top: config.rootHeight - paneHeight
                };
                break;
        }

        return {
            left: pos.left,
            top: pos.top,
            width: size.width,
            height: size.height
        };
    }

    function expectedContentRect(config: ILayoutConfig): IRect {
        var placementLeft = config.rtl ? SplitView.PanePlacement.right : SplitView.PanePlacement.left;
        var placementRight = config.rtl ? SplitView.PanePlacement.left : SplitView.PanePlacement.right;

        var paneWidth: number;
        var paneHeight: number;
        if (!config.paneOpened || config.openedDisplayMode === SplitView.OpenedDisplayMode.overlay) {
            if (config.closedDisplayMode === "none") {
                paneWidth = 0;
                paneHeight = 0;
            } else {
                paneWidth = config.hiddenPaneWidth;
                paneHeight = config.hiddenPaneHeight;
            }
        } else {
            paneWidth = config.shownPaneWidth;
            paneHeight = config.shownPaneHeight;
        }

        var horizontal = config.panePlacement === placementLeft || config.panePlacement === placementRight;
        var size = horizontal ? {
            width: config.rootWidth - paneWidth,
            height: config.rootHeight
        } : {
            width: config.rootWidth,
            height: config.rootHeight - paneHeight
        };

        var pos: { left: number; top: number; }
        switch (config.panePlacement) {
            case placementLeft:
                pos = { left: paneWidth, top: 0 };
                break;
            case SplitView.PanePlacement.top:
                pos = { left: 0, top: paneHeight };
                break;
            case placementRight:
            case SplitView.PanePlacement.bottom:
                pos = { left: 0, top: 0 };
                break;
        }

        return {
            left: pos.left,
            top: pos.top,
            width: size.width,
            height: size.height
        };
    }

    function assertContentLayoutCorrect(splitView: WinJS.UI.PrivateSplitView, config: ILayoutConfig): void {
        var contentRect = measureMarginBox(splitView.contentElement, splitView.element);
        assertAreRectsEqual(expectedContentRect(config), contentRect, "Content rect");
    }
    function assertLayoutCorrect(splitView: WinJS.UI.PrivateSplitView, config: ILayoutConfig): void {
        var paneRect = measureMarginBox(splitView.paneElement, splitView.element);
        assertAreRectsEqual(expectedPaneRect(config), paneRect, "Pane rect");
        assertContentLayoutCorrect(splitView, config);
    }

    interface ITestLayoutArgs {
         rootHeight: number;
         rootWidth: number;
         hiddenPaneWidth: number;
         hiddenPaneHeight: number;
         shownPaneWidth: number;
         shownPaneHeight: number;
         verify?: (splitView: WinJS.UI.PrivateSplitView, config: ILayoutConfig) => void;
    }
    function testLayout(args: ITestLayoutArgs, splitViewOptions?: any) {
        args.verify = args.verify || assertLayoutCorrect;
        testRoot.style.height = args.rootHeight + "px";
        testRoot.style.width = args.rootWidth + "px";

        [true, false].forEach((rtl) => { // rtl
            if (rtl) {
                document.documentElement.setAttribute("lang", "ar");
            } else {
                document.documentElement.removeAttribute("lang");
            }
            var splitView = Utils.useSynchronousAnimations(createSplitView(splitViewOptions));

            ["left", "right", "top", "bottom"].forEach((panePlacement) => { // panePlacement
                ["none", "inline"].forEach((closedDisplayMode) => { // closedDisplayMode
                    ["inline", "overlay"].forEach((openedDisplayMode) => { // openedDisplayMode
                        [true, false].forEach((paneOpened) => { // paneOpened
                            splitView.panePlacement = panePlacement;
                            splitView.closedDisplayMode = closedDisplayMode;
                            splitView.openedDisplayMode = openedDisplayMode;
                            splitView.paneOpened = paneOpened;

                            var config = {
                                panePlacement: panePlacement,
                                closedDisplayMode: closedDisplayMode,
                                openedDisplayMode: openedDisplayMode,
                                paneOpened: paneOpened,
                                rootWidth: args.rootWidth,
                                rootHeight: args.rootHeight,
                                hiddenPaneWidth: args.hiddenPaneWidth,
                                hiddenPaneHeight: args.hiddenPaneHeight,
                                shownPaneWidth: args.shownPaneWidth,
                                shownPaneHeight: args.shownPaneHeight,
                                rtl: rtl
                            };

                            args.verify(splitView, config);
                        });
                    });
                });
            });

            Helper.removeElement(splitView.element);
            splitView.dispose();
        });
    }

    function assertHasClass(element: HTMLElement, className: string, msg: string): void {
        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(element, className), msg);
    }

    function assertProperties(splitView: WinJS.UI.PrivateSplitView, providedOptions) {
        providedOptions = providedOptions || {};
        var validPropreties = Object.keys(defaultOptions);
        Helper.Assert.areKeysValid(providedOptions, validPropreties);
        var options: ISplitViewOptions = WinJS.Utilities._merge(defaultOptions, providedOptions);

        LiveUnit.Assert.areEqual(options.paneOpened, splitView.paneOpened, "splitView.paneOpened incorrect");
        LiveUnit.Assert.areEqual(options.panePlacement, splitView.panePlacement, "splitView.panePlacement incorrect");
        LiveUnit.Assert.areEqual(options.closedDisplayMode, splitView.closedDisplayMode, "splitView.closedDisplayMode incorrect");
        LiveUnit.Assert.areEqual(options.openedDisplayMode, splitView.openedDisplayMode, "splitView.openedDisplayMode incorrect");
    }

    // Taking the registration mechanism as a parameter allows us to use this code to test both
    // DOM level 0 (e.g. onbeforeopen) and DOM level 2 (e.g. addEventListener) events.
    function testEvents(registerForEvent: (splitView: WinJS.UI.PrivateSplitView, eventName: string, handler: Function) => void) {
        var splitView = Utils.useSynchronousAnimations(createSplitView());

        var counter = 0;
        registerForEvent(splitView, "beforeopen", () => {
            LiveUnit.Assert.areEqual(1, counter, "beforeopen fired out of order");
            counter++;
            LiveUnit.Assert.isFalse(splitView.paneOpened, "beforeopen: SplitView should be in hidden state");
        });
        registerForEvent(splitView, "afteropen", () => {
            LiveUnit.Assert.areEqual(2, counter, "afteropen fired out of order");
            counter++;
            LiveUnit.Assert.isTrue(splitView.paneOpened, "afteropen: SplitView should not be in hidden state");
        });
        registerForEvent(splitView, "beforeclose", () => {
            LiveUnit.Assert.areEqual(4, counter, "beforeclose fired out of order");
            counter++;
            LiveUnit.Assert.isTrue(splitView.paneOpened, "beforeclose: SplitView should not be in hidden state");
        });
        registerForEvent(splitView, "afterclose", () => {
            LiveUnit.Assert.areEqual(5, counter, "afterclose fired out of order");
            counter++;
            LiveUnit.Assert.isFalse(splitView.paneOpened, "afterclose: SplitView should be in hidden state");
        });

        LiveUnit.Assert.areEqual(0, counter, "before openPane: wrong number of events fired");
        counter++;
        LiveUnit.Assert.isFalse(splitView.paneOpened, "before openPane: SplitView should be in hidden state");

        splitView.openPane();
        LiveUnit.Assert.areEqual(3, counter, "after openPane: wrong number of events fired");
        counter++;
        LiveUnit.Assert.isTrue(splitView.paneOpened, "after openPane: SplitView should not be in hidden state");

        splitView.closePane();
        LiveUnit.Assert.areEqual(6, counter, "after closePane: wrong number of events fired");
        LiveUnit.Assert.isFalse(splitView.paneOpened, "after closePane: SplitView should be in hidden state");
    }
    
    function testTabIndices(args: {
        openedDisplayMode: string;
        verifyTabIndicesWhenOpened: (splitView: WinJS.UI.PrivateSplitView, lowestTabIndex: number, highestTabIndex: number) => void;
        verifyTabIndicesWhenClosed: (splitView: WinJS.UI.PrivateSplitView, lowestTabIndex: number, highestTabIndex: number) => void;
    }) {
        var openedDisplayMode = args.openedDisplayMode;
        var verifyTabIndicesWhenOpened = args.verifyTabIndicesWhenOpened;
        var verifyTabIndicesWhenClosed = args.verifyTabIndicesWhenClosed;
        
        var paneHTML =
            '<div tabIndex="4">4</div>' +
            '<div tabIndex="5">5</div>' +
            '<div class="aParent">' +
                '<div tabIndex="7">7</div>' +
                '<div tabIndex="8">8</div>' + // highest
                '<div tabIndex="6">6</div>' +
            '</div>' +
            '<div tabIndex="2">2</div>' + // lowest
            '<div tabIndex="3">3</div>';
        var contentHTML =
            '<div tabIndex="0">0</div>' +
            '<div tabIndex="10">10</div>';
        var lowestTabIndex = 2;
        var highestTabIndex = 8;

        var splitView = Utils.useSynchronousAnimations(createSplitView({
            paneHTML: paneHTML,
            contentHTML: contentHTML,
            openedDisplayMode: openedDisplayMode
        }));
        
        verifyTabIndicesWhenClosed(splitView, lowestTabIndex, highestTabIndex);
        splitView.openPane();
        verifyTabIndicesWhenOpened(splitView, lowestTabIndex, highestTabIndex);

        // Test that SplitView updates its tab indices after the user presses
        // the tab key
        //
        lowestTabIndex = 1;
        highestTabIndex = 9;
        var newLowest = document.createElement("div");
        newLowest.tabIndex = lowestTabIndex;
        var newHighest = document.createElement("div");
        newHighest.tabIndex = highestTabIndex;
        splitView._dom.pane.appendChild(newHighest);
        splitView.element.querySelector(".aParent").appendChild(newLowest);

        // Tab key should cause the SplitView to update its tab indices
        Helper.keydown(splitView._dom.pane, WinJS.Utilities.Key.tab);

        verifyTabIndicesWhenOpened(splitView, lowestTabIndex, highestTabIndex);
        splitView.closePane();
        verifyTabIndicesWhenClosed(splitView, lowestTabIndex, highestTabIndex);
        
        Helper.validateUnhandledErrors();
    }

    export class BasicTests {
        setUp() {
            testRoot = document.createElement("div");
            // Give it an id so that we can use it in styles to make sure our styles win over the defaults.
            // We encourage apps to do the same.
            testRoot.id = "test-root";
            createSplitView = Utils.makeCreateSplitView(testRoot);
            document.body.appendChild(testRoot);
        }

        tearDown() {
            WinJS.Utilities.disposeSubTree(testRoot);
            Helper.removeElement(testRoot);
            document.documentElement.removeAttribute("lang");
        }

        testDomLevel0Events() {
            testEvents((splitView: WinJS.UI.PrivateSplitView, eventName: string, handler: Function) => {
                splitView["on" + eventName] = handler;
            });
        }

        testDomLevel2Events() {
            testEvents((splitView: WinJS.UI.PrivateSplitView, eventName: string, handler: Function) => {
                splitView.addEventListener(eventName, handler);
            });
        }

        testBeforeOpenIsCancelable() {
            var splitView = Utils.useSynchronousAnimations(createSplitView());

            splitView.onbeforeopen = function (eventObject) {
                eventObject.preventDefault();
            };
            splitView.onafteropen = function (eventObject) {
                LiveUnit.Assert.fail("afteropen shouldn't have fired due to beforeopen being canceled");
            };
            splitView.onbeforeclose = function (eventObject) {
                LiveUnit.Assert.fail("beforeclose shouldn't have fired due to beforeopen being canceled");
            };
            splitView.onafterclose = function (eventObject) {
                LiveUnit.Assert.fail("afterclose shouldn't have fired due to beforeopen being canceled");
            };

            splitView.openPane();
            LiveUnit.Assert.isFalse(splitView.paneOpened, "SplitView should still be hidden");
        }

        testBeforeCloseIsCancelable() {
            var splitView = Utils.useSynchronousAnimations(createSplitView());

            splitView.openPane();
            splitView.onbeforeclose = function (eventObject) {
                eventObject.preventDefault();
            };
            splitView.onafterclose = function (eventObject) {
                LiveUnit.Assert.fail("Hide should have been canceled");
            };
            splitView.closePane();
            LiveUnit.Assert.isTrue(splitView.paneOpened, "SplitView should still be shown");
        }

        testDispose() {
            function failEventHandler(eventName) {
                return function () {
                    LiveUnit.Assert.fail(eventName + ": shouldn't have run due to control being disposed");
                };
            }

            var splitView = Utils.useSynchronousAnimations(createSplitView());
            splitView.openPane();

            splitView.onbeforeopen = failEventHandler("beforeopen");
            splitView.onbeforeclose = failEventHandler("beforeclose");
            splitView.onafteropen = failEventHandler("afteropen");
            splitView.onafterclose = failEventHandler("afterclose");

            splitView.dispose();
            LiveUnit.Assert.isTrue(splitView._disposed, "SplitView didn't mark itself as disposed");
            LiveUnit.Assert.areEqual("Disposed", splitView._machine._state.name, "SplitView didn't move into the disposed state");

            splitView.openPane();
            splitView.closePane();
            splitView.dispose();
        }

        testDefaultLayout() {
            testLayout({
                rootHeight: 500,
                rootWidth: 1000,
                hiddenPaneWidth: defaultHiddenPaneWidth,
                hiddenPaneHeight: defaultHiddenPaneHeight,
                shownPaneWidth: defaultShownPaneWidth,
                shownPaneHeight: defaultShownPaneHeight
            });
        }

        // Make sure SplitView lays out correctly if the developer uses custom pane dimensions
        testCustomLayoutFixedSizes() {
            WinJS.Utilities.addClass(testRoot, "file-splitviewstyles-less");
            WinJS.Utilities.addClass(testRoot, "custom-sizes-fixed");
            testLayout({
                rootHeight: 500,
                rootWidth: 1000,
                hiddenPaneWidth: 321,
                hiddenPaneHeight: 123,
                shownPaneWidth: 409,
                shownPaneHeight: 242
            });
        }

        // Make sure SplitView lays out correctly if the developer configures the pane to size to its content
        testCustomLayoutAutoSizes() {
            WinJS.Utilities.addClass(testRoot, "file-splitviewstyles-less");
            WinJS.Utilities.addClass(testRoot, "custom-sizes-auto");
            testLayout({
                rootHeight: 500,
                rootWidth: 1000,
                hiddenPaneWidth: 223,
                hiddenPaneHeight: 343,
                shownPaneWidth: 303,
                shownPaneHeight: 444
            }, {
                paneHTML: '<div class="pane-sizer"></div>'
            });
        }

        // Verifies that a percentage sized element (e.g. width/height: 100%) is given the appropriate
        // size when placed within the SplitView's content element.
        // https://github.com/winjs/winjs/issues/801
        testPercentageSizingInContentArea() {
            testLayout({
                rootHeight: 500,
                rootWidth: 1000,
                hiddenPaneWidth: defaultHiddenPaneWidth,
                hiddenPaneHeight: defaultHiddenPaneHeight,
                shownPaneWidth: defaultShownPaneWidth,
                shownPaneHeight: defaultShownPaneHeight,
                verify: function (splitView, config) {
                    var percentageSizedEl = <HTMLElement>splitView.contentElement.querySelector(".percentage-sized");
                    var percentageSizedRect = measureMarginBox(percentageSizedEl, splitView.element);
                    var contentRect = measureMarginBox(splitView.contentElement, splitView.element);
                    assertAreRectsEqual(contentRect, percentageSizedRect,
                        "Element with width:100% and height:100% should be the same size as the SplitView's content element");
                }
            }, {
                contentHTML: '<div class="percentage-sized" style="width:100%; height:100%; background-color:orange; opacity:0.5;"></div>'
            });
        }

        // Verify that if we don't pass an element to the SplitView's constructor, it creates
        // one for us and initializes its DOM structure correctly.
        testInitializationWithoutElement() {
            var options = null;
            var splitView = Utils.useSynchronousAnimations(new SplitView());

            assertHasClass(splitView.element, SplitView._ClassNames.splitView, "splitView.element is missing class");
            assertHasClass(splitView.paneElement, SplitView._ClassNames.pane, "splitView.paneElement is missing class");
            assertHasClass(splitView.contentElement, SplitView._ClassNames.content, "splitView.contentElement is missing class");
            assertProperties(splitView, options);
        }

        // Verify that if we pass an element containing markup to the SplitView's constructor, it correctly
        // initializes its DOM and correctly reparents our markup into the pane and content elements.
        testInitializationWithElement() {
            function assertContainsElementWithClass(element: HTMLElement, className: string, msg: string): void {
                LiveUnit.Assert.isNotNull(element.querySelector("." + className), msg);
            }

            var options = null;
            var splitView = Utils.useSynchronousAnimations(createSplitView({
                paneHTML: '<div class="pane-element1"></div><div class="pane-element2"></div>',
                contentHTML: '<div class="content-element1"></div><div class="content-element2"></div>'
            }));

            assertHasClass(splitView.element, SplitView._ClassNames.splitView, "splitView.element is missing class");
            assertHasClass(splitView.paneElement, SplitView._ClassNames.pane, "splitView.paneElement is missing class");
            assertContainsElementWithClass(splitView.paneElement, "pane-element1", "splitView.paneElement is missing a child");
            assertContainsElementWithClass(splitView.paneElement, "pane-element2", "splitView.paneElement is missing a child");
            assertHasClass(splitView.contentElement, SplitView._ClassNames.content, "splitView.contentElement is missing class");
            assertContainsElementWithClass(splitView.contentElement, "content-element1", "splitView.contentElement is missing a child");
            assertContainsElementWithClass(splitView.contentElement, "content-element2", "splitView.contentElement is missing a child");
            assertProperties(splitView, options);
        }

        testInitializingProperties() {
            var rootHeight = 500;
            var rootWidth = 1000;
            var optionsRecords = [
                undefined,
                { paneOpened: true },
                { panePlacement: "top" },
                { closedDisplayMode: "none" },
                { closedDisplayMode: "inline" },
                { openedDisplayMode: "overlay" },
                { openedDisplayMode: "overlay", paneOpened: true },
                { openedDisplayMode: "inline" },
                { openedDisplayMode: "inline", paneOpened: true },
                { panePlacement: "right", closedDisplayMode: "inline", openedDisplayMode: "inline", paneOpened: true },
                { panePlacement: "left", closedDisplayMode: "none", openedDisplayMode: "inline", paneOpened: false },
                { panePlacement: "bottom", openedDisplayMode: "overlay", paneOpened: true },
                { panePlacement: "bottom", openedDisplayMode: "overlay" }
            ];

            testRoot.style.height = rootHeight + "px";
            testRoot.style.width = rootWidth + "px";
            optionsRecords.forEach(function (options) {
                var element = document.createElement("div");
                testRoot.appendChild(element);
                var splitView = Utils.useSynchronousAnimations(new SplitView(element, options));

                assertProperties(splitView, options);
                assertLayoutCorrect(splitView, WinJS.Utilities._mergeAll([defaultLayoutConfig, options || {}, {
                    rootWidth: rootWidth,
                    rootHeight: rootHeight
                }]));

                splitView.dispose();
                Helper.removeElement(splitView.element);
            });
        }

        testChangingProperties() {
            var rootHeight = 500;
            var rootWidth = 1000;
            var options: any = {};
            var splitView = Utils.useSynchronousAnimations(createSplitView());

            function verify() {
                assertProperties(splitView, options);
                assertLayoutCorrect(splitView, WinJS.Utilities._mergeAll([defaultLayoutConfig, options || {}, {
                    rootWidth: rootWidth,
                    rootHeight: rootHeight
                }]));
            }

            testRoot.style.height = rootHeight + "px";
            testRoot.style.width = rootWidth + "px";

            ["left", "right", "top", "bottom"].forEach((panePlacement) => {
                 options.panePlacement = splitView.panePlacement = panePlacement;
                 verify();
            });

            ["none", "inline"].forEach((closedDisplayMode) => {
                 options.closedDisplayMode = splitView.closedDisplayMode = closedDisplayMode;
                 verify();
            });

            ["overlay", "inline"].forEach((openedDisplayMode) => {
                 options.openedDisplayMode = splitView.openedDisplayMode = openedDisplayMode;
                 verify();
            });

            [false, true].forEach((paneOpened) => {
                 options.paneOpened = splitView.paneOpened = paneOpened;
                 verify();
            });
        }

        testTogglingPane() {
            var rootHeight = 500;
            var rootWidth = 1000;
            var splitView = Utils.useSynchronousAnimations(createSplitView());

            function verify(args: { paneOpened: boolean }) {
                var config = WinJS.Utilities._mergeAll([
                    defaultLayoutConfig,
                    args, {
                        rootWidth: rootWidth,
                        rootHeight: rootHeight
                    }
                ]);
                assertProperties(splitView, args);
                assertLayoutCorrect(splitView, config);
            }

            testRoot.style.height = rootHeight + "px";
            testRoot.style.width = rootWidth + "px";

            // Pane should initially be hidden
            verify({ paneOpened: false });

            // After toggling pane, pane should be shown
            splitView.paneOpened = !splitView.paneOpened;
            verify({ paneOpened: true });

            // After toggling pane, pane should be hidden
            splitView.paneOpened = !splitView.paneOpened;
            verify({ paneOpened: false });
        }

        // Verifies that animations start and end in the correct locations
        testAnimations(complete) {
            var rootHeight = 500;
            var rootWidth = 1000;
            var allConfigs = Helper.pairwise({
                rtl: [true, false],
                panePlacement: ["left", "right", "top", "bottom"],
                closedDisplayMode: ["none", "inline"],
                openedDisplayMode: ["inline", "overlay"]
            });

            var testConfig = (index) => {
                if (index >= allConfigs.length) {
                    complete();
                } else {
                    var config = allConfigs[index];
                    var fullConfig = WinJS.Utilities._merge(config, {
                        rootHeight: rootHeight,
                        rootWidth: rootWidth,
                        hiddenPaneWidth: defaultHiddenPaneWidth,
                        hiddenPaneHeight: defaultHiddenPaneHeight,
                        shownPaneWidth: defaultShownPaneWidth,
                        shownPaneHeight: defaultShownPaneHeight,
                        paneOpened: true
                    });
                    var hooksRan = 0;

                    if (fullConfig.rtl) {
                        document.documentElement.setAttribute("lang", "ar");
                    } else {
                        document.documentElement.removeAttribute("lang");
                    }
                    var splitView = createSplitView({
                        panePlacement: config.panePlacement,
                        closedDisplayMode: config.closedDisplayMode,
                        openedDisplayMode: config.openedDisplayMode
                    });

                    var init = () => {
                        Utils.hookAfterPrepareAnimationOnce(splitView, () => {
                            hooksRan++;
                            fullConfig.paneOpened = false;
                            // It's tricky to verify the layout of the pane at the start of the hidden -> shown transition
                            // because the pane needs to be at its shown size during the animation but at the start it needs
                            // to look like it's in its hidden state (off screen)
                            // So we'll punt and just verify the layout of the content.
                            assertContentLayoutCorrect(splitView, fullConfig);
                        });
                        Utils.hookBeforeClearAnimationOnce(splitView, () => {
                            hooksRan++;
                            fullConfig.paneOpened = true;
                            assertLayoutCorrect(splitView, fullConfig);
                        });
                        splitView.openPane();
                    };

                    splitView.onafteropen = () => {
                        Utils.hookAfterPrepareAnimationOnce(splitView, () => {
                            hooksRan++;
                            fullConfig.paneOpened = true;
                            assertLayoutCorrect(splitView, fullConfig);
                        });
                        Utils.hookBeforeClearAnimationOnce(splitView, () => {
                            hooksRan++;
                            fullConfig.paneOpened = false;
                            // It's tricky to verify the layout of the pane at the end of the shown -> hidden transition
                            // because the pane needs to be at its shown size during the animation but at the end it needs
                            // to look like it's in its hidden state (off screen)
                            // So we'll punt and just verify the layout of the content.
                            assertContentLayoutCorrect(splitView, fullConfig);
                        });
                        splitView.closePane();
                    };

                    splitView.onafterclose = () => {
                        LiveUnit.Assert.areEqual(4, hooksRan, "Not all of the animations hooks ran");
                        splitView.dispose();
                        Helper.removeElement(splitView.element);
                        testConfig(index + 1);
                    };

                    init();
                }
            }

            testRoot.style.height = rootHeight + "px";
            testRoot.style.width = rootWidth + "px";
            testConfig(0);
        }
        
        testTabIndexOfZeroIsHighest() {
            var paneHTML =
                '<div tabIndex="4">4</div>' +
                '<div tabIndex="5">5</div>' +
                '<div class="aParent">' +
                    '<div tabIndex="7">7</div>' +
                    '<div tabIndex="8">8</div>' +
                    '<div tabIndex="0">0</div>' + // highest
                    '<div tabIndex="6">6</div>' +
                '</div>' +
                '<div tabIndex="2">2</div>' + // lowest
                '<div tabIndex="3">3</div>';
            var contentHTML =
                '<div tabIndex="0">0</div>' +
                '<div tabIndex="10">10</div>';
            var lowestTabIndex = 2;
            var highestTabIndex = 0;

            var splitView = Utils.useSynchronousAnimations(createSplitView({
                paneHTML: paneHTML,
                contentHTML: contentHTML,
                openedDisplayMode: WinJS.UI.SplitView.OpenedDisplayMode.overlay
            }));
            
            verifyTabIndicesWithoutCarousel(splitView);
            splitView.openPane();
            verifyTabIndicesWithCarousel(splitView, lowestTabIndex, highestTabIndex);
            splitView.closePane();
            verifyTabIndicesWithoutCarousel(splitView);
            Helper.validateUnhandledErrors();
        }
        
        testTabIndicesOpenedDisplayModeInline() {
            testTabIndices({
                openedDisplayMode: WinJS.UI.SplitView.OpenedDisplayMode.inline,
                verifyTabIndicesWhenOpened: (splitView, lowestTabIndex, highestTabIndex) => {
                    verifyTabIndicesWithoutCarousel(splitView);
                },
                verifyTabIndicesWhenClosed: (splitView, lowestTabIndex, highestTabIndex) => {
                    verifyTabIndicesWithoutCarousel(splitView);
                }
            });
        }
        
        testTabIndicesOpenedDisplayModeOverlay() {            
            testTabIndices({
                openedDisplayMode: WinJS.UI.SplitView.OpenedDisplayMode.overlay,
                verifyTabIndicesWhenOpened: (splitView, lowestTabIndex, highestTabIndex) => {
                    verifyTabIndicesWithCarousel(splitView, lowestTabIndex, highestTabIndex);
                },
                verifyTabIndicesWhenClosed: (splitView, lowestTabIndex, highestTabIndex) => {
                    verifyTabIndicesWithoutCarousel(splitView);
                },
            });
        }
    }
}
LiveUnit.registerTestClass("SplitViewTests.BasicTests");
