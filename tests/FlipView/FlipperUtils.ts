// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="../TestLib/Helper.ts"/>


module FlipperUtils {
    "use strict";

    // Time to wait if using custom animation that is instant.
    export var NAVIGATION_QUICK_TIMEOUT = 500;

    // Time to wait before any navigation should have completed (animations take 200ms by default).
    export var NAVIGATION_TIMEOUT = Math.min(NAVIGATION_QUICK_TIMEOUT, WinJS.UI._animationTimeAdjustment(3000));

    var mainFlipperDivId = "MainFlipperDiv";
    var utils = Helper;

    var FlipView = <typeof WinJS.UI.PrivateFlipView>WinJS.UI.FlipView;

    // Used for TestDataSource
    var controller = {
        directivesForMethod: function (method, args) {
            return {
                callMethodSynchronously: true,
                countBeforeDelta: 0,
                countAfterDelta: 0
            };
        }
    };

    // Flipper Events
    var pageVisibilityEvent = "pagevisibilitychanged";
    var datasourceChangedEvent = "datasourcecountchanged";
    var pageSelectedEvent = "pagecompleted";

    // This is declaration for checkComplete event handler used in navigation methods ensureNext, ensurePrevious and ensureCurrentPage.
    var checkComplete = {};

    // This will verify that the flipper actually flipped to the appropriate page for ensureNext and ensurePrevious.
    function VerifyLocationAfterFlip(flipper, expectedPage, callback) {
        flipper.removeEventListener(pageSelectedEvent, checkComplete, false);
        LiveUnit.LoggingCore.logComment("Flipper currentPage index after navigation: " + flipper.currentPage);
        LiveUnit.Assert.areEqual(expectedPage, flipper.currentPage, "Flipper currentPage should be at index " + expectedPage);
        callback();
    }

    // This will verify that the flipper actually flipped to the appropriate page for ensureCurrentPage.
    function VerifyLocationAfterJump(flipper, expectedPage, callback) {
        flipper.removeEventListener(pageSelectedEvent, checkComplete, false);
        LiveUnit.LoggingCore.logComment("Flipper currentPage index after navigation: " + flipper.currentPage);
        LiveUnit.Assert.areEqual(expectedPage, flipper.currentPage, "Flipper currentPage should be at index " + expectedPage);
        callback();
    }

    export function flipperData() {
        var data = [{ id: "page1", width: "99px", height: "100px", bgcolor: "#FF0000", content: "Page 1" },
            { id: "page2", width: "101px", height: "200px", bgcolor: "#00FF00", content: "Page 2" },
            { id: "page3", width: "200px", height: "101px", bgcolor: "#0000FF", content: "Page 3" },
            { id: "page4", width: "300px", height: "300px", bgcolor: "#FFFF00", content: "Page 4" },
            { id: "page5", width: "200px", height: "300px", bgcolor: "#FF00FF", content: "Page 5" },
            { id: "page6", width: "300px", height: "200px", bgcolor: "#00FFFF", content: "Page 6" },
            { id: "page7", width: "300px", height: "99px", bgcolor: "#AAFFAA", content: "Page 7" }
        ];

        return data;
    }

    export function flipperDataTemplate(itemPromise) {
        return itemPromise.then(function (item) {
            var div = document.createElement("div");
            div.setAttribute("id", item.data.id);
            div.style.width = item.data.width;
            div.style.height = item.data.height;
            div.style.backgroundColor = item.data.bgColor;
            div.textContent = item.data.content;
            return div;
        });
    }

    export function create2DFlipper(childInsertPage, parentOptions?, childOptions?) {
        function parentDataSource(numItems) {
            var testData = [];
            for (var i = 0; i < numItems; ++i) {
                if (i !== childInsertPage) {
                    testData.push({ title: "parentTitle" + i, content: "parentContent" });
                } else {
                    // The child flipper will be inserted at this page
                    testData.push({ title: "childFlipper", childFlipper: 1 });
                }
            }
            return new WinJS.Binding.List(testData).dataSource;
        }

        function childDataSource(numItems) {
            var testData = [];
            for (var i = 0; i < numItems; ++i) {
                testData.push({ title: "childTitle" + i, content: "childContent" });
            }
            return new WinJS.Binding.List(testData).dataSource;
        }

        function parentItemTemplate(itemPromise) {
            return itemPromise.then(function (item) {
                var result = document.createElement("div");
                result.setAttribute("id", item.data.title);

                if (item.data.childFlipper) {
                    if (!childOptions) {
                        childOptions = {};
                    }
                    childOptions.itemDataSource = childFlipperDataSource;
                    childOptions.itemTemplate = childItemTemplate;
                    var childFlipper = new FlipView(result, childOptions);
                    LiveUnit.Assert.isNotNull(childFlipper, "Child flipper element should not be null when instantiated.");
                    LiveUnit.Assert.isTrue(typeof childFlipper.next === "function", "Child flipper doesn't appear to be a valid flipper.");
                } else {
                    result.innerHTML =
                    "<div>" + item.data.title + "</div>" +
                    "<div>" + item.data.content + "</div>";
                }
                return result;
            });
        }

        function childItemTemplate(itemPromise) {
            return itemPromise.then(function (item) {
                var result = document.createElement("div");
                result.setAttribute("id", item.data.title);
                result.innerHTML =
                "<div>" + item.data.title + "</div>" +
                "<div>" + item.data.content + "</div>";
                return result;
            });
        }

        var parentItemCount = 10,
            childItemCount = parentItemCount / 2,
            parentFlipperDataSource = parentDataSource(parentItemCount),
            childFlipperDataSource = childDataSource(childItemCount);

        if (!parentOptions) {
            parentOptions = {};
        }
        parentOptions.itemDataSource = parentFlipperDataSource;
        parentOptions.itemTemplate = parentItemTemplate;
        var parentFlipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID(), parentOptions);

        LiveUnit.Assert.isNotNull(parentFlipper, "Parent flipper element should not be null when instantiated.");
        LiveUnit.Assert.isTrue(typeof parentFlipper.next === "function", "Parent flipper Doesn't appear to be a valid flipper.");

        return parentFlipper;
    }

    export function addFlipperDom(size = "200") {
        /// <summary>
        ///     Add a main flipper DOM from HTML
        /// </summary>

        LiveUnit.LoggingCore.logComment("Add Flipper div \"" + mainFlipperDivId + "\" to the DOM");
        var flipperNode = document.createElement("div");
        flipperNode.setAttribute("id", mainFlipperDivId);

        var htmlString = '<div id="flipper" style="width: ' + size + 'px; height: ' + size + 'px; overflow:hidden">';
        flipperNode.innerHTML = htmlString;
        document.body.appendChild(flipperNode);
    }

    export function basicFlipperHtmlIDs() {
        /// <summary>
        ///     Return div ID's for the divs in flipper page
        /// </summary>
        /// <returns type="array_object"/>

        return ['page1', 'page2', 'page3', 'page4', 'page5', 'page6', 'page7'];
    }

    export function basicFlipperID() {
        /// <summary>
        ///     Return flipper ID for the BasicFlipper.html file
        /// </summary>
        /// <returns type="string"/>

        return 'flipper';
    }

    export function ensureCurrentPage(flipper, index, callback) {
        /// <summary>
        ///     The FlipView's curentPage setter property is asynchronous.  This ensures that it is completed.
        /// </summary>
        /// <param name="flipper" type="object">
        ///     The FlipView object.
        /// </param>
        /// <param name="index" type="integer">
        ///     The index to jump to.
        /// </param>
        /// <param name="callback" type="function">
        ///      The test callback function for when navigation attempt is completed.
        /// </param>

        var expectedPage = (index < 0) ? 0 : index;
        flipper.count().then(function (count) {
            expectedPage = (index >= count) ? (count - 1) : index;
        });

        checkComplete = function (info) {
            VerifyLocationAfterJump(flipper, expectedPage, callback);
        };

        flipper.addEventListener(pageSelectedEvent, checkComplete, false);

        var lastPage = flipper.currentPage;
        LiveUnit.LoggingCore.logComment("Current page index is: " + lastPage);
        LiveUnit.LoggingCore.logComment("Attempt to set page index to: " + index);
        flipper.currentPage = index;
    }

    export function ensureNext(flipper, callback, expectedPage?) {
        /// <summary>
        ///     The FlipView's next function is asynchronous.  This ensures that it is completed.
        /// </summary>
        /// <param name="flipper" type="object">
        ///     The FlipView object.
        /// </param>
        /// <param name="callback" type="function">
        ///     The test callback function for when navigation attempt is completed.
        /// </param>
        /// <returns type="boolean">
        ///     Returns the value of the FlipView next method.
        /// </returns>

        if (typeof (expectedPage) !== 'number') {
            expectedPage = flipper.currentPage + 1;
        }

        checkComplete = function (info) {
            VerifyLocationAfterFlip(flipper, expectedPage, callback);
        };

        LiveUnit.LoggingCore.logComment("Flipper currentPage index before flip to next: " + flipper.currentPage);
        flipper.addEventListener(pageSelectedEvent, checkComplete, false);
        var flipSuccess = flipper.next();
        LiveUnit.LoggingCore.logComment("Flipper next method returned: " + flipSuccess);
        if (!flipSuccess) {
            LiveUnit.LoggingCore.logComment("Waiting " + NAVIGATION_TIMEOUT + "ms to ensure event doesn't fire.");
            setTimeout(function () {
                flipper.removeEventListener(pageSelectedEvent, checkComplete, false);
                callback();
            }, NAVIGATION_TIMEOUT);
        }
        return flipSuccess;
    }

    export function ensurePrevious(flipper, callback, expectedPage?) {
        /// <summary>
        ///     The FlipView's previous function is asynchronous.  This ensures that it is completed.
        /// </summary>
        /// <param name="flipper" type="object">
        ///     The FlipView object.
        /// </param>
        /// <param name="callback" type="function">
        ///      The test callback function for when navigation attempt is completed.
        /// </param>
        /// <returns type="boolean">
        ///     Returns the value of the FlipView previous method.
        /// </returns>

        if (typeof (expectedPage) !== 'number') {
            expectedPage = flipper.currentPage - 1;
        }

        checkComplete = function (info) {
            VerifyLocationAfterFlip(flipper, expectedPage, callback);
        };

        flipper.addEventListener(pageSelectedEvent, checkComplete, false);
        LiveUnit.LoggingCore.logComment("Flipper currentPage index before flip to previous: " + flipper.currentPage);
        var flipSuccess = flipper.previous();
        LiveUnit.LoggingCore.logComment("Flip to Previous page returned: " + flipSuccess);
        if (!flipSuccess) {
            LiveUnit.LoggingCore.logComment("Waiting " + NAVIGATION_TIMEOUT + "ms to ensure event doesn't fire.");
            setTimeout(function () {
                flipper.removeEventListener(pageVisibilityEvent, checkComplete, false);
                callback();
            }, NAVIGATION_TIMEOUT);
        }
        return flipSuccess;
    }

    export function instantiate(elementID, options?) {
        /// <summary>
        ///     Instantiates a flipper object
        /// </summary>
        /// <param name="elementID" type="string">
        ///     The element ID to instantiate the flipper onto.
        /// </param>
        /// <param name="elementID" type="string">
        ///     Flipper object options used to instantiate the flipper.
        /// </param>
        /// <returns type="flipper_object"/>

        var paramObject = {};

        // Set defaults for verify variables
        var currentPageVerify = 0;
        var orientationVerify = "horizontal";
        var itemSpacingVerify = 0;
        var itemDataSource = new WinJS.Binding.List(FlipperUtils.flipperData()).dataSource;
        var itemTemplate = FlipperUtils.flipperDataTemplate;
        var defaultData = true;

        // Get all the passed options
        if (options) {
            if (options.currentPage) {
                var flipperCount = FlipperUtils.flipperData().length;
                currentPageVerify = ((options.currentPage < flipperCount) ? options.currentPage : 0);
            }
            if (options.orientation) {
                orientationVerify = options.orientation;
            }
            if (options.itemSpacing) {
                itemSpacingVerify = options.itemSpacing;
            }
            if (options.itemDataSource) {
                itemDataSource = options.itemDataSource;
                defaultData = false;
            }
            if (options.itemTemplate) {
                itemTemplate = options.itemTemplate;
                defaultData = false;
            }
        }
        else {
            options = {};
        }

        // Add the datasource and template to the options
        // This ensures a datasource and template even if options === undefined
        options.itemDataSource = itemDataSource;
        options.itemTemplate = itemTemplate;

        LiveUnit.LoggingCore.logComment("Flipper will be instantiated with the following options:");
        if (options.currentPage) {
            LiveUnit.LoggingCore.logComment("  currentPage: " + options.currentPage);
        }
        else {
            LiveUnit.LoggingCore.logComment("  currentPage: " + currentPageVerify);
        }
        if (options.orientation) {
            LiveUnit.LoggingCore.logComment("  orientation: " + options.orientation);
        }
        else {
            LiveUnit.LoggingCore.logComment("  orientation: " + orientationVerify);
        }
        if (options.itemSpacing) {
            LiveUnit.LoggingCore.logComment("  itemSpacing: " + options.itemSpacing);
        }
        else {
            LiveUnit.LoggingCore.logComment("  itemSpacing: " + itemSpacingVerify);
        }
        if (defaultData) {
            LiveUnit.LoggingCore.logComment("Using the default itemDataSource and itemTemplate");
        }
        else {
            LiveUnit.LoggingCore.logComment("NOT using the default itemDataSource and itemTemplate");
        }

        LiveUnit.LoggingCore.logComment("Getting the flipper element by ID:" + elementID);
        var flipperElement = document.getElementById(elementID);
        LiveUnit.Assert.isTrue(flipperElement !== null, "Unable to find " + elementID + " in the DOM");
        LiveUnit.LoggingCore.logComment("Instantiate the flipper.");

        var start = new Date(),
            end;
        var flipper = new FlipView(flipperElement, options);

        var fastCustomAnimations = {
            next: function () {
                return WinJS.Promise.wrap();
            },
            previous: function () {
                return WinJS.Promise.wrap();
            },
            jump: function () {
                return WinJS.Promise.wrap();
            },
        };
        flipper.setCustomAnimations(fastCustomAnimations);

        if (flipper) {
            LiveUnit.LoggingCore.logComment("Flipper has been instantiated.");

            LiveUnit.LoggingCore.logComment("Flipper orientation is: " + flipper.orientation);
            LiveUnit.Assert.isTrue(flipper.orientation === orientationVerify, "Flipper orientation is not " + orientationVerify);
            LiveUnit.LoggingCore.logComment("Flipper itemSpacing is: " + flipper.itemSpacing);
            LiveUnit.Assert.isTrue(flipper.itemSpacing === itemSpacingVerify, "Flipper itemSpacing is not " + itemSpacingVerify);
            LiveUnit.LoggingCore.logComment("Flipper currentPage is: " + flipper.currentPage);
            LiveUnit.Assert.isTrue(flipper.currentPage === currentPageVerify, "Flipper currentPage is not " + currentPageVerify);
            FlipperUtils.verifyFlipperDomAccessibility(elementID);
        }
        else {
            LiveUnit.LoggingCore.logComment("Unable to instantiate Flipper.");
        }

        return flipper;
    }

    export function isFlipperItemVisible(elementID) {
        /// <summary>
        ///     Check if current flipper element is visible via DOM validation. This function depends ///     upon the implementation details of flipper.
        /// </summary>
        /// <param name="elementID" type="string">
        ///     The element ID of the flipper item to check.
        /// </param>
        /// <returns type="boolean"/>

        var flipperElement = document.getElementById(elementID);

        if (flipperElement !== null) {
            var flipper = document.getElementById(FlipperUtils.basicFlipperID()).winControl;
            var parents = <HTMLElement>flipperElement.parentNode.parentNode.parentNode;
            var offsetLeft = parents.offsetLeft;
            var offsetRight = offsetLeft + parents.offsetWidth;
            // _panningDivContainer is a private property and can change depending upon the implementation.
            // If failing, check with the dev if this is still the right way to obtain the panning div
            // Right now (beta milestone), this info can be found in FlipperHelpers.js file in the dev
            // unittests
            var panningDivScrollLeft = WinJS.Utilities.getScrollPosition(flipper._panningDivContainer).scrollLeft;
            var panningDivScrollRight = panningDivScrollLeft + flipper._panningDivContainer.offsetWidth;

            LiveUnit.LoggingCore.logComment("offsetLeft: " + offsetLeft);
            LiveUnit.LoggingCore.logComment("offsetRight: " + offsetRight);
            LiveUnit.LoggingCore.logComment("panningDivScrollLeft: " + panningDivScrollLeft);
            LiveUnit.LoggingCore.logComment("panningDivScrollRight: " + panningDivScrollRight);
            LiveUnit.LoggingCore.logComment("Check: (" + offsetRight + " > " + panningDivScrollLeft + ") && (" + offsetLeft + " < " + panningDivScrollRight + ")");

            if ((offsetRight > panningDivScrollLeft) && (offsetLeft < panningDivScrollRight)) {
                LiveUnit.LoggingCore.logComment(elementID + ": In view.");
                return true;
            }
            else {
                LiveUnit.LoggingCore.logComment(elementID + ": In DOM but not in view.");
                return false;
            }
        }
        LiveUnit.LoggingCore.logComment(elementID + ": Not in DOM or in view.");
        return false;
    }

    export function removeFlipperDom() {
        /// <summary>
        ///     Remove the flipper HTML from the DOM
        /// </summary>
        var flipperElement = document.getElementById(mainFlipperDivId);

        LiveUnit.LoggingCore.logComment("Remove Flipper div \"" + mainFlipperDivId + "\" from the DOM");
        flipperElement.parentNode.removeChild(flipperElement);
    }

    export function verifyFlipperDomAccessibility(elementID) {
        /// <summary>
        ///     Verify that the Flipper elements in the DOM have appropriate accessibility attributes.
        ///     This inclues ARIA, role and tabindex properties.
        /// <param name="elementID" type="string">
        ///     The element ID of the flipper item to check.
        /// </param>
        /// </summary>
        var flipperElement = document.getElementById(elementID);
        LiveUnit.LoggingCore.logComment("Verifying ARIA and Accessibility properties on flipper object...");
        var flipper = flipperElement.winControl;
        if (flipper.orientation === "horizontal") {
            var prevInfo = <HTMLElement>flipperElement.getElementsByClassName("win-navleft")[0];
            var nextInfo = <HTMLElement>flipperElement.getElementsByClassName("win-navright")[0];
        }
        else {
            var prevInfo = <HTMLElement>flipperElement.getElementsByClassName("win-navtop")[0];
            var nextInfo = <HTMLElement>flipperElement.getElementsByClassName("win-navbottom")[0];
        }

        var accessibleFlipper = {
            label: flipperElement.getAttribute("aria-label"),
            role: flipperElement.getAttribute("role"),
            tabindex: flipperElement.getAttribute("tabindex"),
            prevlabel: prevInfo.getAttribute("aria-label"),
            nextlabel: nextInfo.getAttribute("aria-label"),
            prevhidden: prevInfo.getAttribute("aria-hidden"),
            nexthidden: nextInfo.getAttribute("aria-hidden")
        };

        // Defined ARIA labels per specification
        var horizontalFlipViewLabel = "",
            verticalFlipViewLabel = "",
            previousButtonLabel = "Previous",
            nextButtonLabel = "Next",
            roleLabel = "listbox";

        LiveUnit.LoggingCore.logComment("Flipper: ARIA label: " + accessibleFlipper.label)
            if (flipper.orientation === "horizontal") {
            LiveUnit.Assert.areEqual(horizontalFlipViewLabel, accessibleFlipper.label, "Flipper: ARIA label is not correct.");
        }
        else {
            LiveUnit.Assert.areEqual(verticalFlipViewLabel, accessibleFlipper.label, "Flipper: ARIA label is not correct.");
        }
        LiveUnit.LoggingCore.logComment("Flipper: role: " + accessibleFlipper.role)
            LiveUnit.Assert.areEqual(roleLabel, accessibleFlipper.role, "Flipper: role is not correct.");
        LiveUnit.LoggingCore.logComment("Flipper: tabindex: " + accessibleFlipper.tabindex)

            // Ensure that tabindex starts at 0 unless it's parent is -1
            LiveUnit.Assert.areEqual("-1", accessibleFlipper.tabindex, "Flipper: tabindex is not correct.");
        /*
        if(flipperElement.parentNode.getAttribute("tabindex") === "-1") {
            LiveUnit.Assert.areEqual("-1", accessibleFlipper.tabindex, "Flipper: tabindex is not correct.");
        }
        else {
            LiveUnit.Assert.areEqual("0", accessibleFlipper.tabindex, "Flipper: tabindex is not correct.");
        }
        */

        LiveUnit.LoggingCore.logComment("Previous Button: ARIA label: " + accessibleFlipper.prevlabel)
            LiveUnit.Assert.areEqual(previousButtonLabel, accessibleFlipper.prevlabel, "Previous Button: ARIA label is not correct.");
        LiveUnit.LoggingCore.logComment("Next Button: ARIA label: " + accessibleFlipper.nextlabel)
            LiveUnit.Assert.areEqual(nextButtonLabel, accessibleFlipper.nextlabel, "Next Button: ARIA label is not correct.");
        LiveUnit.LoggingCore.logComment("Previous Button: hidden: " + accessibleFlipper.prevhidden)
            LiveUnit.Assert.isNotNull(accessibleFlipper.prevhidden, "Next Button: hidden is not correct.");
        LiveUnit.LoggingCore.logComment("Next Button: hidden: " + accessibleFlipper.nexthidden)
            LiveUnit.Assert.isNotNull(accessibleFlipper.nexthidden, "Next Button: hidden is not correct.");
    }

    export function simpleArrayRenderer(itemPromise) {
        /// <summary>
        ///     Custom Item Renderer for the CommonUtil simpleArraryDataSource.
        /// </summary>

        return itemPromise.then(function (item) {
            var result = document.createElement("div");

            // The title is unique for each dataObject and is being used as the ID
            // so it can be easily looked up later for validation.
            result.setAttribute("id", item.data.title);
            result.innerHTML =
            "<div>" + item.data.title + "</div>" +
            "<div>" + item.data.content + "</div>";
            return result;
        });
    }

    export function simpleArrayData(totalItems): { title: string; content: string; }[] {
        /// <summary>
        ///     Simple array data object used for manipulation tests against a TestDataSource.
        /// <param name="totalItems" type="integer">
        ///     The number of array elements to create.
        /// </param>
        /// </summary>
        var data = [];
        for (var i = 0; i < totalItems; ++i) {
            data.push({ title: "Title" + i, content: "Content" + i });
        }
        return data;
    }

    export function getAllItemsFromDataSource(itemDataSource) {
        /// <summary>
        ///     Will return a list of all items from the datasource.
        /// <param name="itemDataSource" type="DataSourceObject">
        ///     An object to a datasource.
        /// </param>
        /// <returns>
        ///     A list of all items in the datasource.
        /// </returns>
        /// </summary>

        /*
        var items = [],
            listBinding = itemDataSource.createListBinding(),
            remaining = true;

        for (var itemPromise = listBinding.first(); remaining; itemPromise = listBinding.next()) {
            items.push(itemPromise);

            itemPromise.then(function (item) {
                if (item) {
                    items.push(item);
                } else {
                    remaining = false;
                }
            });
        }
        listBinding.release();
        return items;
        */

        return itemDataSource.getCount().then(function (count) {
            var listBinding = itemDataSource.createListBinding(),
                promises = [];

            listBinding.jumpToItem(listBinding.first()).then(function () {
                for (var i = 0; i < count; i++) {
                    promises.push(listBinding.current());
                    listBinding.next();
                }
            });
            listBinding.release();
            return WinJS.Promise.join(promises);
        });
    }

    export function insertItem(insertAction, onSuccess, onError, setEventHandlers?) {
        /// <summary>
        ///     Attempt to insert an item based on the insertAction passed in.
        ///     Then verify the results of the insert and ensure the insert really happened.
        /// <param name="insertAction" type="string">
        ///     Valid options are "InsertAtStart", "InsertAtEnd", "InsertBefore", "InsertAfter"
        /// </param>
        /// <param name="onSuccess" type="callback_function">
        ///     A function to call when the change has completed successfully.
        /// </param>
        /// <param name="onError" type="callback_function">
        ///     A function to call when an error occurs.
        /// </param>
        /// <param name="setEventHandlers" optional="true" type="function">
        ///     A function passed in that will set up event handlers.
        /// </param>
        /// </summary>
        var totalItems = 10,
            itemDataSourceObject = new WinJS.Binding.List(FlipperUtils.simpleArrayData(totalItems)).dataSource,
            errors = [],
            verifyPosition,
            flipper,
            insertData = { title: insertAction, content: insertAction },
            flipperDiv = document.getElementById(FlipperUtils.basicFlipperID());

        // Setup event handlers if passed in.
        if (setEventHandlers) {
            setEventHandlers(FlipperUtils.basicFlipperID());
        }

        var action = LiveUnit.GetWrappedCallback(function () {
            if (!flipper) {
                LiveUnit.Assert.fail("Flipper object is invalid");
            }
            flipper.removeEventListener(pageSelectedEvent, action);

            // Retrieve all items from datasource for logging purposes.
            LiveUnit.LoggingCore.logComment("DataSource Object Before " + insertAction);
            FlipperUtils.getAllItemsFromDataSource(itemDataSourceObject).then(function (items) {
                for (var i = 0; i < items.length; i++) {
                    LiveUnit.LoggingCore.logComment("key: " + items[i].key + ", title: " + items[i].data.title);
                }
            });

            // Setup verify variables to check against after inserting items around.
            LiveUnit.LoggingCore.logComment(insertAction + ": Attempting to insert item...");

            var verifydschanged = LiveUnit.GetWrappedCallback(function (ev) {
                Complete();
            });
            flipper.addEventListener(datasourceChangedEvent, verifydschanged);

            switch (insertAction) {
                case "InsertAtStart":
                    verifyPosition = 0;
                    itemDataSourceObject.insertAtStart(null, insertData).
                        then(null, Error);
                    break;

                case "InsertAtEnd":
                    verifyPosition = totalItems;
                    itemDataSourceObject.insertAtEnd(null, insertData).
                        then(null, Error);
                    break;

                case "InsertBefore":
                    verifyPosition = Math.floor(totalItems / 2);
                    itemDataSourceObject.itemFromIndex(verifyPosition).then(function (item) {
                        itemDataSourceObject.insertBefore(null, insertData, item.key).
                            then(null, Error);
                    }, Error);
                    break;

                case "InsertAfter":
                    verifyPosition = Math.floor(totalItems / 2) + 1;
                    itemDataSourceObject.itemFromIndex(verifyPosition - 1).then(function (item) {
                        itemDataSourceObject.insertAfter(null, insertData, item.key).
                            then(null, Error);
                    }, Error);
                    break;

                default:
                    LiveUnit.Assert.fail(insertAction + ": Unrecognized insert action.");
            }
        });
        flipperDiv.addEventListener(pageSelectedEvent, action, false);

        flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID(), { itemDataSource: itemDataSourceObject, itemTemplate: FlipperUtils.simpleArrayRenderer });
        LiveUnit.Assert.isNotNull(flipper, "Flipper element should not be null when instantiated.");

        // This must run after all promises have completed.
        var timeout = setTimeout(function () {
            if (errors[0]) {
                LiveUnit.LoggingCore.logComment("Errors Detected.");
                onError(errors);
            }
            else {
                LiveUnit.LoggingCore.logComment("Edit successful.");
                onSuccess();
            }
            // Setting the timeout to 2 x NAVIGATION_TIMEOUT as datasourcecountchanged takes a long time to fire.
            // If the timeout is less, the test moves on and then event listener is executed causing the subsequent tests to fail
        }, 2 * NAVIGATION_TIMEOUT);

        // The Promise.then onError function that is called if an error occurred on the manipulation action.
        function Error(error) {
            errors.push(error);
        }

        function Complete() {
            // Retrieve all items from datasource for logging purposes.
            LiveUnit.LoggingCore.logComment("DataSource Object After " + insertAction);
            FlipperUtils.getAllItemsFromDataSource(itemDataSourceObject).then(function (items) {
                for (var i = 0; i < items.length; i++) {
                    LiveUnit.LoggingCore.logComment("key: " + items[i].key + ", title: " + items[i].data.title);
                }
            });


            itemDataSourceObject.itemFromIndex(verifyPosition).then(function (item) {
                var verifyItem = item;

                if (verifyItem.data.title === insertData.title) {
                    LiveUnit.LoggingCore.logComment(insertAction + ": Insert succeeded.");

                    // Now verify the flipper.
                    var currentPosition = flipper.currentPage;
                    LiveUnit.LoggingCore.logComment("Current position: " + currentPosition);
                    LiveUnit.LoggingCore.logComment("Data inserted at position: " + verifyPosition);
                    LiveUnit.LoggingCore.logComment("Attempt flip to new position...");

                    var verify = LiveUnit.GetWrappedCallback(function (ev) {
                        var newPosition = flipper.currentPage;
                        LiveUnit.LoggingCore.logComment("Flipper is now at position: " + newPosition);
                        LiveUnit.Assert.isTrue(newPosition === verifyPosition, "New position is not at correct position.");
                        LiveUnit.LoggingCore.logComment("Verify data at current position...");

                        var element = flipper._pageManager._currentPage.element.firstElementChild;
                        LiveUnit.Assert.isTrue(element.id === insertData.title, "Flipper pageManager is not showing data at current position.");
                        LiveUnit.Assert.isTrue(FlipperUtils.isFlipperItemVisible(insertData.title), "Flipper is not showing correct data.");
                    });
                    FlipperUtils.ensureCurrentPage(flipper, verifyPosition, verify);
                }
                else {
                    LiveUnit.LoggingCore.logComment("Data that was inserted was not at the location it was expected to be at.");
                    LiveUnit.LoggingCore.logComment("Expected Position: " + verifyPosition);
                    LiveUnit.LoggingCore.logComment("Expected title of data inserted: " + insertData.title);
                    LiveUnit.LoggingCore.logComment("Actual title of data at expected position: " + verifyItem.data.title);
                    LiveUnit.Assert.fail(insertAction + ": Failed to insert item.");
                }
            }, Error);
        }
    }

    export function moveItem(moveAction, onSuccess, onError, setEventHandlers?) {
        /// <summary>
        ///     Attempt to move an item based on the moveAction passed in.
        ///     Then verify the results of the move and ensure the move really happened.
        ///     Passing signalTestCaseCompleted function allows it to be called later when the verification in the callbacks are completed.
        /// <param name="moveAction" type="string">
        ///     Valid options are "MoveToStart", "MoveToEnd", "MoveBefore", "MoveAfter"
        /// </param>
        /// <param name="onSuccess" type="callback_function">
        ///     A function to call when the change has completed successfully.
        /// </param>
        /// <param name="onError" type="callback_function">
        ///     A function to call when an error occurs.
        /// </param>
        /// <param name="setEventHandlers" optional="true" type="function">
        ///     A function passed in that will set up event handlers.
        /// </param>
        /// </summary>
        var totalItems = 10,
            itemDataSourceObject = new WinJS.Binding.List(FlipperUtils.simpleArrayData(totalItems)).dataSource,
            movePosition,
            verifyPosition,
            errors = [],
            flipperDiv = document.getElementById(FlipperUtils.basicFlipperID()),
            moveData;

        // Setup event handlers if passed in.
        if (setEventHandlers) {
            setEventHandlers(FlipperUtils.basicFlipperID());
        }

        var action = LiveUnit.GetWrappedCallback(function () {
            if (!flipper) {
                LiveUnit.Assert.fail("Flipper object is invalid");
            }
            flipper.removeEventListener(pageSelectedEvent, action);

            // Retrieve all items from datasource for logging purposes.
            LiveUnit.LoggingCore.logComment("DataSource Object Before " + moveAction);
            FlipperUtils.getAllItemsFromDataSource(itemDataSourceObject).then(function (items) {
                for (var i = 0; i < items.length; i++) {
                    LiveUnit.LoggingCore.logComment("key: " + items[i].key + ", title: " + items[i].data.title);
                }
            });
            // Setup verify variables to check against after moving items around.
            LiveUnit.LoggingCore.logComment(moveAction + ": Attempting to move item...");

            switch (moveAction) {
                case "MoveToStart":
                    verifyPosition = 0;
                    itemDataSourceObject.itemFromIndex(totalItems / 2).then(function (item) {
                        moveData = item;
                        itemDataSourceObject.moveToStart(item.key).
                            then(Complete, Error).
                            then(null, Error);
                    }, Error);
                    break;

                case "MoveToEnd":
                    verifyPosition = totalItems - 1;
                    itemDataSourceObject.itemFromIndex(totalItems / 2).then(function (item) {
                        moveData = item;
                        itemDataSourceObject.moveToEnd(item.key).
                            then(Complete, Error).
                            then(null, Error);
                    }, Error);
                    break;

                case "MoveBefore":
                    // Grab the data item that you want to move from
                    itemDataSourceObject.itemFromIndex(totalItems / 2).then(function (moveDataItem) {
                        // Data being moved
                        moveData = moveDataItem;
                        // Data being moved to
                        movePosition = Math.floor((totalItems / 2) / 2);
                        verifyPosition = movePosition;
                        // Grab the data that you want to move to
                        itemDataSourceObject.itemFromIndex(movePosition).then(function (movePositionItem) {
                            itemDataSourceObject.moveBefore(moveDataItem.key, movePositionItem.key).
                                then(Complete, Error).
                                then(null, Error);
                        }, Error);
                    }, Error);
                    break;

                case "MoveAfter":
                    // Grab the data item that you want to move from
                    itemDataSourceObject.itemFromIndex(totalItems / 2).then(function (moveDataItem) {
                        // Data being moved
                        moveData = moveDataItem;
                        // Data being moved to
                        movePosition = Math.floor((totalItems / 2) / 2);
                        verifyPosition = movePosition + 1;
                        // Grab the data that you want to move to
                        itemDataSourceObject.itemFromIndex(movePosition).then(function (movePositionItem) {
                            itemDataSourceObject.moveAfter(moveDataItem.key, movePositionItem.key).
                                then(Complete, Error).
                                then(null, Error);
                        }, Error);
                    }, Error);
                    break;

                default:
                    LiveUnit.Assert.fail(moveAction + ": Unrecognized move action.");
            }
        });
        flipperDiv.addEventListener(pageSelectedEvent, action);

        var flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID(), { itemDataSource: itemDataSourceObject, itemTemplate: FlipperUtils.simpleArrayRenderer });
        LiveUnit.Assert.isNotNull(flipper, "Flipper element should not be null when instantiated.");

        // This must run after all promises have completed.
        var timeout = setTimeout(function () {
            if (errors[0]) {
                LiveUnit.LoggingCore.logComment("Errors Detected.");
                onError(errors);
            }
            else {
                LiveUnit.LoggingCore.logComment("Edit successful.");
                onSuccess();
            }
            // Setting the timeout to 3 x NAVIGATION_TIMEOUT as complete takes a long time to fire.
            // If the timeout is less, the test moves on and then event listener is executed causing the subsequent tests to fail
        }, 3 * NAVIGATION_TIMEOUT);

        // The Promise.then onError function that is called if an error occurred on the manipulation action.
        function Error(error) {
            errors.push(error);
        }

        // The Promise.then onComplete function that determines whether the edit was successful or not.
        function Complete() {
            // Retrieve all items from datasource for logging purposes.
            LiveUnit.LoggingCore.logComment("DataSource Object After " + moveAction);
            FlipperUtils.getAllItemsFromDataSource(itemDataSourceObject).then(function (items) {
                for (var i = 0; i < items.length; i++) {
                    LiveUnit.LoggingCore.logComment("key: " + items[i].key + ", title: " + items[i].data.title);
                }
            });

            itemDataSourceObject.itemFromIndex(verifyPosition).then(function (item) {
                var verifyItem = item;

                if (verifyItem.data.title === moveData.data.title) {
                    LiveUnit.LoggingCore.logComment(moveAction + ": Move succeeded.");
                    // Now verify the flipper.
                    var currentPosition = flipper.currentPage;
                    LiveUnit.LoggingCore.logComment("Current position: " + currentPosition);
                    LiveUnit.LoggingCore.logComment("Verifying at position: " + verifyPosition);
                    LiveUnit.LoggingCore.logComment("Attempt flip to new position...");
                    FlipperUtils.ensureCurrentPage(flipper, verifyPosition, CurrentPageCompleted);
                }
                else {
                    LiveUnit.LoggingCore.logComment("Data that was moved was not at the location it was expected to be at.");
                    LiveUnit.LoggingCore.logComment("Expected Position: " + verifyPosition);
                    LiveUnit.LoggingCore.logComment("Expected title of data moved: " + moveData.data.title);
                    LiveUnit.LoggingCore.logComment("Actual title of data at expected position: " + verifyItem.data.title);
                    LiveUnit.Assert.fail(moveAction + ": Failed to move item.");
                }

                function CurrentPageCompleted() {
                    var newPosition = flipper.currentPage;
                    LiveUnit.LoggingCore.logComment("Flipper is now at position: " + newPosition);
                    LiveUnit.Assert.isTrue(newPosition === verifyPosition, "New position is not at correct position.");
                    LiveUnit.LoggingCore.logComment("Verify data at current position...");

                    var element = flipper._pageManager._currentPage.element.firstElementChild;
                    LiveUnit.Assert.isTrue(element.id === moveData.data.title, "Flipper pageManager is not showing data at current position.");
                    LiveUnit.Assert.isTrue(FlipperUtils.isFlipperItemVisible(moveData.data.title), "Flipper is not showing correct data.");
                }
            }, Error);
        }
    }

    export function removeItem(removeAction, onSuccess, onError, setEventHandlers?) {
        /// <summary>
        ///     Attempt to remove an item based on the removeAction passed in.
        ///     Then verify the results of the remove and ensure the remove really happened.
        ///     Passing signalTestCaseCompleted function allows it to be called later when the verification in the callbacks are completed.
        /// <param name="removeAction" type="string">
        ///     Valid options are "RemoveFromStart", "RemoveFromEnd", "RemoveFromMiddle"
        /// </param>
        /// <param name="onSuccess" type="callback_function">
        ///     A function to call when the change has completed successfully.
        /// </param>
        /// <param name="onError" type="callback_function">
        ///     A function to call when an error occurs.
        /// </param>
        /// <param name="setEventHandlers" optional="true" type="function">
        ///     A function passed in that will set up event handlers.
        /// </param>
        /// </summary>
        var totalItems = 10,
            itemDataSourceObject = Helper.ItemsManager.createTestDataSource(FlipperUtils.simpleArrayData(totalItems), controller, null),
            flipper,
            flipperDiv = document.getElementById(FlipperUtils.basicFlipperID()),
            removePosition,
            removeData,
            errors = [];

        // Setup event handlers if passed in.
        if (setEventHandlers) {
            setEventHandlers(FlipperUtils.basicFlipperID());
        }

        var action = LiveUnit.GetWrappedCallback(function () {
            if (!flipper) {
                LiveUnit.Assert.fail("Flipper is not a valid object");
            }
            flipper.removeEventListener(pageSelectedEvent, action);

            // Retrieve all items from datasource for logging purposes.
            LiveUnit.LoggingCore.logComment("DataSource Object Before " + removeAction);
            FlipperUtils.getAllItemsFromDataSource(itemDataSourceObject).then(function (items) {
                for (var i = 0; i < items.length; i++) {
                    LiveUnit.LoggingCore.logComment("key: " + items[i].key + ", title: " + items[i].data.title);
                }
            });
            // Setup verify variables to check against after removing items.
            LiveUnit.LoggingCore.logComment(removeAction + ": Attempting to remove item...");
            switch (removeAction) {
                case "RemoveFromStart":
                    removePosition = 0;
                    break;

                case "RemoveFromEnd":
                    removePosition = totalItems - 1;
                    break;

                case "RemoveFromMiddle":
                    removePosition = Math.floor(totalItems / 2);
                    break;

                default:
                    LiveUnit.Assert.fail(removeAction + ": Unrecognized remove action.");
            }

            var verifydschanged = LiveUnit.GetWrappedCallback(function () {
                Complete();
            });
            flipper.addEventListener(datasourceChangedEvent, verifydschanged);

            // Remove the specified item.
            itemDataSourceObject.itemFromIndex(removePosition).then(function (item) {
                removeData = item;
                itemDataSourceObject.remove(item.key).
                    then(null, Error);
            }, Error);
        });
        flipperDiv.addEventListener(pageSelectedEvent, action);

        flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID(), { itemDataSource: itemDataSourceObject, itemTemplate: FlipperUtils.simpleArrayRenderer });
        LiveUnit.Assert.isNotNull(flipper, "Flipper element should not be null when instantiated.");

        // This must run after all promises have completed.
        var timeout = setTimeout(function () {
            if (errors[0]) {
                LiveUnit.LoggingCore.logComment("Errors Detected.");
                onError(errors);
            }
            else {
                LiveUnit.LoggingCore.logComment("Edit successful.");
                onSuccess();
            }
            // Setting the timeout to 2 x NAVIGATION_TIMEOUT as datasourcecountchanged takes a long time to fire.
            // If the timeout is less, the test moves on and then event listener is executed causing the subsequent tests to fail
        }, 2 * NAVIGATION_TIMEOUT);

        // The Promise.then onError function that is called if an error occurred on the manipulation action.
        function Error(error) {
            errors.push(error);
        }

        // The Promise.then onComplete function that determines whether the edit was successful or not.
        function Complete() {
            LiveUnit.LoggingCore.logComment(removeAction + " completed.");

            // Retrieve all items from datasource for logging purposes.
            LiveUnit.LoggingCore.logComment("DataSource Object After " + removeAction);
            FlipperUtils.getAllItemsFromDataSource(itemDataSourceObject).then(function (items) {
                for (var i = 0; i < items.length; i++) {
                    LiveUnit.LoggingCore.logComment("key: " + items[i].key + ", title: " + items[i].data.title);
                }
            });
            itemDataSourceObject.getCount().then(function (verifyCount) {
                LiveUnit.LoggingCore.logComment("Total items in data object before remove: " + totalItems);
                LiveUnit.LoggingCore.logComment("Total items in data object after remove: " + verifyCount);
                LiveUnit.Assert.areEqual(totalItems - 1, verifyCount, "Total items after remove should be 1 less than before.");

                // Retrieve all items from datasource and verify item was removed.
                LiveUnit.LoggingCore.logComment("DataSource Object After " + removeAction);
                FlipperUtils.getAllItemsFromDataSource(itemDataSourceObject).then(function (items) {
                    for (var i = 0; i < items.length; i++) {
                        if (items[i].data.title === removeData.data.title) {
                            LiveUnit.LoggingCore.logComment("key: " + items[i].key + ", title: " + items[i].data.title);
                            LiveUnit.LoggingCore.logComment("Data that was supposed to be removed was found in the datasource object.");
                            LiveUnit.LoggingCore.logComment("Removed data title: " + removeData.title);
                            LiveUnit.Assert.fail(removeAction + ": Remove failed.");
                        }
                    }
                });

                LiveUnit.LoggingCore.logComment("Removed data not found in datasource.");

                // Verify that the removed data is not in the DOM.
                LiveUnit.LoggingCore.logComment("Verifying that removed data is not in the DOM.");
                LiveUnit.Assert.isNull(document.getElementById(removeData.title), "Found " + removeData.title + " in the DOM.");
            },
                function (err) {
                    errors.push(err);
                });
        }
    }

    export function changeItem(changeAction, onSuccess, onError, setEventHandlers?) {
        /// <summary>
        ///     Attempt to change an item based on the changeAction passed in.
        ///     Then verify the results of the change and ensure the change really happened.
        ///     Passing signalTestCaseCompleted function allows it to be called later when the verification in the callbacks are completed.
        /// <param name="changeAction" type="string">
        ///     Valid options are "ChangeAtStart", "ChangeAtEnd", "ChangeAtMiddle", "ChangeInvalid"
        /// </param>
        /// <param name="onSuccess" type="callback_function">
        ///     A function to call when the change has completed successfully.
        /// </param>
        /// <param name="onError" type="callback_function">
        ///     A function to call when an error occurs.
        /// </param>
        /// <param name="setEventHandlers" optional="true" type="function">
        ///     A function passed in that will set up event handlers.
        /// </param>
        /// </summary>
        var totalItems = 10,
            itemDataSourceObject = Helper.ItemsManager.createTestDataSource(FlipperUtils.simpleArrayData(totalItems), controller, null),
            flipper,
            flipperDiv = document.getElementById(FlipperUtils.basicFlipperID()),
            verifyPosition,
            errors = [],
            changeData = { title: changeAction, content: changeAction },
            previousData: any = {};

        // Setup event handlers if passed in.
        if (setEventHandlers) {
            setEventHandlers(FlipperUtils.basicFlipperID());
        }

        var action = LiveUnit.GetWrappedCallback(function () {
            if (!flipper) {
                LiveUnit.Assert.fail("Flipper is not a valid object");
            }
            flipper.removeEventListener(pageSelectedEvent, action);

            // Retrieve all items from datasource for logging purposes.
            LiveUnit.LoggingCore.logComment("DataSource Object Before " + changeAction);
            FlipperUtils.getAllItemsFromDataSource(itemDataSourceObject).then(function (items) {
                for (var i = 0; i < items.length; i++) {
                    LiveUnit.LoggingCore.logComment("key: " + items[i].key + ", title: " + items[i].data.title);
                }
            });

            // Setup verify variables to check against after moving items around.
            LiveUnit.LoggingCore.logComment(changeAction + ": Attempting to change item...");
            switch (changeAction) {
                case "ChangeAtStart":
                    verifyPosition = 0;
                    break;

                case "ChangeAtEnd":
                    verifyPosition = totalItems - 1;
                    break;

                case "ChangeAtMiddle":
                    verifyPosition = Math.floor(totalItems / 2);
                    break;

                case "ChangeInvalid":
                    verifyPosition = totalItems + 10;
                    break;

                default:
                    LiveUnit.Assert.fail(changeAction + ": Unrecognized change action.");
            }

            if (changeAction !== "ChangeInvalid") {
                itemDataSourceObject.itemFromIndex(verifyPosition).then(function (item) {
                    previousData = item;
                    itemDataSourceObject.change(verifyPosition.toString(), changeData).
                        then(Complete, Error).
                        then(null, Error);
                }, Error);
            } else {
                itemDataSourceObject.change(verifyPosition.toString(), changeData).
                    then(Complete, Error).
                    then(null, Error);
            }
        });
        flipperDiv.addEventListener(pageSelectedEvent, action);

        flipper = FlipperUtils.instantiate(FlipperUtils.basicFlipperID(), { itemDataSource: itemDataSourceObject, itemTemplate: FlipperUtils.simpleArrayRenderer });
        LiveUnit.Assert.isNotNull(flipper, "Flipper element should not be null when instantiated.");

        // This must run after all promises have completed.
        var timeout = setTimeout(function () {
            if (errors[0]) {
                LiveUnit.LoggingCore.logComment("Errors Detected.");
                onError(errors);
            }
            else {
                LiveUnit.LoggingCore.logComment("Edit successful.");
                onSuccess();
            }
            // Setting the timeout to 2 x NAVIGATION_TIMEOUT as complete takes a long time to fire.
            // If the timeout is less, the test moves on and then event listener is executed causing the subsequent tests to fail
        }, 2 * NAVIGATION_TIMEOUT);

        // The Promise.then onError function that is called if an error occurred on the manipulation action.
        function Error(error) {
            errors.push(error);
        }

        // The Promise.then onComplete function that determines whether the edit was successful or not.
        function Complete() {
            // Retrieve all items from datasource for logging purposes.
            LiveUnit.LoggingCore.logComment("DataSource Object After " + changeAction);
            FlipperUtils.getAllItemsFromDataSource(itemDataSourceObject).then(function (items) {
                for (var i = 0; i < items.length; i++) {
                    LiveUnit.LoggingCore.logComment("key: " + items[i].key + ", title: " + items[i].data.title);
                }
            });

            itemDataSourceObject.itemFromIndex(verifyPosition).then(function (item) {
                var verifyItem = item;

                if (verifyItem.data.title === changeData.title) {
                    LiveUnit.LoggingCore.logComment("Change data was found at expected location in datasource.");
                    LiveUnit.LoggingCore.logComment(changeAction + ": Change succeeded.");

                    // Verify that the data replaced by the updated data is not in the datasource object.
                    FlipperUtils.getAllItemsFromDataSource(itemDataSourceObject).then(function (items) {
                        for (var i = 0; i < items.length; i++) {
                            if (previousData.data === items[i].data) {
                                LiveUnit.LoggingCore.logComment("key: " + items[i].key + ", title: " + items[i].data.title);
                                LiveUnit.LoggingCore.logComment("Data that was supposed to be changed was found in the datasource object.");
                                LiveUnit.Assert.fail(changeAction + ": Change failed.");
                            }
                        }
                    });
                    LiveUnit.LoggingCore.logComment("Previous data not found in datasource.");

                    // Switch to the changed page and then check that changed data is no longer in the DOM.
                    var verify = LiveUnit.GetWrappedCallback(function () {
                        LiveUnit.LoggingCore.logComment("Verifying that previous data is not in the DOM.");
                        LiveUnit.Assert.isTrue(document.getElementById(previousData.data.title) === null, "Found " + previousData.data.title + " in the DOM.");

                        // Now verify the flipper.
                        var newPosition = flipper.currentPage;
                        LiveUnit.LoggingCore.logComment("Flipper is now at position: " + newPosition);
                        LiveUnit.LoggingCore.logComment("Verify data at current position...");

                        var element = flipper._pageManager._currentPage.element.firstElementChild;
                        LiveUnit.Assert.isTrue(element.id === changeData.title, "Flipper pageManager is not showing data at current position.");
                        LiveUnit.Assert.isTrue(FlipperUtils.isFlipperItemVisible(changeData.title), "Flipper is not showing correct data.");
                    });

                    var currentPosition = flipper.currentPage;
                    LiveUnit.LoggingCore.logComment("Current position: " + currentPosition);
                    LiveUnit.LoggingCore.logComment("Verifying at position: " + verifyPosition);
                    LiveUnit.LoggingCore.logComment("Attempt flip to new position...");
                    FlipperUtils.ensureCurrentPage(flipper, verifyPosition, verify);
                }
                else {
                    LiveUnit.LoggingCore.logComment("Change data not found at expected location in the datasource.");
                    LiveUnit.Assert.fail(changeAction + ": Change failed.");
                }
            }, Error);
        }
    }

}
