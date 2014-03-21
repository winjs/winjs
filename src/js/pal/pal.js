//
// WinJS PAL
//

(function (window) {

    function nop() { }

    var isMozilla = !!window.mozAnimationStartTime;
    var isSafari = navigator.userAgent.toLowerCase().indexOf("safari") > -1;
    window.__winjs_not_ie = isMozilla || isSafari || window.chrome;

    if (!window.MutationObserver) {
        window.MutationObserver = function () {
            this.observe = nop;
            this.disconnect = nop;
        };
    }
    
    if (window.HTMLElement && !HTMLElement.prototype.setActive) {
        HTMLElement.prototype.setActive = function () {
            var that = this;
            WinJS.Utilities._setImmediate(function () {
                that.focus();
            });

        };
    }

    try {
        if (window.HTMLElement && !HTMLElement.prototype.innerText) {
            Object.defineProperty(HTMLElement.prototype, "innerText", {
                get: function () {
                    return this.textContent;
                },
                set: function (value) {
                    this.textContent = "" + value;
                }
            });
        }       
    } catch (e) {
        // requesting HTMLElement.prototype.innerText throws in IE
    }

    // Translates a camel cased name (e.g. minHeight) to a dashed name (e.g. min-height)
    function camelCaseToDashed(name) {
        return name.replace(/([A-Z])/g, "-$1").toLowerCase();
    }

    function addCssTranslation(from, to) {
        Object.defineProperty(CSSStyleDeclaration.prototype, from, {
            get: function () {
                return this[to];
            },
            set: function (value) {
                this[to] = value;
            }
        });
    }

    if (isMozilla) {
        // Firefox doesn't support dashed CSS style names (e.g. min-height) so fake it by
        // mapping them to their camel cased counterparts (e.g. minHeight).
        Object.keys(CSS2Properties.prototype).forEach(function (prop) {
            addCssTranslation(camelCaseToDashed(prop), prop);
        });
    }

    if (window.chrome || isSafari) {
        var cssTranslations = [
            "-ms-grid-row", "grid-row",
            "msGridRow", "grid-row",
            "-ms-grid-column", "grid-column",
            "msGridColumn", "grid-column",
            "-ms-grid-rows", "grid-definition-rows",
            "msGridRows", "grid-definition-rows",
            "-ms-grid-columns", "grid-definition-columns",
            "msGridColumns", "grid-definition-columns"
        ];
        for (var i = 0; i < cssTranslations.length; i += 2) {
            addCssTranslation(cssTranslations[i], cssTranslations[i + 1]);
        }

    }
}(this));