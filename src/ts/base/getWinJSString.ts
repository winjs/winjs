// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function getWinJSStringInit() {
    "use strict";

    var appxVersion = "$(TARGET_DESTINATION)";
    var developerPrefix = "Developer.";
    if (appxVersion.indexOf(developerPrefix) === 0) {
        appxVersion = appxVersion.substring(developerPrefix.length);
    }

    WinJS.Namespace.define("WinJS.Resources", {
        _getWinJSString: function (id) {
            return WinJS.Resources.getString("ms-resource://" + appxVersion + "/" + id);
        }
    });
}());
