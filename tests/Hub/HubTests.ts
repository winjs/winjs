// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/util.ts" />

module WinJSTests {

    var Key = WinJS.Utilities.Key;

    var instances = 0;

    var HubSection = <typeof WinJS.UI.PrivateHubSection>WinJS.UI.HubSection;
    var Hub = <typeof WinJS.UI.PrivateHub>WinJS.UI.Hub;

    export class HubTestsFakeControl {
        constructor(element, options) {
            instances++;
        }
        static supportedForProcessing = true;
    }

    function getSomeSections(count) {
        // Returns array of HubSection Objects (for setting sections programatically)
        count = count || 10;
        var sections = [];
        for (var i = 0; i < count; i++) {
            sections.push(getSection(i));
        }
        return sections;
    }

    function getSection(index) {
        // Returns a single HubSection Object
        var hubSectionEl = document.createElement('div');
        hubSectionEl.innerHTML = '<div data-win-control="WinJSTests.HubTestsFakeControl" style="width:100px; height: 100px; background-color: #777;">Content for section ' + index + '</div>';
        var hubSection = new HubSection(hubSectionEl, {
            header: 'Header for section ' + index
        });
        return hubSection;
    }

    function getMarkupForSomeSections(count) {
        // Returns markup for a bunch of HubSections (for parsing markup tests)
        count = count || 10;
        var markup = '';
        for (var i = 0; i < count; i++) {
            markup += getMarkupForSection(i);
        }
        return markup;
    }

    function getMarkupForSection(index) {
        // Returns markup for a single HubSection
        return '<div data-win-control="WinJS.UI.HubSection" data-win-options="{ header: \'Header for section ' + index + '\' }">' +
            '<div data-win-control="WinJSTests.HubTestsFakeControl" style="width:100px; height: 100px; background-color: #777;">Content for section ' + index + '</div>' +
            '</div>';
    }

    function hubLoaded(hub) {
        return new WinJS.Promise(function (c, e, p) {
            function testState() {
                if (hub.loadingState === Hub.LoadingState.complete) {
                    c();
                }
            }
            testState();
            hub.addEventListener(Hub._EventName.loadingStateChanged, testState);
        });
    }

    function sectionOnScreenTest(complete, rtl) {
        var startEndMargins = 80;
        var hubWidth = 1024;
        var hubHeight = 768;
        var sectionWidth = 700;
        var sectionHeight = 768;

        var sectionCount = 10;
        var hubEl = document.createElement('div');
        if (rtl) {
            hubEl.style.direction = "rtl";
        }
        var markup = getMarkupForSomeSections(sectionCount);
        hubEl.innerHTML = markup;
        hubEl.style.width = hubWidth + 'px';
        hubEl.style.height = hubHeight + 'px';
        var hubSectionEl = <HTMLElement>hubEl.firstChild;
        while (hubSectionEl) {
            hubSectionEl.style.width = sectionWidth + 'px';
            hubSectionEl.style.height = sectionHeight + 'px';
            hubSectionEl = <HTMLElement>hubSectionEl.nextSibling;
        }
        document.body.appendChild(hubEl);

        var hub = new Hub(hubEl);

        hubLoaded(hub).done(function () {
            // Section on screen is about lining up the section with the App Header.
            // It uses the startEndMargins (margin/padding on win-hub-surface) and the section's margin/padding.
            LiveUnit.Assert.areEqual(0, hub.sectionOnScreen, "Section0");

            hub.sectionOnScreen = 1;
            LiveUnit.Assert.areEqual(1, hub.sectionOnScreen, "Section1");
            LiveUnit.Assert.areEqual(sectionWidth + startEndMargins, hub.scrollPosition, "Section1 scrollPos");

            hub.scrollPosition = hub.sections.getAt(0).element.offsetWidth + hub.sections.getAt(1).element.offsetWidth;
            LiveUnit.Assert.areEqual(2, hub.sectionOnScreen, "Section2");

            // Section 1 is 1 pixel past the header.
            hub.scrollPosition = hub.scrollPosition - parseFloat(getComputedStyle(hub.sections.getAt(1).element).paddingRight) - parseFloat(getComputedStyle(hub.sections.getAt(1).element).paddingLeft) - 1;
            LiveUnit.Assert.areEqual(1, hub.sectionOnScreen, "Section1 again:" + hub.scrollPosition);

            document.body.removeChild(hubEl);
            complete();
        });
    };

    export class HubTests {
        "use strict";

        testOrientation = function () {
            var hub = new Hub();
            //Default is Horizontal.
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(hub.element, Hub._ClassName.hubHorizontal));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(hub.element, Hub._ClassName.hubVertical));

            hub.orientation = WinJS.UI.Orientation.vertical;
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(hub.element, Hub._ClassName.hubVertical));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(hub.element, Hub._ClassName.hubHorizontal));

            hub.orientation = WinJS.UI.Orientation.horizontal
        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(hub.element, Hub._ClassName.hubHorizontal));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(hub.element, Hub._ClassName.hubVertical));

            // Test taking orientation in via options.
            hub = new Hub(undefined, {
                orientation: WinJS.UI.Orientation.vertical
            });
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(hub.element, Hub._ClassName.hubVertical));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(hub.element, Hub._ClassName.hubHorizontal));
        };

        testHeaderTemplateFunction = function (complete) {
            var hub = new Hub();
            hub.sections = new WinJS.Binding.List(getSomeSections(5));

            hubLoaded(hub).done(function () {
                LiveUnit.Assert.areEqual("Header for section 0", hub.sections.getAt(0)._headerContentElement.textContent, "Default template");

                hub.headerTemplate = function (itemData) {
                    var element = document.createElement('div');
                    element.innerHTML = "Text: " + itemData.header;
                    return element;
                }

            WinJS.Utilities._setImmediate(function () {
                    LiveUnit.Assert.areEqual("Text: Header for section 0", hub.sections.getAt(0)._headerContentElement.textContent, "Template function");
                    complete();
                });
            });
        };

        testHeaderTemplateBindingTemplate = function (complete) {
            var hub = new Hub();
            hub.sections = new WinJS.Binding.List(getSomeSections(5));
            hubLoaded(hub).done(function () {
                LiveUnit.Assert.areEqual("Header for section 0", hub.sections.getAt(0)._headerContentElement.textContent, "Default template");

                var templateEl = document.createElement('div');
                templateEl.innerHTML = '<span>Template: </span><span data-win-bind="textContent: header"></div>';
                hub.headerTemplate = new WinJS.Binding.Template(templateEl);

                WinJS.Utilities._setImmediate(function () {
                    LiveUnit.Assert.areEqual("Template: Header for section 0", hub.sections.getAt(0)._headerContentElement.textContent, "Binding template");
                    complete();
                });
            });
        };

        testLoad = function (complete) {
            var sectionCount = 5;
            instances = 0;
            var hub = new Hub(undefined, {
                sections: new WinJS.Binding.List(getSomeSections(sectionCount))
            });

            hubLoaded(hub).done(function () {
                LiveUnit.Assert.areEqual(sectionCount, hub.sections.length, "Correct # of sections found");
                LiveUnit.Assert.areEqual(sectionCount, instances, "Correct # of instances found");
                LiveUnit.Assert.areEqual(sectionCount, hub.element.querySelectorAll('.' + HubSection._ClassName.hubSection).length, "Correct HubSection dom elements found");
                complete();
            });
        };

        testLazyLoadFromMiddle = function (complete) {
            var hubWidth = 1024;
            var hubHeight = 768;
            var sectionWidth = 700;
            var sectionHeight = 768;

            var sectionCount = 10;
            instances = 0;
            var hubEl = document.createElement('div');
            var markup = getMarkupForSomeSections(sectionCount);
            hubEl.innerHTML = markup;
            hubEl.style.width = hubWidth + 'px';
            hubEl.style.height = hubHeight + 'px';
            var hubSectionEl = <HTMLElement>hubEl.firstChild;
            while (hubSectionEl) {
                hubSectionEl.style.width = sectionWidth + 'px';
                hubSectionEl.style.height = sectionHeight + 'px';
                hubSectionEl = <HTMLElement>hubSectionEl.nextSibling;
            }
            document.body.appendChild(hubEl);

            var hub = new Hub(hubEl, { sectionOnScreen: 5 });

            var called;
            hub.addEventListener(Hub._EventName.contentAnimating, function () {
                LiveUnit.Assert.isFalse(called, "Called once");
                called = true;
                LiveUnit.Assert.areEqual(3, instances, "Correct # of instances found when starting fade in");
            });
            hubLoaded(hub).done(function () {
                if (WinJS.UI.isAnimationEnabled()) {
                    LiveUnit.Assert.isTrue(called, "ContentAnimating not called with correct # of sections before all sections were loaded.");
                }
                LiveUnit.Assert.areEqual(sectionCount, instances, "Correct # of instances found");

                document.body.removeChild(hubEl);
                complete();
            });
        }

    testParse = function (complete) {
            var sectionCount = 5;
            instances = 0;
            var hubEl = document.createElement('div');
            var markup = getMarkupForSomeSections(sectionCount);
            hubEl.innerHTML = markup;

            var hub = new Hub(hubEl);
            hubLoaded(hub).done(function () {
                LiveUnit.Assert.areEqual(sectionCount, hub.sections.length, "Correct # of sections found");
                LiveUnit.Assert.areEqual(sectionCount, instances, "Correct # of instances found");
                complete();
            });
        };

        testIndexOfFirstVisible = function (complete) {
            var startEndMargins = 80;
            var hubWidth = 1024;
            var hubHeight = 768;
            var sectionWidth = 700;
            var sectionHeight = 768;

            var sectionCount = 10;
            var hubEl = document.createElement('div');
            var markup = getMarkupForSomeSections(sectionCount);
            hubEl.innerHTML = markup;
            hubEl.style.width = hubWidth + 'px';
            hubEl.style.height = hubHeight + 'px';
            var hubSectionEl = <HTMLElement>hubEl.firstChild;
            while (hubSectionEl) {
                hubSectionEl.style.width = sectionWidth + 'px';
                hubSectionEl.style.height = sectionHeight + 'px';
                hubSectionEl = <HTMLElement>hubSectionEl.nextSibling;
            }
            document.body.appendChild(hubEl);

            var hub = new Hub(hubEl);

            hubLoaded(hub).done(function () {
                LiveUnit.Assert.areEqual(0, hub.indexOfFirstVisible, "At 0");
                var section1 = hub.sections.getAt(1);
                var section1El = section1.element;
                hub.scrollPosition = section1El.offsetLeft + section1El.offsetWidth - parseFloat(getComputedStyle(section1El).paddingRight);
                LiveUnit.Assert.areEqual(2, hub.indexOfFirstVisible, "At " + hub.scrollPosition);
                hub.scrollPosition = hub.scrollPosition - 1;
                LiveUnit.Assert.areEqual(1, hub.indexOfFirstVisible, "At " + hub.scrollPosition);

                document.body.removeChild(hubEl);
                complete();
            });
        };

        testIndexOfLastVisible = function (complete) {
            var startEndMargins = 80;
            var hubWidth = 1024;
            var hubHeight = 768;
            var sectionWidth = 700;
            var sectionHeight = 768;

            var sectionCount = 10;
            var hubEl = document.createElement('div');
            var markup = getMarkupForSomeSections(sectionCount);
            hubEl.innerHTML = markup;
            hubEl.style.width = hubWidth + 'px';
            hubEl.style.height = hubHeight + 'px';
            var hubSectionEl = <HTMLElement>hubEl.firstChild;
            while (hubSectionEl) {
                hubSectionEl.style.width = sectionWidth + 'px';
                hubSectionEl.style.height = sectionHeight + 'px';
                hubSectionEl = <HTMLElement>hubSectionEl.nextSibling;
            }
            document.body.appendChild(hubEl);

            var hub = new Hub(hubEl);

            hubLoaded(hub).done(function () {
                LiveUnit.Assert.areEqual(1, hub.indexOfLastVisible, "At 0");
                var section2 = hub.sections.getAt(2);
                var section2El = section2.element;
                hub.scrollPosition = section2El.offsetLeft + parseFloat(getComputedStyle(section2El).paddingLeft) - hubWidth + 1;
                LiveUnit.Assert.areEqual(2, hub.indexOfLastVisible, "At " + hub.scrollPosition);
                hub.scrollPosition = hub.scrollPosition - 1;
                LiveUnit.Assert.areEqual(1, hub.indexOfLastVisible, "At " + hub.scrollPosition);

                document.body.removeChild(hubEl);
                complete();
            });
        };

        testSectionOnScreen = function (complete) {
            sectionOnScreenTest(complete, false);
        }

    testSectionOnScreenRTL = function (complete) {
            sectionOnScreenTest(complete, true);
        }


        testHeaderStatic = function (complete) {
            var sectionCount = 5;
            var hub = new Hub(undefined, {
                sections: new WinJS.Binding.List(getSomeSections(sectionCount))
            });
            document.body.appendChild(hub.element);

            hub.sections.getAt(1).isHeaderStatic = true;
            hub.sections.getAt(2).isHeaderStatic = true;
            hub.sections.getAt(2).isHeaderStatic = false;
            hub.sections.getAt(3).isHeaderStatic = false;

            var headerInvoked;
            hub.addEventListener(Hub._EventName.headerInvoked, function (ev) {
                headerInvoked = ev.detail.index;
            });

            hubLoaded(hub).done(function () {
                hub.sections.getAt(2)._headerTabStopElement.click();
                LiveUnit.Assert.areEqual(2, headerInvoked, "Correct header 2 invoked.");

                // Default is not static.
                hub.sections.getAt(0)._headerTabStopElement.click();
                LiveUnit.Assert.areEqual(0, headerInvoked, "Correct header 0 invoked.");

                // Ignore 1 since it is static.
                hub.sections.getAt(1)._headerTabStopElement.click();
                LiveUnit.Assert.areEqual(0, headerInvoked, "Ignore header 1.");

                document.body.removeChild(hub.element);
                complete();
            });
        };

        testKeyboarding = function (complete) {
            var startEndMargins = 80;
            var hubWidth = 1024;
            var hubHeight = 768;
            var sectionWidth = 700;
            var sectionHeight = 768;

            var sectionCount = 10;
            var hubEl = document.createElement('div');
            var markup = getMarkupForSomeSections(sectionCount);
            hubEl.innerHTML = markup;
            hubEl.style.width = hubWidth + 'px';
            hubEl.style.height = hubHeight + 'px';
            var hubSectionEl = <HTMLElement>hubEl.firstChild;
            while (hubSectionEl) {
                hubSectionEl.style.width = sectionWidth + 'px';
                hubSectionEl.style.height = sectionHeight + 'px';
                hubSectionEl = <HTMLElement>hubSectionEl.nextSibling;
            }
            document.body.appendChild(hubEl);

            var hub = new Hub(hubEl);

            hubLoaded(hub).done(function () {
                // The hub uses an "ensureVisible" API to determine how far to scroll when you arrow.
                // The input variables for the test are size of items and before scroll position.
                // Section Sizes:
                // small is < hub size - start Margin - end margin
                // large is > hub size - start Margin - end margin
                // Scroll Positions:
                // 0: need to scroll right
                // length - hub size: max scroll position - need to scroll left
                // Item on screen (for big items) and needs to align left edge not right edge.
                // Item on screen and no scroll necessary.

                var middleIndex = Math.floor(sectionCount / 2);
                var middleSection = hub.sections.getAt(middleIndex);

                function testSmallSections() {
                    var scrollPositionToSeeEndEdge = middleSection.element.offsetLeft + middleSection.element.offsetWidth - hubWidth + startEndMargins + 1;
                    var scrollPositionToSeeStartEdge = middleSection.element.offsetLeft - startEndMargins;

                    hub.sections.getAt(middleIndex - 1)._headerTabStopElement.focus();
                    hub.scrollPosition = 0;
                    dispatchEvent(hub.sections.getAt(middleIndex - 1)._headerTabStopElement, Key.rightArrow);
                    LiveUnit.Assert.areEqual(scrollPositionToSeeEndEdge, hub.scrollPosition, "Small Sections: Right to center section when scrolled to beginning");

                    hub.sections.getAt(middleIndex - 1)._headerTabStopElement.focus();
                    hub.scrollPosition = 10000;
                    dispatchEvent(hub.sections.getAt(middleIndex - 1)._headerTabStopElement, Key.rightArrow);
                    LiveUnit.Assert.areEqual(scrollPositionToSeeStartEdge, hub.scrollPosition, "Small Sections: Right to center section when scrolled to end");

                    var middleScroll = Math.floor(scrollPositionToSeeStartEdge + (scrollPositionToSeeEndEdge - scrollPositionToSeeStartEdge) / 2);
                    hub.sections.getAt(middleIndex - 1)._headerTabStopElement.focus();
                    hub.scrollPosition = middleScroll;
                    dispatchEvent(hub.sections.getAt(middleIndex - 1)._headerTabStopElement, Key.rightArrow);
                    LiveUnit.Assert.areEqual(middleScroll, hub.scrollPosition, "Small Sections: Right to center section when already visible");
                }

                function testLargeSections() {
                    var scrollPositionToSeeEndEdge = middleSection.element.offsetLeft + middleSection.element.offsetWidth - hubWidth + startEndMargins + 1;
                    var scrollPositionToSeeStartEdge = middleSection.element.offsetLeft - startEndMargins;

                    hub.sections.getAt(middleIndex - 1)._headerTabStopElement.focus();
                    hub.scrollPosition = 0;
                    Helper.waitForScroll(hub._viewportElement).then(function () {
                        dispatchEvent(hub.sections.getAt(middleIndex - 1)._headerTabStopElement, Key.rightArrow);
                        LiveUnit.Assert.areEqual(scrollPositionToSeeStartEdge, hub.scrollPosition, "Large Sections: Right to center section when scrolled to beginning");

                        hub.sections.getAt(middleIndex - 1)._headerTabStopElement.focus();
                        hub.scrollPosition = 10000;

                        return Helper.waitForScroll(hub._viewportElement);
                    }).then(function () {
                            dispatchEvent(hub.sections.getAt(middleIndex - 1)._headerTabStopElement, Key.rightArrow);
                            LiveUnit.Assert.areEqual(scrollPositionToSeeStartEdge, hub.scrollPosition, "Large Sections: Right to center section when scrolled to end");

                            var middleScroll = Math.floor(scrollPositionToSeeStartEdge + (scrollPositionToSeeEndEdge - scrollPositionToSeeStartEdge) / 2);
                            hub.sections.getAt(middleIndex - 1)._headerTabStopElement.focus();
                            hub.scrollPosition = middleScroll;

                            return Helper.waitForScroll(hub._viewportElement);
                        }).then(function () {
                            dispatchEvent(hub.sections.getAt(middleIndex - 1)._headerTabStopElement, Key.rightArrow);
                            LiveUnit.Assert.areEqual(scrollPositionToSeeStartEdge, hub.scrollPosition, "Large Sections: Right to center section when already visible");

                            document.body.removeChild(hubEl);
                            complete();
                        });
                }

                testSmallSections();

                hubWidth = 512;
                hubEl.style.width = hubWidth + 'px';
                testLargeSections();
            });

            function dispatchEvent(element, keyCode) {
                var event = document.createEvent("Event");
                event.initEvent("keydown", true, true);
                event['keyCode'] = keyCode;
                element.dispatchEvent(event);
            }
        };

        testSectionEdits = function (complete) {
            var sectionCount = 5;
            var hub = new Hub(undefined, {
                sections: new WinJS.Binding.List(getSomeSections(sectionCount))
            });

            var hubSection;
            hubLoaded(hub).then(function () {
                LiveUnit.Assert.areEqual(sectionCount, hub.sections.length, "Correct # of sections found");
                LiveUnit.Assert.areEqual(sectionCount, hub.element.querySelectorAll('.' + HubSection._ClassName.hubSection).length, "Correct HubSection dom elements found");

                hubSection = hub.sections.pop();
                return hubLoaded(hub);
            }).then(function () {
                    LiveUnit.Assert.areEqual(sectionCount - 1, hub.sections.length, "Pop: Correct # of sections found");
                    LiveUnit.Assert.areEqual(sectionCount - 1, hub.element.querySelectorAll('.' + HubSection._ClassName.hubSection).length, "Pop: Correct HubSection dom elements found");

                    hub.sections.push(hubSection);
                    return hubLoaded(hub);
                }).then(function () {
                    LiveUnit.Assert.areEqual(sectionCount, hub.sections.length, "Push: Correct # of sections found");
                    LiveUnit.Assert.areEqual(sectionCount, hub.element.querySelectorAll('.' + HubSection._ClassName.hubSection).length, "Push: Correct HubSection dom elements found");
                    LiveUnit.Assert.areEqual(hubSection.element, hub.element.querySelectorAll('.' + HubSection._ClassName.hubSection)[sectionCount - 1], "Push: Correct HubSection dom element found");

                    hub.sections.move(sectionCount - 1, sectionCount - 2);
                    LiveUnit.Assert.areEqual(sectionCount, hub.sections.length, "Move: Correct # of sections found");
                    LiveUnit.Assert.areEqual(sectionCount, hub.element.querySelectorAll('.' + HubSection._ClassName.hubSection).length, "Move: Correct HubSection dom elements found");
                    LiveUnit.Assert.areEqual(hubSection.element, hub.element.querySelectorAll('.' + HubSection._ClassName.hubSection)[sectionCount - 2], "Move: Correct HubSection dom element found");

                    hub.sections.move(sectionCount - 2, sectionCount - 1);
                    LiveUnit.Assert.areEqual(sectionCount, hub.sections.length, "Move2: Correct # of sections found");
                    LiveUnit.Assert.areEqual(sectionCount, hub.element.querySelectorAll('.' + HubSection._ClassName.hubSection).length, "Move2: Correct HubSection dom elements found");
                    LiveUnit.Assert.areEqual(hubSection.element, hub.element.querySelectorAll('.' + HubSection._ClassName.hubSection)[sectionCount - 1], "Move2: Correct HubSection dom element found");

                    hub.sections.pop();
                    return hubLoaded(hub);
                }).then(function () {
                    LiveUnit.Assert.areEqual(sectionCount - 1, hub.sections.length, "Pop2: Correct # of sections found");
                    LiveUnit.Assert.areEqual(sectionCount - 1, hub.element.querySelectorAll('.' + HubSection._ClassName.hubSection).length, "Pop2: Correct HubSection dom elements found");

                    hub.sections.setAt(sectionCount - 2, hubSection);
                    LiveUnit.Assert.areEqual(sectionCount - 1, hub.sections.length, "SetAt: Correct # of sections found");
                    LiveUnit.Assert.areEqual(sectionCount - 1, hub.element.querySelectorAll('.' + HubSection._ClassName.hubSection).length, "SetAt: Correct HubSection dom elements found");
                    LiveUnit.Assert.areEqual(hubSection.element, hub.element.querySelectorAll('.' + HubSection._ClassName.hubSection)[sectionCount - 2], "SetAt: Correct HubSection dom element found");

                    hub.sections.reverse();
                    return hubLoaded(hub);
                }).then(function () {
                    LiveUnit.Assert.areEqual(sectionCount - 1, hub.sections.length, "Reverse: Correct # of sections found");
                    LiveUnit.Assert.areEqual(sectionCount - 1, hub.element.querySelectorAll('.' + HubSection._ClassName.hubSection).length, "Reverse: Correct HubSection dom elements found");
                    LiveUnit.Assert.areEqual(hubSection.element, hub.element.querySelectorAll('.' + HubSection._ClassName.hubSection)[0], "Reverse: Correct HubSection dom element found");
                }).then(complete);
        };


        testSetGetCurrentItem = function (complete) {
            var hubWidth = 1024;
            var hubHeight = 768;
            var sectionWidth = 700;
            var sectionHeight = 768;

            var sectionCount = 10;
            var hubEl = document.createElement('div');
            var markup = getMarkupForSomeSections(sectionCount);
            hubEl.innerHTML = markup;
            hubEl.style.width = hubWidth + 'px';
            hubEl.style.height = hubHeight + 'px';
            var hubSectionEl = <HTMLElement>hubEl.firstChild;
            while (hubSectionEl) {
                hubSectionEl.style.width = sectionWidth + 'px';
                hubSectionEl.style.height = sectionHeight + 'px';
                hubSectionEl = <HTMLElement>hubSectionEl.nextSibling;
            }
            document.body.appendChild(hubEl);

            var hub = new Hub(hubEl);
            // Reminder first 80px are for section 2, and then it is section 3.
            hub.sectionOnScreen = 3;
            hubLoaded(hub).then(function () {
                hub.zoomableView.setCurrentItem(150, 150);
                return hub.zoomableView.getCurrentItem();
            }).then(function (sezoObject) {
                    var item = sezoObject.item;
                    LiveUnit.Assert.areEqual(3, item.index, "Correct item 3");

                    hub.zoomableView.setCurrentItem(79, 79);
                    return hub.zoomableView.getCurrentItem();
                }).then(function (sezoObject) {
                    var item = sezoObject.item;
                    LiveUnit.Assert.areEqual(2, item.index, "Correct item 2");

                    hub.zoomableView.setCurrentItem(80, 80);
                    return hub.zoomableView.getCurrentItem();
                }).then(function (sezoObject) {
                    var item = sezoObject.item;
                    LiveUnit.Assert.areEqual(3, item.index, "Correct item 3 again");

                    document.body.removeChild(hubEl);
                    complete();
                });
        };

        testEmptyHub = function (complete) {
            var hubEl = document.createElement('div');
            document.body.appendChild(hubEl);

            var hub = new Hub(hubEl);

            WinJS.Promise.timeout(WinJS.UI._animationTimeAdjustment(3000)).
                done(function () {
                    LiveUnit.Assert.areEqual(0, document.body.querySelectorAll("progress").length, "Expecting no progress indicators in DOM");
                    complete();
                });
        };
    }

    if (WinJS.UI.isAnimationEnabled()) {
        WinJSTests.HubTests.prototype['testAnimationEvents'] = function (complete) {
            var hubEl = document.createElement('div');
            var entranceCount = 0;
            var contentTransitionCount = 0;
            hubEl.addEventListener(Hub._EventName.contentAnimating, function (ev: any) {
                if (ev.detail.type === Hub.AnimationType.entrance) {
                    entranceCount++;
                } else if (ev.detail.type === Hub.AnimationType.contentTransition) {
                    contentTransitionCount++;
                } else {
                    LiveUnit.Assert.fail("Wrong type fired");
                }

                // Causes the below to be synchronous.
                ev.preventDefault();
            });

            // entrance (construction)
            var hub = new Hub(hubEl, {
                sections: new WinJS.Binding.List(getSomeSections(5))
            });
            hubLoaded(hub).done(function () {
                LiveUnit.Assert.areEqual(1, entranceCount, "1) Entrance event fired");
                LiveUnit.Assert.areEqual(0, contentTransitionCount, "1) Content transition event fired");

                // contentTransition
                hub.sections = new WinJS.Binding.List(getSomeSections(3));
                hubLoaded(hub).done(function () {
                    LiveUnit.Assert.areEqual(1, entranceCount, "2) Entrance event fired");
                    LiveUnit.Assert.areEqual(1, contentTransitionCount, "2) Content transition event fired");

                    // contentTransition
                    hub.sections = new WinJS.Binding.List(getSomeSections(2));
                    hubLoaded(hub).done(function () {
                        LiveUnit.Assert.areEqual(1, entranceCount, "3) Entrance event fired");
                        LiveUnit.Assert.areEqual(2, contentTransitionCount, "3) Content transition event fired");

                        // contentTransition
                        hub.sections = new WinJS.Binding.List<any>();
                        hubLoaded(hub).done(function () {
                            LiveUnit.Assert.areEqual(1, entranceCount, "4) Entrance event fired");
                            LiveUnit.Assert.areEqual(3, contentTransitionCount, "4) Content transition event fired");

                            // entrance (empty to full)
                            hub.sections = new WinJS.Binding.List(getSomeSections(2));
                            hubLoaded(hub).done(function () {
                                LiveUnit.Assert.areEqual(2, entranceCount, "5) Entrance event fired");
                                LiveUnit.Assert.areEqual(3, contentTransitionCount, "5) Content transition event fired");
                                complete();
                            });
                        });
                    });
                });
            });
        };
    }
}
LiveUnit.registerTestClass("WinJSTests.HubTests");