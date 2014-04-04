// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
module WinJS {
    "use strict";

    export module Resources {
        var appxVersion = "$(TARGET_DESTINATION)";
        var developerPrefix = "Developer.";
        if (appxVersion.indexOf(developerPrefix) === 0) {
            appxVersion = appxVersion.substring(developerPrefix.length);
        }

        export function _getWinJSString(id) {
            return WinJS.Resources.getString("ms-resource://" + appxVersion + "/" + id);
        }
    }
}
