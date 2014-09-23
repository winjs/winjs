// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

module HubTests {
    export module Utilities {
        "use strict";
        // Helper functions
        export var HubHeaderTestTemplateJS = WinJS.Utilities.markSupportedForProcessing(function HubHeaderTestTemplateJS(item) {
            var div = document.createElement("div");
            div.textContent = item.header;
            div.className += " testHeaderTemplateJS";
            return div;
        });

        var HubSection = <typeof WinJS.UI.PrivateHubSection>WinJS.UI.HubSection;
        var Hub = <typeof WinJS.UI.PrivateHub>WinJS.UI.Hub;

        window['HubHeaderTestTemplateJS'] = HubHeaderTestTemplateJS;

        function getConfigurations() {
            function getListViewContent(testHost) {
                var elementHost = document.createElement("DIV");
                var element = document.createElement("DIV");
                elementHost.appendChild(element);

                var list = new WinJS.Binding.List();
                for (var i = 0; i < 10; i++) {
                    list.push({ item: i });
                }
                function itemTemplate(itemPromise) {
                    var element = document.createElement("div");

                    return itemPromise.then(function () {
                        return element;
                    });
                }

                new WinJS.UI.ListView(element, {
                    itemDataSource: list.dataSource,
                    itemTemplate: itemTemplate
                });

                //Give the Hub a chance to append the element in DOM before we show the ListView
                WinJS.Utilities._setImmediate(function () { element && element.winControl && element.winControl.forceLayout(); });

                return elementHost;
            }

            return [
                {
                    initialize: function (testHost) {
                        return {
                            method: 'JS',
                            headerTemplate: undefined,
                            sectionsArray: [
                                //metadata for sections
                                new HubSection(getListViewContent(testHost), { header: 'Section 0', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 1' }),
                                new HubSection(undefined, { header: 'Section 2' }),
                                new HubSection(undefined, { header: 'Section 3', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 4' })
                            ],
                            orientation: WinJS.UI.Orientation.horizontal
                        };
                    }
                },
                {
                    initialize: function () {
                        return {
                            method: 'JS',
                            headerTemplate: HubHeaderTestTemplateJS,
                            sectionsArray: [
                                //metadata for sections
                                new HubSection(undefined, { header: 'Section 0', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 1' }),
                                new HubSection(undefined, { header: 'Section 2' }),
                                new HubSection(undefined, { header: 'Section 3', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 4' })
                            ],
                            orientation: WinJS.UI.Orientation.vertical
                        };
                    }
                },
                {
                    initialize: function () {
                        return {
                            method: 'JS',
                            headerTemplate: { id: "myHeaderTemplate", html: "<div id='myHeaderTemplate' data-win-control='WinJS.Binding.Template'><span data-win-bind='textContent: this.header'></span></div>" },
                            sectionsArray: [
                                //metadata for sections
                                new HubSection(undefined, { header: 'Section 0', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 1' }),
                                new HubSection(undefined, { header: 'Section 2' }),
                                new HubSection(undefined, { header: 'Section 3', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 4' })
                            ],
                            orientation: WinJS.UI.Orientation.horizontal
                        };
                    }
                },
                {
                    initialize: function () {
                        return {
                            method: 'JS',
                            sectionOnScreen: 2,
                            headerTemplate: HubHeaderTestTemplateJS,
                            sectionsArray: [
                                //metadata for sections
                                new HubSection(undefined, { header: 'Section 0', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 1' }),
                                new HubSection(undefined, { header: 'Section 2' }),
                                new HubSection(undefined, { header: 'Section 3', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 4' })
                            ],
                            orientation: WinJS.UI.Orientation.horizontal
                        };
                    }
                },
                {
                    initialize: function () {
                        return {
                            method: 'JS',
                            sectionOnScreen: 2,
                            headerTemplate: HubHeaderTestTemplateJS,
                            sectionsArray: [
                                //metadata for sections
                                new HubSection(undefined, { header: 'Section 0', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 1' }),
                                new HubSection(undefined, { header: 'Section 2' }),
                                new HubSection(undefined, { header: 'Section 3', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 4' })
                            ],
                            orientation: WinJS.UI.Orientation.vertical
                        };
                    }
                },
                {
                    initialize: function (testHost) {
                        return {
                            method: 'HTML',
                            headerTemplate: undefined,
                            sectionsArray: [
                                //metadata for sections
                                new HubSection(getListViewContent(testHost), { header: 'Section 0', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 1' }),
                                new HubSection(undefined, { header: 'Section 2' }),
                                new HubSection(undefined, { header: 'Section 3', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 4' })
                            ],
                            orientation: WinJS.UI.Orientation.horizontal
                        };
                    }
                },
                {
                    initialize: function () {
                        return {
                            method: 'HTML',
                            headerTemplate: "HubHeaderTestTemplateJS",
                            sectionsArray: [
                                //metadata for sections
                                new HubSection(undefined, { header: 'Section 0', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 1' }),
                                new HubSection(undefined, { header: 'Section 2' }),
                                new HubSection(undefined, { header: 'Section 3', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 4' })
                            ],
                            orientation: WinJS.UI.Orientation.vertical
                        };
                    }
                },
                {
                    initialize: function () {
                        return {
                            method: 'HTML',
                            headerTemplate: { id: "myHeaderTemplate", html: "<div id='myHeaderTemplate' data-win-control='WinJS.Binding.Template'><span data-win-bind='textContent: this.header'></span></div>" },
                            sectionsArray: [
                                //metadata for sections
                                new HubSection(undefined, { header: 'Section 0', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 1' }),
                                new HubSection(undefined, { header: 'Section 2' }),
                                new HubSection(undefined, { header: 'Section 3', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 4' })
                            ],
                            orientation: WinJS.UI.Orientation.vertical
                        };
                    }
                },
                {
                    initialize: function () {
                        return {
                            method: 'HTML',
                            headerTemplate: { id: "myHeaderTemplate", html: "<div id='myHeaderTemplate' data-win-control='WinJS.Binding.Template'><span data-win-bind='textContent: this.header'></span></div>" },
                            sectionOnScreen: 2,
                            sectionsArray: [
                                //metadata for sections
                                new HubSection(undefined, { header: 'Section 0', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 1' }),
                                new HubSection(undefined, { header: 'Section 2' }),
                                new HubSection(undefined, { header: 'Section 3', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 4' })
                            ],
                            orientation: WinJS.UI.Orientation.horizontal
                        };
                    }
                },
                {
                    initialize: function () {
                        return {
                            method: 'HTML',
                            headerTemplate: { id: "myHeaderTemplate", html: "<div id='myHeaderTemplate' data-win-control='WinJS.Binding.Template'><span data-win-bind='textContent: this.header'></span></div>" },
                            sectionOnScreen: 2,
                            sectionsArray: [
                                //metadata for sections
                                new HubSection(undefined, { header: 'Section 0', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 1' }),
                                new HubSection(undefined, { header: 'Section 2' }),
                                new HubSection(undefined, { header: 'Section 3', isHeaderStatic: true }),
                                new HubSection(undefined, { header: 'Section 4' })
                            ],
                            orientation: WinJS.UI.Orientation.vertical
                        };
                    }
                }
            ];
        }

        export function test(that, testHostSelector, testNamePrefix, testFunction, options?, filter?) {

            //for each configuration, build a hub and execute the test
            var configurations = getConfigurations();
            for (var i in configurations) {
                if (!filter || filter(configurations[i])) {
                    (function (i) {
                        var testName = "test" + testNamePrefix + "_config" + i;
                        that[testName] = function (complete) {
                            var testHost = document.querySelector(testHostSelector);
                            var config = configurations[i].initialize(testHost);
                            insertHub(testHost, config);
                            testFunction(testHost, config).
                                done(complete);
                        };

                        if (options) {
                            var optionKeys = Object.keys(options);
                            for (var x = 0; x < optionKeys.length; x++) {
                                var key = optionKeys[x];
                                var value = options[key];
                                that[testName][key] = value;
                            }
                        }
                    })(i);
                }
            }
        }

        export function insertHub(testHost, config) {
            var control;

            //Check to see if we need to insert a Binding.Template
            if (config.headerTemplate && config.headerTemplate.html) {
                var template = document.createElement("div");
                template.innerHTML = config.headerTemplate.html;
                testHost.appendChild(template.firstElementChild);

                //update headerTemplate property and re-add the metadata for test validation
                var temp = {
                    html: config.headerTemplate.html,
                    id: config.headerTemplate.id
                };
                config.headerTemplate = document.getElementById(temp.id);
                config.headerTemplate.html = temp.html;
                config.headerTemplate.id = temp.id;
            }

            config.sections = new WinJS.Binding.List(config.sectionsArray);
            switch (config.method) {
                case 'HTML':
                    var extraHTML = "";
                    var optionsString = "{ ";
                    var configProperties = Object.keys(config);
                    for (var i = 0; i < configProperties.length; i++) {
                        var prop = configProperties[i];
                        switch (prop) {
                            case 'sections':
                                if (optionsString.length > 2) {
                                    optionsString += ',';
                                }
                                window['sectionsList'] = config.sections;
                                optionsString += prop + ": sectionsList";
                                break;

                            case 'headerTemplate':
                                if (optionsString.length > 2) {
                                    optionsString += ',';
                                }
                                if (config[prop]) {
                                    if (typeof config[prop] === "string") {

                                        //If a string is passed, assume it's the name of a function
                                        optionsString += prop + ": " + config[prop];
                                    } else if (config[prop].id) {

                                        //Another special case we accept is an object with an id and html property
                                        optionsString += prop + ": " + config[prop].id;
                                    } else {
                                        LiveUnit.Assert.fail("Oops! bad headerTemplate");
                                    }
                                }
                                break;

                            case 'sectionOnScreen':
                            case 'orientation':
                                if (optionsString.length > 2) {
                                    optionsString += ',';
                                }
                                optionsString += prop + ": \"" + config[prop] + "\"";
                                break;

                            default:
                                break;
                        }
                    }
                    optionsString += " }";

                    var hub = document.createElement("div");
                    hub.innerHTML = "\
                    <div class=\'myHub\' data-win-control=\'WinJS.UI.Hub\' data-win-options=\'" + optionsString + "\'>\
                    \
                    </div>\
                ";
                    testHost.appendChild(hub.firstElementChild);
                    WinJS.UI.processAll();
                    control = testHost.querySelector(".myHub").winControl;
                    break;

                case 'JS':
                default:
                    //ensure the Binding.Template is processed
                    WinJS.UI.processAll();

                    control = new WinJS.UI.Hub(null, config);
                    testHost.appendChild(control.element);
                    break;
            }
            return control;
        }

        export function verifyOrientation(control, expected) {
            LiveUnit.Assert.areEqual(expected, control.orientation, "Control orientation does not match config input");
            if (control.orientation === WinJS.UI.Orientation.horizontal) {
                LiveUnit.Assert.isTrue(control.element.className.indexOf("win-hub-horizontal") !== -1, "Expecting win-hub-horizontal CSS class");
            } else {
                LiveUnit.Assert.isTrue(control.element.className.indexOf("win-hub-vertical") !== -1, "Expecting win-hub-vertical CSS class");
            }
        }

        export function getAllHeaderElements(control) {
            return control.element.querySelectorAll("." + HubSection._ClassName.hubSectionHeader);
        }

        export function verifySections(control, sections, headerTemplate) {
            var sectionsInDOM = control.element.querySelectorAll("." + HubSection._ClassName.hubSection);

            //verify # of sections
            LiveUnit.Assert.areEqual(sections.length, control.sections.length, "Number of sections does not match config input");
            LiveUnit.Assert.areEqual(sections.length, sectionsInDOM.length || 0, "Number of sections in DOM does not match config input");

            //Verify header content
            for (var i = 0; i < sections.length; i++) {
                var currentSection = sectionsInDOM[i];
                switch (typeof headerTemplate) {
                    case "object":
                        var expectedHeader: any = document.createElement("div");
                        if (headerTemplate.render) {
                            headerTemplate.render(sections[i], expectedHeader);
                        } else if (headerTemplate.winControl && headerTemplate.winControl.render) {
                            headerTemplate.winControl.render(sections[i], expectedHeader);
                        } else {
                            LiveUnit.Assert.fail("Unrecognized headerTemplate");
                        }
                        LiveUnit.Assert.areEqual(expectedHeader.firstElementChild.innerHTML,
                            currentSection.querySelector("." + HubSection._ClassName.hubSectionHeaderContent).firstElementChild.innerHTML,
                            "Header content does not match input");
                        break;

                    default:
                        //simulate HubSection's header elements
                        var headerElement = document.createElement("button");
                        headerElement.innerHTML = '<span class="' + HubSection._ClassName.hubSectionHeaderContent + ' ' + HubSection._Constants.ellipsisTypeClassName + '"></span>';

                        var headerElementContent = <HTMLElement>headerElement.firstElementChild;
                        var expectedHeader = typeof headerTemplate === "string" ? eval(headerTemplate)(sections[i]) : headerTemplate(sections[i]);
                        headerElementContent.appendChild(expectedHeader);

                        LiveUnit.Assert.areEqual(headerElementContent.innerHTML,
                            currentSection.querySelector("." + HubSection._ClassName.hubSectionHeaderContent).innerHTML,
                            "Header content does not match input");
                }
            }
        }

        export function waitForReady(control, delay?) {
            return function (x?) {
                return new WinJS.Promise(function waitForReady_Promise(c, e, p) {
                    function waitForReady_handler(ev) {
                        if (control.loadingState === "complete") {
                            c(x);
                            control.removeEventListener(Hub._EventName.loadingStateChanged, waitForReady_handler);
                        } else {
                            p(control.loadingState);
                        }
                    }

                    function waitForReady_work() {
                        if (control.loadingState === "complete") {
                            c(x);
                        } else {
                            control.addEventListener(Hub._EventName.loadingStateChanged, waitForReady_handler);
                        }
                    }

                    if (delay >= 0) {
                        setTimeout(waitForReady_work, delay);
                    } else {
                        WinJS.Utilities._setImmediate(waitForReady_work);
                    }

                });
            };
        }

        export function getScrollRange(control) {
            var viewportElement = control.element.firstElementChild;
            var scrollMin = 0;
            var scrollMax = control.orientation === WinJS.UI.Orientation.vertical ?
                viewportElement.scrollHeight - viewportElement.clientHeight :
                viewportElement.scrollWidth - viewportElement.clientWidth;
            return {
                min: scrollMin,
                max: scrollMax
            };
        }

        export function getSurfaceSpacers(control) {
            var surface = control.element.querySelector("." + Hub._ClassName.hubSurface);
            var computedSurfaceStyles = getComputedStyle(surface);

            return {
                right: parseFloat(computedSurfaceStyles.marginRight) + parseFloat(computedSurfaceStyles.borderRightWidth) + parseFloat(computedSurfaceStyles.paddingRight),
                left: parseFloat(computedSurfaceStyles.marginLeft) + parseFloat(computedSurfaceStyles.borderLeftWidth) + parseFloat(computedSurfaceStyles.paddingLeft),
                bottom: parseFloat(computedSurfaceStyles.marginBottom) + parseFloat(computedSurfaceStyles.borderBottomWidth) + parseFloat(computedSurfaceStyles.paddingBottom),
                top: parseFloat(computedSurfaceStyles.marginTop) + parseFloat(computedSurfaceStyles.borderTopWidth) + parseFloat(computedSurfaceStyles.paddingTop)
            };
        }


        export function findCurrentSectionOnScreen(control) {
            function isSectionOnScreen(control, section, surfaceSpacers) {
                var isLTR = getComputedStyle(control.element).direction === "ltr";
                var currentSectionRect = section.getBoundingClientRect();
                var computedSectionStyle = getComputedStyle(section);
                var viewportRect = control._viewportElement.getBoundingClientRect();
                var offset;
                var collapsedSignificantEdgePosition;
                if (control.orientation === WinJS.UI.Orientation.horizontal) {
                    if (isLTR) {
                        offset = surfaceSpacers.left + viewportRect.left;
                        collapsedSignificantEdgePosition = currentSectionRect.right - parseFloat(computedSectionStyle.paddingRight) - parseFloat(computedSectionStyle.paddingLeft) - parseFloat(computedSectionStyle.borderRightWidth) - parseFloat(computedSectionStyle.borderLeftWidth);
                    } else {
                        //reflect every value so that the same return statement can be used
                        offset = surfaceSpacers.right - viewportRect.right;
                        collapsedSignificantEdgePosition = -(currentSectionRect.left - parseFloat(computedSectionStyle.paddingRight) - parseFloat(computedSectionStyle.paddingLeft) - parseFloat(computedSectionStyle.borderRightWidth) - parseFloat(computedSectionStyle.borderLeftWidth));
                    }
                } else { //control.orientation === WinJS.UI.Orientation.vertical
                    offset = surfaceSpacers.top + viewportRect.top;
                    collapsedSignificantEdgePosition = currentSectionRect.bottom - parseFloat(computedSectionStyle.paddingTop) - parseFloat(computedSectionStyle.paddingBottom) - parseFloat(computedSectionStyle.borderTopWidth) - parseFloat(computedSectionStyle.borderBottomWidth);
                }

                return (collapsedSignificantEdgePosition > offset);
            }

            var sectionElements = control.element.querySelectorAll("." + HubSection._ClassName.hubSection);
            var surfaceSpacers = this.getSurfaceSpacers(control);

            //walk up until we find the element which should be the sectionOnScreen, left edge should be closest to the left spacer
            var index = 0;
            var currentSection = sectionElements[index];
            while ((currentSection = sectionElements[index]) && !isSectionOnScreen(control, currentSection, surfaceSpacers)) {
                index++;
            }
            return index;
        }
    }
}