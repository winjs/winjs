// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    './Core/_Global',
    './Core/_Base',
    './Utilities/_ElementUtilities',
    './Core/_Resources'
], function overlayInit(_Global, _Base, _ElementUtilities, _Resources) {
    "use strict";

    var Strings = {
        // TODO: Don't use an overlay specific string?
        get closeOverlay() { return _Resources._getWinJSString("ui/closeOverlay").value; }
    };
    var ClassNames = {
        _clickEater: "win-click-eater"
    };
    var LightDismissalReasons = {
        tap: "tap",
        lostFocus: "lostFocus"
        // click (_Overlay.js: _Overlay_handleAppBarClickEatingClick, _Overlay__handleFlyoutClickEatingClick)
        // window blur (_Overlay.js: _GlobalListener_windowBlur)
        // edgy (_Overlay.js: _checkRightClickUp, _GlobalListener_edgyStarting, _GlobalListener_edgyCompleted)
        // escape key
        // hardware back button
        // window resize
        // rotation
        // page navigation?
    };
    var BASE_ZINDEX = 1000;

    var LightDismissService = _Base.Class.define(function () {
        this._clickEaterEl = this._createClickEater();
        this._clients = [];
        this._currentTopLevel = null;
        this._isLive = false;
        
        this._onFocusInBound = this._onFocusIn.bind(this);
    }, {
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

        _updateUI: function () {
            this._clients.forEach(function (c, i) {
                c.ld_setZIndex(BASE_ZINDEX + i * 2 + 1);
            }.bind(this));
            this._clickEaterEl.style.zIndex = BASE_ZINDEX + (this._clients.length - 1) * 2;

            if (!this._isLive && this._clients.length > 0) {
                _ElementUtilities._addEventListener(_Global.document.documentElement, "focusin", this._onFocusInBound);
                _Global.document.body.appendChild(this._clickEaterEl);
                this._isLive = true;
            } else if (this._isLive && this._clients.length === 0) {
                _ElementUtilities._removeEventListener(_Global.document.documentElement, "focusin", this._onFocusInBound);
                _Global.document.body.removeChild(this._clickEaterEl);
                this._isLive = false;
            
            }

            if (this._clients.length > 0) {
                var topLevel = this._clients[this._clients.length - 1];
                if (this._currentTopLevel !== topLevel) {
                    this._currentTopLevel = topLevel;
                    topLevel.ld_becameTopLevel();
                }
            } else {
                this._currentTopLevel = null;
            }
        },

        _dispatchLightDismiss: function (reason, clients) {
            this._notifying = true;
            //this._saveFocus();
            clients = clients || this._clients.slice(0);
            var lastClient;
            var info = {
                reason: reason,
                topLevel: true,
                stopPropagation: function () {
                    this._stop = true;
                },
                _stop: false
            };
            for (var i = clients.length - 1; i >= 0; i--) {
                lastClient = clients[i];
                lastClient.ld_lightDismiss(info);
                info.topLevel = false;
                if (info._stop) {
                    break;
                }
            }

            //this._becameTopLevelIfNeeded();
            this._updateUI();
            this._notifying = false;
        },

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

            this._dispatchLightDismiss(LightDismissalReasons.lostFocus, this._clients.slice(i + 1, this._clients.length));
        },

        _createClickEater: function () {
            var clickEater = _Global.document.createElement("section");
            clickEater.className = ClassNames._clickEater;
            clickEater.tabIndex = -1; // testing
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
        _onClickEaterClick: function (event) {
            event.stopPropagation();
            event.preventDefault();
            // light dismiss here? original implementation seemed to dismiss in up and click
            this._dispatchLightDismiss(LightDismissalReasons.tap);
        }
    });

    var LightDismissableElement = {
        // ILightDismissable

        // ABSTRACT: ld_lightDismiss
        // ABSTRACT: ld_becameTopLevel

        ld_setZIndex: function (value) {
            this.element.style.zIndex = value;
        },

        ld_containsElement: function (element) {
            return this.element.contains(element);
        }
    };

    var lds = new LightDismissService();
    lds.LightDismissableElement = LightDismissableElement;
    lds.LightDismissalReasons = LightDismissalReasons;

    return lds;
});
