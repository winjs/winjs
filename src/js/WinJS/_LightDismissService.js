// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    './Core/_Global',
    './Core/_Base',
    './Application',
    './Utilities/_ElementUtilities',
    './Core/_Resources'
], function lightDismissServiceInit(_Global, _Base, Application, _ElementUtilities, _Resources) {
    "use strict";

    // TODO: Connect Menu and SettingsFlyout to service (only did AppBar and Flyout so far)

    // TODO: Sticky AppBar with Flyout on top. Flyout dismisses due to moving focus to body.
    // AppBar should not steal focus.
    // TODO: Bottom AppBar sticky and shown. When focus is in body and you show the top AppBar,
    // (via show button in body) the top AppBar should receive focus.
    // TODO: Bottom AppBar sticky and shown. When showing top AppBar via its invoke button,
    // focus should move to the first command of the top AppBar.
    // TODO: When AppBars are shown via bottom AppBar's invoke button, first command of bottom
    // AppBar should receive focus.

    // TODO: When restoring focus, need to try restoring text selection (as is done by _trySelect in Overlay.js)

    var Strings = {
        // TODO: Don't use an overlay specific string?
        get closeOverlay() { return _Resources._getWinJSString("ui/closeOverlay").value; }
    };
    var ClassNames = {
        _clickEater: "win-click-eater"
    };
    var LightDismissalReasons = {
        tap: "tap",
        lostFocus: "lostFocus",
        escape: "escape",
        hardwareBackButton: "hardwareBackButton",
        windowResize: "windowResize"
        // click (_Overlay.js: _Overlay_handleAppBarClickEatingClick, _Overlay__handleFlyoutClickEatingClick)
        // window blur (_Overlay.js: _GlobalListener_windowBlur)
        // edgy (_Overlay.js: _checkRightClickUp, _GlobalListener_edgyStarting, _GlobalListener_edgyCompleted)
        // escape key
        // hardware back button
        // window resize
        // rotation
        // page navigation?
    };
    var LightDismissalPolicies = {
        Light: function LightDismissalPolicies_Light_shouldReceiveLightDismiss(info) {
            switch (info.reason) {
                case LightDismissalReasons.tap:
                case LightDismissalReasons.escape:
                    if (info.topLevel) {
                        return true;
                    } else {
                        info.stopPropagation();
                        return false;
                    }
                    break;
                case LightDismissalReasons.hardwareBackButton:
                    if (info.topLevel) {
                        info.preventDefault(); // prevent backwards navigation in the app
                        return true;
                    } else {
                        info.stopPropagation();
                        return false;
                    }
                    break;
                case LightDismissalReasons.lostFocus:
                case LightDismissalReasons.windowResize:
                    return true;
                    break;
            }
        },
        Sticky: function LightDismissalPolicies_Sticky_shouldReceiveLightDismiss(info) {
            info.stopPropagation();
            return false;
        }  
    };
    var BASE_ZINDEX = 1000;

    function pp(e) {
        return e ? [e.id, e.className, e.tagName].join(":") : "<null>";
    }

    function _() { };

    var LightDismissableBody = _Base.Class.define(function () {
        _ElementUtilities._addEventListener(_Global.document.documentElement, "focusin", this._onFocusIn.bind(this));
    }, {
        _belongsToBody: function (element) {
            if (element && _Global.document.body.contains(element)) {
                while (element && !_ElementUtilities.hasClass(element, "win-lightdismissable")) {
                    element = element.parentNode;
                }

                return !element;
            } else {
                return false;
            }
        },

        _onFocusIn: function (eventObject) {
            if (this._belongsToBody(eventObject.target)) {
                this._currentFocus = eventObject.target;
            }
        },

        // ILightDismissable
        
        ld_shouldReceiveLightDismiss: function (info) {
            info.stopPropagation();
            return false;
        },
        
        ld_lightDismiss: _,

        ld_receivedFocus: function (element) {
        },

        ld_becameTopLevel: function () {
            if (this._belongsToBody(_Global.document.activeElement)) {
                // nop
            } else if (this._currentFocus && _Global.document.body.contains(this._currentFocus)) {
                this._currentFocus.focus();
            } else {
                _Global.document.body && _ElementUtilities._focusFirstFocusableElement(_Global.document.body);
            }
        },

        ld_lostTopLevel: function () {
        },

        ld_requiresClickEater: function () {
            return false;
        },

        ld_setZIndex: _,

        ld_containsElement: function (element) {
            return _Global.document.body.contains(element);
        }
    });

    var LightDismissableElement = {
        // ILightDismissable

        // ABSTRACT: ld_lightDismiss
        // ABSTRACT: ld_becameTopLevel (deafault impl?: _ElementUtilities._focusFirstFocusableElement(this.element);)

        ld_receivedFocus: _,
        ld_lostTopLevel: _,

        ld_requiresClickEater: function () {
            return true;
        },

        ld_setZIndex: function (value) {
            this.element.style.zIndex = value;
        },

        ld_containsElement: function (element) {
            return this.element.contains(element);
        }
    };

    var LightDismissService = _Base.Class.define(function () {
        this._clickEaterEl = this._createClickEater();
        this._clients = [];
        this._currentTopLevel = null;
        this._isLive = false;
        
        this._onFocusInBound = this._onFocusIn.bind(this);
        _ElementUtilities._addEventListener(_Global.document.documentElement, "focusin", this._onFocusInBound);
        _ElementUtilities._addEventListener(_Global.document.documentElement, "keydown", this._onKeyDown.bind(this));
        Application.addEventListener("backclick", this._onBackClick.bind(this));
        _Global.addEventListener("resize", this._onResize.bind(this));

        this.shown(new LightDismissableBody());
    }, {
        LightDismissableElement: LightDismissableElement,
        LightDismissalReasons: LightDismissalReasons,
        LightDismissalPolicies: LightDismissalPolicies,

        // TODO: Think about states
        // - is top level
        //   - maybe we can put a permanent client at index 0
        //     so we don't need to special case this in other
        //     parts of the code
        // - is notifying

        // TODO: What if somebody calls shown multiple times?
        //       Ignore them? Register them again? Move their registration?
        shown: function (client) {
            //this._saveFocus();
            //if (this._topLevel) {
            //    this._topLevel._isTopLevel = false;
            //}
            var index = this._clients.indexOf(client);
            if (index === -1) {
                this._clients.push(client);
                if (!this._notifying) {
                    //this._becameTopLevelIfNeeded();
                    this._updateUI();
                }
            }
        },

        hidden: function (client) {
            //var dismissedTopLevel = this._topLevel === client;
            var index = this._clients.indexOf(client);
            if (index !== -1) {
                this._clients.splice(index, 1);
                //if (dismissedTopLevel) {
                //    client._isTopLevel = false;
                    if (!this._notifying) {
                        //this._becameTopLevelIfNeeded();
                        this._updateUI();
                    }
                //}
            }
        },

        isTopLevel: function (client) {
            return this._clients[this._clients.length - 1] === client;
        },

        forceLayout: function () {
            this._updateUI();
        },
        
        _updateUI: function () {
            var clickEaterIndex = -1;
            this._clients.forEach(function (c, i) {
                if (c.ld_requiresClickEater()) {
                    clickEaterIndex = i;
                }
                c.ld_setZIndex(BASE_ZINDEX + i * 2 + 1);
            }.bind(this));
            if (clickEaterIndex !== -1) {
                this._clickEaterEl.style.zIndex = BASE_ZINDEX + clickEaterIndex * 2;
            }

            if (!this._isLive && clickEaterIndex !== -1) {
                // TODO: Do we have to listen to focus events when there are clients but nobody needs the click eater?
                //_ElementUtilities._addEventListener(_Global.document.documentElement, "focusin", this._onFocusInBound);
                _Global.document.body.appendChild(this._clickEaterEl);
                this._isLive = true;
            } else if (this._isLive && clickEaterIndex === -1) {
                //_ElementUtilities._removeEventListener(_Global.document.documentElement, "focusin", this._onFocusInBound);
                _Global.document.body.removeChild(this._clickEaterEl);
                this._isLive = false;
            
            }

            var topLevel = this._clients.length > 0 ? this._clients[this._clients.length - 1] : null;
            if (this._currentTopLevel !== topLevel) {
                this._currentTopLevel && this._currentTopLevel.ld_lostTopLevel();
                this._currentTopLevel = topLevel;
                this._currentTopLevel && this._currentTopLevel.ld_becameTopLevel();
            }
        },

        _createClickEater: function () {
            var clickEater = _Global.document.createElement("section");
            clickEater.className = ClassNames._clickEater;
            //clickEater.tabIndex = -1; // testing
            _ElementUtilities._addEventListener(clickEater, "pointerdown", this._onClickEaterPointerDown.bind(this), true);
            _ElementUtilities._addEventListener(clickEater, "pointerup", this._onClickEaterPointerUp.bind(this), true);
            clickEater.addEventListener("click", this._onClickEaterClick.bind(this), true);
            // Tell Aria that it's clickable
            clickEater.setAttribute("role", "menuitem");
            clickEater.setAttribute("aria-label", Strings.closeOverlay);
            // Prevent CED from removing any current selection
            clickEater.setAttribute("unselectable", "on");
            return clickEater;


            //lickEater._winHideClickEater = hideClickEatingDivFunction;
            //_Global.document.body.appendChild(clickEatingDiv);
        },
        
        _dispatchLightDismiss: function (reason, clients) {
            this._notifying = true;
            //this._saveFocus();
            clients = clients || this._clients.slice(0);
            var shouldReceiveDismissInfo = {
                reason: reason,
                topLevel: true,
                stopPropagation: function () {
                    this._stop = true;
                },
                _stop: false,
                preventDefault: function () {
                    this._doDefault = false;  
                },
                _doDefault: true
            };
            var dismissInfo = {
                reason: reason,
                topLevel: true
            };
            for (var i = clients.length - 1; i >= 0 && !shouldReceiveDismissInfo._stop; i--) {
                if (clients[i].ld_shouldReceiveLightDismiss(shouldReceiveDismissInfo, dismissInfo)) {
                    clients[i].ld_lightDismiss(dismissInfo);
                }
                shouldReceiveDismissInfo.topLevel = false;
                dismissInfo.topLevel = false;
            }

            //this._becameTopLevelIfNeeded();
            this._updateUI();
            this._notifying = false;
            
            return shouldReceiveDismissInfo._doDefault;
        },
        
        //
        // Light dismiss triggers
        //
        
        _onFocusIn: function (eventObject) {
            // Commented out code is from _Overlay.js. Think if we need to handle this case in the service.
            // Do not hide focus if focus moved to a CED. Let the click handler on the CED take care of hiding us.
            //if (active &&
            //        (_ElementUtilities.hasClass(active, _Constants._clickEatingFlyoutClass) ||
            //         _ElementUtilities.hasClass(active, _Constants._clickEatingAppBarClass))) {
            //    return;
            //}

            var target = eventObject.target;
            for (var i = this._clients.length - 1; i >= 0; i--) {
                if (this._clients[i].ld_containsElement(target)) {
                    break;
                }
            }
            if (i !== -1) {
                this._clients[i].ld_receivedFocus(target);
            }

            this._dispatchLightDismiss(LightDismissalReasons.lostFocus, this._clients.slice(i + 1, this._clients.length));
        },

        _onKeyDown: function (eventObject) {
            // TODO: Original would set _keyboardInvoked to true for escape here.
            // TODO: preventDefault, stopPropagation even if nobody dismisses?
            if (eventObject.keyCode === _ElementUtilities.Key.escape) {
                event.preventDefault();
                event.stopPropagation();
                this._dispatchLightDismiss(LightDismissalReasons.escape);
            }
        },
        
        _onBackClick: function (eventObject) {
            // Sets keyboardInvoked to false (_Overlay_backClick in _Overlay.js)
            var doDefault = this._dispatchLightDismiss(LightDismissalReasons.hardwareBackButton);
            return !doDefault; // Returns whether or not the event was handled.
        },
        
        _onResize: function (eventObject) {
            // TODO: Cache document size like in _Overlay_baseResize and only trigger light dismiss
            // if the dimensions really changed?
            this._dispatchLightDismiss(LightDismissalReasons.windowResize);
        },

        _onClickEaterPointerDown: function (event) {
            var target = event.currentTarget;
            if (target) {
                try {
                    // Remember pointer id and remember right mouse
                    target._winPointerId = event.pointerId;
                    // Cache right mouse if that was what happened
                    target._winRightMouse = (event.button === 2);
                } catch (e) { }
            }

            if (!target._winRightMouse) {
                event.stopPropagation();
                event.preventDefault();
            }
        },

        // Make sure that if we have an up we had an earlier down of the same kind
        _onClickEaterPointerUp: function (event) {
            var rightMouse = false,
                target = event.currentTarget;

            // Same pointer we were watching?
            try {
                if (target && target._winPointerId === event.pointerId) {
                    // Same pointer
                    rightMouse = target._winRightMouse;
                }
            } catch (e) { }

            if (!rightMouse) {
                event.stopPropagation();
                event.preventDefault();
                // light dismiss here? original implementation seemed to dismiss in up and click
                //target._winHideClickEater(event);
            }
        },

        // TODO: Think about edgy
        // TODO: How to dismiss on right-click? click event doesn't seem to fire on right-click.
        // AppBars don't want to dismiss on right-click because they are hooked up to edgy which
        // will trigger on right-click.
        _onClickEaterClick: function (event) {
            event.stopPropagation();
            event.preventDefault();
            // light dismiss here? original implementation seemed to dismiss in up and click
            this._dispatchLightDismiss(LightDismissalReasons.tap);
        }
    });

    var lds = new LightDismissService();
    _Base.Namespace.define("WinJS.UI", {
        _LightDismissService: lds
    });
    return lds;
});
