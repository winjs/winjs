// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Global = require('../Core/_Global');
import Promise = require('../Promise');
import _Signal = require('../_Signal');

"use strict";

var EventNames = {
    beforeShow: "beforeshow",
    afterShow: "aftershow",
    beforeHide: "beforehide",
    afterHide: "afterhide"
};

//
// State machine
//

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
// An interesting detail is that anytime the state may call into app code (e.g. due to
// firing an event), the current promise must end and a new promise must be chained off of it.
// This is necessary because the app code may interact with the control and cause it to
// change states. If we didn't create a new promise, then the very next line of code that runs
// after calling into app code may not be valid because the state may have exited. Starting a
// new promise after each call into app code prevents us from having to worry about this
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
    exit(): void;
    // SplitView's API surface
    hidden: boolean; // readyonly. Writes go thru show/hide.
    show(): void;
    hide(): void;
    // Misc
    updateDom(): void;
    // Provided by _setState for use within the state
    machine: ShowHideMachine;
}

// Transitions:
//   When created, the control will take one of the following initialization transitions depending on
//   how the control's APIs have been used by the time it is inserted into the DOM:
//     Init -> Hidden
//     Init -> Shown
//   Following that, the life of the SplitView will be dominated by the following
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

    // Initial state. Initializes state on the SplitView shared by the various states.
    export class Init implements IShowHideState {
        private _hidden: boolean;

        machine: ShowHideMachine;
        name = "Init";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    return this.machine._initializedSignal.promise;
                }).then(() => {
                    this.machine._control.onUpdateDom();
                    if (this._hidden) {
                        this.machine._control.onHide({ skipAnimation: true });
                        this.machine._setState(Hidden);
                    } else {
                        this.machine._control.onShow({ skipAnimation: true });
                        this.machine._setState(Shown);
                    }
                    
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

    // A rest state. The SplitView pane is hidden and is waiting for the app to call show.
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

    // An event state. The SplitView fires the beforeshow event.
    class BeforeShow implements IShowHideState {
        machine: ShowHideMachine;
        name = "BeforeShow";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    return this.machine._fireBeforeShow(); // Give opportunity for chain to be canceled when calling into app code
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

    // An animation/event state. The SplitView plays its show animation and fires aftershow.
    class Showing implements IShowHideState {
        private _hideIsPending: boolean;

        machine: ShowHideMachine;
        name = "Showing";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    this._hideIsPending = false;
                    return this.machine._control.onShow();
                }).then(() => {
                    this.machine._fireEvent(EventNames.afterShow); // Give opportunity for chain to be canceled when calling into app code
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

    // A rest state. The SplitView pane is shown and is waiting for the app to trigger hide.
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

    // An event state. The SplitView fires the beforehide event.
    class BeforeHide implements IShowHideState {
        machine: ShowHideMachine;
        name = "BeforeHide";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    return this.machine._fireBeforeHide(); // Give opportunity for chain to be canceled when calling into app code
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

    // An animation/event state. The SpitView plays the hide animation and fires the afterhide event.
    class Hiding implements IShowHideState {
        private _showIsPending: boolean;

        machine: ShowHideMachine;
        name = "Hiding";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    this._showIsPending = false;
                    return this.machine._control.onHide();
                }).then(() => {
                    this.machine._fireEvent(EventNames.afterHide); // Give opportunity for chain to be canceled when calling into app code
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

export interface IShowHideMachineArgs {
    // The element on which the events (beforeshow, afterhide, etc.) should be dispatched.
    eventElement: HTMLElement;
    // Called when the control should render its shown state possibly with an animation.
    onShow(options?: { skipAnimation?: boolean }): Promise<any>;
    // Called when the control should render its hidden state possibly with an animation.
    onHide(options?: { skipAnimation?: boolean }): Promise<any>;
    // Called when the control should render its current internal state to the DOM.
    onUpdateDom(): void;
}

export class ShowHideMachine {
    _control: IShowHideMachineArgs;
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
    
    constructor(args: IShowHideMachineArgs) {
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
    
    // Calls into arbitrary app code
    _fireEvent(eventName: string, options?: { detail?: any; cancelable?: boolean; }): boolean {
        options = options || {};
        var detail = options.detail || null;
        var cancelable = !!options.cancelable;

        var eventObject = <CustomEvent>_Global.document.createEvent("CustomEvent");
        eventObject.initCustomEvent(eventName, true, cancelable, detail);
        return this._control.eventElement.dispatchEvent(eventObject);
    }

    // Calls into arbitrary app code
    _fireBeforeShow(): boolean {
        return this._fireEvent(EventNames.beforeShow, {
            cancelable: true
        });
    }

    // Calls into arbitrary app code
    _fireBeforeHide(): boolean {
        return this._fireEvent(EventNames.beforeHide, {
            cancelable: true
        });
    }
}
