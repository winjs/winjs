(function baseUtilsPhoneInit(global, WinJS) {
    "use strict";

    WinJS.Namespace.define("WinJS.Utilities", {
        /// <field type="Boolean" locid="WinJS.Utilities.isPhone" helpKeyword="WinJS.Utilities.isPhone">Determine if we are currently running in the Phone.</field>
        isPhone: {
            get: function () { return true; },
            configurable: false,
            enumerable: true
        }
    });
})(this, WinJS);
