/*
Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved.

Licensed under the Apache License, Version 2.0.

See License.txt in the project root for license information.
*/

/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />


var CorsicaTests = CorsicaTests || {};

var setupTabManager = function (root) {
    "use strict";
    var first = document.createElement("div");
    first.id = "first";
    first.innerHTML = "<div tabIndex='0'>FIRST</div>";
    var container = document.createElement("div");
    container.id = "container";
    var last = document.createElement("div");
    last.id = "last";
    last.innerHTML = "<div tabIndex='0'>LAST</div>";

    var tabHierarchy;

    for (var i = 0; i < 5; i++) {
        var item = document.createElement("div");
        item.id = "item" + i;
        item.tabIndex = 0;
        item.className = "item";
        item.innerHTML = "bla <div tabIndex='0'>I get focus too</div>";
        
        var attachHandler = function attachHandler (e) {
            e.addEventListener("focus", function () {
                tabHierarchy.childFocus = e;
            }, true);
        };

        attachHandler(item);
        
        container.appendChild(item);
    }

    root.appendChild(first);
    root.appendChild(container);
    root.appendChild(last);

    tabHierarchy = new WinJS.UI.TabContainer(container);
    return tabHierarchy;
}

CorsicaTests.TabManager = function () {
    this.testChildFocusEqualsNull = function () {
        var markup =
            "<button>before</button>" +
            "<button>childFocus</button>" +
            "<button>after</button>";

        var tabEntered = false;
        var tabExited = false;

        var div = document.createElement("div");
        div.innerHTML = markup;
        document.body.appendChild(div);

        var tm = new WinJS.UI.TabContainer(div.children[1]);
        tm.childFocus = null;

        var before = div.children[0];
        var childFocus = div.children[2];
        var after = div.children[4];
        LiveUnit.Assert.isTrue(before.innerHTML === "before");
        LiveUnit.Assert.isTrue(childFocus.innerHTML === "childFocus");
        LiveUnit.Assert.isTrue(after.innerHTML === "after");
        childFocus.addEventListener("onTabEnter", function () {
            if (tabEntered) {
                LiveUnit.Assert.fail("onTabEnter fired twice");
            }
            tabEntered = true;
        });
        childFocus.addEventListener("onTabExit", function () {
            tabExited = true;
        });

        // Make sure the childFocus is focusable before the test
        WinJS.Utilities._setActive(childFocus);
        LiveUnit.Assert.isTrue(document.activeElement === childFocus);

        // Put focus on 'before'
        WinJS.Utilities._setActive(before);
        LiveUnit.Assert.isTrue(document.activeElement === before);

        // Focus the prefix, which should fire onTabEnter and focus should not move
        childFocus.previousElementSibling.focus();
        LiveUnit.Assert.isTrue(tabEntered);
        LiveUnit.Assert.isTrue(document.activeElement === before);

        // Since onTabEnter fired, childFocus is now unfocusable
        childFocus.focus();
        LiveUnit.Assert.isTrue(document.activeElement === before);

        // Focus the postfix, this should onTabExit and make the childFocus focusable again
        childFocus.nextElementSibling.focus();
        LiveUnit.Assert.isTrue(tabExited);
        LiveUnit.Assert.isTrue(document.activeElement === before);

        // Verify that the childFocus is focusable
        childFocus.focus();
        LiveUnit.Assert.isTrue(document.activeElement === childFocus);
    };

    this.testInstantiate = function () {
        // Make sure we were able to create the TabContainer. 
        // (since we cannot simuate Tab event, we cannot test much more)
        var root = document.createElement("div");
        var tabHierarchy = setupTabManager(root);
        LiveUnit.Assert.isTrue(tabHierarchy !== undefined);

        // Check prefix and postfix elements have been inserted
        var children = root.childNodes;
        LiveUnit.Assert.isTrue(children[0].id === "first");
        // children[1] is prefix
        LiveUnit.Assert.isTrue(children[2].id === "container");
        // children[3] is postfix
        LiveUnit.Assert.isTrue(children[4].id === "last");
    }

    this.testChildFocus = function () {
        var root = document.createElement("div");
        var tabHierarchy = setupTabManager(root);
        var container = root.childNodes[2];
        var children = container.childNodes;

        function checkInsertionAt(idx) {
            var childI = 0;
            for (var i = 0; i < 5; i++) {
                if (idx === i) {
                    // Skip prefix
                    childI++;
                }
                LiveUnit.Assert.isTrue(children[childI++].id === "item" + i);
                if (idx === i) {
                    // Skip postfix
                    childI++;
                }
            }
        }

        // Verify no prefix/postfix are inserted around children at this time
        checkInsertionAt(-1);
        
        // Now set active child focus on 4th element
        tabHierarchy.childFocus = children[3];
        // Verify prefix/postfix got inserted
        checkInsertionAt(3);

        // Now set active child focus on 2nd element
        tabHierarchy.childFocus = children[1];
        // Verify prefix/postfix got inserted in new location and removed from old one
        checkInsertionAt(1);
    }
}

var LiveUnit = LiveUnit || undefined;

if (LiveUnit) {
    LiveUnit.registerTestClass("CorsicaTests.TabManager");
}
