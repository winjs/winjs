// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
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
        hiddenDisplayMode: SplitView.ShownDisplayMode.inline,
        shownDisplayMode: SplitView.ShownDisplayMode.overlay,
        paneHidden: true
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

    interface ILayoutConfig {
        rootWidth: number;
        rootHeight: number;
        hiddenPaneWidth: number;
        shownPaneWidth: number;
        hiddenPaneHeight: number;
        shownPaneHeight: number;
        panePlacement: string;
        hiddenDisplayMode: string;
        shownDisplayMode: string;
        paneHidden: boolean;
        rtl: boolean;
    }

    function expectedPaneRect(config: ILayoutConfig): IRect {
        if (config.paneHidden && config.hiddenDisplayMode === "none") {
            return {
                left: 0,
                top: 0,
                width: 0,
                height: 0
            };
        }
        
        var placementLeft = config.rtl ? SplitView.PanePlacement.right : SplitView.PanePlacement.left;
        var placementRight = config.rtl ? SplitView.PanePlacement.left : SplitView.PanePlacement.right;

        var paneWidth = config.paneHidden ? config.hiddenPaneWidth : config.shownPaneWidth;
        var paneHeight = config.paneHidden ? config.hiddenPaneHeight : config.shownPaneHeight;

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
        if (config.paneHidden || config.shownDisplayMode === SplitView.ShownDisplayMode.overlay) {
            if (config.hiddenDisplayMode === "none") {
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

    function testLayout(args: { rootHeight: number; rootWidth: number; hiddenPaneWidth: number; hiddenPaneHeight: number; shownPaneWidth: number; shownPaneHeight: number }, splitViewOptions?: any) {
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
                ["none", "inline"].forEach((hiddenDisplayMode) => { // hiddenDisplayMode
                    ["inline", "overlay"].forEach((shownDisplayMode) => { // shownDisplayMode
                        [true, false].forEach((paneHidden) => { // paneHidden
                            splitView.panePlacement = panePlacement;
                            splitView.hiddenDisplayMode = hiddenDisplayMode;
                            splitView.shownDisplayMode = shownDisplayMode;
                            splitView.paneHidden = paneHidden;
    
                            var config = {
                                panePlacement: panePlacement,
                                hiddenDisplayMode: hiddenDisplayMode,
                                shownDisplayMode: shownDisplayMode,
                                paneHidden: paneHidden,
                                rootWidth: args.rootWidth,
                                rootHeight: args.rootHeight,
                                hiddenPaneWidth: args.hiddenPaneWidth,
                                hiddenPaneHeight: args.hiddenPaneHeight,
                                shownPaneWidth: args.shownPaneWidth,
                                shownPaneHeight: args.shownPaneHeight,
                                rtl: rtl
                            };
    
                            assertLayoutCorrect(splitView, config);
                        });
                    });
                });
            });
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

        LiveUnit.Assert.areEqual(options.paneHidden, splitView.paneHidden, "splitView.paneHidden incorrect");
        LiveUnit.Assert.areEqual(options.panePlacement, splitView.panePlacement, "splitView.panePlacement incorrect");
        LiveUnit.Assert.areEqual(options.hiddenDisplayMode, splitView.hiddenDisplayMode, "splitView.hiddenDisplayMode incorrect");
        LiveUnit.Assert.areEqual(options.shownDisplayMode, splitView.shownDisplayMode, "splitView.shownDisplayMode incorrect");
    }

    // Taking the registration mechanism as a parameter allows us to use this code to test both
    // DOM level 0 (e.g. onbeforeshow) and DOM level 2 (e.g. addEventListener) events.
    function testEvents(registerForEvent: (splitView: WinJS.UI.PrivateSplitView, eventName: string, handler: Function) => void) {
        var splitView = Utils.useSynchronousAnimations(createSplitView());

        var counter = 0;
        registerForEvent(splitView, "beforeshow", () => {
            LiveUnit.Assert.areEqual(1, counter, "beforeshow fired out of order");
            counter++;
            LiveUnit.Assert.isTrue(splitView.paneHidden, "beforeshow: SplitView should be in hidden state");
        });
        registerForEvent(splitView, "aftershow", () => {
            LiveUnit.Assert.areEqual(2, counter, "aftershow fired out of order");
            counter++;
            LiveUnit.Assert.isFalse(splitView.paneHidden, "aftershow: SplitView should not be in hidden state");
        });
        registerForEvent(splitView, "beforehide", () => {
            LiveUnit.Assert.areEqual(4, counter, "beforehide fired out of order");
            counter++;
            LiveUnit.Assert.isFalse(splitView.paneHidden, "beforehide: SplitView should not be in hidden state");
        });
        registerForEvent(splitView, "afterhide", () => {
            LiveUnit.Assert.areEqual(5, counter, "afterhide fired out of order");
            counter++;
            LiveUnit.Assert.isTrue(splitView.paneHidden, "afterhide: SplitView should be in hidden state");
        });

        LiveUnit.Assert.areEqual(0, counter, "before showPane: wrong number of events fired");
        counter++;
        LiveUnit.Assert.isTrue(splitView.paneHidden, "before showPane: SplitView should be in hidden state");

        splitView.showPane();
        LiveUnit.Assert.areEqual(3, counter, "after showPane: wrong number of events fired");
        counter++;
        LiveUnit.Assert.isFalse(splitView.paneHidden, "after showPane: SplitView should not be in hidden state");

        splitView.hidePane();
        LiveUnit.Assert.areEqual(6, counter, "after hidePane: wrong number of events fired");
        LiveUnit.Assert.isTrue(splitView.paneHidden, "after hidePane: SplitView should be in hidden state");
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

        testBeforeShowIsCancelable() {
            var splitView = Utils.useSynchronousAnimations(createSplitView());

            splitView.onbeforeshow = function (eventObject) {
                eventObject.preventDefault();
            };
            splitView.onaftershow = function (eventObject) {
                LiveUnit.Assert.fail("aftershow shouldn't have fired due to beforeshow being canceled");
            };
            splitView.onbeforehide = function (eventObject) {
                LiveUnit.Assert.fail("beforehide shouldn't have fired due to beforeshow being canceled");
            };
            splitView.onafterhide = function (eventObject) {
                LiveUnit.Assert.fail("afterhide shouldn't have fired due to beforeshow being canceled");
            };

            splitView.showPane();
            LiveUnit.Assert.isTrue(splitView.paneHidden, "SplitView should still be hidden");
        }

        testBeforeHideIsCancelable() {
            function showShouldNotHaveCompleted() {
                LiveUnit.Assert.fail("show should not have completed");
            }

            var splitView = Utils.useSynchronousAnimations(createSplitView());

            splitView.showPane();
            splitView.onbeforehide = function (eventObject) {
                eventObject.preventDefault();
            };
            splitView.onafterhide = function (eventObject) {
                LiveUnit.Assert.fail("Hide should have been canceled");
            };
            splitView.hidePane();
            LiveUnit.Assert.isFalse(splitView.paneHidden, "SplitView should still be shown");
        }

        testDispose() {
            function failEventHandler(eventName) {
                return function () {
                    LiveUnit.Assert.fail(eventName + ": shouldn't have run due to control being disposed");
                };
            }

            var splitView = Utils.useSynchronousAnimations(createSplitView());
            splitView.showPane();

            splitView.onbeforeshow = failEventHandler("beforeshow");
            splitView.onbeforehide = failEventHandler("beforehide");
            splitView.onaftershow = failEventHandler("aftershow");
            splitView.onafterhide = failEventHandler("afterhide");

            splitView.dispose();
            LiveUnit.Assert.isTrue(splitView._disposed, "SplitView didn't mark itself as disposed");
            LiveUnit.Assert.areEqual("Disposed", splitView._state.name, "SplitView didn't move into the disposed state");

            splitView.showPane();
            splitView.hidePane();
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
            })
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
            })
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
            })
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
                null,
                { paneHidden: false },
                { panePlacement: "top" },
                { hiddenDisplayMode: "none" },
                { hiddenDisplayMode: "inline" },
                { shownDisplayMode: "overlay" },
                { shownDisplayMode: "overlay", paneHidden: false },
                { shownDisplayMode: "inline" },
                { shownDisplayMode: "inline", paneHidden: false },
                { panePlacement: "right", hiddenDisplayMode: "inline", shownDisplayMode: "inline", paneHidden: false },
                { panePlacement: "left", hiddenDisplayMode: "none", shownDisplayMode: "inline", paneHidden: true },
                { panePlacement: "bottom", shownDisplayMode: "overlay", paneHidden: false },
                { panePlacement: "bottom", shownDisplayMode: "overlay" }
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
            
            ["none", "inline"].forEach((hiddenDisplayMode) => {
                 options.hiddenDisplayMode = splitView.hiddenDisplayMode = hiddenDisplayMode;
                 verify();
            });

            ["overlay", "inline"].forEach((shownDisplayMode) => {
                 options.shownDisplayMode = splitView.shownDisplayMode = shownDisplayMode;
                 verify();
            });
            
            [false, true].forEach((paneHidden) => {
                 options.paneHidden = splitView.paneHidden = paneHidden;
                 verify();
            });
        }

        testTogglingPane() {
            var rootHeight = 500;
            var rootWidth = 1000;
            var splitView = Utils.useSynchronousAnimations(createSplitView());

            function verify(args: { paneHidden: boolean }) {
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
            verify({ paneHidden: true });

            // After toggling pane, pane should be shown
            splitView.paneHidden = !splitView.paneHidden;
            verify({ paneHidden: false });

            // After toggling pane, pane should be hidden
            splitView.paneHidden = !splitView.paneHidden;
            verify({ paneHidden: true });
        }

        // Verifies that animations start and end in the correct locations
        testAnimations(complete) {
            var rootHeight = 500;
            var rootWidth = 1000;
            var allConfigs = Helper.pairwise({
                rtl: [true, false],
                panePlacement: ["left", "right", "top", "bottom"],
                hiddenDisplayMode: ["none", "inline"],
                shownDisplayMode: ["inline", "overlay"]
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
                        paneHidden: false
                    });
                    var hooksRan = 0;

                    if (fullConfig.rtl) {
                        document.documentElement.setAttribute("lang", "ar");
                    } else {
                        document.documentElement.removeAttribute("lang");
                    }
                    var splitView = createSplitView({
                        panePlacement: config.panePlacement,
                        hiddenDisplayMode: config.hiddenDisplayMode,
                        shownDisplayMode: config.shownDisplayMode
                    });

                    var init = () => {
                        Utils.hookAfterPrepareAnimationOnce(splitView, () => {
                            hooksRan++;
                            fullConfig.paneHidden = true;
                            // It's tricky to verify the layout of the pane at the start of the hidden -> shown transition
                            // because the pane needs to be at its shown size during the animation but at the start it needs
                            // to look like it's in its hidden state (off screen)
                            // So we'll punt and just verify the layout of the content.
                            assertContentLayoutCorrect(splitView, fullConfig);
                        });
                        Utils.hookBeforeClearAnimationOnce(splitView, () => {
                            hooksRan++;
                            fullConfig.paneHidden = false;
                            assertLayoutCorrect(splitView, fullConfig);
                        });
                        splitView.showPane();
                    };

                    splitView.onaftershow = () => {
                        Utils.hookAfterPrepareAnimationOnce(splitView, () => {
                            hooksRan++;
                            fullConfig.paneHidden = false;
                            assertLayoutCorrect(splitView, fullConfig);
                        });
                        Utils.hookBeforeClearAnimationOnce(splitView, () => {
                            hooksRan++;
                            fullConfig.paneHidden = true;
                            // It's tricky to verify the layout of the pane at the end of the shown -> hidden transition
                            // because the pane needs to be at its shown size during the animation but at the end it needs
                            // to look like it's in its hidden state (off screen)
                            // So we'll punt and just verify the layout of the content.
                            assertContentLayoutCorrect(splitView, fullConfig);
                        });
                        splitView.hidePane();
                    };

                    splitView.onafterhide = () => {
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
    }
}
LiveUnit.registerTestClass("SplitViewTests.BasicTests");
