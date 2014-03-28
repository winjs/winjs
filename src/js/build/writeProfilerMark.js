(function (global) {
    global.WinJS = global.WinJS || {};
    WinJS.Utilities = WinJS.Utilities || {};
    WinJS.Utilities._writeProfilerMark = function _writeProfilerMark(text) {
        global.msWriteProfilerMark && msWriteProfilerMark(text);
    };
})(this);
