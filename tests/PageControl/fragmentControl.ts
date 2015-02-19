// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <deploy src="../TestData/" />
// <reference path="../TestData/page1.js" />
// <reference path="../TestData/page2.js" />

declare var fragmentWithExternalScriptAndStylesLoad;
declare var findmeInternal;
declare var fcc_initialize2;
declare var fcc_fireOnchange;
declare var fcc_getCount;
declare var PageControlsDemo;

module WinJSTests {

    "use strict";

    function pageNavigated(e) {
        // get the element where we want the fragment to load into
        var content = WinJS.Utilities.query("#pageContent")[0];
        WinJS.Utilities.empty(content);

        // Get the fragmentControl constructor by looking up the name of the member passed via the call to navigation().
        // For this to work, the control needs to be previously "defined" or loaded via WinJS.UI.Pages.define().  In this case
        // it got defined by global JS code when page1.js was included at the top of this test.
        var ctor = WinJS.Utilities.getMember(e.detail.location, PageControlsDemo);

        // render the control into the destination element.  Note the control returned from this
        // constructor can also be retrieved later via contentElement.winControl.
        new ctor(content);
    }


    export class FragmentControl {

        testFragmentControlBasicRender = function (complete) {
            var fragfile = "$(TESTDATA)/FragmentControlBasic.html";

            WinJS.UI.Pages._remove(fragfile);

            var d = document.createElement("div");
            WinJS.UI.Pages.render(fragfile, d).then(function () {
                var rendered = d.firstElementChild;
                LiveUnit.Assert.areEqual("This is just a test.", rendered.textContent);
            }).
                then(null, Helper.unhandledTestError).
                then(function () {
                    // cleanup
                    WinJS.UI.Pages._remove(fragfile);
                }).
                then(complete);
        };

        testFragmentControlBasicRenderHTMLBody = function (complete) {
            var fragfile = "$(TESTDATA)/FragmentBasic.html";
            WinJS.UI.Pages._remove(fragfile);

            var d = document.createElement("span");
            WinJS.UI.Pages.render(fragfile, d).then(function () {
                var rendered = d.firstElementChild;
                LiveUnit.Assert.areEqual("This is just a test.", rendered.textContent);
            }).then(null, Helper.unhandledTestError).then(complete);
        };

        testFragmentControlRemove = function (complete) {
            // remove clears the fragment from the cache and deletes item from viewmap
            var fragfile = "$(TESTDATA)/FragmentControlBasic.html";
            WinJS.UI.Pages._remove(fragfile);

            var d = document.createElement("div");
            var ctor = WinJS.UI.Pages.get(fragfile);
            var instance = new ctor(d);

            // fragment file should be present in the cache after calling constructor
            LiveUnit.Assert.isTrue(Helper.namedObjectContainsString(WinJS.UI.Fragments._cacheStore, fragfile) >= 0);

            instance.elementReady.then(function (element) {
                LiveUnit.Assert.isTrue(element === d);
            }).
                then(function () {
                    WinJS.UI.Pages._remove(fragfile);

                    // fragment file should no longer be in the cache after calling remove
                    LiveUnit.Assert.isFalse(Helper.namedObjectContainsString(WinJS.UI.Fragments._cacheStore, fragfile) >= 0);
                }).
                then(null, Helper.unhandledTestError).
                then(function () {
                    // cleanup
                    WinJS.UI.Pages._remove(fragfile);
                }).
                then(complete);
        };

        testFragmentControlBasicGet = function () {
            WinJS.UI.Pages._remove("$(TESTDATA)/FragmentControlBasic.html");
            LiveUnit.Assert.isTrue(WinJS.UI.Pages.get("FragmentControlBasic.html") !== undefined);
        };

        testElementReady = function (complete) {
            // verify elementReady promise returns rendered element, but processAll() + other has not been called
            var fragfile = "$(TESTDATA)/FragmentControlBasic.html";
            WinJS.UI.Pages._remove(fragfile);

            var d = document.createElement("div");
            var ctor = WinJS.UI.Pages.get(fragfile);
            var instance = new ctor(d);

            instance.elementReady.then(function (element) {
                LiveUnit.Assert.isTrue(element === d);
                LiveUnit.Assert.isTrue(element === instance.element);
                LiveUnit.Assert.areEqual("This is just a test.", element.childNodes[0].textContent);
                LiveUnit.Assert.areEqual(1, element.childNodes.length);
            }).
                then(null, Helper.unhandledTestError).
                then(function () {
                    // cleanup
                    WinJS.UI.Pages._remove(fragfile);
                }).
                then(complete);
        };

        testFragmentControlBasicInstance = function (complete) {
            // verify renderComplete promise returns rendered element
            var fragfile = "$(TESTDATA)/FragmentControlBasic.html";
            WinJS.UI.Pages._remove(fragfile);

            var d = document.createElement("div");
            var ctor = WinJS.UI.Pages.get(fragfile);
            var instance = new ctor(d);
            LiveUnit.Assert.isTrue(instance !== undefined);
            LiveUnit.Assert.isTrue(instance.element === d);
            LiveUnit.Assert.isTrue(instance.elementReady !== undefined);
            LiveUnit.Assert.isTrue(instance.renderComplete !== undefined);

            instance.renderComplete.then(function (docfrag) {
                LiveUnit.Assert.areEqual(docfrag.element, d, "expected return from renderComplete to be the dest element");

                var rendered = d.firstElementChild;
                LiveUnit.Assert.areEqual("This is just a test.", rendered.textContent);
            }).
                then(function () {
                    // cleanup
                    WinJS.UI.Pages._remove(fragfile);
                }).
                then(null, Helper.unhandledTestError).
                then(complete);
        };

        testRenderCompleteProcessAll = function (complete) {
            // verify renderComplete promise returns rendered element and that processAll() has been called
            var fragfile = "$(TESTDATA)/FragmentControlCombo.html";
            WinJS.UI.Pages._remove(fragfile);

            var d = document.createElement("div");
            document.body.appendChild(d);

            var ctor = WinJS.UI.Pages.get(fragfile);
            var instance = new ctor(d);
            LiveUnit.Assert.isTrue(instance !== undefined);
            LiveUnit.Assert.isTrue(instance.element === d);
            LiveUnit.Assert.isTrue(instance.elementReady !== undefined);
            LiveUnit.Assert.isTrue(instance.renderComplete !== undefined);

            instance.renderComplete.then(function () {
                // initialize the loaded fragment contents which looks for fragment elements that were just appended to the document
                fcc_initialize2();

                LiveUnit.Assert.areEqual(1, fcc_getCount(), "expecting count == 1 after renderComplete()");

                // make sure standard control events work
                LiveUnit.Assert.isNotNull(document.getElementById('fcc_testSelect'));
                fcc_fireOnchange(document.getElementById('fcc_testSelect'));
                LiveUnit.Assert.areEqual(2, fcc_getCount(), "expecting count == 2 after firing testSelect onchange");

                // make sure WinJS control events work
                var datepicker = document.getElementById("datepicker");
                LiveUnit.Assert.isNotNull(datepicker.querySelector('.win-datepicker-month'), "unable to query for month element");
                fcc_fireOnchange(datepicker.querySelector('.win-datepicker-month'));
                LiveUnit.Assert.areEqual(3, fcc_getCount(), "expecting count == 3 after firing onchange for month element");
            }).
                then(function () {
                    // cleanup
                    WinJS.UI.Pages._remove(fragfile);
                    WinJS.Utilities.disposeSubTree(d);
                    document.body.removeChild(d);
                }).
                then(null, Helper.unhandledTestError).
                then(complete);
        };


        testEmbeddedJSCSS = function (complete) {
            // load fragment with embedded JS and CSS, call fragment JS function, validate CSS
            var fragfile = "$(TESTDATA)/FragmentFindmeInternal.html";
            WinJS.UI.Pages._remove(fragfile);

            var d = document.createElement("div");
            document.body.appendChild(d);

            WinJS.UI.Pages.render(fragfile, d).
                then(function (docfrag) {
                    LiveUnit.Assert.isTrue(docfrag !== undefined, "expecting rendered fragment returned from render");
                    LiveUnit.Assert.isTrue(docfrag.element === d);

                    // call JS that got loaded up with the fragment
                    var x = findmeInternal();
                    LiveUnit.Assert.isTrue(x.id, "findmeInternal");

                    // make sure CSS was applied
                    Helper.Assert.areColorsEqual("rgb(255, 0, 0)", getComputedStyle(x).color);
                }).
                then(null, Helper.unhandledTestError).
                then(function () {
                    // clean up after the test
                    WinJS.UI.Pages._remove(fragfile);
                    WinJS.Utilities.disposeSubTree(d);
                    document.body.removeChild(d);
                }).
                then(complete);
        }

    testExternalJSCSS = function (complete) {
            // load fragment with links to external JS and CSS, call fragment JS function, validate CSS
            var fragfile = "$(TESTDATA)/FragmentWithExternalScriptAndStyles.html";
            WinJS.UI.Pages._remove(fragfile);

            var d = document.createElement("div");
            document.body.appendChild(d);

            WinJS.UI.Pages.render(fragfile, d).
                then(function (docfrag) {
                    LiveUnit.Assert.isTrue(docfrag !== undefined, "expecting rendered fragment returned from render");
                    LiveUnit.Assert.isTrue(docfrag.element === d);

                    // call JS that got loaded up with the fragment
                    fragmentWithExternalScriptAndStylesLoad(docfrag.element);
                    LiveUnit.Assert.areEqual(1, document.head.querySelectorAll("[data-magic='testFragmentWithExternalScriptAndStyles']").length, "should have cloned the custom attribute on style");
                    LiveUnit.Assert.areEqual(4, d.children.length, "Missing expected child");

                    // verify CSS was applied
                    return WinJS.Promise.timeout(500).then(function () {
                        Helper.Assert.areColorsEqual("rgb(255, 0, 0)", getComputedStyle(d.children[3]).backgroundColor, "Referenced style should have been applied and colored the generated element");
                        LiveUnit.Assert.areEqual("hit", d.children[3].textContent, "Loaded script should have run and updated the body for the generated element");
                    });
                }).
                then(null, Helper.unhandledTestError).
                then(function () {
                    // clean up after the test
                    WinJS.UI.Pages._remove(fragfile);
                    WinJS.Utilities.disposeSubTree(d);
                    document.body.removeChild(d);
                }).
                then(complete);
        }

    testEventOrdering = function (complete) {
            var fragfile = "foo";
            WinJS.UI.Pages._remove(fragfile);

            var d = document.createElement("div");
            var ctor = WinJS.UI.Pages.define(fragfile, {
                load: function (uri) {
                    LiveUnit.Assert.areEqual(0, options.stage);
                    options.stage++;
                    return "Some load result";
                },
                init: function (element, options) {
                    LiveUnit.Assert.areEqual(1, options.stage);
                    options.stage++;
                },
                render: function (element, options, loadResult) {
                    LiveUnit.Assert.areEqual(2, options.stage);
                    LiveUnit.Assert.areEqual("Some load result", loadResult);
                    options.stage++;

                    var content = document.createElement("div");
                    content.textContent = "hit";
                    element.appendChild(content);
                    return content;
                },
                processed: function (element, options) {
                    LiveUnit.Assert.areEqual(3, options.stage);
                    options.stage++;
                },
                ready: function (element, options) {
                    LiveUnit.Assert.areEqual(4, options.stage);
                    options.stage++;
                }
            });
            var options = { stage: 0 };
            var instance = new ctor(d, options);
            LiveUnit.Assert.isTrue(instance !== undefined);
            LiveUnit.Assert.isTrue(instance.element === d);
            LiveUnit.Assert.isTrue(instance.elementReady !== undefined);
            LiveUnit.Assert.isTrue(instance.renderComplete !== undefined);

            instance.renderComplete.then(function () {
                var rendered = d.firstElementChild;
                LiveUnit.Assert.areEqual("hit", rendered.textContent);
                LiveUnit.Assert.areEqual(5, options.stage);
            }).
                then(function () {
                    // clean up after the test
                    WinJS.UI.Pages._remove(fragfile);
                }).
                then(null, Helper.unhandledTestError).
                then(complete);
        };

        testErrorOrdering = function (complete) {
            var options = { stage: 0 };
            var fragfile = "foo";
            var stageError = 45;
            var err = -1;
            WinJS.UI.Pages._remove(fragfile);

            var d = document.createElement("div");
            var ctor = WinJS.UI.Pages.define(fragfile, {
                load: function (uri) {
                    LiveUnit.Assert.areEqual(0, options.stage);
                    if (options.stage === stageError) {
                        throw options.stage;
                    }
                    if (options.stage > stageError) {
                        LiveUnit.Assert.fail("error should have occured earlier and not propogated");
                    }
                    options.stage++;
                    return "Some load result";
                },
                init: function (element, options) {
                    LiveUnit.Assert.areEqual(1, options.stage);
                    if (options.stage === stageError) {
                        throw options.stage;
                    }
                    if (options.stage > stageError) {
                        LiveUnit.Assert.fail("error should have occured earlier and not propogated");
                    }
                    options.stage++;
                },
                render: function (element, options, loadResult) {
                    LiveUnit.Assert.areEqual(2, options.stage);
                    LiveUnit.Assert.areEqual("Some load result", loadResult);
                    if (options.stage === stageError) {
                        throw options.stage;
                    }
                    if (options.stage > stageError) {
                        LiveUnit.Assert.fail("error should have occured earlier and not propogated");
                    }
                    options.stage++;

                    var content = document.createElement("div");
                    content.textContent = "hit";
                    element.appendChild(content);
                    return content;
                },
                processed: function (element, options) {
                    LiveUnit.Assert.areEqual(3, options.stage);
                    if (options.stage === stageError) {
                        throw options.stage;
                    }
                    if (options.stage > stageError) {
                        LiveUnit.Assert.fail("error should have occured earlier and not propogated");
                    }
                    options.stage++;
                },
                ready: function (element, options) {
                    LiveUnit.Assert.areEqual(4, options.stage);
                    if (options.stage === stageError) {
                        throw options.stage;
                    }
                    if (options.stage > stageError) {
                        LiveUnit.Assert.fail("error should have occured earlier and not propogated");
                    }
                    options.stage++;
                },
                error: function (e) {
                    LiveUnit.Assert.isFalse(err >= 0, "error handler should only be called once");
                    LiveUnit.Assert.areEqual(stageError, e, "expected failure in appropriate stage");
                    err = e;
                    // "recover" by not returning error
                }
            });

            function allStages() {
                options = { stage: 0 };
                stageError = 5;
                var instance = new ctor(d, options);
                LiveUnit.Assert.isTrue(instance !== undefined);
                LiveUnit.Assert.isTrue(instance.element === d);
                LiveUnit.Assert.isTrue(instance.elementReady !== undefined);
                LiveUnit.Assert.isTrue(instance.renderComplete !== undefined);

                return instance.renderComplete.then(function () {
                    var rendered = d.firstElementChild;
                    LiveUnit.Assert.areEqual("hit", rendered.textContent);
                    LiveUnit.Assert.areEqual(5, options.stage);
                }).
                    then(function () {
                        // clean up after the test
                        WinJS.UI.Pages._remove(fragfile);
                    }).
                    then(null, Helper.unhandledTestError);
            }

            function failStage(num) {
                options = { stage: 0 };
                stageError = num;
                err = -1;
                var instance = new ctor(d, options);

                return instance.renderComplete.then(function () {
                    LiveUnit.Assert.areEqual(stageError, options.stage, "should have only completed up to the error stage");
                }).
                    then(null, function (e) {
                        LiveUnit.Assert.areEqual(stageError, e, "expected failure in appropriate stage");
                    }).
                    then(function () {
                        // clean up after the test
                        WinJS.UI.Pages._remove(fragfile);
                    }).
                    then(null, Helper.unhandledTestError);
            }

            allStages().then(function () {
                return failStage(0);
            }).then(function () {
                    return failStage(1);
                }).then(function () {
                    return failStage(2);
                }).then(function () {
                    return failStage(3);
                }).then(function () {
                    return failStage(4);
                }).then(function () {
                    complete();
                });

        };


        testSelfHost = function (complete) {
            var fragfile = "$(TESTDATA)/FragmentControlSelfHost.html";
            WinJS.UI.Pages._remove(fragfile);

            var iframe = document.createElement("iframe");

            var signal;
            var listener = function (m) {
                if (m.data === "FragmentControlSelfHost_ready:true") {
                    signal(true);
                } else if (m.data === "FragmentControlSelfHost_ready:false") {
                    LiveUnit.Assert.fail("Should not reach here!");
                }
            }
        var cleanup = function () {
                window.removeEventListener("message", listener);
                document.body.removeChild(iframe);
            }
        WinJS.Promise.timeout(5000, new WinJS.Promise(function (c) { signal = c; }))
                .then(
                function (result) {
                    LiveUnit.Assert.isTrue(result, "Should have recieved a message from the self-hosted fragment in the iframe");
                },
                function () {
                    LiveUnit.Assert.fail("Should not get here");
                }
                )
                .then(null, Helper.unhandledTestError)
                .then(cleanup)
                .then(complete);

            window.addEventListener("message", listener);
            document.body.appendChild(iframe);
            iframe.src = fragfile;
        }

    testSelfHostDocumentRunsWhenNotSelfHosted = function (complete) {
            // load fragment with links to external JS and CSS, call fragment JS function, validate CSS
            var fragfile = "$(TESTDATA)/FragmentControlNotSelfHost.html";
            WinJS.UI.Pages._remove(fragfile);

            var d = document.createElement("div");
            document.body.appendChild(d);

            WinJS.UI.Pages.render(fragfile, d).
                then(function (control: any) {
                    LiveUnit.Assert.isTrue(control !== undefined, "expecting rendered fragment returned from render");
                    LiveUnit.Assert.isTrue(control.element === d);
                    LiveUnit.Assert.isFalse(control.selfhost);
                    LiveUnit.Assert.isTrue(control.runWithoutSelfHost);
                }).
                then(null, Helper.unhandledTestError).
                then(function () {
                    // clean up after the test
                    WinJS.UI.Pages._remove(fragfile);
                    WinJS.Utilities.disposeSubTree(d);
                    document.body.removeChild(d);
                }).
                then(complete);
        }

        xtestPageControlScenario1 = function (complete) {
            // bug#522041 scripts get loaded twice if script tags differ by '\' or '/'
            // emulate usage scenario utilized in VS Templates
            WinJS.UI.Pages._remove("Page1");
            WinJS.Navigation.history = {};

            var contentElement = document.createElement("div");
            contentElement.setAttribute("id", "pageContent");
            document.body.appendChild(contentElement);

            WinJS.Navigation.addEventListener("navigated", pageNavigated);

            // pass the name of the Control to navigation.
            // Note: "Page1" is the member name inside the PageControlsDemo namespace defined by page1.js when it was
            // included at the top of this test
            WinJS.Navigation.navigate("Page1").
                then(function (navigationSuccess) {
                    LiveUnit.Assert.isTrue(navigationSuccess, "navigate(Page1) returned false");

                    // get the control that's been inserted into our content element
                    var pageControl = contentElement.winControl;
                    LiveUnit.Assert.isTrue(pageControl !== undefined, "pageControl is undefined");

                    // wait for the control to finish rendering, then verify content has been added to DOM
                    pageControl.renderComplete.then(function (fragment) {
                        // now we should have navigated to Page1
                        LiveUnit.Assert.isTrue(fragment.element.id == "pageContent", "expecting fragment.element.id == pageContent");

                        // verify content from page1.html is on the page
                        var page1Content = WinJS.Utilities.query(".page1")[0];
                        LiveUnit.Assert.isTrue(page1Content !== undefined);
                    }).
                        then(null, Helper.unhandledTestError).
                        then(function () {
                            // clean up after the test
                            WinJS.UI.Pages._remove(contentElement);
                            WinJS.Navigation.history = {};
                            WinJS.Navigation.removeEventListener("navigated", pageNavigated, true);
                        }).
                        then(complete);
                });
        };

        testRenderSetsWinControlOnHostElement = function (complete) {
            var fragfile = "$(TESTDATA)/FragmentControlBasic.html";

            WinJS.UI.Pages._remove(fragfile);

            var d = document.createElement("div");
            WinJS.UI.Pages.render(fragfile, d).then(function () {
                var rendered = d.firstElementChild;
                LiveUnit.Assert.areEqual("This is just a test.", rendered.textContent);
                LiveUnit.Assert.isTrue(d.winControl !== undefined);
            }).
                then(null, Helper.unhandledTestError).
                then(function () {
                    // cleanup
                    WinJS.UI.Pages._remove(fragfile);
                }).
                then(complete);
        };

        testNewInstanceSetsWinControlOnHostElement = function () {
            var fragfile = "$(TESTDATA)/FragmentControlBasic.html";
            WinJS.UI.Pages._remove(fragfile);

            var d = document.createElement("div");
            var ctor = WinJS.UI.Pages.get(fragfile);
            var instance = new ctor(d);

            LiveUnit.Assert.isTrue(d.winControl !== undefined);
            LiveUnit.Assert.areEqual(instance, d.winControl);
        };

        testDisposePageControl = function (complete) {
            var fragfile = "$(TESTDATA)/FragmentForDisposeTests.html";
            WinJS.UI.Pages._remove(fragfile);

            WinJS.UI.Pages.render(fragfile).then(function (page: any) {
                var count = 0;
                var disposeElement = page.element.querySelector("#dispose");
                for (var i = 0; i < disposeElement.children.length; i++) {
                    WinJS.Utilities.markDisposable(disposeElement.children[i], function () { count++ });
                }

                LiveUnit.Assert.isNotNull(page.dispose);
                page.dispose();
                LiveUnit.Assert.areEqual(disposeElement.children.length, count);

                WinJS.UI.Pages.render(fragfile).then(function (page2: any) {
                    LiveUnit.Assert.isFalse(page == page2);
                    LiveUnit.Assert.isFalse(page2._disposed);
                    complete();
                });
            });
        };

        testOverridePagePolicy = function () {
            var pageUri = "<notReal>";
            WinJS.UI.Pages._remove(pageUri);

            var customLoad = function () { };

            var Page = WinJS.UI.Pages.define(pageUri, {
                load: customLoad
            });

            LiveUnit.Assert.areEqual(customLoad, Page.prototype.load);

            Page = WinJS.UI.Pages.define(pageUri, {
                process: function () { }
            });

            LiveUnit.Assert.areEqual(customLoad, Page.prototype.load);

        };

        testHandleRenderErrors = function (complete) {
            var fragfile = "<not real>";

            WinJS.UI.Pages._remove(fragfile);
            var errorHandled = false;

            var d = document.createElement("div");
            WinJS.UI.Pages.render(fragfile, d).then(null, function(err) {
                    return err.page.readyComplete;
                }).
                then(null, function(err) {
                    errorHandled = true;
                }).
                then(function () {
                    // cleanup
                    WinJS.UI.Pages._remove(fragfile);
                    LiveUnit.Assert.isTrue(errorHandled);
                }).
                then(complete);
        };
    };
}
LiveUnit.registerTestClass("WinJSTests.FragmentControl");
