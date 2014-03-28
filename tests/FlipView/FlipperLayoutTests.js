/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="..\TestLib\LegacyLiveUnit\commonutils.js"/>
/// <reference path="FlipperUtils.js"/>
/// <reference path="..\TestLib\ItemsManager\TestDataSource.js"/>

var LayoutTests = null;

(function() {

    // Create LayoutTests object
    LayoutTests = function() {
        var flipperUtils = new FlipperUtils();
        var commonUtils = new CommonUtils();
        var pageSelectedEvent = "pagecompleted";

        //
        // Function: SetUp
        //
        this.setUp = function() {
            LiveUnit.LoggingCore.logComment("In setup");
            commonUtils.getIEInfo();
            // We want to recreate the flipper element between each test so we start fresh.
            flipperUtils.addFlipperDom();
        }

        //
        // Function: tearDown
        //
        this.tearDown = function() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            flipperUtils.removeFlipperDom();
        }

        //
        // Test: testFlipperLargeContent
        // Ensure the large content is cropped, not centered.
        //
        /*
        this.testFlipperLargeContent = function (signalTestCaseCompleted) {
            var flipperDiv = document.getElementById(flipperUtils.basicFlipperID()),
                flipperHeight = flipperDiv.offsetHeight,
                flipperWidth = flipperDiv.offsetWidth,
                foundLarge = false,
                basicIds = flipperUtils.basicFlipperHtmlIDs(),
                currentIndex = 0,
                flipper;

            LiveUnit.LoggingCore.logComment("Flipper Height: " + flipperHeight);
            LiveUnit.LoggingCore.logComment("Flipper Width: " + flipperWidth);

            var callback = LiveUnit.GetWrappedCallback(function () {
                verifyLayout(currentIndex);
                currentIndex++;
                if (currentIndex < basicIds.length) {
                    flipperUtils.ensureCurrentPage(flipper, currentIndex, callback);
                }
            });

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                callback();
            });
            flipperDiv.addEventListener(pageSelectedEvent, verify);

            flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());

            var verifyLayout = function (index) {
                var pageID = basicIds[index];
                var pageDiv = document.getElementById(pageID);
                LiveUnit.Assert.isNotNull(pageDiv, "Unable to find basic html element ID: " + pageID);

                // find a page that is larger than the flipper
                if (pageDiv.offsetHeight > flipperHeight && pageDiv.offsetWidth > flipperWidth) {
                    foundLarge = true;
                    LiveUnit.LoggingCore.logComment("Found large page: " + pageID);
                    var largeHeight = pageDiv.offsetHeight;
                    var largeWidth = pageDiv.offsetWidth;
                    LiveUnit.LoggingCore.logComment("Large Height: " + largeHeight);
                    LiveUnit.LoggingCore.logComment("Large Width: " + largeWidth);

                    // Ensure that the the div is not centered (top-left justified)
                    var largeLeft = pageDiv.offsetLeft;
                    var largeTop = pageDiv.offsetTop;
                    LiveUnit.LoggingCore.logComment("Large Left: " + largeLeft);
                    LiveUnit.LoggingCore.logComment("Large Top: " + largeTop);
                    LiveUnit.Assert.isTrue(largeLeft === 0, "left style should be 0 but is " + largeLeft);
                    LiveUnit.Assert.isTrue(largeTop === 0, "top style should be 0 but is " + largeTop);

                    // Need to compare the element's dimension with panningDivContainer's dimensions
                    var parentNode = flipper._panningDivContainer;
                    var parentHeight = parentNode.offsetHeight;
                    var parentWidth = parentNode.offsetWidth;
                    LiveUnit.LoggingCore.logComment("Parent Height: " + parentHeight);
                    LiveUnit.LoggingCore.logComment("Parent Width: " + parentWidth);
                    LiveUnit.Assert.isTrue(parentHeight === flipperHeight, "Parent height of large item should " + 
                        " be the same as flipper height but is not.");
                    LiveUnit.Assert.isTrue(parentWidth === flipperWidth, "Parent width of large item should be " + 
                        " the same as flipper width but is not.");
                }

                if ((index + 1) === basicIds.length) {
                    // We are at the last page of flipper
                    // Ensure that a large item was found otherwise throw an assert.
                    LiveUnit.Assert.isTrue(foundLarge, "Unable to find an item larger than the flipper.  Check HTML.");
                    signalTestCaseCompleted();
                }
            };
        }
        
        //
        // Test: testFlipperSmallContent
        // Ensure that the small content is centered in the flipper region.
        //
        // Disabling the test till I upgrade to a new build
        // 806940
        this.testFlipperSmallContent = function (signalTestCaseCompleted) {
            var flipperDiv = document.getElementById(flipperUtils.basicFlipperID()),
                flipperHeight = flipperDiv.offsetHeight,
                flipperWidth = flipperDiv.offsetWidth,
                foundSmall = false,
                basicIds = flipperUtils.basicFlipperHtmlIDs(),
                currentIndex = 0,
                flipper;

            LiveUnit.LoggingCore.logComment("Flipper Height: " + flipperHeight);
            LiveUnit.LoggingCore.logComment("Flipper Width: " + flipperWidth);

            var verify = LiveUnit.GetWrappedCallback(function () {
                flipper.removeEventListener(pageSelectedEvent, verify);
                callback();
            });
            flipperDiv.addEventListener(pageSelectedEvent, verify);

            flipper = flipperUtils.instantiate(flipperUtils.basicFlipperID());

            var callback = LiveUnit.GetWrappedCallback(function () {
                verifyLayout(currentIndex);
                currentIndex++;
                if (currentIndex < basicIds.length) {
                    flipperUtils.ensureCurrentPage(flipper, currentIndex, callback);
                }
            });            
            
            var verifyLayout = function (index) {
                var pageID = basicIds[index];
                var pageDiv = document.getElementById(pageID);
                LiveUnit.Assert.isNotNull(pageDiv, "Unable to find basic html element ID: " + pageID);

                // find a page that is smaller than the flipper (either height or width)
                if (pageDiv.offsetHeight < flipperHeight || pageDiv.offsetWidth < flipperWidth) {
                    foundSmall = true;
                    LiveUnit.LoggingCore.logComment("Found small page: " + pageID);
                    var smallHeight = pageDiv.offsetHeight;
                    var smallWidth = pageDiv.offsetWidth;
                    LiveUnit.LoggingCore.logComment("Small Height: " + smallHeight);
                    LiveUnit.LoggingCore.logComment("Small Width: " + smallWidth);

                    // Ensure that the the div is centered
                    var smallLeft = pageDiv.offsetLeft;
                    var smallTop = pageDiv.offsetTop;
                    LiveUnit.LoggingCore.logComment("Small Left: " + smallLeft);
                    LiveUnit.LoggingCore.logComment("Small Top: " + smallTop);
                    if (pageDiv.offsetHeight < flipperHeight) {
                        // It appears for Top calculations the number is rounded up.
                        var centerTop = Math.ceil((flipperHeight - smallHeight) / 2);
                        LiveUnit.LoggingCore.logComment("Calculated center Top: " + centerTop);
                        LiveUnit.Assert.isTrue(smallTop === centerTop, "Small Top doesn't match calculated Top.");
                    }
                    if (pageDiv.offsetWidth < flipperWidth) {
                        // It appears for Width calculations the number is rounded up.
                        var centerLeft = Math.ceil((flipperWidth - smallWidth) / 2);
                        LiveUnit.LoggingCore.logComment("Calculated center Left: " + centerLeft);
                        LiveUnit.Assert.isTrue(smallLeft === centerLeft, "Small Left doesn't match calculated Left.");
                    }

                    // Need to compare the element's dimension with panningDivContainer's dimensions
                    var parentNode = flipper._panningDivContainer;
                    var parentHeight = parentNode.offsetHeight;
                    var parentWidth = parentNode.offsetWidth;
                    LiveUnit.LoggingCore.logComment("Parent Height: " + parentHeight);
                    LiveUnit.LoggingCore.logComment("Parent Width: " + parentWidth);
                    LiveUnit.Assert.isTrue(parentHeight === flipperHeight, "Parent height of small item should " +
                        " be the same as flipper height but is not.");
                    LiveUnit.Assert.isTrue(parentWidth === flipperWidth, "Parent width of small item should be " + 
                        " the same as flipper width but is not.");
                }

                if ((index + 1) === basicIds.length) {
                    // We are at the last page of flipper
                    // Ensure that a small item was found otherwise throw an assert.
                    LiveUnit.Assert.isTrue(foundSmall, "Unable to find an item larger than the flipper.  Check HTML.");
                    signalTestCaseCompleted();
                }
            };
        }
        */
    }

    // Register the object as a test class by passing in the name
    LiveUnit.registerTestClass("LayoutTests");
} ());
