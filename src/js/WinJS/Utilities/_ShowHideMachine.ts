// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Global = require('../Core/_Global');
import Promise = require('../Promise');
import _Signal = require('../_Signal');

"use strict";

// This module provides a state machine which is designed to be used by controls which need to
// show, hide, and fire related events (e.g. beforeshow, afterhide). The state machine handles
// many edge cases. For example, what happens if:
//  - show is called when we're already shown?
//  - hide is called while we're in the middle of showing?
//  - dispose is called while we're in the middle of firing beforeshow?
// The state machine takes care of all of these edge cases so that the control doesn't have to.
// The control is responible for knowing how to play its show/hide animations and update its DOM.
// The state machine is responsible for ensuring that these things happen at the appropriate times.
// This module is broken up into 3 major pieces:
//   - ShowHideMachine: Controls should instantiate one of these. The machine keeps track of the
//     current state and has methods for forwarding calls to the current state.
//   - IShowHideControl: Controls must provide an object which implements this interface. The
//     interface gives the machine hooks for invoking the control's show and hide animations.
//   - States: The various states (e.g. Hidden, Shown, Showing) that the machine can be in. Each
//     implements IShowHideState.

// Example usage:
//   class MyControl {
//       element: HTMLElement;
//       private _machine: ShowHideMachine;
//
//       constructor(element?: HTMLElement, options: any = {}) {
//           this.element = element || document.createElement("div");
//
//           // Create the machine.
//           this._machine = new ShowHideMachine({
//               eventElement: this.element,
//               onShow: (): Promise<any> => {
//                   // Do the work to render the contol in its shown state with an animation.
//                   // Return the animation promise.
//               },
//               onHide: (): Promise<any> => {
//                   // Do the work to render the contol in its hidden state with an animation.
//                   // Return the animation promise.
//               },
//               onUpdateDom() {
//                   // Do the work to render the internal state of the control to the DOM. If a
//                   // control restricts all its DOM modifications to onUpdateDom, the state machine
//                   // can guarantee that the control won't modify its DOM while it is animating.
//               },
//               onUpdateDomWithIsShown: (isShown: boolean ) => {
//                   // Do the same work as onUpdateDom but ensure that the DOM is rendered with either
//                   // the shown or hidden visual as dictacted by isShown. The control should have some
//                   // internal state to track whether it is currently shown or hidden. Treat this as a
//                   // cue to mutate that internal state to reflect the value of isShown.
//               },
//           });
//
//           // Initialize the control. During this time, the machine will not ask the control to
//           // play any animations or update its DOM.
//           this.hidden = true;
//           _Control.setOptions(this, options);
//
//           // Tell the machine the control is initialized. After this, the machine will start asking
//           // the control to play animations and update its DOM as appropriate.
//           this._machine.initialized();
//       }
//
//       get hidden() {
//           return this._machine.hidden;
//       }
//       set hidden(value: boolean) {
//           this._machine.hidden = value;
//       }
//       show() {
//           this._machine.show();
//       }
//       hide() {
//           this._machine.hide();
//       }
//       dispose() {
//           this._machine.dispose();
//       }
//   }

var EventNames = {
    beforeShow: "beforeshow",
    afterShow: "aftershow",
    beforeHide: "beforehide",
    afterHide: "afterhide"
};

//
// IShowHideControl
//

export interface IShowHideControl {
    // The element on which the events should be dispatched. The events are:
    //   - beforeshow (cancelable)
    //   - aftershow
    //   - beforehide (cancelable)
    //   - afterhide
    eventElement: HTMLElement;
    // Called when the control should render its shown state with an animation.
    // onShow is called if the beforeshow event is not preventDefaulted. aftershow is fired
    // upon completion of onShow's promise.
    onShow(): Promise<any>;
    // Called when the control should render its hidden state with an animation.
    // onHide is called if the beforehide event is not preventDefaulted. afterhide is fired
    // upon completion of onHide's promise.
    onHide(): Promise<any>;
    // Called when the control should render its current internal state to the DOM. If a
    // control restricts all its DOM modifications to onUpdateDom, the state machine can
    // guarantee that the control won't modify its DOM while it is animating.
    onUpdateDom(): void;
    // Same as onUpdateDom but enables the machine to force the control to update and render
    // its hidden or shown visual as dictated by isShown.
    onUpdateDomWithIsShown(isShown: boolean): void;
}

//
// ShowHideMachine
//

export class ShowHideMachine {
	_control: IShowHideControl;
    _initializedSignal: _Signal<any>;

    private _disposed: boolean;
    private _state: IShowHideState;

    //
    // Methods called by the control
    //

    // When the machine is created, it sits in the Init state. When in the Init state, calls to
    // updateDom will be postponed until the machine exits the Init state. Consequently, while in
    // this state, the control can feel free to call updateDom as many times as it wants without
    // worrying about it being expensive due to updating the DOM many times. The control should call
    // *initialized* to move the machine out of the Init state.

    constructor(args: IShowHideControl) {
        this._control = args;
        this._initializedSignal = new _Signal();
        this._disposed = false;
        this._setState(States.Init);
    }

    // Moves the machine out of the Init state and into the Shown or Hidden state depending on whether
    // show or hide was called more recently.
    initialized() {
        this._initializedSignal.complete();
    }


    // These method calls are forwarded to the current state.
    updateDom() { this._state.updateDom(); }
    show() { this._state.show(); }
    hide() { this._state.hide(); }
    get hidden() { return this._state.hidden; }
    set hidden(value: boolean) {
        if (value) {
            this.hide();
        } else {
            this.show();
        }
    }

    // Puts the machine into the Disposed state.
    dispose() {
        this._setState(States.Disposed);
        this._disposed = true;
        this._control = null;
    }

    //
    // Methods called by states
    //

    _setState(NewState: any, arg0?: any) {
        if (!this._disposed) {
            this._state && this._state.exit();
            this._state = new NewState();
            this._state.machine = this;
            this._state.enter(arg0);
        }
    }

    // Triggers arbitrary app code
    _fireEvent(eventName: string, options?: { detail?: any; cancelable?: boolean; }): boolean {
        options = options || {};
        var detail = options.detail || null;
        var cancelable = !!options.cancelable;

        var eventObject = <CustomEvent>_Global.document.createEvent("CustomEvent");
        eventObject.initCustomEvent(eventName, true, cancelable, detail);
        return this._control.eventElement.dispatchEvent(eventObject);
    }

    // Triggers arbitrary app code
    _fireBeforeShow(): boolean {
        return this._fireEvent(EventNames.beforeShow, {
            cancelable: true
        });
    }

    // Triggers arbitrary app code
    _fireBeforeHide(): boolean {
        return this._fireEvent(EventNames.beforeHide, {
            cancelable: true
        });
    }
}

//
// States (each implements IShowHideState)
//

// WinJS animation promises always complete successfully. This
// helper allows an animation promise to complete in the canceled state
// so that the success handler can be skipped when the animation is
// interrupted.
function cancelablePromise(animationPromise: Promise<any>) {
    return Promise._cancelBlocker(animationPromise, function () {
        animationPromise.cancel();
    });
}

// Noop function, used in the various states to indicate that they don't support a given
// message. Named with the somewhat cute name '_' because it reads really well in the states.
function _() { }

// Implementing the control as a state machine helps us correctly handle:
//   - re-entrancy while firing events
//   - calls into the control during asynchronous operations (e.g. animations)
//
// Many of the states do their "enter" work within a promise chain. The idea is that if
// the state is interrupted and exits, the rest of its work can be skipped by canceling
// the promise chain.
// An interesting detail is that anytime the state may trigger app code (e.g. due to
// firing an event), the current promise must end and a new promise must be chained off of it.
// This is necessary because the app code may interact with the control and cause it to
// change states. If we didn't create a new promise, then the very next line of code that runs
// after triggering app code may not be valid because the state may have exited. Starting a
// new promise after each triggering of app code prevents us from having to worry about this
// problem. In this configuration, when a promise's success handler runs, it guarantees that
// the state hasn't exited.
// For similar reasons, each of the promise chains created in "enter" starts off with a _Signal
// which is completed at the end of the "enter" function (this boilerplate is abstracted away by
// the "interruptible" function). The reason is that we don't want any of the code in "enter"
// to run until the promise chain has been stored in a variable. If we didn't do this (e.g. instead,
// started the promise chain with Promise.wrap()), then the "enter" code could trigger the "exit"
// function (via app code) before the promise chain had been stored in a variable. Under these
// circumstances, the promise chain would be uncancelable and so the "enter" work would be
// unskippable. This wouldn't be good when we needed the state to exit early.

// These two functions manage interruptible work promises (one creates them the other cancels
// them). They communicate with each other thru the _interruptibleWorkPromises property which
//  "interruptible" creates on your object.

function interruptible<T>(object: T, workFn: (promise: Promise<any>) => Promise<any>) {
    object["_interruptibleWorkPromises"] = object["_interruptibleWorkPromises"] || [];
    var workStoredSignal = new _Signal();
    object["_interruptibleWorkPromises"].push(workFn(workStoredSignal.promise));
    workStoredSignal.complete();
}

function cancelInterruptibles() {
    (this["_interruptibleWorkPromises"] || []).forEach((workPromise: _Signal<any>) => {
        workPromise.cancel();
    });
}

interface IShowHideState {
    // Debugging
    name: string;
    // State lifecyle
    enter(args: any): void;
    exit(): void; // Immediately exit the state & cancel async work. Most important during dispose.
                  // In general, the current state is responsible for switching to the next state. The
                  // one exception is dispose where the machine will force the current state to exit.
    // Machine's API surface
    hidden: boolean; // read only. Writes go thru show/hide.
    show(): void;
    hide(): void;
    updateDom(): void; // If a state decides to postpone updating the DOM, it should
                       // update the DOM immediately before switching to the next state.
    // Provided by _setState for use within the state
    machine: ShowHideMachine;
}

// Transitions:
//   When created, the state machine will take one of the following initialization
//   transitions depending on how the machines's APIs have been used by the time
//   initialized() is called on it:
//     Init -> Hidden
//     Init -> Shown
//   Following that, the life of the machine will be dominated by the following
//   sequences of transitions. In geneneral, these sequences are uninterruptible.
//     Hidden -> BeforeShow -> Hidden (when preventDefault is called on beforeshow event)
//     Hidden -> BeforeShow -> Showing -> Shown
//     Shown -> BeforeHide -> Shown (when preventDefault is called on beforehide event)
//     Shown -> BeforeHide -> Hiding -> Hidden
//   However, any state can be interrupted to go to the Disposed state:
//     * -> Disposed

module States {
    function updateDomImpl(): void {
        this.machine._control.onUpdateDom();
    }

    // Initial state. Gives the control the opportunity to initialize itself without
    // triggering any animations or DOM modifications. When done, the control should
    // call *initialized* to move the machine to the next state.
    export class Init implements IShowHideState {
        private _hidden: boolean;

        machine: ShowHideMachine;
        name = "Init";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    return this.machine._initializedSignal.promise;
                }).then(() => {
                    this.machine._control.onUpdateDomWithIsShown(!this._hidden);
                    this.machine._setState(this._hidden ? Hidden : Shown);
                });
            });
        }
        exit = cancelInterruptibles;
        get hidden(): boolean {
            return this._hidden;
        }
        show() {
            this._hidden = false;
        }
        hide() {
            this._hidden = true;
        }
        updateDom = _; // Postponed until immediately before we switch to another state
    }

    // A rest state. The control is hidden and is waiting for the app to call show.
    class Hidden implements IShowHideState {
        machine: ShowHideMachine;
        name = "Hidden";
        enter(args?: { showIsPending?: boolean; }) {
            args = args || {};
            if (args.showIsPending) {
                this.show();
            }
        }
        exit = _;
        hidden = true;
        show() {
            this.machine._setState(BeforeShow);
        }
        hide = _;
        updateDom = updateDomImpl;
    }

    // An event state. The control fires the beforeshow event.
    class BeforeShow implements IShowHideState {
        machine: ShowHideMachine;
        name = "BeforeShow";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    return this.machine._fireBeforeShow(); // Give opportunity for chain to be canceled when triggering app code
                }).then((shouldShow) => {
                    if (shouldShow) {
                        this.machine._setState(Showing);
                    } else {
                        this.machine._setState(Hidden);
                    }
                });
            });
        }
        exit = cancelInterruptibles;
        hidden = true;
        show = _;
        hide = _;
        updateDom = updateDomImpl;
    }

    // An animation/event state. The control plays its show animation and fires aftershow.
    class Showing implements IShowHideState {
        private _hideIsPending: boolean;

        machine: ShowHideMachine;
        name = "Showing";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    this._hideIsPending = false;
                    return cancelablePromise(this.machine._control.onShow());
                }).then(() => {
                    this.machine._fireEvent(EventNames.afterShow); // Give opportunity for chain to be canceled when triggering app code
                }).then(() => {
                    this.machine._control.onUpdateDom();
                    this.machine._setState(Shown, { hideIsPending: this._hideIsPending });
                });
            });
        }
        exit = cancelInterruptibles;
        get hidden() {
            return this._hideIsPending;
        }
        show() {
            this._hideIsPending = false;
        }
        hide() {
            this._hideIsPending = true;
        }
        updateDom = _; // Postponed until immediately before we switch to another state
    }

    // A rest state. The control is shown and is waiting for the app to call hide.
    class Shown implements IShowHideState {
        machine: ShowHideMachine;
        name = "Shown";
        enter(args?: { hideIsPending?: boolean }) {
            args = args || {};
            if (args.hideIsPending) {
                this.hide();
            }
        }
        exit = _;
        hidden = false;
        show = _;
        hide() {
            this.machine._setState(BeforeHide);
        }
        updateDom = updateDomImpl;
    }

    // An event state. The control fires the beforehide event.
    class BeforeHide implements IShowHideState {
        machine: ShowHideMachine;
        name = "BeforeHide";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    return this.machine._fireBeforeHide(); // Give opportunity for chain to be canceled when triggering app code
                }).then((shouldHide) => {
                    if (shouldHide) {
                        this.machine._setState(Hiding);
                    } else {
                        this.machine._setState(Shown);
                    }
                });
            });
        }
        exit = cancelInterruptibles;
        hidden = false;
        show = _;
        hide = _;
        updateDom = updateDomImpl;
    }

    // An animation/event state. The control plays the hide animation and fires the afterhide event.
    class Hiding implements IShowHideState {
        private _showIsPending: boolean;

        machine: ShowHideMachine;
        name = "Hiding";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    this._showIsPending = false;
                    return cancelablePromise(this.machine._control.onHide());
                }).then(() => {
                    this.machine._fireEvent(EventNames.afterHide); // Give opportunity for chain to be canceled when triggering app code
                }).then(() => {
                    this.machine._control.onUpdateDom();
                    this.machine._setState(Hidden, { showIsPending: this._showIsPending });
                });
            });
        }
        exit = cancelInterruptibles;
        get hidden() {
            return !this._showIsPending;
        }
        show() {
            this._showIsPending = true;
        }
        hide() {
            this._showIsPending = false;
        }
        updateDom = _; // Postponed until immediately before we switch to another state
    }

    export class Disposed implements IShowHideState {
        machine: ShowHideMachine;
        name = "Disposed";
        enter = _;
        exit = _;
        hidden = true;
        show = _;
        hide = _;
        updateDom = _;
    }
}
