// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Global = require('../Core/_Global');
import Promise = require('../Promise');
import _Signal = require('../_Signal');

"use strict";

// This module provides a state machine which is designed to be used by controls which need to
// open, close, and fire related events (e.g. beforeopen, afterclose). The state machine handles
// many edge cases. For example, what happens if:
//  - open is called when we're already opened?
//  - close is called while we're in the middle of opening?
//  - dispose is called while we're in the middle of firing beforeopen?
// The state machine takes care of all of these edge cases so that the control doesn't have to.
// The control is responible for knowing how to play its open/close animations and update its DOM.
// The state machine is responsible for ensuring that these things happen at the appropriate times.
// This module is broken up into 3 major pieces:
//   - OpenCloseMachine: Controls should instantiate one of these. The machine keeps track of the
//     current state and has methods for forwarding calls to the current state.
//   - IOpenCloseControl: Controls must provide an object which implements this interface. The
//     interface gives the machine hooks for invoking the control's open and close animations.
//   - States: The various states (e.g. Closed, Opened, Opening) that the machine can be in. Each
//     implements IOpenCloseState.

// Example usage:
//   class MyControl {
//       element: HTMLElement;
//       private _machine: OpenCloseMachine;
//
//       constructor(element?: HTMLElement, options: any = {}) {
//           this.element = element || document.createElement("div");
//
//           // Create the machine.
//           this._machine = new OpenCloseMachine({
//               eventElement: this.element,
//               onOpen: (): Promise<any> => {
//                   // Do the work to render the contol in its opened state with an animation.
//                   // Return the animation promise.
//               },
//               onClose: (): Promise<any> => {
//                   // Do the work to render the contol in its closed state with an animation.
//                   // Return the animation promise.
//               },
//               onUpdateDom() {
//                   // Do the work to render the internal state of the control to the DOM. If a
//                   // control restricts all its DOM modifications to onUpdateDom, the state machine
//                   // can guarantee that the control won't modify its DOM while it is animating.
//               },
//               onUpdateDomWithIsOpened: (isOpened: boolean ) => {
//                   // Do the same work as onUpdateDom but ensure that the DOM is rendered with either
//                   // the opened or closed visual as dictacted by isOpened. The control should have some
//                   // internal state to track whether it is currently opened or closed. Treat this as a
//                   // cue to mutate that internal state to reflect the value of isOpened.
//               },
//           });
//
//           // Initialize the control. During this time, the machine will not ask the control to
//           // play any animations or update its DOM.
//           this.opened = true;
//           _Control.setOptions(this, options);
//
//           // Tell the machine the control is initialized. After this, the machine will start asking
//           // the control to play animations and update its DOM as appropriate.
//           this._machine.initialized();
//       }
//
//       get opened() {
//           return this._machine.opened;
//       }
//       set opened(value: boolean) {
//           this._machine.opened = value;
//       }
//       open() {
//           this._machine.open();
//       }
//       close() {
//           this._machine.close();
//       }
//       forceLayout() {
//           this._machine.updateDom();
//       }
//       dispose() {
//           this._machine.dispose();
//       }
//   }

var EventNames = {
    beforeOpen: "beforeopen",
    afterOpen: "afteropen",
    beforeClose: "beforeclose",
    afterClose: "afterclose"
};

//
// IOpenCloseControl
//

export interface IOpenCloseControl {
    // The element on which the events should be dispatched. The events are:
    //   - beforeopen (cancelable)
    //   - afteropen
    //   - beforeclose (cancelable)
    //   - afterclose
    eventElement: HTMLElement;
    // Called when the control should render its opened state with an animation.
    // onOpen is called if the beforeopen event is not preventDefaulted. afteropen is fired
    // upon completion of onOpen's promise.
    onOpen(): Promise<any>;
    // Called when the control should render its closed state with an animation.
    // onClose is called if the beforeclose event is not preventDefaulted. afterclose is fired
    // upon completion of onClose's promise.
    onClose(): Promise<any>;
    // Called when the control should render its current internal state to the DOM. If a
    // control restricts all its DOM modifications to onUpdateDom, the state machine can
    // guarantee that the control won't modify its DOM while it is animating.
    onUpdateDom(): void;
    // Same as onUpdateDom but enables the machine to force the control to update and render
    // its closed or opened visual as dictated by isOpened.
    onUpdateDomWithIsOpened(isOpened: boolean): void;
}

//
// OpenCloseMachine
//

export class OpenCloseMachine {
	_control: IOpenCloseControl;
    _initializedSignal: _Signal<any>;

    private _disposed: boolean;
    private _state: IOpenCloseState;

    //
    // Methods called by the control
    //

    // When the machine is created, it sits in the Init state. When in the Init state, calls to
    // updateDom will be postponed until the machine exits the Init state. Consequently, while in
    // this state, the control can feel free to call updateDom as many times as it wants without
    // worrying about it being expensive due to updating the DOM many times. The control should call
    // *initialized* to move the machine out of the Init state.

    constructor(args: IOpenCloseControl) {
        this._control = args;
        this._initializedSignal = new _Signal();
        this._disposed = false;
        this._setState(States.Init);
    }
    
    private _counter = 0;

    initializing(p: Promise<any>) {
        ++this._counter;
        p.then(() => {this._initialized()});
    }

    // Moves the machine out of the Init state and into the Opened or Closed state depending on whether
    // open or close was called more recently.
    private _initialized() {
        --this._counter;
        if (this._counter === 0) {
            this._initializedSignal.complete();
        }
    }


    // These method calls are forwarded to the current state.
    updateDom() { this._state.updateDom(); }
    open() { this._state.open(); }
    close() { this._state.close(); }
    get opened() { return this._state.opened; }
    set opened(value: boolean) {
        if (value) {
            this.open();
        } else {
            this.close();
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
    _fireBeforeOpen(): boolean {
        return this._fireEvent(EventNames.beforeOpen, {
            cancelable: true
        });
    }

    // Triggers arbitrary app code
    _fireBeforeClose(): boolean {
        return this._fireEvent(EventNames.beforeClose, {
            cancelable: true
        });
    }
}

//
// States (each implements IOpenCloseState)
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

interface IOpenCloseState {
    // Debugging
    name: string;
    // State lifecyle
    enter(args: any): void;
    exit(): void; // Immediately exit the state & cancel async work. Most important during dispose.
                  // In general, the current state is responsible for switching to the next state. The
                  // one exception is dispose where the machine will force the current state to exit.
    // Machine's API surface
    opened: boolean; // read only. Writes go thru open/close.
    open(): void;
    close(): void;
    updateDom(): void; // If a state decides to postpone updating the DOM, it should
                       // update the DOM immediately before switching to the next state.
    // Provided by _setState for use within the state
    machine: OpenCloseMachine;
}

// Transitions:
//   When created, the state machine will take one of the following initialization
//   transitions depending on how the machines's APIs have been used by the time
//   initialized() is called on it:
//     Init -> Closed
//     Init -> Opened
//   Following that, the life of the machine will be dominated by the following
//   sequences of transitions. In geneneral, these sequences are uninterruptible.
//     Closed -> BeforeOpen -> Closed (when preventDefault is called on beforeopen event)
//     Closed -> BeforeOpen -> Opening -> Opened
//     Opened -> BeforeClose -> Opened (when preventDefault is called on beforeclose event)
//     Opened -> BeforeClose -> Closing -> Closed
//   However, any state can be interrupted to go to the Disposed state:
//     * -> Disposed

module States {
    function updateDomImpl(): void {
        this.machine._control.onUpdateDom();
    }

    // Initial state. Gives the control the opportunity to initialize itself without
    // triggering any animations or DOM modifications. When done, the control should
    // call *initialized* to move the machine to the next state.
    export class Init implements IOpenCloseState {
        private _opened: boolean;

        machine: OpenCloseMachine;
        name = "Init";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    return this.machine._initializedSignal.promise;
                }).then(() => {
                    this.machine._control.onUpdateDomWithIsOpened(this._opened);
                    this.machine._setState(this._opened ? Opened : Closed);
                });
            });
        }
        exit = cancelInterruptibles;
        get opened(): boolean {
            return this._opened;
        }
        open() {
            this._opened = true;
        }
        close() {
            this._opened = false;
        }
        updateDom = _; // Postponed until immediately before we switch to another state
    }

    // A rest state. The control is closed and is waiting for the app to call open.
    class Closed implements IOpenCloseState {
        machine: OpenCloseMachine;
        name = "Closed";
        enter(args?: { openIsPending?: boolean; }) {
            args = args || {};
            if (args.openIsPending) {
                this.open();
            }
        }
        exit = _;
        opened = false;
        open() {
            this.machine._setState(BeforeOpen);
        }
        close = _;
        updateDom = updateDomImpl;
    }

    // An event state. The control fires the beforeopen event.
    class BeforeOpen implements IOpenCloseState {
        machine: OpenCloseMachine;
        name = "BeforeOpen";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    return this.machine._fireBeforeOpen(); // Give opportunity for chain to be canceled when triggering app code
                }).then((shouldOpen) => {
                    if (shouldOpen) {
                        this.machine._setState(Opening);
                    } else {
                        this.machine._setState(Closed);
                    }
                });
            });
        }
        exit = cancelInterruptibles;
        opened = false;
        open = _;
        close = _;
        updateDom = updateDomImpl;
    }

    // An animation/event state. The control plays its open animation and fires afteropen.
    class Opening implements IOpenCloseState {
        private _closeIsPending: boolean;

        machine: OpenCloseMachine;
        name = "Opening";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    this._closeIsPending = false;
                    return cancelablePromise(this.machine._control.onOpen());
                }).then(() => {
                    this.machine._fireEvent(EventNames.afterOpen); // Give opportunity for chain to be canceled when triggering app code
                }).then(() => {
                    this.machine._control.onUpdateDom();
                    this.machine._setState(Opened, { closeIsPending: this._closeIsPending });
                });
            });
        }
        exit = cancelInterruptibles;
        get opened() {
            return !this._closeIsPending;
        }
        open() {
            this._closeIsPending = false;
        }
        close() {
            this._closeIsPending = true;
        }
        updateDom = _; // Postponed until immediately before we switch to another state
    }

    // A rest state. The control is opened and is waiting for the app to call close.
    class Opened implements IOpenCloseState {
        machine: OpenCloseMachine;
        name = "Opened";
        enter(args?: { closeIsPending?: boolean }) {
            args = args || {};
            if (args.closeIsPending) {
                this.close();
            }
        }
        exit = _;
        opened = true;
        open = _;
        close() {
            this.machine._setState(BeforeClose);
        }
        updateDom = updateDomImpl;
    }

    // An event state. The control fires the beforeclose event.
    class BeforeClose implements IOpenCloseState {
        machine: OpenCloseMachine;
        name = "BeforeClose";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    return this.machine._fireBeforeClose(); // Give opportunity for chain to be canceled when triggering app code
                }).then((shouldClose) => {
                    if (shouldClose) {
                        this.machine._setState(Closing);
                    } else {
                        this.machine._setState(Opened);
                    }
                });
            });
        }
        exit = cancelInterruptibles;
        opened = true;
        open = _;
        close = _;
        updateDom = updateDomImpl;
    }

    // An animation/event state. The control plays the close animation and fires the afterclose event.
    class Closing implements IOpenCloseState {
        private _openIsPending: boolean;

        machine: OpenCloseMachine;
        name = "Closing";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    this._openIsPending = false;
                    return cancelablePromise(this.machine._control.onClose());
                }).then(() => {
                    this.machine._fireEvent(EventNames.afterClose); // Give opportunity for chain to be canceled when triggering app code
                }).then(() => {
                    this.machine._control.onUpdateDom();
                    this.machine._setState(Closed, { openIsPending: this._openIsPending });
                });
            });
        }
        exit = cancelInterruptibles;
        get opened() {
            return this._openIsPending;
        }
        open() {
            this._openIsPending = true;
        }
        close() {
            this._openIsPending = false;
        }
        updateDom = _; // Postponed until immediately before we switch to another state
    }

    export class Disposed implements IOpenCloseState {
        machine: OpenCloseMachine;
        name = "Disposed";
        enter = _;
        exit = _;
        opened = false;
        open = _;
        close = _;
        updateDom = _;
    }
}
