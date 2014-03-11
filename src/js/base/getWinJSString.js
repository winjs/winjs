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
}(this));