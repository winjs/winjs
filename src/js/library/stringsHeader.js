
(function (global) {
    global.strings = global.strings || {};

    var appxVersion = "$(TARGET_DESTINATION)";
    var developerPrefix = "Developer.";
    if (appxVersion.indexOf(developerPrefix) === 0) {
        appxVersion = appxVersion.substring(developerPrefix.length);
    }

    function addStrings(keyPrefix,  strings) {
        Object.keys(strings).forEach(function (key) {
            global.strings[keyPrefix + key.replace("\\", "/")] = strings[key];
        });
    }
    