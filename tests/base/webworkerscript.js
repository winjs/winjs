(function (global) {
    if (global.WinJS) {
        return;
    }
    
    global.WinJS = {
        Class: {
            define: function (ctor, members) {
                Object.keys(members).forEach(function (key) {
                    ctor.prototype[key] = members[key];
                });
                return ctor;
            }
        }
    };
})(this);