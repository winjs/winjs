(function KeyboardBehaviorInit(global, WinJS, undefined) {
    "use strict";

    // not supported in WebWorker
    if (!global.document) {
        return;
    }

    WinJS.UI._keyboardSeenLast = false;

    window.addEventListener("pointerdown", function (ev) {
        if (WinJS.UI._keyboardSeenLast) {
            WinJS.UI._keyboardSeenLast = false;
        }
    }, true);

    window.addEventListener("keydown", function (ev) {
        if (!WinJS.UI._keyboardSeenLast) {
            WinJS.UI._keyboardSeenLast = true;
        }
    }, true);

    WinJS.Namespace.define("WinJS.UI", {
        _WinKeyboard: function (element) {
            // Win Keyboard behavior is a solution that would be similar to -ms-keyboard-focus.
            // It monitors the last input (keyboard/mouse) and adds/removes a win-keyboard class
            // so that you can style .foo.win-keyboard:focus vs .foo:focus to add a keyboard rect
            // on an item only when the last input method was keyboard.
            // Reminder: Touch edgy does not count as an input method.
            element.addEventListener("pointerdown", function (ev) {
                // In case pointer down came on the active element.
                WinJS.Utilities.removeClass(ev.target, "win-keyboard");
            }, true);
            element.addEventListener("keydown", function (ev) {
                WinJS.Utilities.addClass(ev.target, "win-keyboard");
            }, true);
            WinJS.Utilities._addEventListener(element, "focusin", function (ev) {
                WinJS.UI._keyboardSeenLast && WinJS.Utilities.addClass(ev.target, "win-keyboard");
            }, false);
            WinJS.Utilities._addEventListener(element, "focusout", function (ev) {
                WinJS.Utilities.removeClass(ev.target, "win-keyboard");
            }, false);
        },
        _KeyboardBehavior: WinJS.Namespace._lazy(function () {
            var Key = WinJS.Utilities.Key;

            return WinJS.Class.define(function KeyboardBehavior_ctor(element, options) {
                // KeyboardBehavior allows you to easily convert a bunch of tabable elements into a single tab stop with 
                // navigation replaced by keyboard arrow (Up/Down/Left/Right) + Home + End + Custom keys.
                //
                // Example use cases:
                //
                // 1 Dimensional list: FixedDirection = height and FixedSize = 1;
                // [1] [ 2 ] [  3  ] [4] [  5  ]...
                //
                // 2 Dimensional list: FixedDirection = height and FixedSize = 2;
                // [1] [3] [5] [7] ...
                // [2] [4] [6] [8]
                //
                // 1 Dimensional list: FixedDirection = width and FixedSize = 1;
                // [ 1 ]
                // -   -
                // |   |
                // | 2 |
                // |   |
                // -   -
                // [ 3 ]
                // [ 4 ]
                //  ...
                //
                // 2 Dimensional list: FixedDirection = width and FixedSize = 2;
                // [1][2]
                // [3][4]
                // [5][6]
                // ...
                //
                // Currently it is a "behavior" instead of a "control" so it can be attached to the same element as a 
                // winControl. The main scenario for this would be to attach it to the same element as a repeater.
                //
                // It also blocks "Portaling" where you go off the end of one column and wrap around to the other 
                // column. It also blocks "Carousel" where you go from the end of the list to the beginning.
                //
                // Keyboarding behavior supports nesting. It supports your tab stops having sub tab stops. If you want
                // an interactive element within the tab stop you need to use the win-interactive classname or during the
                // keydown event stop propogation so that the event is skipped.
                //
                // If you have custom keyboarding the getAdjacent API is provided. This can be used to enable keyboarding 
                // in multisize 2d lists or custom keyboard commands. PageDown and PageUp are the most common since this 
                // behavior does not detect scrollers.
                //
                // It also allows developers to show/hide keyboard focus rectangles themselves.
                // 
                // It has an API called currentIndex so that Tab (or Shift+Tab) or a developer imitating Tab will result in
                // the correct item having focus.
                //
                // It also allows an element to be represented as 2 arrow stops (commonly used for a split button) by calling
                // the _getFocusInto API on the child element's winControl if it exists.

                element = element || document.createElement("DIV");
                options = options || {};

                element._keyboardBehavior = this;
                this._element = element;

                this._fixedDirection = WinJS.UI._KeyboardBehavior.FixedDirection.width;
                this._fixedSize = 1;
                this._currentIndex = 0;

                WinJS.UI.setOptions(this, options);

                this._element.addEventListener('keydown', this._keyDownHandler.bind(this));
                this._element.addEventListener('pointerdown', this._MSPointerDownHandler.bind(this));
                this._element.addEventListener("beforeactivate", this._beforeActivateHandler.bind(this));
            }, {
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                fixedDirection: {
                    get: function () {
                        return this._fixedDirection;
                    },
                    set: function (value) {
                        this._fixedDirection = value;
                    }
                },

                fixedSize: {
                    get: function () {
                        return this._fixedSize;
                    },
                    set: function (value) {
                        if (+value === value) {
                            value = Math.max(1, value);
                            this._fixedSize = value;
                        }
                    }
                },

                currentIndex: {
                    get: function () {
                        if (this._element.children.length > 0) {
                            return this._currentIndex;
                        }
                        return -1;
                    },
                    set: function (value) {
                        if (+value === value) {
                            var length = this._element.children.length;
                            value = Math.max(0, Math.min(length - 1, value));
                            this._currentIndex = value;
                        }
                    }
                },

                getAdjacent: {
                    get: function () {
                        return this._getAdjacent;
                    },
                    set: function (value) {
                        this._getAdjacent = value;
                    }
                },

                _keyDownHandler: function _KeyboardBehavior_keyDownHandler(ev) {
                    if (!ev.altKey) {
                        if (WinJS.Utilities._matchesSelector(ev.target, ".win-interactive, .win-interactive *")) {
                            return;
                        }
                        var blockScrolling = false;

                        var newIndex = this.currentIndex;
                        var maxIndex = this._element.children.length - 1;
                        var minIndex = 0;

                        var rtl = getComputedStyle(this._element).direction === "rtl";
                        var leftStr = rtl ? Key.rightArrow : Key.leftArrow;
                        var rightStr = rtl ? Key.leftArrow : Key.rightArrow;

                        var targetIndex = this.getAdjacent && this.getAdjacent(newIndex, ev.keyCode);
                        if (+targetIndex === targetIndex) {
                            blockScrolling = true;
                            newIndex = targetIndex;
                        } else {
                            var modFixedSize = newIndex % this.fixedSize;

                            if (ev.keyCode === leftStr) {
                                blockScrolling = true;
                                if (this.fixedDirection === WinJS.UI._KeyboardBehavior.FixedDirection.width) {
                                    if (modFixedSize !== 0) {
                                        newIndex--;
                                    }
                                } else {
                                    if (newIndex >= this.fixedSize) {
                                        newIndex -= this.fixedSize;
                                    }
                                }
                            } else if (ev.keyCode === rightStr) {
                                blockScrolling = true;
                                if (this.fixedDirection === WinJS.UI._KeyboardBehavior.FixedDirection.width) {
                                    if (modFixedSize !== this.fixedSize - 1) {
                                        newIndex++;
                                    }
                                } else {
                                    if (newIndex + this.fixedSize - modFixedSize <= maxIndex) {
                                        newIndex += this.fixedSize;
                                    }
                                }
                            } else if (ev.keyCode === Key.upArrow) {
                                blockScrolling = true;
                                if (this.fixedDirection === WinJS.UI._KeyboardBehavior.FixedDirection.height) {
                                    if (modFixedSize !== 0) {
                                        newIndex--;
                                    }
                                } else {
                                    if (newIndex >= this.fixedSize) {
                                        newIndex -= this.fixedSize;
                                    }
                                }
                            } else if (ev.keyCode === Key.downArrow) {
                                blockScrolling = true;
                                if (this.fixedDirection === WinJS.UI._KeyboardBehavior.FixedDirection.height) {
                                    if (modFixedSize !== this.fixedSize - 1) {
                                        newIndex++;
                                    }
                                } else {
                                    if (newIndex + this.fixedSize - modFixedSize <= maxIndex) {
                                        newIndex += this.fixedSize;
                                    }
                                }
                            } else if (ev.keyCode === Key.home) {
                                blockScrolling = true;
                                newIndex = 0;
                            } else if (ev.keyCode === Key.end) {
                                blockScrolling = true;
                                newIndex = this._element.children.length - 1;
                            } else if (ev.keyCode === Key.pageUp) {
                                blockScrolling = true;
                            } else if (ev.keyCode === Key.pageDown) {
                                blockScrolling = true;
                            }
                        }

                        newIndex = Math.max(0, Math.min(this._element.children.length - 1, newIndex));

                        if (newIndex !== this.currentIndex) {
                            this._focus(newIndex, ev.keyCode);

                            // Allow KeyboardBehavior to be nested
                            if (ev.keyCode === leftStr || ev.keyCode === rightStr || ev.keyCode === Key.upArrow || ev.keyCode === Key.downArrow) {
                                ev.stopPropagation();
                            }
                        }

                        if (blockScrolling) {
                            ev.preventDefault();
                        }
                    }
                },

                _focus: function _KeyboardBehavior_focus(index, keyCode) {
                    index = (+index === index) ? index : this.currentIndex;

                    var elementToFocus = this._element.children[index];
                    if (elementToFocus) {
                        if (elementToFocus.winControl && elementToFocus.winControl._getFocusInto) {
                            elementToFocus = elementToFocus.winControl._getFocusInto(keyCode);
                        }

                        this.currentIndex = index;

                        WinJS.Utilities._setActive(elementToFocus);
                    }
                },

                _MSPointerDownHandler: function _KeyboardBehavior_MSPointerDownHandler(ev) {
                    var srcElement = ev.target;
                    if (srcElement === this.element) {
                        return;
                    }

                    while (srcElement.parentNode !== this.element) {
                        srcElement = srcElement.parentNode;
                    }

                    var index = -1;
                    while (srcElement) {
                        index++;
                        srcElement = srcElement.previousElementSibling;
                    }

                    this.currentIndex = index;
                },

                _beforeActivateHandler: function _KeyboardBehavior_beforeActivateHandler(ev) {
                    var allowActivate = false;
                    if (this._element.children.length) {
                        var currentItem = this._element.children[this.currentIndex];
                        if (currentItem === ev.target || currentItem.contains(ev.target)) {
                            allowActivate = true;
                        }
                    }

                    if (!allowActivate) {
                        ev.stopPropagation();
                        ev.preventDefault();
                    }
                }
            }, {
                FixedDirection: {
                    height: "height",
                    width: "width"
                }
            })
        })
    });

})(this, WinJS);