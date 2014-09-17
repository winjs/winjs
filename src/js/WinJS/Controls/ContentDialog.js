// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    '../Utilities/_Dispose',
    '../Promise',
    '../_Signal',
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
    'require-style!less/desktop/controls',
    'require-style!less/phone/controls'
    ], function contentDialogInit(_Dispose, Promise, _Signal, _Global, _WinRT, _Base, _Events, _ErrorFromName, _Resources, _Control, _ElementUtilities, _Hoverable, _Animations) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.ContentDialog">
        /// Displays a modal dialog which can display arbitrary HTML content.
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.contentdialog.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.contentdialog.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.ContentDialog"></div>]]></htmlSnippet>
        /// <event name="beforeshow" locid="WinJS.UI.ContentDialog_e:beforeshow">Raised just before showing a dialog.</event>
        /// <event name="aftershow" locid="WinJS.UI.ContentDialog_e:aftershow">Raised immediately after a dialog is fully shown.</event>
        /// <event name="beforehide" locid="WinJS.UI.ContentDialog_e:beforehide">Raised just before hiding a dialog. Call preventDefault on this event to stop the dialog from being hidden.</event>
        /// <event name="afterhide" locid="WinJS.UI.ContentDialog_e:afterhide">Raised immediately after a dialog is fully hidden.</event>
        /// <part name="contentdialog" class="win-contentdialog" locid="WinJS.UI.ContentDialog_part:contentdialog">The entire ContentDialog control.</part>
        /// <part name="contentdialog-dimcontent" class="win-contentdialog-dimcontent" locid="WinJS.UI.ContentDialog_part:contentdialog-dimcontent">The full screen element which dims the content that is behind the dialog.</part>
        /// <part name="contentdialog-body" class="win-contentdialog-body" locid="WinJS.UI.ContentDialog_part:contentdialog-body">The main element of the dialog which holds the dialog's title, content, and commands.</part>
        /// <part name="contentdialog-title" class="win-contentdialog-title" locid="WinJS.UI.ContentDialog_part:contentdialog-title">The element which displays the dialog's title.</part>
        /// <part name="contentdialog-primarycommand" class="win-contentdialog-primarycommand" locid="WinJS.UI.ContentDialog_part:contentdialog-primarycommand">The dialog's primary button.</part>
        /// <part name="contentdialog-secondarycommand" class="win-contentdialog-secondarycommand" locid="WinJS.UI.ContentDialog_part:contentdialog-secondarycommand">The dialog's secondary button.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        ContentDialog: _Base.Namespace._lazy(function () {
            var strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get controlDisposed() { return "Cannot interact with the control after it has been disposed"; },
                get contentDialogAlreadyShowing() { return "Cannot show a ContentDialog if there is already a ContentDialog that is showing"; }
            };
            var PendingDisplayOperations = {
                show: "show",
                hide: "hide",
                none: "none"
            };
            var DismissalReasons = {
                none: "none",
                primary: "primary",
                secondary: "secondary"
            };
            var ClassNames = {
                contentDialog: "win-contentdialog",
                dimContent: "win-contentdialog-dimcontent",
                body: "win-contentdialog-body",
                title: "win-contentdialog-title",
                primaryCommand: "win-contentdialog-primarycommand",
                secondaryCommand: "win-contentdialog-secondarycommand",
                
                _verticalAlignment: "win-contentdialog-verticalalignment",
                _scroller: "win-contentdialog-scroller",
                _content: "win-contentdialog-content",
                _commands: "win-contentdialog-commands",
                _column0or1: "win-contentdialog-column0or1",
                _visible: "win-contentdialog-visible",
                _tabStop: "win-contentdialog-tabstop"
            };
            var EventNames = {
                beforeShow: "beforeshow",
                afterShow: "aftershow",
                beforeHide: "beforehide",
                afterHide: "afterhide",
            };
            var minContentHeightWithInputPane = 120;
            
            function aDialogIsShowing() {
                var visibleDialogs = Array.prototype.slice.call(_Global.document.body.querySelectorAll("." + ClassNames.contentDialog + "." + ClassNames._visible), 0);
                return visibleDialogs.some(function (dialogEl) {
                    var dialog = dialogEl.winControl;
                    return dialog && !dialog._disposed && !dialog.hidden;
                });
            }
            
            // WinJS animation promises always complete successfully. This
            // helper allows an animation promise to complete in the canceled state
            // so that the success handler can be skipped when the animation is
            // interrupted.
            function cancelablePromise(animationPromise) {
                var complete, error, canceled;
                var p = new Promise(function (c, e) {
                    complete = c;
                    error = e;
                }, function () {
                    canceled = true;
                    animationPromise.cancel();
                });
                animationPromise.then(function (v) {
                    if (!canceled) {
                        complete(v);
                    }
                }, function (e) {
                    error(e);
                });
                return p;
            }
            
            function onInputPaneShown(dialog, eventObject) {
                eventObject.ensuredFocusedElementInView = true;
                dialog._renderForInputPane(eventObject.occludedRect.height);
            }

            function onInputPaneHidden(dialog) {
                dialog._clearInputPaneRendering();
            }

            // Noop function, used in the various states to indicate that they don't support a given
            // message. Named with the somewhat cute name '_' because it reads really well in the states.

            function _() { }
            
            // Implementing the control as a state machine helps us correctly handle:
            //   - re-entrancy while firing events
            //   - calls into the control during asynchronous operations (e.g. animations)
            //
            // Transitions:
            //   When created, the control will take the following initialization transition:
            //     Init -> Hidden
            //   Following that, the life of the dialog will be dominated by the following 3
            //   sequences of transitions. In geneneral, these sequences are uninterruptible.
            //     Hidden -> BeforeShow -> Showing -> Shown
            //     Shown -> BeforeHide -> Hiding -> Hidden
            //     Shown -> BeforeHide -> Shown (when preventDefault is called on beforehide event)
            //   However, any state can be interrupted to go to the Disposed state:
            //     * -> Disposed

            // interface IContentDialogState {
            //     // State lifecycle
            //     enter(dialog, arg0);
            //     exit(dialog);
            //     // ContentDialog's public API surface
            //     hidden: boolean;
            //     show(dialog);
            //     hide(dialog, reason);
            //     // Events
            //     onCommandClicked(dialog, reason);
            //     onInputPaneShown(dialog, eventObject);
            //     onInputPaneHidden(dialogs);
            // }

            var States = {
                // Initial state. Initializes state on the dialog shared by the various states.
                Init: _Base.Class.define(null, {
                    hidden: true,
                    enter: function (dialog, reason) {
                        dialog._pendingDisplayOperation = { type: PendingDisplayOperations.none };
                        dialog._dismissedSignal = new _Signal();
                        dialog._setState(States.Hidden);
                    },
                    exit: _,
                    show: function (dialog) {
                        throw "It's illegal to call show on the Init state";
                    },
                    hide: _,
                    onCommandClicked: _,
                    onInputPaneShown: _,
                    onInputPaneHidden: _
                }),
                // A rest state. The dialog is hidden and is waiting for the app to call show.
                Hidden: _Base.Class.define(null, {
                    hidden: true,
                    enter: function (dialog) {
                        dialog._executePendingOperation();
                    },
                    exit: _,
                    show: function (dialog) {
                        if (aDialogIsShowing()) {
                            return Promise.wrapError(new _ErrorFromName("WinJS.UI.ContentDialog.ContentDialogAlreadyShowing", strings.contentDialogAlreadyShowing));
                        } else {
                            var dismissedPromise = dialog._dismissedSignal.promise;
                            dialog._setState(States.BeforeShow);
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
                    hidden: true,
                    enter: function (dialog) {
                        var that = this;
                        var promiseStoredSignal = new _Signal();
                        that._promise = promiseStoredSignal.promise.then(function () {
                            return dialog._fireEvent(EventNames.beforeShow);
                        }).then(function () {
                            dialog._setState(States.Showing);
                        });
                        promiseStoredSignal.complete();
                    },
                    exit: function (dialog) {
                        this._promise.cancel();
                    },
                    show: function (dialog) {
                        return Promise.wrapError(new _ErrorFromName("WinJS.UI.ContentDialog.ContentDialogAlreadyShowing", strings.contentDialogAlreadyShowing));
                    },
                    hide: _,
                    onCommandClicked: _,
                    onInputPaneShown: _,
                    onInputPaneHidden: _
                }),
                // An animation/event state. The dialog plays its entrance animation and fires aftershow.
                Showing: _Base.Class.define(null, {
                    hidden: false,
                    enter: function (dialog) {
                        var that = this;
                        var promiseStoredSignal = new _Signal();
                        that._promise = promiseStoredSignal.promise.then(function () {
                            _ElementUtilities.addClass(dialog._dom.root, ClassNames._visible);
                            dialog._addInputPaneListeners();
                            if (_WinRT.Windows.UI.ViewManagement.InputPane) {
                                var inputPaneHeight = _WinRT.Windows.UI.ViewManagement.InputPane.getForCurrentView().occludedRect.height;
                                if (inputPaneHeight > 0) {
                                    dialog._renderForInputPane(inputPaneHeight);
                                }
                            }
                            _ElementUtilities._focusFirstFocusableElement(dialog._dom.content) || dialog._dom.body.focus();
                            return dialog._playEntranceAnimation();
                        }).then(function () {
                            return dialog._fireEvent(EventNames.afterShow);
                        }).then(function () {
                            dialog._setState(States.Shown);
                        });
                        promiseStoredSignal.complete();
                    },
                    exit: function (dialog) {
                        this._promise.cancel();
                    },
                    show: function (dialog) {
                        return Promise.wrapError(new _ErrorFromName("WinJS.UI.ContentDialog.ContentDialogAlreadyShowing", strings.contentDialogAlreadyShowing));
                    },
                    hide: function (dialog, reason) {
                        dialog._pendingDisplayOperation = { type: PendingDisplayOperations.hide, value: reason };
                    },
                    onCommandClicked: _,
                    onInputPaneShown: onInputPaneShown,
                    onInputPaneHidden: onInputPaneHidden
                }),
                // A rest state. The dialog is shown and is waiting for the user or the app to trigger hide.
                Shown: _Base.Class.define(null, {
                    hidden: false,
                    enter: function (dialog) {
                         dialog._executePendingOperation();
                    },
                    exit: _,
                    show: function (dialog) {
                        return Promise.wrapError(new _ErrorFromName("WinJS.UI.ContentDialog.ContentDialogAlreadyShowing", strings.contentDialogAlreadyShowing));
                    },
                    hide: function (dialog, reason) {
                        dialog._setState(States.BeforeHide, reason);
                    },
                    onCommandClicked: function (dialog, reason) {
                        this.hide(dialog, reason);
                    },
                    onInputPaneShown: onInputPaneShown,
                    onInputPaneHidden: onInputPaneHidden
                }),
                // An event state. The dialog fires the beforehide event.
                BeforeHide: _Base.Class.define(null, {
                    hidden: false,
                    enter: function (dialog, reason) {
                        var that = this;
                        var promiseStoredSignal = new _Signal();
                        that._promise = promiseStoredSignal.promise.then(function () {
                            return dialog._fireBeforeHide(reason);
                        }).then(function (shouldHide) {
                            if (shouldHide) {
                                dialog._setState(States.Hiding, reason);
                            } else {
                                dialog._setState(States.Shown);
                            }
                        });
                        promiseStoredSignal.complete();
                    },
                    exit: function (dialog) {
                        this._promise.cancel();
                    },
                    show: function (dialog) {
                        return Promise.wrapError(new _ErrorFromName("WinJS.UI.ContentDialog.ContentDialogAlreadyShowing", strings.contentDialogAlreadyShowing));
                    },
                    hide: _,
                    onCommandClicked: _,
                    onInputPaneShown: onInputPaneShown,
                    onInputPaneHidden: onInputPaneHidden
                }),
                // An animation/event state. The dialog plays the exit animation and fires the afterhide event.
                Hiding: _Base.Class.define(null, {
                    hidden: true,
                    enter: function (dialog, reason) {
                        var that = this;
                        var promiseStoredSignal = new _Signal();
                        that._promise = promiseStoredSignal.promise.then(function () {
                            dialog._removeInputPaneListeners();
                            return dialog._resetDismissalPromise(reason);
                        }).then(function () {
                            return dialog._playExitAnimation();
                        }).then(function () {
                            _ElementUtilities.removeClass(dialog._dom.root, ClassNames._visible);
                            dialog._clearInputPaneRendering();
                            return dialog._fireAfterHide(reason);
                        }).then(function () {
                            dialog._setState(States.Hidden); 
                        });
                        promiseStoredSignal.complete();
                    },
                    exit: function (dialog) {
                        this._promise.cancel();
                    },
                    show: function (dialog) {
                        if (dialog._pendingDisplayOperation.type === PendingDisplayOperations.none) {
                            dialog._pendingDisplayOperation = { type: PendingDisplayOperations.show };
                            return dialog._dismissedSignal.promise;
                        } else {
                            return Promise.wrapError(new _ErrorFromName("WinJS.UI.ContentDialog.ContentDialogAlreadyShowing", strings.contentDialogAlreadyShowing));
                        }
                    },
                    hide: function (dialog, reason) {
                        if (dialog._pendingDisplayOperation.type === PendingDisplayOperations.show) {
                            dialog._pendingDisplayOperation = { type: PendingDisplayOperations.none };
                            dialog._resetDismissalPromise(reason);
                        }
                    },
                    onCommandClicked: _,
                    onInputPaneShown: _,
                    onInputPaneHidden: _
                }),
                Disposed: _Base.Class.define(null, {
                    hidden: true,
                    enter: function (dialog) {
                        dialog._removeInputPaneListeners();
                        dialog._dismissedSignal.error(new _ErrorFromName("WinJS.UI.ContentDialog.ControlDisposed", strings.controlDisposed));
                    },
                    exit: _,
                    show: function (dialog) {
                        return Promise.wrapError(new _ErrorFromName("WinJS.UI.ContentDialog.ControlDisposed", strings.controlDisposed));
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
                    throw new _ErrorFromName("WinJS.UI.ContentDialog.DuplicateConstruction", strings.duplicateConstruction);
                }
                options = options || {};
                
                this._onInputPaneShownBound = this._onInputPaneShown.bind(this);
                this._onInputPaneHiddenBound = this._onInputPaneHidden.bind(this);
                
                this._disposed = false;
                this._resizedForInputPane = false;
                
                this._initializeDom(element || _Global.document.createElement("div"));
                this._state = new States.Init();
                this._state.enter(this);
                
                this.title = "";
                this.primaryCommandText = "";
                this.isPrimaryCommandEnabled = true;
                this.secondaryCommandText = "";
                this.isSecondaryCommandEnabled = true;

                _Control.setOptions(this, options);
            }, {
                /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.ContentDialog.element" helpKeyword="WinJS.UI.ContentDialog.element">
                /// Gets the DOM element that hosts the ContentDialog control.
                /// </field>
                element: {
                    get: function () {
                        return this._dom.root;
                    }
                },
                
                /// <field type="String" locid="WinJS.UI.ContentDialog.title" helpKeyword="WinJS.UI.ContentDialog.title">
                /// The text displayed as the title of the dialog.
                /// </field>
                title: {
                    get: function () {
                        return this._title;
                    },
                    set: function (value) {
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
                    get: function () {
                        return this._primaryCommandText;
                    },
                    set: function (value) {
                        value = value || "";
                        if (this._primaryCommandText !== value) {
                            this._primaryCommandText = value;
                            this._dom.commands[0].textContent = value;
                            this._dom.commands[0].style.display = value ? "" : "none";
                        }
                    }
                },
                
                /// <field type="String" locid="WinJS.UI.ContentDialog.secondaryCommandText" helpKeyword="WinJS.UI.ContentDialog.secondaryCommandText">
                /// The text displayed on the secondary command's button.
                /// </field>
                secondaryCommandText: {
                    get: function () {
                        return this._secondaryCommandText;
                    },
                    set: function (value) {
                        value = value || "";
                        if (this._secondaryCommandText !== value) {
                            this._secondaryCommandText = value;
                            this._dom.commands[1].textContent = value;
                            this._dom.commands[1].style.display = value ? "" : "none";
                        }
                    }
                },
                
                /// <field type="Boolean" locid="WinJS.UI.ContentDialog.isPrimaryCommandEnabled" helpKeyword="WinJS.UI.ContentDialog.isPrimaryCommandEnabled">
                /// Indicates whether the button representing the primary command is currently enabled.
                /// </field>
                isPrimaryCommandEnabled: {
                    get: function () {
                        return this._isPrimaryCommandEnabled;
                    },
                    set: function (value) {
                        value = !!value;
                        if (this._isPrimaryCommandEnabled !== value) {
                            this._isPrimaryCommandEnabled = value;
                            this._dom.commands[0].disabled = !value;
                        }
                    }
                },
                
                /// <field type="Boolean" locid="WinJS.UI.ContentDialog.isSecondaryCommandEnabled" helpKeyword="WinJS.UI.ContentDialog.isSecondaryCommandEnabled">
                /// Indicates whether the button representing the secondary command is currently enabled.
                /// </field>
                isSecondaryCommandEnabled: {
                    get: function () {
                        return this._isSecondaryCommandEnabled;
                    },
                    set: function (value) {
                        value = !!value;
                        if (this._isSecondaryCommandEnabled !== value) {
                            this._isSecondaryCommandEnabled = value;
                            this._dom.commands[1].disabled = !value;
                        }
                    }
                },

                /// <field type="Boolean" readonly="true" hidden="true" locid="WinJS.UI.ContentDialog.hidden" helpKeyword="WinJS.UI.ContentDialog.hidden">
                /// Read only. True if the dialog is currently not visible.
                /// </field>
                hidden: {
                    get: function () {
                        return this._state.hidden;
                    }
                },

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.ContentDialog.dispose">
                    /// <summary locid="WinJS.UI.ContentDialog.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;
                    this._setState(States.Disposed);
                    _Dispose._disposeElement(this._dom.content);
                },
                
                show: function () {
                    /// <signature helpKeyword="WinJS.UI.ContentDialog.show">
                    /// <summary locid="WinJS.UI.ContentDialog.show">
                    /// Shows the ContentDialog. Only one ContentDialog may be shown at a time. If another
                    /// ContentDialog is already shown, this ContentDialog will remain hidden.
                    /// </summary>
                    /// <returns type="WinJS.Promise" locid="WinJS.UI.ContentDialog.show_returnValue">
                    /// A promise which is successfully fulfilled when the dialog is dismissed. The
                    /// completion value indicates the reason that the dialog was dismissed. This may
                    /// be 'primary', 'secondary', 'none', or whatever custom value was passed to hide.
                    /// If this ContentDialog cannot be shown because a ContentDialog is already showing,
                    /// then the return value is a promise which is in an error state.
                    /// </returns>
                    /// </signature>
                    return this._state.show(this);
                },
                
                hide: function (reason) {
                    /// <signature helpKeyword="WinJS.UI.ContentDialog.hide">
                    /// <summary locid="WinJS.UI.ContentDialog.hide">
                    /// Hides the ContentDialog.
                    /// </summary>
                    /// <param name="reason" locid="WinJS.UI.ContentDialog.hide_p:reason">
                    /// A value indicating why the dialog is being hidden. The promise returned
                    /// by show will be fulfilled with this value.
                    /// </param>
                    /// </signature>
                    if (reason === undefined) {
                        reason = DismissalReasons.none;
                    }
                    this._state.hide(this, reason);
                },
                
                _initializeDom: function (root) {
                    // Reparent the children of the root element into the content element.
                    var contentEl = _Global.document.createElement("div");
                    contentEl.className = ClassNames._content;
                    var childNodes = Array.prototype.slice.call(root.childNodes, 0);
                    for (var i = 0; i < childNodes.length; i++) {
                        contentEl.appendChild(childNodes[i]);
                    }
                    
                    root.winControl = this;
                    root.className = ClassNames.contentDialog + " " + ClassNames._verticalAlignment;
                    root.innerHTML =
                        '<div class="' + ClassNames.dimContent + '"></div>' +
                        '<div class="' + ClassNames._tabStop + '"></div>' +
                        '<div tabindex="-1" class="' + ClassNames.body + '">' +
                            '<div class="' + ClassNames.title + '"></div>' +
                            '<div class="' + ClassNames._scroller + '"></div>' +
                            '<div class="' + ClassNames._commands + '">' +
                                '<button class="' + ClassNames.primaryCommand + '"></button>' +
                                '<button class="' + ClassNames.secondaryCommand + '"></button>' +
                            '</div>' +
                        '</div>' +
                        '<div class="' + ClassNames._tabStop + '"></div>' +
                        '<div class="' + ClassNames._column0or1 + '"></div>';
                    
                    var dom = {};
                    dom.root = root;
                    dom.dimContent = dom.root.firstElementChild;
                    dom.startBodyTab = dom.dimContent.nextElementSibling;
                    dom.body = dom.startBodyTab.nextElementSibling;
                    dom.title = dom.body.firstElementChild;
                    dom.scroller = dom.title.nextElementSibling;
                    dom.commandContainer = dom.scroller.nextElementSibling;
                    dom.commands = [];
                    dom.commands.push(dom.commandContainer.firstElementChild);
                    dom.commands.push(dom.commands[0].nextElementSibling);
                    dom.endBodyTab = dom.body.nextElementSibling;
                    dom.content = contentEl;
                    
                    dom.scroller.appendChild(dom.content);
                    
                    var contentDescendants = dom.content.getElementsByTagName("*");
                    var lowestTabIndex = _ElementUtilities._getLowestTabIndexInList(contentDescendants);
                    var highestTabIndex = _ElementUtilities._getHighestTabIndexInList(contentDescendants);
                    dom.startBodyTab.tabIndex = lowestTabIndex;
                    dom.commands[0].tabIndex = highestTabIndex;
                    dom.commands[1].tabIndex = highestTabIndex;
                    dom.endBodyTab.tabIndex = highestTabIndex;
                    dom.body.setAttribute("role", "dialog");
                    _ElementUtilities._ensureId(dom.title);
                    dom.body.setAttribute("aria-labelledby", dom.title.id);

                    _ElementUtilities._addEventListener(dom.startBodyTab, "focusin", this._onStartBodyTabFocusIn.bind(this));
                    _ElementUtilities._addEventListener(dom.endBodyTab, "focusin", this._onEndBodyTabFocusIn.bind(this));
                    dom.commands[0].addEventListener("click", this._onCommandClicked.bind(this, DismissalReasons.primary));
                    dom.commands[1].addEventListener("click", this._onCommandClicked.bind(this, DismissalReasons.secondary));
                    
                    this._dom = dom;
                },
                
                _onCommandClicked: function (reason) {
                    this._state.onCommandClicked(this, reason);
                },

                _onStartBodyTabFocusIn: function () {
                    _ElementUtilities._focusLastFocusableElement(this._dom.body);
                },

                _onEndBodyTabFocusIn: function () {
                    _ElementUtilities._focusFirstFocusableElement(this._dom.body);
                },

                _onInputPaneShown: function (eventObject) {
                    this._state.onInputPaneShown(this, eventObject);
                },
                
                _onInputPaneHidden: function () {
                    this._state.onInputPaneHidden(this);
                },
                
                //
                // Methods called by states
                //
                
                _setState: function (NewState, arg0) {
                    if (!this._disposed) {
                        this._state.exit(this);
                        this._state = new NewState();
                        this._state.enter(this, arg0);
                    }
                },
                
                _executePendingOperation: function () {
                    var op = this._pendingDisplayOperation;
                    this._pendingDisplayOperation = { type: PendingDisplayOperations.none }; 
                    if (op.type === PendingDisplayOperations.show) {
                        this.show();
                    } else if (op.type === PendingDisplayOperations.hide) {
                        this.hide(op.value);
                    }
                },
                
                // Calls into arbitrary app code
                _resetDismissalPromise: function (reason) {
                    var dismissedSignal = this._dismissedSignal;
                    this._dismissedSignal = new _Signal();
                    dismissedSignal.complete({ reason: reason });
                },
                
                // Calls into arbitrary app code
                _fireEvent: function (eventName, options) {
                    options = options || {};
                    var detail = options.detail || null;
                    var cancelable = !!options.cancelable;
                    
                    var eventObject = _Global.document.createEvent("CustomEvent");
                    eventObject.initCustomEvent(eventName, true, cancelable, detail);
                    return Promise.wrap(this._dom.root.dispatchEvent(eventObject));
                },
                
                // Calls into arbitrary app code
                _fireBeforeHide: function (reason) {
                    return this._fireEvent(EventNames.beforeHide, {
                        detail: { reason: reason },
                        cancelable: true
                    });
                },
                
                // Calls into arbitrary app code
                _fireAfterHide: function (reason) {
                    return this._fireEvent(EventNames.afterHide, {
                        detail: { reason: reason }
                    });
                },
                
                _playEntranceAnimation: function () {
                    return cancelablePromise(_Animations.fadeIn(this._dom.root));
                },
                
                _playExitAnimation: function () {
                    return cancelablePromise(_Animations.fadeOut(this._dom.root));
                },

                _addInputPaneListeners: function () {
                    if (_WinRT.Windows.UI.ViewManagement.InputPane) {
                        var inputPane = _WinRT.Windows.UI.ViewManagement.InputPane.getForCurrentView();
                        inputPane.addEventListener("showing", this._onInputPaneShownBound);
                        inputPane.addEventListener("hiding", this._onInputPaneHiddenBound);
                    }
                },

                _removeInputPaneListeners: function () {
                    if (_WinRT.Windows.UI.ViewManagement.InputPane) {
                        var inputPane = _WinRT.Windows.UI.ViewManagement.InputPane.getForCurrentView();
                        inputPane.removeEventListener("showing", this._onInputPaneShownBound);
                        inputPane.removeEventListener("hiding", this._onInputPaneHiddenBound);
                    }
                },

                _renderForInputPane: function (inputPaneHeight) {
                    this._clearInputPaneRendering();

                    var dialog = this._dom.body;
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

                _clearInputPaneRendering: function () {
                    if (this._resizedForInputPane) {
                        if (this._dom.title.parentNode !== this._dom.body) {
                            // Make sure the title isn't in the scroller
                            this._dom.body.insertBefore(this._dom.title, this._dom.scroller);
                        }
            
                        var style = this._dom.body.style;
                        this._dom.root.style.display = "";
                        style.height = "";
                        style.position = "";
                        style.left = "";
                        style.top = "";
                        style.minHeight = "";
                        this._resizedForInputPane = false;
                    }
                }
            }, {
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
