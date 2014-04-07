﻿// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function navigationInit(WinJS) {
    "use strict";

    var navigatedEventName = "navigated";
    var navigatingEventName = "navigating";
    var beforenavigateEventName = "beforenavigate";
    var ListenerType = WinJS.Class.mix(WinJS.Class.define(null, { /* empty */ }, { supportedForProcessing: false }), WinJS.Utilities.eventMixin);
    var listeners = new ListenerType();
    var history:any = {
        backStack: [],
        current: { location: "", initialPlaceholder: true },
        forwardStack: []
    };

    var raiseBeforeNavigate = function (proposed) {
        WinJS.Utilities._writeProfilerMark("WinJS.Navigation:navigation,StartTM");
        return WinJS.Promise.as().
            then(function () {
                var waitForPromise = WinJS.Promise.as();
                var defaultPrevented = listeners.dispatchEvent(beforenavigateEventName, {
                    setPromise: function (promise) { 
                        /// <signature helpKeyword="WinJS.Navigation.beforenavigate.setPromise">
                        /// <summary locid="WinJS.Navigation.beforenavigate.setPromise">
                        /// Used to inform the ListView that asynchronous work is being performed, and that this
                        /// event handler should not be considered complete until the promise completes. 
                        /// </summary>
                        /// <param name="promise" type="WinJS.Promise" locid="WinJS.Navigation.beforenavigate.setPromise_p:promise">
                        /// The promise to wait for.
                        /// </param>
                        /// </signature>
                    
                        waitForPromise = waitForPromise.then(function() { return promise; }); 
                    },
                    location: proposed.location,
                    state: proposed.state
                });
                return waitForPromise.then(function beforeNavComplete(cancel) {
                    return defaultPrevented || cancel;
                });
            });
    };
    var raiseNavigating = function (delta?) {
        return WinJS.Promise.as().
            then(function () {
                var waitForPromise = WinJS.Promise.as();
                listeners.dispatchEvent(navigatingEventName, {
                    setPromise: function (promise) { 
                        /// <signature helpKeyword="WinJS.Navigation.navigating.setPromise">
                        /// <summary locid="WinJS.Navigation.navigating.setPromise">
                        /// Used to inform the ListView that asynchronous work is being performed, and that this
                        /// event handler should not be considered complete until the promise completes. 
                        /// </summary>
                        /// <param name="promise" type="WinJS.Promise" locid="WinJS.Navigation.navigating.setPromise_p:promise">
                        /// The promise to wait for.
                        /// </param>
                        /// </signature>
                    
                        waitForPromise = waitForPromise.then(function() { return promise; }); 
                    },
                    location: history.current.location,
                    state: history.current.state,
                    delta: delta
                });
                return waitForPromise;
            });
    };
    var raiseNavigated = function (value, err) {
        WinJS.Utilities._writeProfilerMark("WinJS.Navigation:navigation,StopTM");
        var waitForPromise = WinJS.Promise.as();
        var detail:any = {
            value: value,
            location: history.current.location,
            state: history.current.state,
            setPromise: function (promise) { 
                /// <signature helpKeyword="WinJS.Navigation.navigated.setPromise">
                /// <summary locid="WinJS.Navigation.navigated.setPromise">
                /// Used to inform the ListView that asynchronous work is being performed, and that this
                /// event handler should not be considered complete until the promise completes. 
                /// </summary>
                /// <param name="promise" type="WinJS.Promise" locid="WinJS.Navigation.navigated.setPromise_p:promise">
                /// The promise to wait for.
                /// </param>
                /// </signature>
            
                waitForPromise = waitForPromise.then(function() { return promise; }); 
            }
        };
        if (!value && err) {
            detail.error = err;
        }
        listeners.dispatchEvent(navigatedEventName, detail);
        return waitForPromise;
    };

    var go = function (distance, fromStack, toStack, delta) {
        distance = Math.min(distance, fromStack.length);
        if (distance > 0) {
            return raiseBeforeNavigate(fromStack[fromStack.length - distance]).
                then(function goBeforeCompleted(cancel) {
                    if (!cancel) {
                        toStack.push(history.current);
                        while (distance - 1 != 0) {
                            distance--;
                            toStack.push(fromStack.pop());
                        }
                        history.current = fromStack.pop();
                        return raiseNavigating(delta).then(
                            raiseNavigated,
                            function (err) {
                                raiseNavigated(undefined, err || true);
                                throw err;
                            }).then(function () { return true; });
                    }
                    else {
                        return false;
                    }
                });
        }
        return WinJS.Promise.wrap(false);
    }

    WinJS.Namespace.define("WinJS.Navigation", {
        /// <field name="canGoForward" type="Boolean" locid="WinJS.Navigation.canGoForward" helpKeyword="WinJS.Navigation.canGoForward">
        /// Determines whether it is possible to navigate forwards.
        /// </field>
        canGoForward: {
            get: function () {
                return history.forwardStack.length > 0;
            }
        },
        /// <field name="canGoBack" type="Boolean" locid="WinJS.Navigation.canGoBack" helpKeyword="WinJS.Navigation.canGoBack">
        /// Determines whether it is possible to navigate backwards.
        /// </field>
        canGoBack: {
            get: function () {
                return history.backStack.length > 0;
            }
        },
        /// <field name="location" locid="WinJS.Navigation.location" helpKeyword="WinJS.Navigation.location">
        /// Gets the current location.
        /// </field>
        location: {
            get: function () {
                return history.current.location;
            }
        },
        /// <field name="state" locid="WinJS.Navigation.state" helpKeyword="WinJS.Navigation.state">
        /// Gets or sets the navigation state.
        /// </field>
        state: {
            get: function () {
                return history.current.state;
            },
            set: function (value) {
                history.current.state = value;
            }
        },
        /// <field name="history" locid="WinJS.Navigation.history" helpKeyword="WinJS.Navigation.history">
        /// Gets or sets the navigation history.
        /// </field>
        history: {
            get: function () {
                return history;
            },
            set: function (value) {
                var s = history = value;

                // ensure the require fields are present
                //
                s.backStack = s.backStack || [];
                s.forwardStack = s.forwardStack || [];
                s.current = s.current || { location: "", initialPlaceholder: true };
                s.current.location = s.current.location || "";
            }
        },
        forward: function (distance) {
            /// <signature helpKeyword="WinJS.Navigation.forward">
            /// <summary locid="WinJS.Navigation.forward">
            /// Navigates forwards.
            /// </summary>
            /// <param name="distance" type="Number" optional="true" locid="WinJS.Navigation.forward_p:distance">
            /// The number of entries to go forward.
            /// </param>
            /// <returns type="Promise" locid="WinJS.Navigation.forward_returnValue">
            /// A promise that is completed with a value that indicates whether or not
            /// the navigation was successful.
            /// </returns>
            /// </signature>
            distance = distance || 1;
            return go(distance, history.forwardStack, history.backStack, distance);
        },
        back: function (distance) {
            /// <signature helpKeyword="WinJS.Navigation.back">
            /// <summary locid="WinJS.Navigation.back">
            /// Navigates backwards.
            /// </summary>
            /// <param name="distance" type="Number" optional="true" locid="WinJS.Navigation.back_p:distance">
            /// The number of entries to go back into the history.
            /// </param>
            /// <returns type="Promise" locid="WinJS.Navigation.back_returnValue">
            /// A promise that is completed with a value that indicates whether or not
            /// the navigation was successful.
            /// </returns>
            /// </signature>
            distance = distance || 1;
            return go(distance, history.backStack, history.forwardStack, -distance);
        },
        navigate: function (location, initialState) {
            /// <signature helpKeyword="WinJS.Navigation.navigate">
            /// <summary locid="WinJS.Navigation.navigate">
            /// Navigates to a location.
            /// </summary>
            /// <param name="location" type="Object" locid="WinJS.Navigation.navigate_p:location">
            /// The location to navigate to. Generally the location is a string, but
            /// it may be anything.
            /// </param>
            /// <param name="initialState" type="Object" locid="WinJS.Navigation.navigate_p:initialState">
            /// The navigation state that may be accessed through WinJS.Navigation.state.
            /// </param>
            /// <returns type="Promise" locid="WinJS.Navigation.navigate_returnValue">
            /// A promise that is completed with a value that indicates whether or not
            /// the navigation was successful.
            /// </returns>
            /// </signature>
            var proposed = { location: location, state: initialState };
            return raiseBeforeNavigate(proposed).
                then(function navBeforeCompleted(cancel) {
                    if (!cancel) {
                        if (!history.current.initialPlaceholder) {
                            history.backStack.push(history.current);
                        }
                        history.forwardStack = [];
                        history.current = proposed;

                        // error or no, we go from navigating -> navigated
                        // cancelation should be handled with "beforenavigate"
                        //
                        return raiseNavigating().then(
                            raiseNavigated,
                            function (err) {
                                raiseNavigated(undefined, err || true);
                                throw err;
                            }).then(function () { return true; });
                    }
                    else {
                        return false;
                    }
                });
        },
        addEventListener: function (eventType, listener, capture) {
            /// <signature helpKeyword="WinJS.Navigation.addEventListener">
            /// <summary locid="WinJS.Navigation.addEventListener">
            /// Adds an event listener to the control.
            /// </summary>
            /// <param name="eventType" type="String" locid="WinJS.Navigation.addEventListener_p:eventType">
            /// The type (name) of the event.
            /// </param>
            /// <param name="listener" type="Function" locid="WinJS.Navigation.addEventListener_p:listener">
            /// The listener to invoke when the event gets raised.
            /// </param>
            /// <param name="capture" type="Boolean" locid="WinJS.Navigation.addEventListener_p:capture">
            /// Specifies whether or not to initiate capture.
            /// </param>
            /// </signature>
            listeners.addEventListener(eventType, listener, capture);
        },
        removeEventListener: function (eventType, listener, capture) {
            /// <signature helpKeyword="WinJS.Navigation.removeEventListener">
            /// <summary locid="WinJS.Navigation.removeEventListener">
            /// Removes an event listener from the control.
            /// </summary>
            /// <param name='eventType' type="String" locid="WinJS.Navigation.removeEventListener_p:eventType">
            /// The type (name) of the event.
            /// </param>
            /// <param name='listener' type='Function' locid="WinJS.Navigation.removeEventListener_p:listener">
            /// The listener to remove.
            /// </param>
            /// <param name='capture' type='Boolean' locid="WinJS.Navigation.removeEventListener_p:capture">
            /// Specifies whether or not to initiate capture.
            /// </param>
            /// </signature>
            listeners.removeEventListener(eventType, listener, capture);
        }
    });

    Object.defineProperties(WinJS.Navigation, WinJS.Utilities.createEventProperties(navigatedEventName, navigatingEventName, beforenavigateEventName));
})(WinJS);
