// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

(function () {
    "use strict";
    
    // Input: A list of fully qualified test names. e.g.:
    // ["WinJSTests.VerticalGridTests.testSetScrollPosition_VGrid_4X5X5"]
    // Output: A map of fully qualified module names to a map of test names to true. e.g.:
    // {
    //   "WinJSTests.VerticalGridTests": {
    //     "testSetScrollPosition_VGrid_4X5X5": true
    //   }
    // }
    function indexTests(tests) {
        var lookupTable = {};
        tests.forEach(function (fullTestName) {
            var parts = fullTestName.split(".");
            var fullModuleName = parts.slice(0, -1).join(".");
            var testName = parts[parts.length - 1];
            
            if (!lookupTable[fullModuleName]) {
                lookupTable[fullModuleName] = {};
            } 
            lookupTable[fullModuleName][testName] = true;
        });
        
        return lookupTable;
    }
    
    function disableTests(testsToRun) {
        var modulesTable = indexTests(testsToRun);
        
        var registerTestClass = LiveUnit.registerTestClass; 
        LiveUnit.registerTestClass = function (fullModuleName) {
            if (modulesTable[fullModuleName]) {
                var parts = fullModuleName.split(".");
                var moduleParentPath = parts.slice(0, -1);
                var moduleName = parts[parts.length - 1];
                var ModuleParent = moduleParentPath.reduce(function (current, name) {
                    return current && current[name];
                }, window);
                
                var isTestDisabled = modulesTable[fullModuleName];
                var Module = ModuleParent[moduleName];
                ModuleParent[moduleName] = function () {
                    Module.call(this);
                    for (var prop in this) {
                        if (isTestDisabled[prop]) {
                            delete this[prop];
                        }
                    }
                };
            }
            
            return registerTestClass(fullModuleName);
        };
    }
    
    disableTests([
        "WinJSTests.GroupListEditorTest.testInsertToEmpty_normal_grouped_grid_TestDataSource",
        
        "WinJSTests.LayoutTests.testDefaultItemsContainerMargins",
        
        "WinJSTests.LayoutTestsExtra.testFirstLastDisplayedInGridLayout_GridLayout",
        "WinJSTests.LayoutTestsExtra.testHeightAutoLayoutGridLayout",
        "WinJSTests.LayoutTestsExtra.testHeightAutoLayoutListLayout",
        "WinJSTests.LayoutTestsExtra.testRestoringScrollpos",
        
        "WinJSTests.ListEditorTest.testDeleteWrapperSizeDuringAnimation",
        
        "WinJSTests.VirtualizedViewTests.testAnimationDuringSezoZoomingAndchange",
        "WinJSTests.VirtualizedViewTests.testAnimationDuringSezoZoomingAndremove",
        "WinJSTests.VirtualizedViewTests.testBackdropClass",
        "WinJSTests.VirtualizedViewTests.testDeferContainerCreationUntilSeZoZoomCompletes",
        "WinJSTests.VirtualizedViewTests.testDeferUnrealizingUntilSeZoZoomCompletes",
        "WinJSTests.VirtualizedViewTests.testDeleteAnimationStartsBeforeUpdateTreeIsDone",
        "WinJSTests.VirtualizedViewTests.testEditsDuringLazyCreation",
        "WinJSTests.VirtualizedViewTests.testGetAdjactentWait",
        "WinJSTests.VirtualizedViewTests.testInsertionsDuringLazyContainerCreation",
        "WinJSTests.VirtualizedViewTests.testLazyFlatTreeCreation",
        "WinJSTests.VirtualizedViewTests.testLazyGroupedTreeCreationWithBigGroups",
        "WinJSTests.VirtualizedViewTests.testLazyGroupedTreeCreationWithSmallGroups",
        "WinJSTests.VirtualizedViewTests.testLazyTreeCreationPriority",
        "WinJSTests.VirtualizedViewTests.testRebuildingStructureNodesAfterResize",
        "WinJSTests.VirtualizedViewTests.testResizeDuringLazyTreeCreation",
        "WinJSTests.VirtualizedViewTests.testResizeWithStructuralNodes",
        "WinJSTests.VirtualizedViewTests.testStoppingLazyTreeCreation",
        "WinJSTests.VirtualizedViewTests.testTogglingStructuralNodesDueToEdits",
        "WinJSTests.VirtualizedViewTests.testUpdateContainersUpdatesToAffectedRange",
    ]);
})();
