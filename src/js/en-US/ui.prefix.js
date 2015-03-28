/*!
  Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
  Build: $(build.version).$(build.branch).$(build.date)
  Version: $(TARGET_DESTINATION)
*/

(function () {
    var globalObject =
        typeof window !== 'undefined' ? window :
        typeof self !== 'undefined' ? self :
        typeof global !== 'undefined' ? global :
        {};
    globalObject.strings = globalObject.strings || {};

    var appxVersion = "$(TARGET_DESTINATION)";
    var developerPrefix = "Developer.";
    if (appxVersion.indexOf(developerPrefix) === 0) {
        appxVersion = appxVersion.substring(developerPrefix.length);
    }

    function addStrings(keyPrefix,  strings) {
        Object.keys(strings).forEach(function (key) {
            globalObject.strings[keyPrefix + key.replace("\\", "/")] = strings[key];
        });
    }
    addStrings("ms-resource://"+appxVersion+"/ui/",