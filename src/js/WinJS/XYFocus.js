// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
//High Level
// -Provides direct APIs to navigate focus to each cardinal direction relative
//  to the current focused element within a specified container
// -Directly listens to configurable key inputs and invokes navigation
//  automatically
// -Coordinates with XYFocus implementations within iframes for seamless focus
//  navigation into and out of an iframe
//Navigation Algorithm
// -Navigation API is called with a given direction
// -Source element is established, usually the current focused element
// -All elements within the focus root (document.body by default) are gathered
//      -Each element's distance from the source element is measured
//      -Each element is assigned a score value which takes the following into
//       account, in order of importance:
//          -The relative size and alignment difference between the element
//           and history rectangle
//          -The distance between the element and source element along the
//           main axis
//          -The relative size and alignment difference between the element
//           and source element
//          -The distance the element and source element  along the co- axis
// -The highest scoring element is resolved which is the candidate for navigation
// -NOTE: a more in -depth summary of this algorithm can be found in the actual
//        source code which has been well- maintained as the code evolved
//Customizations
// The focus request can be customized by the following:
//   -Specific source rectangle/ element, algorithm calculates from this
//    rectangle instead of the current focused element
//   -A focus root, only elements within the focus root are considered as
//    potential targets
//   -A history rectangle, which heavily favors potential target elements that
//    are aligned and of similar size to the history rectangle
//   -Any focusable element can be also annotated with a
//    "data-win-focus='{ left: '#myDiv' }'" attribute.This attribute is referred
//    to as an XYFocus override.This allows you to directly control where focus
//    should move from this element, given the requested direction.
//Automatic Focus
// The XYFocus module can be configured to listen to specific hotkeys via
// XYFocus.keyCodeMap.When a mapped key input is detected, it will automatically
// invoke the above navigation algorithm.By default, the Xbox DPad and left thumbstick
// keys are mapped.These can be cleared and new keys(e.g.arrow keys, WASD) can be added.
//Suspension
// Any element can be annotated with 'win-xyfocus-suspended', the focus navigation
// algorithm will ignore any focus request when source of the input comes from within a
// suspended element.This helps custom controls to declare their element root as suspended
// and handle focus navigation manually.
// Taking the ListView as an example, XYFocus with arrow key mappings would heavily conflict
// with this control.Since the ListView manually handles arrow keys, and does not support
// direct focus movement in some scenarios around its virtualization logic, the user would
// experience unwanted behaviors.However, we don't want to just completely disable XYFocus
// as the rest of the page properly leverages it.To fix this issue, the ListView root element
// would be annotated with 'win-xyfocus-suspended' and XYFocus will not process any input when
// the source element is contained within the suspended element.
//Toggle Mode
//Problem Statement
// Some native elements have their own input logic defined, such as a range input element.
// If the developer has mapped the arrow keys for XYFocus navigation, then we run into the
// problem where a right arrow key would navigate to the right element from the input element
// (if any) instead of manipulating the range values.The opposite scenario/ problem is also true.
//ToggleMode rules
// Any element can be annotated with 'win-xyfocus-togglemode'.An element with just the toggle mode
// class is said to be in the toggle- mode - rest state, in this state, the element is not treated
// in any special way.An element can be toggled from toggle-mode-rest to toggle-mode-active
// state by further annotating it with 'win-xyfocus-togglemode-active' in which case the focus
// navigation algorithm treats the element as if it was suspended.
//Additional KeyCodeMappings
// XYFocus.keyCodeMap.accept and XYFocus.keyCodeMap.cancel can be used to control which keys toggle
// the modes. 'Accept' toggles from rest to active, and 'Cancel' toggles it from active to rest.
//Solution
// A list of input sensitive native HTML elements have the toggle mode logic applied to automatically
// (see list in XYFocus source code, better maintained there than here).This means that if the
// XYFocus code navigates to an element type in the list, it will automatically apply the toggle
// mode onto the element.If the user wants to interact with the element directly, they can press a
// key mapped in XYFocus.keyCodeMap.accept to activate the toggle mode to suspend focus requests.
//Considerations when authoring new controls
// When authoring a new control, you may just let XYFocus handle all your focus navigation if the
// focus navigation story is trivial.If not, then consider using the win-xyfocus-suspended class
// on the control root to disable XYFocus within your control.In suspended mode, you can still
// leverage XYFocus.findNextFocusableElement(direction) to aid your custom focus implementation.
// If the new control's focus movement is trivial but conflicts with existing XYFocus keys, like
// the Rating control, then leverage win- xyfocus - togglemode to enable toggling of suspension.
//Dealing with edge cases
// Rule of thumb: Ignore it! One important thing to accept is that XYFocus is a heuristic-it is
// not a general focus management solution.It works very well in orthogonal, grid - like layouts
// and will fail utterly outside of them.
//  -There are numerous layouts that can break the XYFocus' heuristic for determining the next
//   focusable element.Most of these are unnatural and contrived layouts where buttons are
//   purposely misaligned and overlapping.Historically, we have ignored these issues.
//  -If a valid edge case is found, we handle it on a case-by -case basis.In most cases,
//   leveraging the XYFocus override is good enough.
//  -If anything more fundamental with the heuristics are found (which has not happened since
//   XYFocus was handed to WinJS by Xbox), consider tweaking the scoring constants - this is the
//   most EXTREME case.
//  -Another category of edge cases revolves around history focus.These have also been historically
//   ignored as no real app has produced any valid layout that triggers these issues.
// One common example here is that you could have a list of buttons so long that the score from
// the primary axis trumps the history score, however, you'd need 10,000s of pixels of consecutive
// buttons which is unrealistic as a focus movement likely will trigger a scroll which invalidates history.
;(function() {
  'use strict';

  var global = this;
  var exports = {};

  var MATCHES = (
    'msMatchesSelector' in document.documentElement ? 'msMatchesSelector' :
    'webkitMatchesSelector' in document.documentElement ? 'webkitMatchesSelector' :
    'matches' in document.documentElement ? 'matches' : ''
  );

  // Defines a set of keyboard values.
  var Keys = {
    F1: 112, F2: 113, F3: 114, F4: 115, F5: 116, F6: 117, F7: 118, F8: 119, F9: 120,
    F10: 121, F11: 122, F12: 123,

    num0: 48, num1: 49, num2: 50, num3: 51, num4: 52, num5: 53, num6: 54, num7: 55,
    num8: 56, num9: 57,
    numPad0: 96, numPad1: 97, numPad2: 98, numPad3: 99, numPad4: 100, numPad5: 101,
    numPad6: 102, numPad7: 103, numPad8: 104, numPad9: 105,
    multiply: 106, add: 107, subtract: 109, decimalPoint: 110, divide: 111,

    a: 65, b: 66, c: 67, d: 68, e: 69, f: 70, g: 71, h: 72, i: 73, j: 74,
    k: 75, l: 76, m: 77, n: 78, o: 79, p: 80, q: 81, r: 82, s: 83, t: 84, u: 85,
    v: 86, w: 87, x: 88, y: 89, z: 90,

    backspace: 8, tab: 9, enter: 13, shift: 16, ctrl: 17, alt: 18, pause: 19, capsLock: 20,
    escape: 27, space: 32, pageUp: 33, pageDown: 34, end: 35, home: 36,
    numLock: 144, scrollLock: 145, browserBack: 166, browserForward: 167, semicolon: 186,
    equal: 187, comma: 188, dash: 189, period: 190, forwardSlash: 191, graveAccent: 192,
    openBracket: 219, backSlash: 220, closeBracket: 221, singleQuote: 222, IME: 229,

    leftArrow: 37, upArrow: 38, rightArrow: 39, downArrow: 40, insert: 45, deleteKey: 46,
    leftWindows: 91, rightWindows: 92, menu: 93,

    NavigationView: 136, NavigationMenu: 137, NavigationUp: 138, NavigationDown: 139,
    NavigationLeft: 140, NavigationRight: 141, NavigationAccept: 142, NavigationCancel: 143,

    GamepadA: 195, GamepadB: 196, GamepadX: 197, GamepadY: 198, GamepadRightShoulder: 199,
    GamepadLeftShoulder: 200, GamepadLeftTrigger: 201, GamepadRightTrigger: 202,
    GamepadDPadUp: 203, GamepadDPadDown: 204, GamepadDPadLeft: 205, GamepadDPadRight: 206,
    GamepadMenu: 207, GamepadView: 208, GamepadLeftThumbstick: 209, GamepadRightThumbstick: 210,
    GamepadLeftThumbstickUp: 211, GamepadLeftThumbstickDown: 212, GamepadLeftThumbstickRight: 213,
    GamepadLeftThumbstickLeft: 214, GamepadRightThumbstickUp: 215, GamepadRightThumbstickDown: 216,
    GamepadRightThumbstickRight: 217, GamepadRightThumbstickLeft: 218
  };

  function assign(object, source) {
    var index = -1,
        props = Object.keys(source),
        length = props.length;

    while (++index < length) {
      var key = props[index];
      object[key] = source[key];
    }
    return object;
  }

  function createEventProperty(name) {
    var eventPropStateName = "_on" + name + "state";

    return {
      get: function() {
        var state = this[eventPropStateName];
        return state && state.userHandler;
      },
      set: function(handler) {
        var state = this[eventPropStateName];
        if (handler) {
          if (!state) {
            state = { wrapper: function(evt) { return state.userHandler(evt); }, userHandler: handler };
            Object.defineProperty(this, eventPropStateName, { value: state, enumerable: false, writable:true, configurable: true });
            this.addEventListener(name, state.wrapper, false);
          }
          state.userHandler = handler;
        } else if (state) {
          this.removeEventListener(name, state.wrapper, false);
          this[eventPropStateName] = null;
        }
      },
      enumerable: true
    };
  }

  function createEventProperties() {
    /// <signature helpKeyword="WinJS.Utilities.createEventProperties">
    /// <summary locid="WinJS.Utilities.createEventProperties">
    /// Creates an object that has one property for each name passed to the function.
    /// </summary>
    /// <param name="events" locid="WinJS.Utilities.createEventProperties_p:events">
    /// A variable list of property names.
    /// </param>
    /// <returns type="Object" locid="WinJS.Utilities.createEventProperties_returnValue">
    /// The object with the specified properties. The names of the properties are prefixed with 'on'.
    /// </returns>
    /// </signature>
    var props = {};
    for (var i = 0, len = arguments.length; i < len; i++) {
      var name = arguments[i];
      props["on" + name] = createEventProperty(name);
    }
    return props;
  }

  function EventMixinEvent(type, detail, target) {
    this.detail = detail;
    this.target = target;
    this.timeStamp = Date.now();
    this.type = type;
  }

  EventMixinEvent.prototype = {
    constructor: EventMixinEvent,
    bubbles: { value: false, writable: false },
    cancelable: { value: false, writable: false },
    currentTarget: {
      get: function() { return this.target; }
    },
    defaultPrevented: {
      get: function() { return this._preventDefaultCalled; }
    },
    trusted: { value: false, writable: false },
    eventPhase: { value: 0, writable: false },
    target: null,
    timeStamp: null,
    type: null,

    preventDefault: function() {
      this._preventDefaultCalled = true;
    },
    stopImmediatePropagation: function() {
      this._stopImmediatePropagationCalled = true;
    },
    stopPropagation: function() {}
  };

  EventMixinEvent.supportedForProcessing = false;

  var eventMixin = {
    _listeners: null,

    addEventListener: function(type, listener, useCapture) {
      /// <signature helpKeyword="WinJS.Utilities.eventMixin.addEventListener">
      /// <summary locid="WinJS.Utilities.eventMixin.addEventListener">
      /// Adds an event listener to the control.
      /// </summary>
      /// <param name="type" locid="WinJS.Utilities.eventMixin.addEventListener_p:type">
      /// The type (name) of the event.
      /// </param>
      /// <param name="listener" locid="WinJS.Utilities.eventMixin.addEventListener_p:listener">
      /// The listener to invoke when the event is raised.
      /// </param>
      /// <param name="useCapture" locid="WinJS.Utilities.eventMixin.addEventListener_p:useCapture">
      /// if true initiates capture, otherwise false.
      /// </param>
      /// </signature>
      useCapture = useCapture || false;
      this._listeners = this._listeners || {};
      var eventListeners = (this._listeners[type] = this._listeners[type] || []);
      for (var i = 0, len = eventListeners.length; i < len; i++) {
        var l = eventListeners[i];
        if (l.useCapture === useCapture && l.listener === listener) {
          return;
        }
      }
      eventListeners.push({ listener: listener, useCapture: useCapture });
    },
    dispatchEvent: function(type, details) {
      /// <signature helpKeyword="WinJS.Utilities.eventMixin.dispatchEvent">
      /// <summary locid="WinJS.Utilities.eventMixin.dispatchEvent">
      /// Raises an event of the specified type and with the specified additional properties.
      /// </summary>
      /// <param name="type" locid="WinJS.Utilities.eventMixin.dispatchEvent_p:type">
      /// The type (name) of the event.
      /// </param>
      /// <param name="details" locid="WinJS.Utilities.eventMixin.dispatchEvent_p:details">
      /// The set of additional properties to be attached to the event object when the event is raised.
      /// </param>
      /// <returns type="Boolean" locid="WinJS.Utilities.eventMixin.dispatchEvent_returnValue">
      /// true if preventDefault was called on the event.
      /// </returns>
      /// </signature>
      var listeners = this._listeners && this._listeners[type];
      if (listeners) {
        var eventValue = new EventMixinEvent(type, details, this);
        // Need to copy the array to protect against people unregistering while we are dispatching
        listeners = listeners.slice(0, listeners.length);
        for (var i = 0, len = listeners.length; i < len && !eventValue._stopImmediatePropagationCalled; i++) {
          listeners[i].listener(eventValue);
        }
        return eventValue.defaultPrevented || false;
      }
      return false;
    },
    removeEventListener: function(type, listener, useCapture) {
      /// <signature helpKeyword="WinJS.Utilities.eventMixin.removeEventListener">
      /// <summary locid="WinJS.Utilities.eventMixin.removeEventListener">
      /// Removes an event listener from the control.
      /// </summary>
      /// <param name="type" locid="WinJS.Utilities.eventMixin.removeEventListener_p:type">
      /// The type (name) of the event.
      /// </param>
      /// <param name="listener" locid="WinJS.Utilities.eventMixin.removeEventListener_p:listener">
      /// The listener to remove.
      /// </param>
      /// <param name="useCapture" locid="WinJS.Utilities.eventMixin.removeEventListener_p:useCapture">
      /// Specifies whether to initiate capture.
      /// </param>
      /// </signature>
      useCapture = useCapture || false;
      var listeners = this._listeners && this._listeners[type];
      if (listeners) {
        for (var i = 0, len = listeners.length; i < len; i++) {
          var l = listeners[i];
          if (l.listener === listener && l.useCapture === useCapture) {
            listeners.splice(i, 1);
            if (listeners.length === 0) {
              delete this._listeners[type];
            }
            // Only want to remove one element for each call to removeEventListener
            break;
          }
        }
      }
    }
  };

  var AttributeNames = {
    focusOverride: 'data-win-xyfocus',
    focusOverrideLegacy: 'data-win-focus'
  };

  var ClassNames = {
    focusable: 'win-focusable',
    suspended: 'win-xyfocus-suspended',
    toggleMode: 'win-xyfocus-togglemode',
    toggleModeActive: 'win-xyfocus-togglemode-active',
    xboxPlatform: 'win-xbox'
  };

  var CrossDomainMessageConstants = {
    messageDataProperty: 'msWinJSXYFocusControlMessage',
    register: 'register',
    unregister: 'unregister',
    dFocusEnter: 'dFocusEnter',
    dFocusExit: 'dFocusExit'
  };

  var DirectionNames = {
    left: 'left',
    right: 'right',
    up: 'up',
    down: 'down'
  };

  var EventNames = {
    focusChanging: 'focuschanging',
    focusChanged: 'focuschanged'
  };

  var FocusableTagNames = [
    'A',
    'BUTTON',
    'IFRAME',
    'INPUT',
    'SELECT',
    'TEXTAREA'
  ];

  // These factors can be tweaked to adjust which elements are favored by the focus algorithm.
  var ScoringConstants = {
    primaryAxisDistanceWeight: 30,
    secondaryAxisDistanceWeight: 20,
    percentInHistoryShadowWeight: 100000
  };

  /**
   * Gets the mapping object that maps keycodes to XYFocus actions.
  **/
  exports.keyCodeMap = {
    left: [],
    right: [],
    up: [],
    down: [],
    accept: [],
    cancel: []
  };

  function findNextFocusElement(direction, options) {
    var result = _findNextFocusElementInternal(direction, options);
    return result ? result.target : null;
  }
  exports.findNextFocusElement = findNextFocusElement;

  function moveFocus(direction, options) {
    var result = findNextFocusElement(direction, options);
    if (result) {
      var previousFocusElement = document.activeElement;
      if (_trySetFocus(result, -1)) {
        eventSrc.dispatchEvent(EventNames.focusChanged, { previousFocusElement: previousFocusElement, keyCode: -1 });
        return result;
      }
    }
    return null;
  }
  exports.moveFocus = moveFocus;

  // Privates.
  var _lastTarget;
  var _cachedLastTargetRect;
  var _historyRect;

  /**
   * Executes XYFocus algorithm with the given parameters. Returns true if focus was moved, false otherwise.
   * @param direction The direction to move focus.
   * @param keyCode The key code of the pressed key.
   * @param (optional) A rectangle to use as the source coordinates for finding the next focusable element.
   * @param (optional) Indicates whether this focus request is allowed to propagate to its parent if we are in iframe.
  **/
  function _xyFocus(direction, keyCode, referenceRect, dontExit) {
    var activeElement = document.activeElement;

    // Nested Helpers.
    function updateHistoryRect(direction, result) {
      var newHistoryRect = _defaultRect();
      // It's possible to get into a situation where the target element has no overlap with the reference edge.
      //
      //..╔══════════════╗..........................
      //..║   reference  ║..........................
      //..╚══════════════╝..........................
      //.....................╔═══════════════════╗..
      //.....................║                   ║..
      //.....................║       target      ║..
      //.....................║                   ║..
      //.....................╚═══════════════════╝..
      //
      // If that is the case, we need to reset the coordinates to the edge of the target element.
      if (direction === DirectionNames.left || direction === DirectionNames.right) {
        newHistoryRect.top = Math.max(result.targetRect.top, result.referenceRect.top, _historyRect ? _historyRect.top : Number.MIN_VALUE);
        newHistoryRect.bottom = Math.min(result.targetRect.bottom, result.referenceRect.bottom, _historyRect ? _historyRect.bottom : Number.MAX_VALUE);
        if (newHistoryRect.bottom <= newHistoryRect.top) {
          newHistoryRect.top = result.targetRect.top;
          newHistoryRect.bottom = result.targetRect.bottom;
        }
        newHistoryRect.height = newHistoryRect.bottom - newHistoryRect.top;
        newHistoryRect.width = Number.MAX_VALUE;
        newHistoryRect.left = Number.MIN_VALUE;
        newHistoryRect.right = Number.MAX_VALUE;
      }
      else {
        newHistoryRect.left = Math.max(result.targetRect.left, result.referenceRect.left, _historyRect ? _historyRect.left : Number.MIN_VALUE);
        newHistoryRect.right = Math.min(result.targetRect.right, result.referenceRect.right, _historyRect ? _historyRect.right : Number.MAX_VALUE);
        if (newHistoryRect.right <= newHistoryRect.left) {
          newHistoryRect.left = result.targetRect.left;
          newHistoryRect.right = result.targetRect.right;
        }
        newHistoryRect.width = newHistoryRect.right - newHistoryRect.left;
        newHistoryRect.height = Number.MAX_VALUE;
        newHistoryRect.top = Number.MIN_VALUE;
        newHistoryRect.bottom = Number.MAX_VALUE;
      }
      _historyRect = newHistoryRect;
    }
    // If focus has moved since the last XYFocus movement, scrolling occured, or an explicit
    // reference rectangle was given to us, then we invalidate the history rectangle.
    if (referenceRect || activeElement !== _lastTarget) {
      _historyRect = null;
      _lastTarget = null;
      _cachedLastTargetRect = null;
    }
    else if (_lastTarget && _cachedLastTargetRect) {
      var lastTargetRect = _toIRect(_lastTarget.getBoundingClientRect());
      if (lastTargetRect.left !== _cachedLastTargetRect.left || lastTargetRect.top !== _cachedLastTargetRect.top) {
        _historyRect = null;
        _lastTarget = null;
        _cachedLastTargetRect = null;
      }
    }
    var lastTarget = _lastTarget;
    var result = _findNextFocusElementInternal(direction, {
      focusRoot: exports.focusRoot,
      historyRect: _historyRect,
      referenceElement: _lastTarget,
      referenceRect: referenceRect
    });

    if (result && _trySetFocus(result.target, keyCode)) {
      // A focus target was found.
      updateHistoryRect(direction, result);
      _lastTarget = result.target;
      _cachedLastTargetRect = result.targetRect;
      result.target.classList.toggle(ClassNames.toggleModeActive, result.target.classList.contains(ClassNames.toggleMode));

      if (result.target.nodeName === 'IFRAME') {
        var targetIframe = result.target;
        if (IFrameHelper.isXYFocusEnabled(targetIframe)) {
          // If we successfully moved focus and the new focused item is an IFRAME, then we need to notify it
          // Note on coordinates: When signaling enter, DO transform the coordinates into the child frame's coordinate system.
          var refRect = _toIRect({
            left: result.referenceRect.left - result.targetRect.left,
            top: result.referenceRect.top - result.targetRect.top,
            width: result.referenceRect.width,
            height: result.referenceRect.height
          });

          var message = {};
          message[CrossDomainMessageConstants.messageDataProperty] = {
            type: CrossDomainMessageConstants.dFocusEnter,
            direction: direction,
            referenceRect: refRect
          };

          // postMessage API is safe even in cross-domain scenarios.
          targetIframe.contentWindow.postMessage(message, '*');
        }
      }
      eventSrc.dispatchEvent(EventNames.focusChanged, { previousFocusElement: activeElement, keyCode: keyCode });
      return true;
    }
    else {
      // No focus target was found; if we are inside an IFRAME and focus is allowed to propagate out, notify the parent that focus is exiting this IFRAME
      // Note on coordinates: When signaling exit, do NOT transform the coordinates into the parent's coordinate system.
      if (!dontExit && top !== window) {
        var refRect = referenceRect;
        if (!refRect) {
          refRect = document.activeElement ? _toIRect(document.activeElement.getBoundingClientRect()) : _defaultRect();
        }
        var message = {};
        message[CrossDomainMessageConstants.messageDataProperty] = {
          type: CrossDomainMessageConstants.dFocusExit,
          direction: direction,
          referenceRect: refRect
        };

        // postMessage API is safe even in cross-domain scenarios.
        parent.postMessage(message, '*');
        return true;
      }
    }
    return false;
  }

  function _findNextFocusElementInternal(direction, options) {
    // Nested Helpers.
    function calculatePercentInShadow(minReferenceCoord, maxReferenceCoord, minPotentialCoord, maxPotentialCoord) {
      // Calculates the percentage of the potential element that is in the shadow of the reference element.
      if ((minReferenceCoord >= maxPotentialCoord) || (maxReferenceCoord <= minPotentialCoord)) {
        // Potential is not in the reference's shadow.
        return 0;
      }
      var pixelOverlap = Math.min(maxReferenceCoord, maxPotentialCoord) - Math.max(minReferenceCoord, minPotentialCoord);
      var shortEdge = Math.min(maxPotentialCoord - minPotentialCoord, maxReferenceCoord - minReferenceCoord);
      return shortEdge === 0 ? 0 : (pixelOverlap / shortEdge);
    }

    function calculateScore(direction, maxDistance, historyRect, referenceRect, potentialRect) {
      var score = 0;
      var percentInShadow;
      var primaryAxisDistance;
      var secondaryAxisDistance = 0;
      var percentInHistoryShadow = 0;
      switch (direction) {
        case DirectionNames.left:
          // Make sure we don't evaluate any potential elements to the right of the reference element.
          if (potentialRect.left >= referenceRect.left) {
            break;
          }
          percentInShadow = calculatePercentInShadow(referenceRect.top, referenceRect.bottom, potentialRect.top, potentialRect.bottom);
          primaryAxisDistance = referenceRect.left - potentialRect.right;
          if (percentInShadow > 0) {
            percentInHistoryShadow = calculatePercentInShadow(historyRect.top, historyRect.bottom, potentialRect.top, potentialRect.bottom);
          }
          else {
            // If the potential element is not in the shadow, then we calculate secondary axis distance.
            secondaryAxisDistance = (referenceRect.bottom <= potentialRect.top) ? (potentialRect.top - referenceRect.bottom) : referenceRect.top - potentialRect.bottom;
          }
          break;
        case DirectionNames.right:
          // Make sure we don't evaluate any potential elements to the left of the reference element.
          if (potentialRect.right <= referenceRect.right) {
            break;
          }
          percentInShadow = calculatePercentInShadow(referenceRect.top, referenceRect.bottom, potentialRect.top, potentialRect.bottom);
          primaryAxisDistance = potentialRect.left - referenceRect.right;
          if (percentInShadow > 0) {
            percentInHistoryShadow = calculatePercentInShadow(historyRect.top, historyRect.bottom, potentialRect.top, potentialRect.bottom);
          }
          else {
            // If the potential element is not in the shadow, then we calculate secondary axis distance.
            secondaryAxisDistance = (referenceRect.bottom <= potentialRect.top) ? (potentialRect.top - referenceRect.bottom) : referenceRect.top - potentialRect.bottom;
          }
          break;
        case DirectionNames.up:
          // Make sure we don't evaluate any potential elements below the reference element.
          if (potentialRect.top >= referenceRect.top) {
            break;
          }
          percentInShadow = calculatePercentInShadow(referenceRect.left, referenceRect.right, potentialRect.left, potentialRect.right);
          primaryAxisDistance = referenceRect.top - potentialRect.bottom;
          if (percentInShadow > 0) {
            percentInHistoryShadow = calculatePercentInShadow(historyRect.left, historyRect.right, potentialRect.left, potentialRect.right);
          }
          else {
            // If the potential element is not in the shadow, then we calculate secondary axis distance.
            secondaryAxisDistance = (referenceRect.right <= potentialRect.left) ? (potentialRect.left - referenceRect.right) : referenceRect.left - potentialRect.right;
          }
          break;
        case DirectionNames.down:
          // Make sure we don't evaluate any potential elements above the reference element.
          if (potentialRect.bottom <= referenceRect.bottom) {
            break;
          }
          percentInShadow = calculatePercentInShadow(referenceRect.left, referenceRect.right, potentialRect.left, potentialRect.right);
          primaryAxisDistance = potentialRect.top - referenceRect.bottom;
          if (percentInShadow > 0) {
            percentInHistoryShadow = calculatePercentInShadow(historyRect.left, historyRect.right, potentialRect.left, potentialRect.right);
          }
          else {
            // If the potential element is not in the shadow, then we calculate secondary axis distance.
            secondaryAxisDistance = (referenceRect.right <= potentialRect.left) ? (potentialRect.left - referenceRect.right) : referenceRect.left - potentialRect.right;
          }
          break;
      }
      if (primaryAxisDistance >= 0) {
        // The score needs to be a positive number so we make these distances positive numbers.
        primaryAxisDistance = maxDistance - primaryAxisDistance;
        secondaryAxisDistance = maxDistance - secondaryAxisDistance;
        if (primaryAxisDistance >= 0 && secondaryAxisDistance >= 0) {
          // Potential elements in the shadow get a multiplier to their final score.
          primaryAxisDistance += primaryAxisDistance * percentInShadow;
          score = primaryAxisDistance * ScoringConstants.primaryAxisDistanceWeight +
            secondaryAxisDistance * ScoringConstants.secondaryAxisDistanceWeight +
            percentInHistoryShadow * ScoringConstants.percentInHistoryShadowWeight;
        }
      }
      return score;
    }

    function getReferenceObject(referenceElement, referenceRect) {
      var refElement;
      var refRect;
      if ((!referenceElement && !referenceRect) || (referenceElement && !referenceElement.parentNode)) {
        // Note: We need to check to make sure 'parentNode' is not null otherwise there is a case
        // where _lastTarget is defined, but calling getBoundingClientRect will throw a native exception.
        // This case happens if the innerHTML of the parent of the _lastTarget is set to ''.
        // If no valid reference is supplied, we'll use document.activeElement unless it's the body.
        if (document.activeElement !== document.body) {
          referenceElement = document.activeElement;
        }
      }
      if (referenceElement) {
        refElement = referenceElement;
        refRect = _toIRect(refElement.getBoundingClientRect());
      }
      else if (referenceRect) {
        refRect = _toIRect(referenceRect);
      }
      else {
        refRect = _defaultRect();
      }
      return {
        element: refElement,
        rect: refRect
      };
    }

    options = options || {};
    options.focusRoot = options.focusRoot || exports.focusRoot || document.body;
    options.historyRect = options.historyRect || _defaultRect();
    var maxDistance = Math.max(global.screen.availHeight, global.screen.availWidth);
    var refObj = getReferenceObject(options.referenceElement, options.referenceRect);

    // Handle override.
    if (refObj.element) {
      var manualOverrideOptions = refObj.element.getAttribute(AttributeNames.focusOverride) || refObj.element.getAttribute(AttributeNames.focusOverrideLegacy);
      if (manualOverrideOptions) {
        var parsedOptions = JSON.parse(
          manualOverrideOptions
            .replace(/\w+(?=:)/g, '"$&"')
            .replace(/'/g, '"')
        );

        // The left-hand side can be cased as either 'left' or 'Left'.
        var selector = parsedOptions[direction] || parsedOptions[direction[0].toUpperCase() + direction.slice(1)];
        if (selector) {
          var target;
          var element = refObj.element;
          while (!target && element) {
            target = element.querySelector(selector);
            element = element.parentElement;
          }
          if (target) {
            if (target === document.activeElement) {
              return null;
            }
            return { target: target, targetRect: _toIRect(target.getBoundingClientRect()), referenceRect: refObj.rect, usedOverride: true };
          }
        }
      }
    }
    // Calculate scores for each element in the root.
    var bestPotential = {
      element: null,
      rect: null,
      score: 0
    };

    var allElements = options.focusRoot.getElementsByTagName('*');
    for (var i = 0, length = allElements.length; i < length; i++) {
      var potentialElement = allElements[i];
      if (refObj.element === potentialElement || !_isFocusable(potentialElement) || _isInInactiveToggleModeContainer(potentialElement)) {
        continue;
      }
      var potentialRect = _toIRect(potentialElement.getBoundingClientRect());

      // Skip elements that have either a width of zero or a height of zero.
      if (potentialRect.width === 0 || potentialRect.height === 0) {
        continue;
      }
      var score = calculateScore(direction, maxDistance, options.historyRect, refObj.rect, potentialRect);
      if (score > bestPotential.score) {
        bestPotential.element = potentialElement;
        bestPotential.rect = potentialRect;
        bestPotential.score = score;
      }
    }
    if (!bestPotential.element) {
      return null;
    }
    return { target: bestPotential.element, targetRect: bestPotential.rect, referenceRect: refObj.rect, usedOverride: false };
  }

  function _defaultRect() {
    // We set the top, left, bottom and right properties of the referenceBoundingRectangle to '-1'
    // (as opposed to '0') because we want to make sure that even elements that are up to the edge
    // of the screen can receive focus.
    return {
      top: -1,
      bottom: -1,
      right: -1,
      left: -1,
      height: 0,
      width: 0
    };
  }

  function _toIRect(rect) {
    return {
      top: Math.floor(rect.top),
      bottom: Math.floor(rect.top + rect.height),
      right: Math.floor(rect.left + rect.width),
      left: Math.floor(rect.left),
      height: Math.floor(rect.height),
      width: Math.floor(rect.width)
    };
  }

  function _trySetFocus(element, keyCode) {
    // We raise an event on the focusRoot before focus changes to give listeners
    // a chance to prevent the next focus target from receiving focus if they want.
    var canceled = eventSrc.dispatchEvent(EventNames.focusChanging, { nextFocusElement: element, keyCode: keyCode });
    if (!canceled) {
        element.focus();
    }
    return document.activeElement === element;
  }

  function _isFocusable(element) {
    var nodeName = element.nodeName;
    if (!element.hasAttribute('tabindex') && FocusableTagNames.indexOf(nodeName) === -1 && !element.classList.contains(ClassNames.focusable)) {
      // If the current potential element is not one of the tags we consider to be focusable, then exit.
      return false;
    }
    if (nodeName === 'IFRAME' && !IFrameHelper.isXYFocusEnabled(element)) {
      // Skip IFRAMEs without compatible XYFocus implementation
      return false;
    }
    if (nodeName === 'DIV' && element['winControl'] && element['winControl'].disabled) {
      // Skip disabled WinJS controls.
      return false;
    }
    var style = getComputedStyle(element, null);
    if (element.getAttribute('tabIndex') === '-1' || style.display === 'none' || style.visibility === 'hidden' || element.disabled) {
      // Skip elements that are hidden
      // Note: We don't check for opacity === 0, because the browser cannot tell us this value accurately.
      return false;
    }
    return true;
  }

  function _findParentToggleModeContainer(element) {
    var toggleModeRoot = element.parentElement;
    while (toggleModeRoot && !_isToggleMode(toggleModeRoot)) {
      toggleModeRoot = toggleModeRoot.parentElement;
    }
    return toggleModeRoot;
  }

  function _isInInactiveToggleModeContainer(element) {
    var container = _findParentToggleModeContainer(element);
    return container && !container.classList.contains(ClassNames.toggleModeActive);
  }

  var _toggleTypes = {
    'date': true,
    'datetime': true,
    'datetime-local': true,
    'email': true,
    'month': true,
    'number': true,
    'password': true,
    'range': true,
    'search': true,
    'tel': true,
    'text': true,
    'time': true,
    'url': true,
    'week': true
  };

  function _isToggleMode(element) {
    if (element.classList.contains(ClassNames.toggleMode)) {
      return true;
    }
    if (element.nodeName === 'INPUT') {
      if (_toggleTypes[element.type.toLowerCase()]) {
        return true;
      }
    }
    else if (element.nodeName === 'TEXTAREA') {
      return true;
    }
    return false;
  }

  function _getStateHandler(element) {
    var suspended = false;
    var toggleMode = false;
    var toggleModeActive = false;
    if (element) {
        suspended = element[MATCHES]('.' + ClassNames.suspended + ', .' + ClassNames.suspended + ' *');
        toggleMode = _isToggleMode(element);
        toggleModeActive = element.classList.contains(ClassNames.toggleModeActive);
    }
    var stateHandler = KeyHandlerStates.RestState;
    if (suspended) {
        stateHandler = KeyHandlerStates.SuspendedState;
    }
    else {
        if (toggleMode) {
            if (toggleModeActive) {
                stateHandler = KeyHandlerStates.ToggleModeActiveState;
            }
            else {
                stateHandler = KeyHandlerStates.ToggleModeRestState;
            }
        }
    }
    return stateHandler;
  }

  function _handleKeyEvent(e) {
    if (e.defaultPrevented) {
      return;
    }
    var stateHandler = _getStateHandler(document.activeElement);
    var direction = '';
    if (exports.keyCodeMap.up.indexOf(e.keyCode) !== -1) {
      direction = 'up';
    }
    else if (exports.keyCodeMap.down.indexOf(e.keyCode) !== -1) {
      direction = 'down';
    }
    else if (exports.keyCodeMap.left.indexOf(e.keyCode) !== -1) {
      direction = 'left';
    }
    else if (exports.keyCodeMap.right.indexOf(e.keyCode) !== -1) {
      direction = 'right';
    }
    if (direction) {
      var shouldPreventDefault = stateHandler.xyFocus(direction, e.keyCode);
      if (shouldPreventDefault) {
        e.preventDefault();
      }
    }
  }

  function _handleCaptureKeyEvent(e) {
      if (e.defaultPrevented) {
        return;
      }
      var activeElement = document.activeElement;
      var shouldPreventDefault = false;
      var stateHandler = _getStateHandler(activeElement);

      if (exports.keyCodeMap.accept.indexOf(e.keyCode) !== -1) {
        shouldPreventDefault = stateHandler.accept(activeElement);
      }
      else if (exports.keyCodeMap.cancel.indexOf(e.keyCode) !== -1) {
        shouldPreventDefault = stateHandler.cancel(activeElement);
      }
      if (shouldPreventDefault) {
        e.preventDefault();
      }
  }

  var KeyHandlerStates = {};
  (function(KeyHandlerStates) {

    function _clickElement(element) {
      element && element.click && element.click();
      return false;
    }

    function _nop() {
      return false;
    }

    // Element is not suspended and does not use toggle mode.
    function RestState() {}
    RestState.accept = _clickElement;
    RestState.cancel = _nop;
    RestState.xyFocus = _xyFocus; // Prevent default when XYFocus moves focus
    KeyHandlerStates.RestState = RestState;

    // Element has opted out of XYFocus.
    function SuspendedState() {}
    SuspendedState.accept = _nop;
    SuspendedState.cancel = _nop;
    SuspendedState.xyFocus = _nop;
    KeyHandlerStates.SuspendedState = SuspendedState;

    // Element uses toggle mode but is not toggled nor opted out of XYFocus.
    function ToggleModeRestState() {}
    ToggleModeRestState.accept = function(element) {
      _ElementUtilities.addClass(element, ClassNames.toggleModeActive);
      return true;
    };
    ToggleModeRestState.cancel = _nop;
    ToggleModeRestState.xyFocus = _xyFocus; // Prevent default when XYFocus moves focus
    KeyHandlerStates.ToggleModeRestState = ToggleModeRestState;

    // Element uses toggle mode and is toggled and did not opt out of XYFocus.
    function ToggleModeActiveState() {}
    ToggleModeActiveState.cancel = function(element) {
      element && element.classList.remove(ClassNames.toggleModeActive);
      return true;
    };
    ToggleModeActiveState.accept = _clickElement;
    ToggleModeActiveState.xyFocus = _nop;
    KeyHandlerStates.ToggleModeActiveState = ToggleModeActiveState;

  })(KeyHandlerStates);

  var IFrameHelper = {};
  (function(IFrameHelper) {
    // XYFocus caches registered iframes and iterates over the cache for its focus navigation implementation.
    // However, since there is no reliable way for an iframe to unregister with its parent as it can be
    // spontaneously taken out of the DOM, the cache can go stale. This helper module makes sure that on
    // every query to the iframe cache, stale iframes are removed.
    // Furthermore, merely accessing an iframe that has been garbage collected by the platform will cause an
    // exception so each iteration during a query must be in a try/catch block.
    var iframes = [];
    function count() {
      // Iterating over it causes stale iframes to be cleared from the cache.
      _safeForEach(function() { return false; });
      return iframes.length;
    }
    IFrameHelper.count = count;

    function getIFrameFromWindow(win) {
      var iframes = document.getElementsByTagName('IFRAME');
      var found = Array.prototype.filter.call(iframes, function(x) { return x.contentWindow === win; });
      return found.length ? found[0] : null;
    }
    IFrameHelper.getIFrameFromWindow = getIFrameFromWindow;

    function isXYFocusEnabled(iframe) {
      var found = false;
      _safeForEach(function(ifr) {
        if (ifr === iframe) {
          found = true;
        }
      });
      return found;
    }
    IFrameHelper.isXYFocusEnabled = isXYFocusEnabled;

    function registerIFrame(iframe) {
      iframes.push(iframe);
    }
    IFrameHelper.registerIFrame = registerIFrame;

    function unregisterIFrame(iframe) {
      var index = -1;
      _safeForEach(function(ifr, i) {
        if (ifr === iframe) {
          index = i;
        }
      });
      if (index !== -1) {
        iframes.splice(index, 1);
      }
    }
    IFrameHelper.unregisterIFrame = unregisterIFrame;

    function _safeForEach(callback) {
      for (var i = iframes.length - 1; i >= 0; i--) {
        try {
          var iframe = iframes[i];
          if (!iframe.contentWindow) {
            iframes.splice(i, 1);
          }
          else {
            callback(iframe, i);
          }
        }
        catch (e) {
          // Iframe has been GC'd.
          iframes.splice(i, 1);
        }
      }
    }
  }(IFrameHelper));

  if (global.document) {
    // Note: This module is not supported in WebWorker.
    // Default mappings.
    exports.keyCodeMap.left.push(Keys.GamepadLeftThumbstickLeft, Keys.GamepadDPadLeft, Keys.NavigationLeft);
    exports.keyCodeMap.right.push(Keys.GamepadLeftThumbstickRight, Keys.GamepadDPadRight, Keys.NavigationRight);
    exports.keyCodeMap.up.push(Keys.GamepadLeftThumbstickUp, Keys.GamepadDPadUp, Keys.NavigationUp);
    exports.keyCodeMap.down.push(Keys.GamepadLeftThumbstickDown, Keys.GamepadDPadDown, Keys.NavigationDown);
    exports.keyCodeMap.accept.push(Keys.GamepadA, Keys.NavigationAccept);
    exports.keyCodeMap.cancel.push(Keys.GamepadB, Keys.NavigationCancel);

    global.addEventListener('message', function(e) {
      // Note: e.source is the Window object of an iframe which could be hosting content
      // from a different domain. No properties on e.source should be accessed or we may
      // run into a cross-domain access violation exception.
      var sourceWindow = null;
      try {
        // Since messages are async, by the time we get this message, the iframe could've
        // been removed from the DOM and e.source is null or throws an exception on access.
        sourceWindow = e.source;
        if (!sourceWindow) {
          return;
        }
      }
      catch (e) {
        return;
      }
      if (!e.data || !e.data[CrossDomainMessageConstants.messageDataProperty]) {
        return;
      }
      var data = e.data[CrossDomainMessageConstants.messageDataProperty];
      switch (data.type) {
        case CrossDomainMessageConstants.register:
            var iframe = IFrameHelper.getIFrameFromWindow(sourceWindow);
            iframe && IFrameHelper.registerIFrame(iframe);
            break;
        case CrossDomainMessageConstants.unregister:
            var iframe = IFrameHelper.getIFrameFromWindow(sourceWindow);
            iframe && IFrameHelper.unregisterIFrame(iframe);
            break;
        case CrossDomainMessageConstants.dFocusEnter:
            // The coordinates stored in data.refRect are already in this frame's coordinate system.
            // First try to focus anything within this iframe without leaving the current frame.
            var focused = _xyFocus(data.direction, -1, data.referenceRect, true);
            if (!focused) {
              // No focusable element was found, we'll focus document.body if it is focusable.
              if (_isFocusable(document.body)) {
                document.body.focus();
              }
              else {
                // Nothing within this iframe is focusable, we call _xyFocus again without a refRect
                // and allow the request to propagate to the parent.
                _xyFocus(data.direction, -1);
              }
            }
            break;
        case CrossDomainMessageConstants.dFocusExit:
          var iframe = IFrameHelper.getIFrameFromWindow(sourceWindow);
          if (document.activeElement !== iframe) {
            // Since postMessage is async, by the time we get this message, the user may have
            // manually moved the focus elsewhere, if so, ignore this message.
            break;
          }
          // The coordinates stored in data.refRect are in the IFRAME's coordinate system,
          // so we must first transform them into this frame's coordinate system.
          var refRect = data.referenceRect;
          var iframeRect = iframe.getBoundingClientRect();
          refRect.left += iframeRect.left;
          refRect.top += iframeRect.top;
          if (typeof refRect.right === 'number') {
            refRect.right += iframeRect.left;
          }
          if (typeof refRect.bottom === 'number') {
            refRect.bottom += iframeRect.top;
          }
          _xyFocus(data.direction, -1, refRect);
          break;
      }
    });

    document.addEventListener('DOMContentLoaded', function() {
      if (global.Windows && global.Windows.Xbox) {
        document.body.classList.add(ClassNames.xboxPlatform);
      }
      // Subscribe on capture phase to prevent this key event from interacting with
      // the element/control if XYFocus handled it for accept/cancel keys.
      document.addEventListener('keydown', _handleCaptureKeyEvent, true);
      // Subscribe on bubble phase to allow developers to override XYFocus behaviors for directional keys.
      document.addEventListener('keydown', _handleKeyEvent);
      // If we are running within an iframe, we send a registration message to the parent window.
      if (global.top !== global.window) {
        var message = {};
        message[CrossDomainMessageConstants.messageDataProperty] = {
          type: CrossDomainMessageConstants.register,
          version: 1.0
        };
        parent.postMessage(message, '*');
      }
    });

    // Publish to WinJS namespace.
    var toPublish = {
      focusRoot: {
        get: function() {
          return exports.focusRoot;
        },
        set: function(value) {
          exports.focusRoot = value;
        }
      },
      findNextFocusElement: findNextFocusElement,
      keyCodeMap: exports.keyCodeMap,
      moveFocus: moveFocus,
      onfocuschanged: createEventProperty(EventNames.focusChanged),
      onfocuschanging: createEventProperty(EventNames.focusChanging),
      _xyFocus: _xyFocus,
      _iframeHelper: IFrameHelper
    };

    toPublish = assign(toPublish, eventMixin);
    toPublish._listeners = {};
    toPublish.Key = Keys;

    var eventSrc = toPublish;
    global.XYFocus = toPublish;
  }
}.call(this));
