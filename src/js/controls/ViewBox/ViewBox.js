// ViewBox control
(function viewboxInit(global, undefined) {
    "use strict";

    WinJS.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.ViewBox">
        /// Scales a single child element to fill the available space without
        /// resizing it. This control reacts to changes in the size of the container as well as
        /// changes in size of the child element. For example, a media query may result in
        /// a change in aspect ratio.
        /// </summary>
        /// </field>
        /// <name locid="WinJS.UI.ViewBox_name">View Box</name>
        /// <icon src="ui_winjs.ui.viewbox.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.viewbox.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.ViewBox"><div>ViewBox</div></div>]]></htmlSnippet>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        ViewBox: WinJS.Namespace._lazy(function () {
            var Scheduler = WinJS.Utilities.Scheduler;

            var strings = {
                get invalidViewBoxChildren() { return WinJS.Resources._getWinJSString("ui/invalidViewBoxChildren").value; },
            };

            function onresize(control) {
                if (control && !control._resizing) {
                    control._resizing = control._resizing || 0;
                    control._resizing++;
                    try {
                        control._updateLayout();
                    } finally {
                        control._resizing--;
                    }
                }
            }

            function onresizeBox(ev) {
                if (ev.target) {
                    onresize(ev.target.winControl);
                }
            }

            function onresizeSizer(ev) {
                if (ev.target) {
                    onresize(ev.target.parentElement.winControl);
                }
            }

            var ViewBox = WinJS.Class.define(function ViewBox_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.ViewBox.ViewBox">
                /// <summary locid="WinJS.UI.ViewBox.constructor">Initializes a new instance of the ViewBox control</summary>
                /// <param name="element" type="HTMLElement" domElement="true" mayBeNull="true" locid="WinJS.UI.ViewBox.constructor_p:element">
                /// The DOM element that functions as the scaling box. This element fills 100% of the width and height allotted to it.
                /// </param>
                /// <param name="options" type="Object" optional="true" locid="WinJS.UI.ViewBox.constructor_p:options">
                /// The set of options to be applied initially to the ViewBox control.
                /// </param>
                /// <returns type="WinJS.UI.ViewBox" locid="WinJS.UI.ViewBox.constructor_returnValue">A constructed ViewBox control.</returns>
                /// </signature>
                this._disposed = false;

                this._element = element || document.createElement("div");
                var box = this.element;
                box.winControl = this;
                WinJS.Utilities.addClass(box, "win-disposable");
                WinJS.Utilities.addClass(box, "win-viewbox");
                this.forceLayout();
            }, {
                _sizer: null,
                _element: null,

                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.ViewBox.element" helpKeyword="WinJS.UI.ViewBox.element">
                /// Gets the DOM element that functions as the scaling box.
                /// </field>
                element: {
                    get: function () { return this._element; }
                },

                _rtl: {
                    get: function () {
                        return window.getComputedStyle(this.element).direction === "rtl";
                    }
                },

                _initialize: function () {
                    var box = this.element;
                    if (box.firstElementChild !== this._sizer) {
                        if (WinJS.validation) {
                            if (box.childElementCount != 1) {
                                throw new WinJS.ErrorFromName("WinJS.UI.ViewBox.InvalidChildren", strings.invalidViewBoxChildren);
                            }
                        }
                        if (this._sizer) {
                            this._sizer.onresize = null;
                        }
                        var sizer = box.firstElementChild;
                        this._sizer = sizer;
                        if (sizer) {
                            box.addEventListener("mselementresize", onresizeBox);
                            sizer.addEventListener("mselementresize", onresizeSizer);
                        }
                        if (box.clientWidth === 0 && box.clientHeight === 0) {
                            var that = this;
                            // Wait for the viewbox to get added to the DOM. It should be added
                            // in the synchronous block in which _initialize was called.
                            Scheduler.schedule(function ViewBox_async_initialize() {
                                that._updateLayout();
                            }, Scheduler.Priority.normal, null, "WinJS.UI.ViewBox._updateLayout")
                        }
                    }
                },
                _updateLayout: function () {
                    var sizer = this._sizer;
                    if (sizer) {
                        var box = this.element;
                        var w = sizer.clientWidth;
                        var h = sizer.clientHeight;
                        var bw = box.clientWidth;
                        var bh = box.clientHeight;
                        var wRatio = bw / w;
                        var hRatio = bh / h;
                        var mRatio = Math.min(wRatio, hRatio);
                        var transX = Math.abs(bw - (w * mRatio)) / 2;
                        var transY = Math.abs(bh - (h * mRatio)) / 2;
                        var rtl = this._rtl;
                        this._sizer.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName] = "translate(" + (rtl ? "-" : "") + transX + "px," + transY + "px) scale(" + mRatio + ")";
                        this._sizer.style[WinJS.Utilities._browserStyleEquivalents["transform-origin"].scriptName] = rtl ? "top right" : "top left";
                    }
                },

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.ViewBox.dispose">
                    /// <summary locid="WinJS.UI.ViewBox.dispose">
                    /// Disposes this ViewBox.
                    /// </summary>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }

                    this._disposed = true;
                    WinJS.Utilities.disposeSubTree(this._element);
                },

                forceLayout: function () {
                    this._initialize();
                    this._updateLayout();
                }
            });
            WinJS.Class.mix(ViewBox, WinJS.UI.DOMEventMixin);
            return ViewBox;
        })
    });

}(this));
