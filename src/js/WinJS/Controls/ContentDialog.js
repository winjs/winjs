// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    '../Application',
    '../Utilities/_Dispose',
    '../Promise',
    '../_Signal',
    '../Core/_BaseUtils',
    '../Core/_Global',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_Events',
    '../Core/_ErrorFromName',
    '../Core/_Resources',
    '../Utilities/_Control',
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    '../Animations',
    'require-style!less/controls'
    ], function contentDialogInit(Application, _Dispose, Promise, _Signal, _BaseUtils, _Global, _WinRT, _Base, _Events, _ErrorFromName, _Resources, _Control, _ElementUtilities, _Hoverable, _Animations) {
    "use strict";

    var ContentDialogManager;
    
    // Need to be the first one to register these events so that they can be
    // canceled before any other listener sees them.
    var eventsToBlock = [
        "edgystarting",
        "edgycompleted",
        "edgycanceled"
    ];
    
    function blockEventIfDialogIsShowing(eventObject) {
        if (ContentDialogManager && ContentDialogManager.aDialogIsShowing()) {
            eventObject.stopImmediatePropagation();
        }
    }
    
    eventsToBlock.forEach(function (eventName) {
        Application.addEventListener(eventName, blockEventIfDialogIsShowing);
    });

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.ContentDialog">
        /// Displays a modal dialog which can display arbitrary HTML content.
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.contentdialog.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.contentdialog.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.ContentDialog"></div>]]></htmlSnippet>
        /// <event name="beforeshow" locid="WinJS.UI.ContentDialog_e:beforeshow">Raised just before showing a dialog. Call preventDefault on this event to stop the dialog from being shown.</event>
        /// <event name="aftershow" locid="WinJS.UI.ContentDialog_e:aftershow">Raised immediately after a dialog is fully shown.</event>
        /// <event name="beforehide" locid="WinJS.UI.ContentDialog_e:beforehide">Raised just before hiding a dialog. Call preventDefault on this event to stop the dialog from being hidden.</event>
        /// <event name="afterhide" locid="WinJS.UI.ContentDialog_e:afterhide">Raised immediately after a dialog is fully hidden.</event>
        /// <part name="contentdialog" class="win-contentdialog" locid="WinJS.UI.ContentDialog_part:contentdialog">The entire ContentDialog control.</part>
        /// <part name="contentdialog-backgroundoverlay" class="win-contentdialog-backgroundoverlay" locid="WinJS.UI.ContentDialog_part:contentdialog-backgroundoverlay">The full screen element which dims the content that is behind the dialog.</part>
        /// <part name="contentdialog-dialog" class="win-contentdialog-dialog" locid="WinJS.UI.ContentDialog_part:contentdialog-dialog">The main element of the dialog which holds the dialog's title, content, and commands.</part>
        /// <part name="contentdialog-title" class="win-contentdialog-title" locid="WinJS.UI.ContentDialog_part:contentdialog-title">The element which displays the dialog's title.</part>
        /// <part name="contentdialog-content" class="win-contentdialog-content" locid="WinJS.UI.ContentDialog_part:contentdialog-content">The element which contains the dialog's custom content.</part>
        /// <part name="contentdialog-commands" class="win-contentdialog-commands" locid="WinJS.UI.ContentDialog_part:contentdialog-commands">The element which contains the dialog's primary and secondary commands.</part>
        /// <part name="contentdialog-primarycommand" class="win-contentdialog-primarycommand" locid="WinJS.UI.ContentDialog_part:contentdialog-primarycommand">The dialog's primary button.</part>
        /// <part name="contentdialog-secondarycommand" class="win-contentdialog-secondarycommand" locid="WinJS.UI.ContentDialog_part:contentdialog-secondarycommand">The dialog's secondary button.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        ContentDialog: _Base.Namespace._lazy(function () {
            var Strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get controlDisposed() { return "Cannot interact with the control after it has been disposed"; },
                get contentDialogAlreadyShowing() { return "Cannot show a ContentDialog if there is already a ContentDialog that is showing"; }
            };
            var DismissalReason = {
                /// <field locid="WinJS.UI.ContentDialog.none" helpKeyword="WinJS.UI.ContentDialog.none">
                /// The dialog was dismissed without the user selecting any of the commands. The user may have
                /// dismissed the dialog by hitting the escape key or pressing the hardware back button.
                /// </field>
                none: "none",
                /// <field locid="WinJS.UI.ContentDialog.primary" helpKeyword="WinJS.UI.ContentDialog.primary">
                /// The user dismissed the dialog by pressing the primary command.
                /// </field>
                primary: "primary",
                /// <field locid="WinJS.UI.ContentDialog.secondary" helpKeyword="WinJS.UI.ContentDialog.secondary">
                /// The user dismissed the dialog by pressing the secondary command.
                /// </field>
                secondary: "secondary"
            };
            var ClassNames = {
                contentDialog: "win-contentdialog",
                backgroundOverlay: "win-contentdialog-backgroundoverlay",
                dialog: "win-contentdialog-dialog",
                title: "win-contentdialog-title",
                content: "win-contentdialog-content",
                commands: "win-contentdialog-commands",
                primaryCommand: "win-contentdialog-primarycommand",
                secondaryCommand: "win-contentdialog-secondarycommand",

                _verticalAlignment: "win-contentdialog-verticalalignment",
                _scroller: "win-contentdialog-scroller",
                _column0or1: "win-contentdialog-column0or1",
                _visible: "win-contentdialog-visible",
                _tabStop: "win-contentdialog-tabstop",
                _commandSpacer: "win-contentdialog-commandspacer"
            };
            var EventNames = {
                beforeShow: "beforeshow",
                afterShow: "aftershow",
                beforeHide: "beforehide",
                afterHide: "afterhide",
            };
            var minContentHeightWithInputPane = 120;
            
            ContentDialogManager = new (_Base.Class.define(function () {
                this._dialogs = [];
                this._prevFocus = null;
            }, {
                willShow: function ContentDialogManager_willShow(dialog) {
                    var startLength = this._dialogs.length; 
                    this._pruneDialogsMissingFromDom();
                    
                    if (this._dialogs.indexOf(dialog) === -1) {
                        this._dialogs.push(dialog);
                    }
                    
                    if (startLength === 0 && this._dialogs.length === 1) {
                        this._firstDialogWillShow(dialog);
                    }
                },
                
                didHide: function ContentDialogManager_didHide(dialog) {
                    var startLength = this._dialogs.length; 
                    this._pruneDialogsMissingFromDom();
                    
                    var index = this._dialogs.indexOf(dialog);
                    if (index !== -1) {
                        this._dialogs.splice(index, 1);
                    }
                    
                    if (startLength > 0 && this._dialogs.length === 0) {
                        this._lastDialogDidHide();
                    }
                },
                
                aDialogIsShowing: function ContentDialogManager_aDialogIsShowing() {
                    return this._dialogs.some(function (dialog) {
                        return !dialog.hidden;
                    });
                },
                
                // Filter out any ContentDialogs that may have been ripped
                // out of the DOM without getting hidden or disposed.
                _pruneDialogsMissingFromDom: function ContentDialogManager_pruneDialogsMissingFromDom() {
                    this._dialogs = this._dialogs.filter(function (dialog) {
                        return !_Global.document.body.contains(dialog.element);
                    });
                },
                
                _firstDialogWillShow: function ContentDialogManager_firstDialogWillShow(dialog) {
                    this._prevFocus = _Global.document.activeElement;
                },
                
                _lastDialogDidHide: function ContentDialogManager_lastDialogDidHide() {
                    var prevFocus = this._prevFocus;
                    this._prevFocus = null;
                    prevFocus && prevFocus.focus();
                }
            }))();
            
            function elementInFlyout(element) {
                while (element) {
                    if (_ElementUtilities.hasClass(element, "win-flyout")) {
                        return true;
                    }
                    element = element.parentNode;
                }
                return false;
            }

            // WinJS animation promises always complete successfully. This
            // helper allows an animation promise to complete in the canceled state
            // so that the success handler can be skipped when the animation is
            // interrupted.
            function cancelablePromise(animationPromise) {
                return Promise._cancelBlocker(animationPromise, function () {
                    animationPromise.cancel();
                });
            }

            function onInputPaneShown(eventObject) {
                /*jshint validthis: true */
                eventObject.ensuredFocusedElementInView = true;
                this.dialog._renderForInputPane(eventObject.occludedRect.height);
            }

            function onInputPaneHidden() {
                /*jshint validthis: true */
                this.dialog._clearInputPaneRendering();
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
            // An interesting detail is that anytime the state may call into app code (e.g. due to
            // firing an event), the current promise must end and a new promise must be chained off of it.
            // This is necessary because the app code may interact with the ContentDialog and cause it to
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

            function interruptible(object, workFn) {
                object._interruptibleWorkPromises = object._interruptibleWorkPromises || [];
                var workStoredSignal = new _Signal();
                object._interruptibleWorkPromises.push(workFn(object, workStoredSignal.promise));
                workStoredSignal.complete();
            }

            function cancelInterruptibles() {
                /*jshint validthis: true */
                (this._interruptibleWorkPromises || []).forEach(function (workPromise) {
                    workPromise.cancel();
                });
            }

            // Transitions:
            //   When created, the control will take the following initialization transition:
            //     Init -> Hidden
            //   Following that, the life of the dialog will be dominated by the following 3
            //   sequences of transitions. In geneneral, these sequences are uninterruptible.
            //     Hidden -> BeforeShow -> Hidden (when preventDefault is called on beforeshow event)
            //     Hidden -> BeforeShow -> Showing -> Shown
            //     Shown -> BeforeHide -> Hiding -> Hidden
            //     Shown -> BeforeHide -> Shown (when preventDefault is called on beforehide event)
            //   However, any state can be interrupted to go to the Disposed state:
            //     * -> Disposed
            //
            // interface IContentDialogState {
            //     // Debugging
            //     name: string;
            //     // State lifecycle
            //     enter(arg0);
            //     exit();
            //     // ContentDialog's public API surface
            //     hidden: boolean;
            //     show();
            //     hide(reason);
            //     // Events
            //     onCommandClicked(reason);
            //     onInputPaneShown(eventObject);
            //     onInputPaneHidden();
            //     // Provided by _setState for use within the state
            //     dialog: WinJS.UI.ContentDialog;
            // }

            var States = {
                // Initial state. Initializes state on the dialog shared by the various states.
                Init: _Base.Class.define(null, {
                    name: "Init",
                    hidden: true,
                    enter: function ContentDialog_InitState_enter(reason) {
                        this.dialog._dismissedSignal = new _Signal();
                        this.dialog._setState(States.Hidden, false);
                    },
                    exit: _,
                    show: function ContentDialog_InitState_show() {
                        throw "It's illegal to call show on the Init state";
                    },
                    hide: _,
                    onCommandClicked: _,
                    onInputPaneShown: _,
                    onInputPaneHidden: _
                }),
                // A rest state. The dialog is hidden and is waiting for the app to call show.
                Hidden: _Base.Class.define(null, {
                    name: "Hidden",
                    hidden: true,
                    enter: function ContentDialog_HiddenState_enter(showIsPending) {
                        if (showIsPending) {
                            this.show();
                        } else {
                            ContentDialogManager.didHide(this.dialog);
                        }
                    },
                    exit: _,
                    show: function ContentDialog_HiddenState_show() {
                        if (ContentDialogManager.aDialogIsShowing()) {
                            return Promise.wrapError(new _ErrorFromName("WinJS.UI.ContentDialog.ContentDialogAlreadyShowing", Strings.contentDialogAlreadyShowing));
                        } else {
                            var dismissedPromise = this.dialog._dismissedSignal.promise;
                            this.dialog._setState(States.BeforeShow);
                            return dismissedPromise;
                        }
                    },
                    hide: _,
                    onCommandClicked: _,
                    onInputPaneShown: _,
                    onInputPaneHidden: _
                }),
                // An event state. The dialog fires the beforeshow event.
                BeforeShow: _Base.Class.define(null, {
                    name: "BeforeShow",
                    hidden: true,
                    enter: function ContentDialog_BeforeShowState_enter() {
                        interruptible(this, function (that, ready) {
                            return ready.then(function () {
                                return that.dialog._fireBeforeShow(); // Give opportunity for chain to be canceled when calling into app code
                            }).then(function (shouldShow) {
                                if (!shouldShow) {
                                    that.dialog._cancelDismissalPromise(); // Give opportunity for chain to be canceled when calling into app code
                                }
                                return shouldShow;
                            }).then(function (shouldShow) {
                                if (shouldShow) {
                                    that.dialog._setState(States.Showing);
                                } else {
                                    that.dialog._setState(States.Hidden, false);
                                }
                            });
                        });
                    },
                    exit: cancelInterruptibles,
                    show: function ContentDialog_BeforeShowState_show() {
                        return Promise.wrapError(new _ErrorFromName("WinJS.UI.ContentDialog.ContentDialogAlreadyShowing", Strings.contentDialogAlreadyShowing));
                    },
                    hide: _,
                    onCommandClicked: _,
                    onInputPaneShown: _,
                    onInputPaneHidden: _
                }),
                // An animation/event state. The dialog plays its entrance animation and fires aftershow.
                Showing: _Base.Class.define(null, {
                    name: "Showing",
                    hidden: {
                        get: function ContentDialog_ShowingState_hidden_get() {
                            return !!this._pendingHide;
                        }
                    },
                    enter: function ContentDialog_ShowingState_enter() {
                        interruptible(this, function (that, ready) {
                            return ready.then(function () {
                                that._pendingHide = null;
                                _ElementUtilities.addClass(that.dialog._dom.root, ClassNames._visible);
                                that.dialog._addExternalListeners();
                                if (_WinRT.Windows.UI.ViewManagement.InputPane) {
                                    var inputPaneHeight = _WinRT.Windows.UI.ViewManagement.InputPane.getForCurrentView().occludedRect.height;
                                    if (inputPaneHeight > 0) {
                                        that.dialog._renderForInputPane(inputPaneHeight);
                                    }
                                }
                                ContentDialogManager.willShow(that.dialog);
                                that.dialog._focusInitialElement();
                                return that.dialog._playEntranceAnimation();
                            }).then(function () {
                                that.dialog._fireEvent(EventNames.afterShow); // Give opportunity for chain to be canceled when calling into app code
                            }).then(function () {
                                that.dialog._setState(States.Shown, that._pendingHide);
                            });
                        });
                    },
                    exit: cancelInterruptibles,
                    show: function ContentDialog_ShowingState_show() {
                        if (this._pendingHide) {
                            var reason = this._pendingHide.reason;
                            this._pendingHide = null;
                            return this.dialog._resetDismissalPromise(reason).promise;
                        } else {
                            return Promise.wrapError(new _ErrorFromName("WinJS.UI.ContentDialog.ContentDialogAlreadyShowing", Strings.contentDialogAlreadyShowing));
                        }
                    },
                    hide: function ContentDialog_ShowingState_hide(reason) {
                        this._pendingHide = { reason: reason };
                    },
                    onCommandClicked: _,
                    onInputPaneShown: onInputPaneShown,
                    onInputPaneHidden: onInputPaneHidden
                }),
                // A rest state. The dialog is shown and is waiting for the user or the app to trigger hide.
                Shown: _Base.Class.define(null, {
                    name: "Shown",
                    hidden: false,
                    enter: function ContentDialog_ShownState_enter(pendingHide) {
                         if (pendingHide) {
                             this.hide(pendingHide.reason);
                         }
                    },
                    exit: _,
                    show: function ContentDialog_ShownState_show() {
                        return Promise.wrapError(new _ErrorFromName("WinJS.UI.ContentDialog.ContentDialogAlreadyShowing", Strings.contentDialogAlreadyShowing));
                    },
                    hide: function ContentDialog_ShownState_hide(reason) {
                        this.dialog._setState(States.BeforeHide, reason);
                    },
                    onCommandClicked: function ContentDialog_ShownState_onCommandClicked(reason) {
                        this.hide(reason);
                    },
                    onInputPaneShown: onInputPaneShown,
                    onInputPaneHidden: onInputPaneHidden
                }),
                // An event state. The dialog fires the beforehide event.
                BeforeHide: _Base.Class.define(null, {
                    name: "BeforeHide",
                    hidden: false,
                    enter: function ContentDialog_BeforeHideState_enter(reason) {
                        interruptible(this, function (that, ready) {
                            return ready.then(function () {
                                return that.dialog._fireBeforeHide(reason); // Give opportunity for chain to be canceled when calling into app code
                            }).then(function (shouldHide) {
                                if (shouldHide) {
                                    that.dialog._setState(States.Hiding, reason);
                                } else {
                                    that.dialog._setState(States.Shown, null);
                                }
                            });
                        });
                    },
                    exit: cancelInterruptibles,
                    show: function ContentDialog_BeforeHideState_show() {
                        return Promise.wrapError(new _ErrorFromName("WinJS.UI.ContentDialog.ContentDialogAlreadyShowing", Strings.contentDialogAlreadyShowing));
                    },
                    hide: _,
                    onCommandClicked: _,
                    onInputPaneShown: onInputPaneShown,
                    onInputPaneHidden: onInputPaneHidden
                }),
                // An animation/event state. The dialog plays the exit animation and fires the afterhide event.
                Hiding: _Base.Class.define(null, {
                    name: "Hiding",
                    hidden: {
                        get: function ContentDialog_HidingState_hidden_get() {
                            return !this._showIsPending;
                        }
                    },
                    enter: function ContentDialog_HidingState_enter(reason) {
                        interruptible(this, function (that, ready) {
                            return ready.then(function () {
                                that._showIsPending = false;
                                that.dialog._resetDismissalPromise(reason); // Give opportunity for chain to be canceled when calling into app code
                            }).then(function () {
                                return that.dialog._playExitAnimation();
                            }).then(function () {
                                that.dialog._removeExternalListeners();
                                _ElementUtilities.removeClass(that.dialog._dom.root, ClassNames._visible);
                                that.dialog._clearInputPaneRendering();
                                that.dialog._fireAfterHide(reason); // Give opportunity for chain to be canceled when calling into app code
                            }).then(function () {
                                that.dialog._setState(States.Hidden, that._showIsPending);
                            });
                        });
                    },
                    exit: cancelInterruptibles,
                    show: function ContentDialog_HidingState_show() {
                        if (this._showIsPending) {
                            return Promise.wrapError(new _ErrorFromName("WinJS.UI.ContentDialog.ContentDialogAlreadyShowing", Strings.contentDialogAlreadyShowing));
                        } else {
                            this._showIsPending = true;
                            return this.dialog._dismissedSignal.promise;
                        }
                    },
                    hide: function ContentDialog_HidingState_hide(reason) {
                        if (this._showIsPending) {
                            this._showIsPending = false;
                            this.dialog._resetDismissalPromise(reason);
                        }
                    },
                    onCommandClicked: _,
                    onInputPaneShown: _,
                    onInputPaneHidden: _
                }),
                Disposed: _Base.Class.define(null, {
                    name: "Disposed",
                    hidden: true,
                    enter: function ContentDialog_DisposedState_enter() {
                        ContentDialogManager.didHide(this.dialog);
                        this.dialog._removeExternalListeners();
                        this.dialog._dismissedSignal.error(new _ErrorFromName("WinJS.UI.ContentDialog.ControlDisposed", Strings.controlDisposed));
                    },
                    exit: _,
                    show: function ContentDialog_DisposedState_show() {
                        return Promise.wrapError(new _ErrorFromName("WinJS.UI.ContentDialog.ControlDisposed", Strings.controlDisposed));
                    },
                    hide: _,
                    onCommandClicked: _,
                    onInputPaneShown: _,
                    onInputPaneHidden: _
                }),
            };

            var ContentDialog = _Base.Class.define(function ContentDialog_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.ContentDialog.ContentDialog">
                /// <summary locid="WinJS.UI.ContentDialog.constructor">
                /// Creates a new ContentDialog control.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.ContentDialog.constructor_p:element">
                /// The DOM element that hosts the ContentDialog control.
                /// </param>
                /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.ContentDialog.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// Event names must begin with "on". For example, to provide a handler for the beforehide event,
                /// add a property named "onbeforehide" to the options object and set its value to the event handler.
                /// </param>
                /// <returns type="WinJS.UI.ContentDialog" locid="WinJS.UI.ContentDialog.constructor_returnValue">
                /// The new ContentDialog.
                /// </returns>
                /// </signature>

                // Check to make sure we weren't duplicated
                if (element && element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.ContentDialog.DuplicateConstruction", Strings.duplicateConstruction);
                }
                options = options || {};
                
                this._onBackClickBound = this._onBackClick.bind(this);
                this._onBeforeRequestingFocusOnKeyboardInputBound = this._onBeforeRequestingFocusOnKeyboardInput.bind(this);
                this._onInputPaneShownBound = this._onInputPaneShown.bind(this);
                this._onInputPaneHiddenBound = this._onInputPaneHidden.bind(this);
                this._onFocusInBound = this._onFocusIn.bind(this);
                this._onKeyDownEnteringDocumentBound = this._onKeyDownEnteringDocument.bind(this);
                this._onKeyEnteringDocumentBound = this._onKeyEnteringDocument.bind(this);
                
                this._disposed = false;
                this._resizedForInputPane = false;
                this._currentFocus = null;
                
                this._initializeDom(element || _Global.document.createElement("div"));
                this._setState(States.Init);

                this.title = "";
                this.primaryCommandText = "";
                this.primaryCommandDisabled = false;
                this.secondaryCommandText = "";
                this.secondaryCommandDisabled = false;

                _Control.setOptions(this, options);
            }, {
                /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.ContentDialog.element" helpKeyword="WinJS.UI.ContentDialog.element">
                /// Gets the DOM element that hosts the ContentDialog control.
                /// </field>
                element: {
                    get: function ContentDialog_element_get() {
                        return this._dom.root;
                    }
                },

                /// <field type="String" locid="WinJS.UI.ContentDialog.title" helpKeyword="WinJS.UI.ContentDialog.title">
                /// The text displayed as the title of the dialog.
                /// </field>
                title: {
                    get: function ContentDialog_title_get() {
                        return this._title;
                    },
                    set: function ContentDialog_title_set(value) {
                        value = value || "";
                        if (this._title !== value) {
                            this._title = value;
                            this._dom.title.textContent = value;
                            this._dom.title.style.display = value ? "" : "none";
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.ContentDialog.primaryCommandText" helpKeyword="WinJS.UI.ContentDialog.primaryCommandText">
                /// The text displayed on the primary command's button.
                /// </field>
                primaryCommandText: {
                    get: function ContentDialog_primaryCommandText_get() {
                        return this._primaryCommandText;
                    },
                    set: function ContentDialog_primaryCommandText_set(value) {
                        value = value || "";
                        if (this._primaryCommandText !== value) {
                            this._primaryCommandText = value;
                            this._dom.commands[0].textContent = value;
                            this._updateCommandsUI();
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.ContentDialog.secondaryCommandText" helpKeyword="WinJS.UI.ContentDialog.secondaryCommandText">
                /// The text displayed on the secondary command's button.
                /// </field>
                secondaryCommandText: {
                    get: function ContentDialog_secondaryCommandText_get() {
                        return this._secondaryCommandText;
                    },
                    set: function ContentDialog_secondaryCommandText_set(value) {
                        value = value || "";
                        if (this._secondaryCommandText !== value) {
                            this._secondaryCommandText = value;
                            this._dom.commands[1].textContent = value;
                            this._updateCommandsUI();
                        }
                    }
                },
                
                /// <field type="Boolean" locid="WinJS.UI.ContentDialog.primaryCommandDisabled" helpKeyword="WinJS.UI.ContentDialog.primaryCommandDisabled">
                /// Indicates whether the button representing the primary command is currently disabled.
                /// </field>
                primaryCommandDisabled: {
                    get: function ContentDialog_primaryCommandDisabled_get() {
                        return this._primaryCommandDisabled;
                    },
                    set: function ContentDialog_primaryCommandDisabled_set(value) {
                        value = !!value;
                        if (this._primaryCommandDisabled !== value) {
                            this._primaryCommandDisabled = value;
                            this._dom.commands[0].disabled = value;
                        }
                    }
                },
                
                /// <field type="Boolean" locid="WinJS.UI.ContentDialog.secondaryCommandDisabled" helpKeyword="WinJS.UI.ContentDialog.secondaryCommandDisabled">
                /// Indicates whether the button representing the secondary command is currently disabled.
                /// </field>
                secondaryCommandDisabled: {
                    get: function ContentDialog_secondaryCommandDisabled_get() {
                        return this._secondaryCommandDisabled;
                    },
                    set: function ContentDialog_secondaryCommandDisabled_set(value) {
                        value = !!value;
                        if (this._secondaryCommandDisabled !== value) {
                            this._secondaryCommandDisabled = value;
                            this._dom.commands[1].disabled = value;
                        }
                    }
                },

                /// <field type="Boolean" readonly="true" hidden="true" locid="WinJS.UI.ContentDialog.hidden" helpKeyword="WinJS.UI.ContentDialog.hidden">
                /// Read only. True if the dialog is currently not visible.
                /// </field>
                hidden: {
                    get: function ContentDialog_hidden_get() {
                        return this._state.hidden;
                    }
                },

                dispose: function ContentDialog_dispose() {
                    /// <signature helpKeyword="WinJS.UI.ContentDialog.dispose">
                    /// <summary locid="WinJS.UI.ContentDialog.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._setState(States.Disposed);
                    this._disposed = true;
                    _Dispose._disposeElement(this._dom.content);
                },

                show: function ContentDialog_show() {
                    /// <signature helpKeyword="WinJS.UI.ContentDialog.show">
                    /// <summary locid="WinJS.UI.ContentDialog.show">
                    /// Shows the ContentDialog. Only one ContentDialog may be shown at a time. If another
                    /// ContentDialog is already shown, this ContentDialog will remain hidden.
                    /// </summary>
                    /// <returns type="WinJS.Promise" locid="WinJS.UI.ContentDialog.show_returnValue">
                    /// A promise which is successfully fulfilled when the dialog is dismissed. The
                    /// completion value indicates the reason that the dialog was dismissed. This may
                    /// be 'primary', 'secondary', 'none', or whatever custom value was passed to hide.
                    /// If this ContentDialog cannot be shown because a ContentDialog is already showing
                    /// or the ContentDialog is disposed, then the return value is a promise which is in
                    /// an error state. If preventDefault() is called on the beforeshow event, then this
                    /// promise will be canceled.
                    /// </returns>
                    /// </signature>
                    return this._state.show();
                },

                hide: function ContentDialog_hide(reason) {
                    /// <signature helpKeyword="WinJS.UI.ContentDialog.hide">
                    /// <summary locid="WinJS.UI.ContentDialog.hide">
                    /// Hides the ContentDialog.
                    /// </summary>
                    /// <param name="reason" locid="WinJS.UI.ContentDialog.hide_p:reason">
                    /// A value indicating why the dialog is being hidden. The promise returned
                    /// by show will be fulfilled with this value.
                    /// </param>
                    /// </signature>
                    this._state.hide(reason === undefined ? DismissalReason.none : reason);
                },

                _initializeDom: function ContentDialog_initializeDom(root) {
                    // Reparent the children of the root element into the content element.
                    var contentEl = _Global.document.createElement("div");
                    contentEl.className = ClassNames.content;
                    _ElementUtilities._reparentChildren(root, contentEl);

                    root.winControl = this;
                    root.className = ClassNames.contentDialog + " " + ClassNames._verticalAlignment + " win-disposable";
                    root.innerHTML =
                        '<div class="' + ClassNames.backgroundOverlay + '"></div>' +
                        '<div class="' + ClassNames._tabStop + '"></div>' +
                        '<div tabindex="-1" role="dialog" class="' + ClassNames.dialog + '">' +
                            '<div class="' + ClassNames.title + '"></div>' +
                            '<div class="' + ClassNames._scroller + '"></div>' +
                            '<div class="' + ClassNames.commands + '">' +
                                '<button class="' + ClassNames._commandSpacer + '"></button>' +
                                '<button class="' + ClassNames.primaryCommand + '"></button>' +
                                '<button class="' + ClassNames.secondaryCommand + '"></button>' +
                            '</div>' +
                        '</div>' +
                        '<div class="' + ClassNames._tabStop + '"></div>' +
                        '<div class="' + ClassNames._column0or1 + '"></div>';

                    var dom = {};
                    dom.root = root;
                    dom.backgroundOverlay = dom.root.firstElementChild;
                    dom.startBodyTab = dom.backgroundOverlay.nextElementSibling;
                    dom.dialog = dom.startBodyTab.nextElementSibling;
                    dom.title = dom.dialog.firstElementChild;
                    dom.scroller = dom.title.nextElementSibling;
                    dom.commandContainer = dom.scroller.nextElementSibling;
                    dom.commandSpacer = dom.commandContainer.firstElementChild;
                    dom.commands = [];
                    dom.commands.push(dom.commandSpacer.nextElementSibling);
                    dom.commands.push(dom.commands[0].nextElementSibling);
                    dom.endBodyTab = dom.dialog.nextElementSibling;
                    dom.content = contentEl;
                    this._dom = dom;

                    // Put the developer's content into the scroller
                    dom.scroller.appendChild(dom.content);

                    _ElementUtilities._ensureId(dom.title);
                    _ElementUtilities._ensureId(dom.startBodyTab);
                    _ElementUtilities._ensureId(dom.endBodyTab);
                    dom.dialog.setAttribute("aria-labelledby", dom.title.id);
                    dom.startBodyTab.setAttribute("x-ms-aria-flowfrom", dom.endBodyTab.id);
                    dom.endBodyTab.setAttribute("aria-flowto", dom.startBodyTab.id);
                    this._updateTabIndices();
                    
                    var onKeyLeavingElementBound = this._onKeyLeavingElement.bind(this);
                    dom.root.addEventListener("keydown", onKeyLeavingElementBound);
                    dom.root.addEventListener("keyup", onKeyLeavingElementBound);
                    dom.root.addEventListener("keypress", onKeyLeavingElementBound);
                    _ElementUtilities._addEventListener(dom.root, "pointerdown", this._onPointerDown.bind(this));
                    _ElementUtilities._addEventListener(dom.root, "pointerup", this._onPointerUp.bind(this));
                    dom.root.addEventListener("click", this._onClick.bind(this));
                    _ElementUtilities._addEventListener(dom.startBodyTab, "focusin", this._onStartBodyTabFocusIn.bind(this));
                    _ElementUtilities._addEventListener(dom.endBodyTab, "focusin", this._onEndBodyTabFocusIn.bind(this));
                    dom.commands[0].addEventListener("click", this._onCommandClicked.bind(this, DismissalReason.primary));
                    dom.commands[1].addEventListener("click", this._onCommandClicked.bind(this, DismissalReason.secondary));
                },
                
                _updateCommandsUI: function ContentDialog_updateCommandsUI() {
                    this._dom.commands[0].style.display = this.primaryCommandText ? "" : "none";
                    this._dom.commands[1].style.display = this.secondaryCommandText ? "" : "none";
                    
                    // commandSpacer's purpose is to ensure that when only 1 button is shown, that button takes up half
                    // the width of the dialog and is right-aligned. It works by:
                    // - When only one command is shown:
                    //   - Coming before the other command in the DOM (so the other command will look right-aligned)
                    //   - Having the same flex-grow as the other command (so it occupies half of the space)
                    //   - Having visibility: hidden (so it's invisible but it takes up space)
                    // - When both commands are shown:
                    //   - Having display: none (so it doesn't occupy any space and the two shown commands each take up half the dialog)
                    // - When 0 commands are shown:
                    //   - Having display: none (so the commands area takes up no space)
                    this._dom.commandSpacer.style.display = this.primaryCommandText && !this.secondaryCommandText || !this.primaryCommandText && this.secondaryCommandText ? "" : "none"; 
                },
                
                // _updateTabIndices and _updateTabIndicesImpl are used in tests
                _updateTabIndices: function ContentDialog_updateTabIndices() {
                    if (!this._updateTabIndicesThrottled) {
                        this._updateTabIndicesThrottled = _BaseUtils._throttledFunction(100, this._updateTabIndicesImpl.bind(this));    
                    }
                    this._updateTabIndicesThrottled();
                },
                _updateTabIndicesImpl: function ContentDialog_updateTabIndicesImpl() {
                    var tabIndex = _ElementUtilities._getHighAndLowTabIndices(this._dom.content);
                    this._dom.startBodyTab.tabIndex = tabIndex.lowest;
                    this._dom.commands[0].tabIndex = tabIndex.highest;
                    this._dom.commands[1].tabIndex = tabIndex.highest;
                    this._dom.endBodyTab.tabIndex = tabIndex.highest;
                },
                
                _elementInDialog: function ContentDialog_elementInDialog(element) {
                    return this._dom.dialog.contains(element) || element === this._dom.startBodyTab || element === this._dom.endBodyTab;
                },
                
                _retakeFocus: function ContentDialog_retakeFocus(element) {
                    if (!(this._currentFocus && this._elementInDialog(this._currentFocus) && _ElementUtilities._tryFocus(this._currentFocus))) {
                        this._focusInitialElement();
                    }
                },
                
                _isTopLevel: {
                    get: function ContentDialog_isTopLevel_get() {
                        return !elementInFlyout(_Global.document.activeElement);
                    }
                },
                
                _onCommandClicked: function ContentDialog_onCommandClicked(reason) {
                    this._state.onCommandClicked(reason);
                },
                
                _onPointerDown: function ContentDialog_onPointerDown(eventObject) {
                    eventObject.stopPropagation();
                    if (!this._elementInDialog(eventObject.target)) {
                        eventObject.preventDefault();
                    }
                },

                _onPointerUp: function ContentDialog_onPointerUp(eventObject) {
                    eventObject.stopPropagation();
                    if (!this._elementInDialog(eventObject.target)) {
                        eventObject.preventDefault();
                    }
                },

                _onClick: function ContentDialog_onClick(eventObject) {
                    eventObject.stopPropagation();
                    if (!this._elementInDialog(eventObject.target)) {
                        eventObject.preventDefault();
                    }
                },
                
                _onFocusIn: function ContentDialog_onFocusIn(eventObject) {
                    eventObject = eventObject.detail.originalEvent;
                    if (this._isTopLevel) {
                        if (this._elementInDialog(eventObject.target)) {
                            this._currentFocus = eventObject.target;
                        } else {
                            this._retakeFocus();
                        }
                    }
                },
                
                _onKeyDownEnteringDocument: function ContentDialog_onKeyDownEnteringDocument(eventObject) {
                    eventObject = eventObject.detail.originalEvent;
                    if (this._isTopLevel) {
                        if (eventObject.keyCode === _ElementUtilities.Key.tab) {
                            this._updateTabIndices();
                        } else if (eventObject.keyCode === _ElementUtilities.Key.escape) {
                            this.hide(DismissalReason.none);
                            eventObject.preventDefault();
                            eventObject.stopImmediatePropagation();
                        } else if (!this._elementInDialog(_Global.document.activeElement)) {
                            // When focus has escaped the dialog, eat all other keys.
                            eventObject.preventDefault();
                            eventObject.stopImmediatePropagation();
                        }
                    }
                },
                
                _onKeyEnteringDocument: function ContentDialog_onKeyEnteringDocument(eventObject) {
                    eventObject = eventObject.detail.originalEvent;
                    if (this._isTopLevel && !this._elementInDialog(_Global.document.activeElement) && eventObject.keyCode !== _ElementUtilities.Key.tab) {
                        // When focus has escaped the dialog, eat all other keys.
                        eventObject.preventDefault();
                        eventObject.stopImmediatePropagation();
                    }
                },
                
                _onKeyLeavingElement: function ContentDialog_onKeyLeavingElement(eventObject) {
                    if (this._isTopLevel) {
                        // stopImmediatePropagation so that none of the app's other event handlers will see the event.
                        // Don't preventDefault so that the browser's hotkeys will still work.
                        eventObject.stopImmediatePropagation();
                    }
                },
                
                _onBeforeRequestingFocusOnKeyboardInput: function ContentDialog_onBeforeRequestingFocusOnKeyboardInput(eventObject) {
                    // Suppress the requestingFocusOnKeyboardInput event.
                    eventObject.preventDefault();
                },
                
                _onBackClick: function ContentDialog_onBackClick(eventObject) {
                    if (this._isTopLevel) {
                        this.hide(DismissalReason.none);
                        eventObject.preventDefault();
                    }
                },

                _onStartBodyTabFocusIn: function ContentDialog_onStartBodyTabFocusIn() {
                    _ElementUtilities._focusLastFocusableElement(this._dom.dialog);
                },

                _onEndBodyTabFocusIn: function ContentDialog_onEndBodyTabFocusIn() {
                    _ElementUtilities._focusFirstFocusableElement(this._dom.dialog);
                },

                _onInputPaneShown: function ContentDialog_onInputPaneShown(eventObject) {
                    this._state.onInputPaneShown(eventObject.detail.originalEvent);
                },

                _onInputPaneHidden: function ContentDialog_onInputPaneHidden() {
                    this._state.onInputPaneHidden();
                },

                //
                // Methods called by states
                //

                _setState: function ContentDialog_setState(NewState, arg0) {
                    if (!this._disposed) {
                        this._state && this._state.exit();
                        this._state = new NewState();
                        this._state.dialog = this;
                        this._state.enter(arg0);
                    }
                },

                // Calls into arbitrary app code
                _resetDismissalPromise: function ContentDialog_resetDismissalPromise(reason) {
                    var dismissedSignal = this._dismissedSignal;
                    var newDismissedSignal = this._dismissedSignal = new _Signal();
                    dismissedSignal.complete({ reason: reason });
                    return newDismissedSignal;
                },

                // Calls into arbitrary app code
                _cancelDismissalPromise: function ContentDialog_cancelDismissalPromise() {
                    var dismissedSignal = this._dismissedSignal;
                    var newDismissedSignal = this._dismissedSignal = new _Signal();
                    dismissedSignal.cancel();
                    return newDismissedSignal;
                },
                
                // Calls into arbitrary app code
                _fireEvent: function ContentDialog_fireEvent(eventName, options) {
                    options = options || {};
                    var detail = options.detail || null;
                    var cancelable = !!options.cancelable;

                    var eventObject = _Global.document.createEvent("CustomEvent");
                    eventObject.initCustomEvent(eventName, true, cancelable, detail);
                    return this._dom.root.dispatchEvent(eventObject);
                },

                // Calls into arbitrary app code
                _fireBeforeShow: function ContentDialog_fireBeforeShow() {
                    return this._fireEvent(EventNames.beforeShow, {
                        cancelable: true
                    });
                },
                
                // Calls into arbitrary app code
                _fireBeforeHide: function ContentDialog_fireBeforeHide(reason) {
                    return this._fireEvent(EventNames.beforeHide, {
                        detail: { reason: reason },
                        cancelable: true
                    });
                },

                // Calls into arbitrary app code
                _fireAfterHide: function ContentDialog_fireAfterHide(reason) {
                    this._fireEvent(EventNames.afterHide, {
                        detail: { reason: reason }
                    });
                },

                _playEntranceAnimation: function ContentDialog_playEntranceAnimation() {
                    return cancelablePromise(_Animations.fadeIn(this._dom.root));
                },

                _playExitAnimation: function ContentDialog_playExitAnimation() {
                    return cancelablePromise(_Animations.fadeOut(this._dom.root));
                },
                
                _addExternalListeners: function ContentDialog_addExternalListeners() {
                    _ElementUtilities._inputPaneListener.addEventListener(this._dom.root, "showing", this._onInputPaneShownBound);
                    _ElementUtilities._inputPaneListener.addEventListener(this._dom.root, "hiding", this._onInputPaneShownBound);
                    
                    _ElementUtilities._documentElementListener.addEventListener(this._dom.root, "keydown", this._onKeyDownEnteringDocumentBound, true);
                    _ElementUtilities._documentElementListener.addEventListener(this._dom.root, "keyup", this._onKeyEnteringDocumentBound, true);
                    _ElementUtilities._documentElementListener.addEventListener(this._dom.root, "keypress", this._onKeyEnteringDocumentBound, true);
                    _ElementUtilities._documentElementListener.addEventListener(this._dom.root, "focusin", this._onFocusInBound);
                    
                    Application._applicationListener.addEventListener(this._dom.root, "backclick", this._onBackClickBound);
                    Application._applicationListener.addEventListener(this._dom.root, "beforerequestingfocusonkeyboardinput", this._onBeforeRequestingFocusOnKeyboardInputBound);
                },
                
                _removeExternalListeners: function ContentDialog_removeExternalListeners() {
                    _ElementUtilities._inputPaneListener.removeEventListener(this._dom.root, "showing", this._onInputPaneShownBound);
                    _ElementUtilities._inputPaneListener.removeEventListener(this._dom.root, "hiding", this._onInputPaneShownBound);
                    
                    _ElementUtilities._documentElementListener.removeEventListener(this._dom.root, "keydown", this._onKeyDownEnteringDocumentBound, true);
                    _ElementUtilities._documentElementListener.removeEventListener(this._dom.root, "keyup", this._onKeyEnteringDocumentBound, true);
                    _ElementUtilities._documentElementListener.removeEventListener(this._dom.root, "keypress", this._onKeyEnteringDocumentBound, true);
                    _ElementUtilities._documentElementListener.removeEventListener(this._dom.root, "focusin", this._onFocusInBound);
                    
                    Application._applicationListener.removeEventListener(this._dom.root, "backclick", this._onBackClickBound);
                    Application._applicationListener.removeEventListener(this._dom.root, "beforerequestingfocusonkeyboardinput", this._onBeforeRequestingFocusOnKeyboardInputBound);
                },

                _renderForInputPane: function ContentDialog_renderForInputPane(inputPaneHeight) {
                    this._clearInputPaneRendering();

                    var dialog = this._dom.dialog;
                    var style = dialog.style;
                    var left = dialog.offsetLeft;
                    var top = dialog.offsetTop;
                    var height = dialog.offsetHeight;
                    var bottom = top + height;
                    var visibleBottom = this._dom.root.offsetHeight - inputPaneHeight;
                    var titleHeight = _ElementUtilities.getTotalHeight(this._dom.title);
                    var commandsHeight = _ElementUtilities.getTotalHeight(this._dom.commandContainer);

                    if (bottom > visibleBottom) {
                        var newHeight = height - (bottom - visibleBottom);
                        if (newHeight - titleHeight - commandsHeight < minContentHeightWithInputPane) {
                            // Put title into scroller so there's more screen real estate for the content
                            this._dom.scroller.insertBefore(this._dom.title, this._dom.content);
                        }

                        this._dom.root.style.display = "block";
                        style.height = newHeight + "px";
                        style.position = "absolute";
                        style.left = left + "px";
                        style.top = top + "px";
                        style.minHeight = 0;

                        this._resizedForInputPane = true;
                        _Global.document.activeElement.focus(); // Ensure activeElement is scrolled into view
                    }
                },

                _clearInputPaneRendering: function ContentDialog_clearInputPaneRendering() {
                    if (this._resizedForInputPane) {
                        if (this._dom.title.parentNode !== this._dom.dialog) {
                            // Make sure the title isn't in the scroller
                            this._dom.dialog.insertBefore(this._dom.title, this._dom.scroller);
                        }
                        
                        var style = this._dom.dialog.style;
                        this._dom.root.style.display = "";
                        style.height = "";
                        style.position = "";
                        style.left = "";
                        style.top = "";
                        style.minHeight = "";
                        this._resizedForInputPane = false;
                    }
                },
                
                _focusInitialElement: function ContentDialog_focusInitialElement() {
                    _ElementUtilities._focusFirstFocusableElement(this._dom.content) || this._dom.dialog.focus();
                }
            }, {
                /// <field locid="WinJS.UI.ContentDialog.DismissalReason" helpKeyword="WinJS.UI.ContentDialog.DismissalReason">
                /// Specifies the reason that the ContentDialog was dismissed.
                /// </field>
                DismissalReason: DismissalReason,
                
                _ClassNames: ClassNames
            });
            _Base.Class.mix(ContentDialog, _Events.createEventProperties(
                "beforeshow",
                "aftershow",
                "beforehide",
                "afterhide"
            ));
            _Base.Class.mix(ContentDialog, _Control.DOMEventMixin);
            return ContentDialog;
        })
    });
});
