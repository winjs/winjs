// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />

var WinJSTests = WinJSTests || {};

WinJSTests.GroupFocusCacheTests = function () {
    "use strict";
    function createCache() {
        var lv = {
            _groups: {
                group: function(index) {
                    return { key: index };
                },
                
                fromKey: function(key) {
                    return {
                        group: {
                            startIndex: 987
                        }
                    };
                }
            }
        };
        return new WinJS.UI._GroupFocusCache(lv);
    }

    this.testUpdateCache = function() {
        var cache = createCache();
        
        cache.updateCache("1", "10", 100);
        LiveUnit.Assert.areEqual("10", cache._groupToItem["1"]);
        LiveUnit.Assert.areEqual("100", cache._itemToIndex["10"]);
        
        cache.updateCache("1", "10", 150);
         LiveUnit.Assert.areEqual("10", cache._groupToItem["1"]);
        LiveUnit.Assert.areEqual("150", cache._itemToIndex["10"]);
        
        cache.updateCache("1", "15", 150);
         LiveUnit.Assert.areEqual("15", cache._groupToItem["1"]);
        LiveUnit.Assert.areEqual("150", cache._itemToIndex["10"]);
    };
    
    this.testDeleteItem = function() {
        var cache = createCache();
        
        cache.updateCache("1", "10", 100);
        LiveUnit.Assert.areEqual("10", cache._groupToItem["1"]);
        LiveUnit.Assert.areEqual("100", cache._itemToIndex["10"]);
        
        cache.deleteItem("10");
        LiveUnit.Assert.isFalse(cache._groupToItem["1"]);
        LiveUnit.Assert.isFalse(cache._itemToIndex["10"]);
    };
    
    this.testDeleteGroup = function() {
        var cache = createCache();
        
        cache.updateCache("1", "10", 100);
        LiveUnit.Assert.areEqual("10", cache._groupToItem["1"]);
        LiveUnit.Assert.areEqual("100", cache._itemToIndex["10"]);
        
        cache.deleteGroup("1");
        LiveUnit.Assert.isFalse(cache._groupToItem["1"]);
        LiveUnit.Assert.isFalse(cache._itemToIndex["10"]);
    };
    
    this.testUpdateItemIndex = function() {
        var cache = createCache();
        
        cache.updateCache("1", "10", 100);
        LiveUnit.Assert.areEqual("10", cache._groupToItem["1"]);
        LiveUnit.Assert.areEqual("100", cache._itemToIndex["10"]);
    };
    
    this.testGetIndexForGroup = function() {
        var cache = createCache();
        
        // Try getting a non-cached index
        LiveUnit.Assert.areEqual(987, cache.getIndexForGroup(0));
        
        // Try getting a cached index
        cache.updateCache("0", "1", 100);
        LiveUnit.Assert.areEqual(100, cache.getIndexForGroup(0));
        
        // Try getting an updated index
        cache.updateItemIndex("1", 123);
        LiveUnit.Assert.areEqual(123, cache.getIndexForGroup(0));
        
        // Try getting a deleted index
        cache.deleteItem("1");
        LiveUnit.Assert.areEqual(987, cache.getIndexForGroup(0));
    };
    
    this.testClear = function() {
        var cache = createCache();
        
        cache.updateCache("0", "1", 123);
        cache.updateCache("1", "2", 234);
        cache.updateCache("2", "3", 345);
        
        LiveUnit.Assert.areEqual(3, Object.keys(cache._groupToItem).length);
        LiveUnit.Assert.areEqual(3, Object.keys(cache._itemToIndex).length);
        
        cache.clear();
        
        LiveUnit.Assert.areEqual(0, Object.keys(cache._groupToItem).length);
        LiveUnit.Assert.areEqual(0, Object.keys(cache._itemToIndex).length);
    };
};

LiveUnit.registerTestClass("WinJSTests.GroupFocusCacheTests");