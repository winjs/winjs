// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    './Core/_Global',
    './Core/_WinRT',
    './Core/_Base',
    './Application',
    './Utilities/_ElementUtilities',
    './Core/_Resources'
], function lightDismissServiceInit(_Global, _WinRT, _Base, Application, _ElementUtilities, _Resources) {
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
    var EventNames = {
        requestingFocusOnKeyboardInput: "requestingfocusonkeyboardinput",
        edgyStarting: "edgystarting",
        edgyCompleted: "edgycompleted",
        edgyCanceled: "edgycanceled"
    };
    var LightDismissalReasons = {
        tap: "tap",
        lostFocus: "lostFocus",
        escape: "escape",
        hardwareBackButton: "hardwareBackButton",
        windowResize: "windowResize",
        windowBlur: "windowBlur",
        edgy: "edgy"
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
                case LightDismissalReasons.windowBlur:
                case LightDismissalReasons.edgy:
                    return true;
                    break;
            }
        },
        Sticky: function LightDismissalPolicies_Sticky_shouldReceiveLightDismiss(info) {
            info.stopPropagation(); // TODO: Maybe we shouldn't stopPropagation here
            return false;
        }  
    };
    var BASE_ZINDEX = 1000;

    var TypeToSearch = {
        _suggestionManager: null,
        _registered: false,
        _handler: null,

        register: function Application_TypeToSearch_register(handler) {
            if (!TypeToSearch._registered) {
                if (_WinRT.Windows.ApplicationModel.Search.Core.SearchSuggestionManager) {
                    TypeToSearch._suggestionManager = new _WinRT.Windows.ApplicationModel.Search.Core.SearchSuggestionManager();
                    TypeToSearch._suggestionManager.addEventListener("requestingfocusonkeyboardinput", TypeToSearch._requestingFocusOnKeyboardInput);
                } else {
                    TypeToSearch._updateKeydownCaptureListeners(_Global.top, true /*add*/);
                }
                TypeToSearch._handler = handler;
                TypeToSearch._registered = true;
            }
        },

        unregister: function Application_TypeToSearch_unregister() {
            if (TypeToSearch._registered) {
                if (_WinRT.Windows.ApplicationModel.Search.Core.SearchSuggestionManager) {
                    TypeToSearch._suggestionManager && TypeToSearch._suggestionManager.removeEventListener("requestingfocusonkeyboardinput", TypeToSearch._requestingFocusOnKeyboardInput);
                    TypeToSearch._suggestionManager = null;
                } else {
                    TypeToSearch._updateKeydownCaptureListeners(_Global.top, false /*add*/);
                }
                TypeToSearch._handler = null;
                TypeToSearch._registered = false;
            }
        },

        _requestingFocusOnKeyboardInput: function Application_TypeToSearch_requestingFocusOnKeyboardInput() {
            TypeToSearch._handler && TypeToSearch._handler();
        },

        _keydownCaptureHandler: function Application_TypeToSearch_keydownCaptureHandler(event) {
            if (TypeToSearch._registered && TypeToSearch._shouldKeyTriggerTypeToSearch(event)) {
                TypeToSearch._requestingFocusOnKeyboardInput();
            }
        },

        _frameLoadCaptureHandler: function Application_TypeToSearch_frameLoadCaptureHandler(event) {
            if (TypeToSearch._registered) {
                TypeToSearch._updateKeydownCaptureListeners(event.target.contentWindow, true /*add*/);
            }
        },

        _updateKeydownCaptureListeners: function Application_TypeToSearch_updateKeydownCaptureListeners(win, add) {
            // Register for child frame keydown events in order to support FocusOnKeyboardInput
            // when focus is in a child frame.  Also register for child frame load events so
            // it still works after frame navigations.
            // Note: This won't catch iframes added programmatically later, but that can be worked
            // around by toggling FocusOnKeyboardInput off/on after the new iframe is added.
            try {
                if (add) {
                    win.document.addEventListener('keydown', TypeToSearch._keydownCaptureHandler, true);
                } else {
                    win.document.removeEventListener('keydown', TypeToSearch._keydownCaptureHandler, true);
                }
            } catch (e) { // if the IFrame crosses domains, we'll get a permission denied error
            }

            if (win.frames) {
                for (var i = 0, l = win.frames.length; i < l; i++) {
                    var childWin = win.frames[i];
                    TypeToSearch._updateKeydownCaptureListeners(childWin, add);

                    try {
                        if (add) {
                            if (childWin.frameElement) {
                                childWin.frameElement.addEventListener('load', TypeToSearch._frameLoadCaptureHandler, true);
                            }
                        } else {
                            if (childWin.frameElement) {
                                childWin.frameElement.removeEventListener('load', TypeToSearch._frameLoadCaptureHandler, true);
                            }
                        }
                    } catch (e) { // if the IFrame crosses domains, we'll get a permission denied error
                    }
                }
            }
        },

        _shouldKeyTriggerTypeToSearch: function Application_TypeToSearch_shouldKeyTriggerTypeToSearch(event) {
            var shouldTrigger = false;
            // First, check if a metaKey is pressed (only applies to MacOS). If so, do nothing here.
            if (!event.metaKey) {
                // We also don't handle CTRL/ALT combinations, unless ALTGR is also set. Since there is no shortcut for checking AltGR,
                // we need to use getModifierState, however, Safari currently doesn't support this.
                if ((!event.ctrlKey && !event.altKey) || (event.getModifierState && event.getModifierState("AltGraph"))) {
                    // Show on most keys for visible characters like letters, numbers, etc.
                    switch (event.keyCode) {
                        case 0x30:  //0x30 0 key
                        case 0x31:  //0x31 1 key
                        case 0x32:  //0x32 2 key
                        case 0x33:  //0x33 3 key
                        case 0x34:  //0x34 4 key
                        case 0x35:  //0x35 5 key
                        case 0x36:  //0x36 6 key
                        case 0x37:  //0x37 7 key
                        case 0x38:  //0x38 8 key
                        case 0x39:  //0x39 9 key

                        case 0x41:  //0x41 A key
                        case 0x42:  //0x42 B key
                        case 0x43:  //0x43 C key
                        case 0x44:  //0x44 D key
                        case 0x45:  //0x45 E key
                        case 0x46:  //0x46 F key
                        case 0x47:  //0x47 G key
                        case 0x48:  //0x48 H key
                        case 0x49:  //0x49 I key
                        case 0x4A:  //0x4A J key
                        case 0x4B:  //0x4B K key
                        case 0x4C:  //0x4C L key
                        case 0x4D:  //0x4D M key
                        case 0x4E:  //0x4E N key
                        case 0x4F:  //0x4F O key
                        case 0x50:  //0x50 P key
                        case 0x51:  //0x51 Q key
                        case 0x52:  //0x52 R key
                        case 0x53:  //0x53 S key
                        case 0x54:  //0x54 T key
                        case 0x55:  //0x55 U key
                        case 0x56:  //0x56 V key
                        case 0x57:  //0x57 W key
                        case 0x58:  //0x58 X key
                        case 0x59:  //0x59 Y key
                        case 0x5A:  //0x5A Z key

                        case 0x60:  // VK_NUMPAD0,             //0x60 Numeric keypad 0 key
                        case 0x61:  // VK_NUMPAD1,             //0x61 Numeric keypad 1 key
                        case 0x62:  // VK_NUMPAD2,             //0x62 Numeric keypad 2 key
                        case 0x63:  // VK_NUMPAD3,             //0x63 Numeric keypad 3 key
                        case 0x64:  // VK_NUMPAD4,             //0x64 Numeric keypad 4 key
                        case 0x65:  // VK_NUMPAD5,             //0x65 Numeric keypad 5 key
                        case 0x66:  // VK_NUMPAD6,             //0x66 Numeric keypad 6 key
                        case 0x67:  // VK_NUMPAD7,             //0x67 Numeric keypad 7 key
                        case 0x68:  // VK_NUMPAD8,             //0x68 Numeric keypad 8 key
                        case 0x69:  // VK_NUMPAD9,             //0x69 Numeric keypad 9 key
                        case 0x6A:  // VK_MULTIPLY,            //0x6A Multiply key
                        case 0x6B:  // VK_ADD,                 //0x6B Add key
                        case 0x6C:  // VK_SEPARATOR,           //0x6C Separator key
                        case 0x6D:  // VK_SUBTRACT,            //0x6D Subtract key
                        case 0x6E:  // VK_DECIMAL,             //0x6E Decimal key
                        case 0x6F:  // VK_DIVIDE,              //0x6F Divide key

                        case 0xBA:  // VK_OEM_1,               //0xBA Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the ';:' key
                        case 0xBB:  // VK_OEM_PLUS,            //0xBB For any country/region, the '+' key
                        case 0xBC:  // VK_OEM_COMMA,           //0xBC For any country/region, the ',' key
                        case 0xBD:  // VK_OEM_MINUS,           //0xBD For any country/region, the '-' key
                        case 0xBE:  // VK_OEM_PERIOD,          //0xBE For any country/region, the '.' key
                        case 0xBF:  // VK_OEM_2,               //0xBF Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the '/?' key
                        case 0xC0:  // VK_OEM_3,               //0xC0 Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the '`~' key

                        case 0xDB:  // VK_OEM_4,               //0xDB Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the '[{' key
                        case 0xDC:  // VK_OEM_5,               //0xDC Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the '\|' key
                        case 0xDD:  // VK_OEM_6,               //0xDD Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the ']}' key
                        case 0xDE:  // VK_OEM_7,               //0xDE Used for miscellaneous characters; it can vary by keyboard. For the US standard keyboard, the 'single-quote/double-quote' key
                        case 0xDF:  // VK_OEM_8,               //0xDF Used for miscellaneous characters; it can vary by keyboard.

                        case 0xE2:  // VK_OEM_102,             //0xE2 Either the angle bracket key or the backslash key on the RT 102-key keyboard

                        case 0xE5:  // VK_PROCESSKEY,          //0xE5 IME PROCESS key

                        case 0xE7:  // VK_PACKET,              //0xE7 Used to pass Unicode characters as if they were keystrokes. The VK_PACKET key is the low word of a 32-bit Virtual Key value used for non-keyboard input methods. For more information, see Remark in KEYBDINPUT, SendInput, WM_KEYDOWN, and WM_KEYUP
                            shouldTrigger = true;
                            break;
                    }
                }
            }
            return shouldTrigger;
        }
    };

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
        
        ld_edgyStarting: _,
        
        ld_edgyCompleted: _,
        
        ld_edgyCanceled: _,
        
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
        },

        ld_requestingFocusOnKeyboardInput: function (info) {
            var that = this;
            // TODO: Is the filter necessary?
            // TODO: Is this too much overhead for the common path? This will run on every keystroke.
            var targets = lds._getRequestingFocusOnKeyboardInputCandidates(_Global.document.body).filter(function (el) {
                return that._belongsToBody(el);
            });
            lds._dispatchRequestingFocusOnKeyboardInput(targets);
            info.stopPropagation();
        }
    });

    var LightDismissableElement = {
        // ILightDismissable

        ld_receivedFocus: _,
        ld_lostTopLevel: _,
        
        ld_becameTopLevel: function () {
            // TODO: Track focus so that we can restore it rather than always going to the first element?
            _ElementUtilities._focusFirstFocusableElement(this.element);
        },
        
        ld_edgyStarting: _,
        
        ld_edgyCompleted: _,
        
        ld_edgyCanceled: _,
        
        ld_shouldReceiveLightDismiss: LightDismissalPolicies.Light,
        
        ld_lightDismiss: _,

        ld_requiresClickEater: function () {
            return true;
        },

        ld_setZIndex: function (value) {
            this.element.style.zIndex = value;
        },

        ld_containsElement: function (element) {
            return this.element.contains(element);
        },

        ld_requestingFocusOnKeyboardInput: function (info) {
            // TODO: If there's a type to search SearchBox, this will run on every keystroke
            // even though there probably isn't one in this light dismissable
            var targets = lds._getRequestingFocusOnKeyboardInputCandidates(this.element);
            lds._dispatchRequestingFocusOnKeyboardInput(targets);
            info.stopPropagation();
        },
    };

    var LightDismissService = _Base.Class.define(function () {
        this._clickEaterEl = this._createClickEater();
        this._clients = [];
        this._currentTopLevel = null;
        this._isLive = false;
        this._listeners = {};
        
        this._onEdgyStartingBound = this._onEdgyStarting.bind(this);
        this._onEdgyCompletedBound = this._onEdgyCompleted.bind(this);
        this._onEdgyCanceledBound = this._onEdgyCanceled.bind(this);
        if (_WinRT.Windows.UI.Input.EdgeGesture) {
            var edgy = _WinRT.Windows.UI.Input.EdgeGesture.getForCurrentView();
            edgy.addEventListener("starting", this._onEdgyStartingBound);
            edgy.addEventListener("completed", this._onEdgyCompletedBound);
            edgy.addEventListener("canceled", this._onEdgyCanceledBound);
        }
        
        this._onFocusInBound = this._onFocusIn.bind(this);
        _ElementUtilities._addEventListener(_Global.document.documentElement, "focusin", this._onFocusInBound);
        _ElementUtilities._addEventListener(_Global.document.documentElement, "keydown", this._onKeyDown.bind(this));
        Application.addEventListener("backclick", this._onBackClick.bind(this));
        _Global.addEventListener("resize", this._onWindowResize.bind(this));
        // Focus handlers generally use WinJS.Utilities._addEventListener with focusout/focusin. This
        // uses the browser's blur event directly beacuse _addEventListener doesn't support focusout/focusin
        // on window.
        _Global.addEventListener("blur", this._onWindowBlur.bind(this));

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
        
        addEventListener: function (element, name, listener) {
            name = name.toLowerCase();
            var handlers = this._getHandlers();
            var handler = handlers[name];

            if (!handler) {
                handler = this._getListener(name);
                handler.refCount = 0;
                handlers[name] = handler;
                handler.listeners = [];
                
                if (name === EventNames.requestingFocusOnKeyboardInput) {
                    TypeToSearch.register(this._requestingFocusOnKeyboardInput.bind(this));
                    //this.object.addEventListener(name, handler);
                }
                // We're always listening to edgy events so no need to start listening to them now
            }
            
            handler.refCount++;
            if (name === EventNames.requestingFocusOnKeyboardInput) {
                element.addEventListener(this._getEventName(name), listener);
                _ElementUtilities.addClass(element, this._getClassName(name));
            } else {
                // edgy
                handler.listeners.push(listener);
            }
        },

        removeEventListener: function (element, name, listener) {
            name = name.toLowerCase();
            var handlers = this._getHandlers();
            var handler = handlers[name];

            if (handler) {
                handler.refCount--;
                if (handler.refCount === 0) {
                    if (name === EventNames.requestingFocusOnKeyboardInput) {
                        TypeToSearch.unregister();
                        //this.object.removeEventListener(name, handler);
                    }
                    // We're always listening to edgy events so no need to unregister them now
                    delete handlers[name];
                }
            }
            
            if (name === EventNames.requestingFocusOnKeyboardInput) {
                _ElementUtilities.removeClass(element, this._getClassName(name));
                element.removeEventListener(this._getEventName(name), listener);
            } else {
                // edgy
                var index = handler.listeners.indexOf(listener);
                if (index !== -1) {
                    handler.listeners.splice(index, 1);
                }
            }
            
        },
        
        _getHandlers: function () {
            return this._listeners;
        },
        
        _getClassName: function (name) {
            return 'win-lightdismissservice-event-' + name;
        },

        _getEventName: function (name) {
            return 'WinJSLightDismissServiceEvent-' + name;
        },
        
        _getListener: function (name) {
            var listener = function (ev) {

                var targets = _Global.document.querySelectorAll('.' + this._getClassName(name));
                var length = targets.length;
                var handled = false;
                for (var i = 0; i < length; i++) {
                    var event = _Global.document.createEvent("Event");
                    event.initEvent(this._getEventName(name), false, true);
                    event.detail = { originalEvent: ev };
                    var doDefault = targets[i].dispatchEvent(event);
                    handled = handled || !doDefault;
                }
                return handled;
            };

            return listener.bind(this);
        },
        
        _getRequestingFocusOnKeyboardInputCandidates: function (element) {
            var className = lds._getClassName(EventNames.requestingFocusOnKeyboardInput);
            
            return Array.prototype.slice.call(element.querySelectorAll('.' + className), 0);
        },
        
        _dispatchRequestingFocusOnKeyboardInput: function (targets) {
            var eventName = lds._getEventName(EventNames.requestingFocusOnKeyboardInput);
            
            var length = targets.length;
            for (var i = 0; i < length; i++) {
                var event = _Global.document.createEvent("Event");
                event.initEvent(eventName, false, true);
                targets[i].dispatchEvent(event);
            }
        },

        _requestingFocusOnKeyboardInput: function () {
            var clients = this._clients.slice(0);
            var info = {
                stopPropagation: function () {
                    this._stop = true;
                },
                _stop: false,
            };
            // Notify light dismiss stack
            for (var i = clients.length - 1; i >= 0 && !info._stop; i--) {
                clients[i].ld_requestingFocusOnKeyboardInput(info);
            }
        },
        
        _onEdgyStarting: function (eventObject) {
            this._dispatchEdgy(EventNames.edgyStarting, eventObject);
        },
        
        _onEdgyCompleted: function (eventObject) {
            this._dispatchEdgy(EventNames.edgyCompleted, eventObject);
        },
        
        _onEdgyCanceled: function (eventObject) {
            this._dispatchEdgy(EventNames.edgyCanceled, eventObject);
        },
        
        _dispatchEdgy: function (edgyEventName, eventObject) {
            var eventToMethod = {};
            eventToMethod[EventNames.edgyStarting] = "ld_edgyStarting";
            eventToMethod[EventNames.edgyCompleted] = "ld_edgyCompleted";
            eventToMethod[EventNames.edgyCanceled] = "ld_edgyCanceled";
            var method = eventToMethod[edgyEventName];
            var handler = this._getHandlers()[edgyEventName.toLowerCase()];
            var baseListeners = handler ? handler.listeners.slice(0) : [];
            
            var clients = this._clients.slice(0);
            var info = {
                originalEvent: eventObject,
                stopPropagation: function () {
                    this._stop = true;
                },
                _stop: false,
                preventDefault: function () {
                    this._doDefault = false;  
                },
                _doDefault: true
            };
            // Notify light dismiss stack
            for (var i = clients.length - 1; i >= 0 && !info._stop; i--) {
                clients[i][method](info);
            }
            // Notify listeners outside of the light dismiss stack
            for (var i = 0, len = baseListeners.length; i < len && !info._stop; i++) {
                baseListeners[i](info);
            }
            
            // Convert the edgy event into a light dismiss trigger
            if (info._doDefault && (edgyEventName === EventNames.edgyStarting || edgyEventName === EventNames.edgyCompleted)) {
                this._dispatchLightDismiss(LightDismissalReasons.edgy);
            }
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
        //  Implemented
        //    - tap on click eater
        //    - hardware back button
        //    - escape key
        //    - resize
        //    - *lost focus (not in SplitView spec)
        //    - app is navigated away (start button pressed) (window blur?)
        //  Might work (need to test)
        //    - rotation (does this trigger resize?)
        //    - page is navigated away (should happen automatically because controls get disposed when a page navigates away)
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
            // TODO: Should I uncomment this?
            //if (target !== document.activeElement) {
            //    // The elements don't match. Focus events are async in IE so assume this
            //    // focus event is out of date and ignore it. Another one must be coming.
            //    return;
            //}
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
        
        _onWindowResize: function (eventObject) {
            // TODO: Cache document size like in _Overlay_baseResize and only trigger light dismiss
            // if the dimensions really changed?
            this._dispatchLightDismiss(LightDismissalReasons.windowResize);
        },
        
        _onWindowBlur: function (eventObject) {
            // TODO: Handle iframe case like _GlobalListener_windowBlur in _Overlay.js.
            this._dispatchLightDismiss(LightDismissalReasons.windowBlur);
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
