// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Core/_ErrorFromName',
    '../../Core/_Events',
    '../../Core/_Log',
    '../../Core/_Resources',
    '../../Core/_WriteProfilerMark',
    '../../Animations',
    '../../Animations/_TransitionAnimation',
    '../../BindingList',
    '../../ControlProcessor',
    '../../Navigation',
    '../../Promise',
    '../../Scheduler',
    '../../Utilities/_Control',
    '../../Utilities/_ElementUtilities',
    '../../Utilities/_KeyboardBehavior',
    '../../Utilities/_UI',
    '../AppBar/_Constants',
    '../Repeater',
    './_Command'
], function NavBarContainerInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Events, _Log, _Resources, _WriteProfilerMark, Animations, _TransitionAnimation, BindingList, ControlProcessor, Navigation, Promise, Scheduler, _Control, _ElementUtilities, _KeyboardBehavior, _UI, _Constants, Repeater, _Command) {
    "use strict";

    function nobodyHasFocus() {
        return _Global.document.activeElement === null || _Global.document.activeElement === _Global.document.body;
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.NavBarContainer">
        /// Contains a group of NavBarCommand objects in a NavBar.
        /// </summary>
        /// <compatibleWith platform="Windows" minVersion="8.1"/>
        /// </field>
        /// <icon src="ui_winjs.ui.navbarcontainer.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.navbarcontainer.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.NavBarContainer">
        /// <div data-win-control="WinJS.UI.NavBarCommand" data-win-options="{location:'/pages/home/home.html',label:'Home',icon:WinJS.UI.AppBarIcon.home}"></div>
        /// </div>]]></htmlSnippet>
        /// <event name="invoked" locid="WinJS.UI.NavBarContainer_e:invoked">Raised when a NavBarCommand is invoked.</event>
        /// <event name="splittoggle" locid="WinJS.UI.NavBarContainer_e:splittoggle">Raised when the split button on a NavBarCommand is toggled.</event>
        /// <part name="navbarcontainer" class="win-navbarcontainer" locid="WinJS.UI.NavBarContainer_part:navbarcontainer">Styles the entire NavBarContainer control.</part>
        /// <part name="pageindicators" class="win-navbarcontainer-pageindicator-box" locid="WinJS.UI.NavBarContainer_part:pageindicators">
        /// Styles the page indication for the NavBarContainer.
        /// </part>
        /// <part name="indicator" class="win-navbarcontainer-pagination-indicator" locid="WinJS.UI.NavBarContainer_part:indicator">Styles the page indication for each page.</part>
        /// <part name="currentindicator" class="win-navbarcontainer-pagination-indicator-current" locid="WinJS.UI.NavBarContainer_part:currentindicator">
        /// Styles the indication of the current page.
        /// </part>
        /// <part name="items" class="win-navbarcontainer-surface" locid="WinJS.UI.NavBarContainer_part:items">Styles the area that contains items for the NavBarContainer.</part>
        /// <part name="navigationArrow" class="win-navbarcontainer-navarrow" locid="WinJS.UI.NavBarContainer_part:navigationArrow">Styles left and right navigation arrows.</part>
        /// <part name="leftNavigationArrow" class="win-navbarcontainer-navleft" locid="WinJS.UI.NavBarContainer_part:leftNavigationArrow">Styles the left navigation arrow.</part>
        /// <part name="rightNavigationArrow" class="win-navbarcontainer-navright" locid="WinJS.UI.NavBarContainer_part:rightNavigationArrow">Styles the right navigation arrow.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        NavBarContainer: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            var buttonFadeDelay = 3000;
            var PT_TOUCH = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_TOUCH || "touch";
            var MS_MANIPULATION_STATE_STOPPED = 0;

            var createEvent = _Events._createEventProperty;
            var eventNames = {
                invoked: "invoked",
                splittoggle: "splittoggle"
            };

            var strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get navBarContainerViewportAriaLabel() { return _Resources._getWinJSString("ui/navBarContainerViewportAriaLabel").value; }
            };

            var NavBarContainer = _Base.Class.define(function NavBarContainer_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.NavBarContainer.NavBarContainer">
                /// <summary locid="WinJS.UI.NavBarContainer.constructor">
                /// Creates a new NavBarContainer.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.NavBarContainer.constructor_p:element">
                /// The DOM element that will host the NavBarContainer control.
                /// </param>
                /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.NavBarContainer.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// Event names must begin with "on".
                /// </param>
                /// <returns type="WinJS.UI.NavBarContainer" locid="WinJS.UI.NavBarContainer.constructor_returnValue">
                /// The new NavBarContainer.
                /// </returns>
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </signature>

                element = element || _Global.document.createElement("DIV");
                this._id = element.id || _ElementUtilities._uniqueID(element);
                this._writeProfilerMark("constructor,StartTM");

                options = options || {};

                if (element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.NavBarContainer.DuplicateConstruction", strings.duplicateConstruction);
                }

                // Attaching JS control to DOM element
                element.winControl = this;
                this._element = element;
                _ElementUtilities.addClass(this.element, NavBarContainer._ClassName.navbarcontainer);
                _ElementUtilities.addClass(this.element, "win-disposable");
                if (!element.getAttribute("tabIndex")) {
                    element.tabIndex = -1;
                }

                this._focusCurrentItemPassivelyBound = this._focusCurrentItemPassively.bind(this);
                this._closeSplitAndResetBound = this._closeSplitAndReset.bind(this);
                this._currentManipulationState = MS_MANIPULATION_STATE_STOPPED;

                this._panningDisabled = !_ElementUtilities._supportsSnapPoints;
                this._fixedSize = false;
                this._maxRows = 1;
                this._sizes = {};

                this._setupTree();

                this._duringConstructor = true;

                this._dataChangingBound = this._dataChanging.bind(this);
                this._dataChangedBound = this._dataChanged.bind(this);

                Navigation.addEventListener('navigated', this._closeSplitAndResetBound);

                // Don't use set options for the properties so we can control the ordering to avoid rendering multiple times.
                this.layout = options.layout || _UI.Orientation.horizontal;
                if (options.maxRows) {
                    this.maxRows = options.maxRows;
                }
                if (options.template) {
                    this.template = options.template;
                }
                if (options.data) {
                    this.data = options.data;
                }
                if (options.fixedSize) {
                    this.fixedSize = options.fixedSize;
                }

                // Events only
                _Control._setOptions(this, options, true);

                this._duringConstructor = false;

                if (options.currentIndex) {
                    this.currentIndex = options.currentIndex;
                }

                this._updatePageUI();

                Scheduler.schedule(function NavBarContainer_async_initialize() {
                    this._updateAppBarReference();
                }, Scheduler.Priority.normal, this, "WinJS.UI.NavBarContainer_async_initialize");

                this._writeProfilerMark("constructor,StopTM");
            }, {
                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.NavBarContainer.element" helpKeyword="WinJS.UI.NavBarContainer.element">
                /// Gets the DOM element that hosts the NavBarContainer.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="Object" locid="WinJS.UI.NavBarContainer.template" helpKeyword="WinJS.UI.NavBarContainer.template" potentialValueSelector="[data-win-control='WinJS.Binding.Template']">
                /// Gets or sets a Template or custom rendering function that defines the HTML of each item within the NavBarContainer.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                template: {
                    get: function () {
                        return this._template;
                    },
                    set: function (value) {
                        this._template = value;
                        if (this._repeater) {
                            var hadFocus = this.element.contains(_Global.document.activeElement);

                            if (!this._duringConstructor) {
                                this._closeSplitIfOpen();
                            }

                            // the repeater's template is wired up to this._render() so just resetting it will rebuild the tree.
                            this._repeater.template = this._repeater.template;

                            if (!this._duringConstructor) {
                                this._measured = false;
                                this._sizes.itemMeasured = false;
                                this._reset();
                                if (hadFocus) {
                                    this._keyboardBehavior._focus(0);
                                }
                            }
                        }
                    }
                },

                _render: function NavBarContainer_render(item) {
                    var navbarCommandEl = _Global.document.createElement('div');

                    var template = this._template;
                    if (template) {
                        if (template.render) {
                            template.render(item, navbarCommandEl);
                        } else if (template.winControl && template.winControl.render) {
                            template.winControl.render(item, navbarCommandEl);
                        } else {
                            navbarCommandEl.appendChild(template(item));
                        }
                    }

                    // Create the NavBarCommand after calling render so that the reparenting in navbarCommand works.
                    var navbarCommand = new _Command.NavBarCommand(navbarCommandEl, item);
                    return navbarCommand._element;
                },

                /// <field type="WinJS.Binding.List" locid="WinJS.UI.NavBarContainer.data" helpKeyword="WinJS.UI.NavBarContainer.data">
                /// Gets or sets the WinJS.Binding.List that provides the NavBarContainer with items to display.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                data: {
                    get: function () {
                        return this._repeater && this._repeater.data;
                    },
                    set: function (value) {
                        if (!value) {
                            value = new BindingList.List();
                        }

                        if (!this._duringConstructor) {
                            this._closeSplitIfOpen();
                        }

                        this._removeDataChangingEvents();
                        this._removeDataChangedEvents();

                        var hadFocus = this.element.contains(_Global.document.activeElement);

                        if (!this._repeater) {
                            this._surfaceEl.innerHTML = "";
                            this._repeater = new Repeater.Repeater(this._surfaceEl, {
                                template: this._render.bind(this)
                            });
                        }

                        this._addDataChangingEvents(value);
                        this._repeater.data = value;
                        this._addDataChangedEvents(value);

                        if (!this._duringConstructor) {
                            this._measured = false;
                            this._sizes.itemMeasured = false;
                            this._reset();
                            if (hadFocus) {
                                this._keyboardBehavior._focus(0);
                            }
                        }
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.NavBarContainer.maxRows" helpKeyword="WinJS.UI.NavBarContainer.maxRows">
                /// Gets or sets the number of rows allowed to be used before items are placed on additional pages.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                maxRows: {
                    get: function () {
                        return this._maxRows;
                    },
                    set: function (value) {
                        value = (+value === value) ? value : 1;
                        this._maxRows = Math.max(1, value);

                        if (!this._duringConstructor) {
                            this._closeSplitIfOpen();

                            this._measured = false;
                            this._reset();
                        }
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.Orientation" locid="WinJS.UI.NavBarContainer.layout" helpKeyword="WinJS.UI.NavBarContainer.layout">
                /// Gets or sets a value that specifies whether the NavBarContainer has a horizontal or vertical layout. The default is "horizontal".
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                layout: {
                    get: function () {
                        return this._layout;
                    },
                    set: function (value) {
                        if (value === _UI.Orientation.vertical) {
                            this._layout = _UI.Orientation.vertical;
                            _ElementUtilities.removeClass(this.element, NavBarContainer._ClassName.horizontal);
                            _ElementUtilities.addClass(this.element, NavBarContainer._ClassName.vertical);
                        } else {
                            this._layout = _UI.Orientation.horizontal;
                            _ElementUtilities.removeClass(this.element, NavBarContainer._ClassName.vertical);
                            _ElementUtilities.addClass(this.element, NavBarContainer._ClassName.horizontal);
                        }

                        this._viewportEl.style.msScrollSnapType = "";
                        this._zooming = false;

                        if (!this._duringConstructor) {
                            this._measured = false;
                            this._sizes.itemMeasured = false;
                            this._ensureVisible(this._keyboardBehavior.currentIndex, true);
                            this._updatePageUI();
                            this._closeSplitIfOpen();
                        }
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.NavBarContainer.currentIndex" hidden="true" helpKeyword="WinJS.UI.NavBarContainer.currentIndex">
                /// Gets or sets the index of the current NavBarCommand.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                currentIndex: {
                    get: function () {
                        return this._keyboardBehavior.currentIndex;
                    },
                    set: function (value) {
                        if (value === +value) {
                            var hadFocus = this.element.contains(_Global.document.activeElement);

                            this._keyboardBehavior.currentIndex = value;

                            this._ensureVisible(this._keyboardBehavior.currentIndex, true);

                            if (hadFocus) {
                                this._keyboardBehavior._focus();
                            }
                        }
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.NavBarContainer.fixedSize" helpKeyword="WinJS.UI.NavBarContainer.fixedSize">
                /// Gets or sets a value that specifies whether child NavBarCommand  objects should be a fixed width when there are multiple pages. A value of true indicates
                /// that the NavBarCommand objects use a fixed width; a value of false indicates that they use a dynamic width.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                fixedSize: {
                    get: function () {
                        return this._fixedSize;
                    },
                    set: function (value) {
                        this._fixedSize = !!value;

                        if (!this._duringConstructor) {
                            this._closeSplitIfOpen();

                            if (!this._measured) {
                                this._measure();
                            } else if (this._surfaceEl.children.length > 0) {
                                this._updateGridStyles();
                            }
                        }
                    }
                },

                /// <field type="Function" locid="WinJS.UI.NavBarContainer.oninvoked" helpKeyword="WinJS.UI.NavBarContainer.oninvoked">
                /// Raised when a NavBarCommand has been invoked.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                oninvoked: createEvent(eventNames.invoked),

                /// <field type="Function" locid="WinJS.UI.NavBarContainer.onsplittoggle" helpKeyword="WinJS.UI.NavBarContainer.onsplittoggle">
                /// Raised when the split button on a NavBarCommand is toggled.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                onsplittoggle: createEvent(eventNames.splittoggle),

                forceLayout: function NavBarContainer_forceLayout() {
                    /// <signature helpKeyword="WinJS.UI.NavBarContainer.forceLayout">
                    /// <summary locid="WinJS.UI.NavBarContainer.forceLayout">
                    /// Forces the NavBarContainer to update scroll positions and if the NavBar has changed size, it will also re-measure.
                    /// Use this function when making the NavBarContainer visible again after you set its style.display property to "none".
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </signature>
                    this._resizeHandler();
                    if (this._measured) {
                        this._scrollPosition = _ElementUtilities.getScrollPosition(this._viewportEl)[(this.layout === _UI.Orientation.horizontal ? "scrollLeft" : "scrollTop")];
                    }

                    this._duringForceLayout = true;
                    this._ensureVisible(this._keyboardBehavior.currentIndex, true);
                    this._updatePageUI();
                    this._duringForceLayout = false;
                },

                _updateAppBarReference: function NavBarContainer_updateAppBarReference() {
                    if (!this._appBarEl || !this._appBarEl.contains(this.element)) {
                        if (this._appBarEl) {
                            this._appBarEl.removeEventListener('beforeshow', this._closeSplitAndResetBound);
                            this._appBarEl.removeEventListener('beforeshow', this._resizeImplBound);
                            this._appBarEl.removeEventListener('aftershow', this._focusCurrentItemPassivelyBound);
                        }

                        var appBarEl = this.element.parentNode;
                        while (appBarEl && !_ElementUtilities.hasClass(appBarEl, _Constants.appBarClass)) {
                            appBarEl = appBarEl.parentNode;
                        }
                        this._appBarEl = appBarEl;

                        if (this._appBarEl) {
                            this._appBarEl.addEventListener('beforeshow', this._closeSplitAndResetBound);
                            this._appBarEl.addEventListener('aftershow', this._focusCurrentItemPassivelyBound);
                        }
                    }
                },

                _closeSplitAndReset: function NavBarContainer_closeSplitAndReset() {
                    this._closeSplitIfOpen();
                    this._reset();
                },

                _dataChanging: function NavBarContainer_dataChanging(ev) {
                    // Store the element that was active so that we can detect
                    // if the focus went away because of the data change.
                    this._elementHadFocus = _Global.document.activeElement;

                    if (this._currentSplitNavItem && this._currentSplitNavItem.splitOpened) {
                        if (ev.type === "itemremoved") {
                            if (this._surfaceEl.children[ev.detail.index].winControl === this._currentSplitNavItem) {
                                this._closeSplitIfOpen();
                            }
                        } else if (ev.type === "itemchanged") {
                            if (this._surfaceEl.children[ev.detail.index].winControl === this._currentSplitNavItem) {
                                this._closeSplitIfOpen();
                            }
                        } else if (ev.type === "itemmoved") {
                            if (this._surfaceEl.children[ev.detail.oldIndex].winControl === this._currentSplitNavItem) {
                                this._closeSplitIfOpen();
                            }
                        } else if (ev.type === "reload") {
                            this._closeSplitIfOpen();
                        }
                    }
                },

                _dataChanged: function NavBarContainer_dataChanged(ev) {
                    this._measured = false;

                    if (ev.type === "itemremoved") {
                        if (ev.detail.index < this._keyboardBehavior.currentIndex) {
                            this._keyboardBehavior.currentIndex--;
                        } else if (ev.detail.index === this._keyboardBehavior.currentIndex) {
                            // This clamps if the item being removed was the last item in the list
                            this._keyboardBehavior.currentIndex = this._keyboardBehavior.currentIndex;
                            if (nobodyHasFocus() && this._elementHadFocus) {
                                this._keyboardBehavior._focus();
                            }
                        }
                    } else if (ev.type === "itemchanged") {
                        if (ev.detail.index === this._keyboardBehavior.currentIndex) {
                            if (nobodyHasFocus() && this._elementHadFocus) {
                                this._keyboardBehavior._focus();
                            }
                        }
                    } else if (ev.type === "iteminserted") {
                        if (ev.detail.index <= this._keyboardBehavior.currentIndex) {
                            this._keyboardBehavior.currentIndex++;
                        }
                    } else if (ev.type === "itemmoved") {
                        if (ev.detail.oldIndex === this._keyboardBehavior.currentIndex) {
                            this._keyboardBehavior.currentIndex = ev.detail.newIndex;
                            if (nobodyHasFocus() && this._elementHadFocus) {
                                this._keyboardBehavior._focus();
                            }
                        }
                    } else if (ev.type === "reload") {
                        this._keyboardBehavior.currentIndex = 0;
                        if (nobodyHasFocus() && this._elementHadFocus) {
                            this._keyboardBehavior._focus();
                        }
                    }

                    this._ensureVisible(this._keyboardBehavior.currentIndex, true);
                    this._updatePageUI();
                },

                _focusCurrentItemPassively: function NavBarContainer_focusCurrentItemPassively() {
                    if (this.element.contains(_Global.document.activeElement)) {
                        this._keyboardBehavior._focus();
                    }
                },

                _reset: function NavBarContainer_reset() {
                    this._keyboardBehavior.currentIndex = 0;

                    if (this.element.contains(_Global.document.activeElement)) {
                        this._keyboardBehavior._focus(0);
                    }

                    this._viewportEl.style.msScrollSnapType = "";
                    this._zooming = false;

                    this._ensureVisible(0, true);
                    this._updatePageUI();
                },

                _removeDataChangedEvents: function NavBarContainer_removeDataChangedEvents() {
                    if (this._repeater) {
                        this._repeater.data.removeEventListener("itemchanged", this._dataChangedBound);
                        this._repeater.data.removeEventListener("iteminserted", this._dataChangedBound);
                        this._repeater.data.removeEventListener("itemmoved", this._dataChangedBound);
                        this._repeater.data.removeEventListener("itemremoved", this._dataChangedBound);
                        this._repeater.data.removeEventListener("reload", this._dataChangedBound);
                    }
                },

                _addDataChangedEvents: function NavBarContainer_addDataChangedEvents() {
                    if (this._repeater) {
                        this._repeater.data.addEventListener("itemchanged", this._dataChangedBound);
                        this._repeater.data.addEventListener("iteminserted", this._dataChangedBound);
                        this._repeater.data.addEventListener("itemmoved", this._dataChangedBound);
                        this._repeater.data.addEventListener("itemremoved", this._dataChangedBound);
                        this._repeater.data.addEventListener("reload", this._dataChangedBound);
                    }
                },

                _removeDataChangingEvents: function NavBarContainer_removeDataChangingEvents() {
                    if (this._repeater) {
                        this._repeater.data.removeEventListener("itemchanged", this._dataChangingBound);
                        this._repeater.data.removeEventListener("iteminserted", this._dataChangingBound);
                        this._repeater.data.removeEventListener("itemmoved", this._dataChangingBound);
                        this._repeater.data.removeEventListener("itemremoved", this._dataChangingBound);
                        this._repeater.data.removeEventListener("reload", this._dataChangingBound);
                    }
                },

                _addDataChangingEvents: function NavBarContainer_addDataChangingEvents(bindingList) {
                    bindingList.addEventListener("itemchanged", this._dataChangingBound);
                    bindingList.addEventListener("iteminserted", this._dataChangingBound);
                    bindingList.addEventListener("itemmoved", this._dataChangingBound);
                    bindingList.addEventListener("itemremoved", this._dataChangingBound);
                    bindingList.addEventListener("reload", this._dataChangingBound);
                },

                _mouseleave: function NavBarContainer_mouseleave() {
                    if (this._mouseInViewport) {
                        this._mouseInViewport = false;
                        this._updateArrows();
                    }
                },

                _MSPointerDown: function NavBarContainer_MSPointerDown(ev) {
                    if (ev.pointerType === PT_TOUCH) {
                        if (this._mouseInViewport) {
                            this._mouseInViewport = false;
                            this._updateArrows();
                        }
                    }
                },

                _MSPointerMove: function NavBarContainer_MSPointerMove(ev) {
                    if (ev.pointerType !== PT_TOUCH) {
                        if (!this._mouseInViewport) {
                            this._mouseInViewport = true;
                            this._updateArrows();
                        }
                    }
                },

                _setupTree: function NavBarContainer_setupTree() {
                    this._animateNextPreviousButtons = Promise.wrap();
                    this._element.addEventListener('mouseleave', this._mouseleave.bind(this));
                    _ElementUtilities._addEventListener(this._element, 'pointerdown', this._MSPointerDown.bind(this));
                    _ElementUtilities._addEventListener(this._element, 'pointermove', this._MSPointerMove.bind(this));
                    _ElementUtilities._addEventListener(this._element, "focusin", this._focusHandler.bind(this), false);

                    this._pageindicatorsEl = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._pageindicatorsEl, NavBarContainer._ClassName.pageindicators);
                    this._element.appendChild(this._pageindicatorsEl);

                    this._ariaStartMarker = _Global.document.createElement("div");
                    this._element.appendChild(this._ariaStartMarker);

                    this._viewportEl = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._viewportEl, NavBarContainer._ClassName.viewport);
                    this._element.appendChild(this._viewportEl);
                    this._viewportEl.setAttribute("role", "group");
                    this._viewportEl.setAttribute("aria-label", strings.navBarContainerViewportAriaLabel);

                    this._boundResizeHandler = this._resizeHandler.bind(this);
                    _ElementUtilities._resizeNotifier.subscribe(this._element, this._boundResizeHandler);
                    this._viewportEl.addEventListener("mselementresize", this._resizeHandler.bind(this));
                    this._viewportEl.addEventListener("scroll", this._scrollHandler.bind(this));
                    this._viewportEl.addEventListener("MSManipulationStateChanged", this._MSManipulationStateChangedHandler.bind(this));

                    this._ariaEndMarker = _Global.document.createElement("div");
                    this._element.appendChild(this._ariaEndMarker);

                    this._surfaceEl = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._surfaceEl, NavBarContainer._ClassName.surface);
                    this._viewportEl.appendChild(this._surfaceEl);

                    this._surfaceEl.addEventListener("_invoked", this._navbarCommandInvokedHandler.bind(this));
                    this._surfaceEl.addEventListener("_splittoggle", this._navbarCommandSplitToggleHandler.bind(this));
                    _ElementUtilities._addEventListener(this._surfaceEl, "focusin", this._itemsFocusHandler.bind(this), false);
                    this._surfaceEl.addEventListener("keydown", this._keyDownHandler.bind(this));

                    // Reparent NavBarCommands which were in declarative markup
                    var tempEl = this.element.firstElementChild;
                    while (tempEl !== this._pageindicatorsEl) {
                        this._surfaceEl.appendChild(tempEl);
                        ControlProcessor.process(tempEl);
                        tempEl = this.element.firstElementChild;
                    }

                    this._leftArrowEl = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._leftArrowEl, NavBarContainer._ClassName.navleftarrow);
                    _ElementUtilities.addClass(this._leftArrowEl, NavBarContainer._ClassName.navarrow);
                    this._element.appendChild(this._leftArrowEl);
                    this._leftArrowEl.addEventListener('click', this._goLeft.bind(this));
                    this._leftArrowEl.style.opacity = 0;
                    this._leftArrowEl.style.visibility = 'hidden';
                    this._leftArrowFadeOut = Promise.wrap();

                    this._rightArrowEl = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._rightArrowEl, NavBarContainer._ClassName.navrightarrow);
                    _ElementUtilities.addClass(this._rightArrowEl, NavBarContainer._ClassName.navarrow);
                    this._element.appendChild(this._rightArrowEl);
                    this._rightArrowEl.addEventListener('click', this._goRight.bind(this));
                    this._rightArrowEl.style.opacity = 0;
                    this._rightArrowEl.style.visibility = 'hidden';
                    this._rightArrowFadeOut = Promise.wrap();

                    this._keyboardBehavior = new _KeyboardBehavior._KeyboardBehavior(this._surfaceEl, {
                        scroller: this._viewportEl
                    });
                    this._winKeyboard = new _KeyboardBehavior._WinKeyboard(this._surfaceEl);
                },

                _goRight: function NavBarContainer_goRight() {
                    if (this._sizes.rtl) {
                        this._goPrev();
                    } else {
                        this._goNext();
                    }
                },

                _goLeft: function NavBarContainer_goLeft() {
                    if (this._sizes.rtl) {
                        this._goNext();
                    } else {
                        this._goPrev();
                    }
                },

                _goNext: function NavBarContainer_goNext() {
                    this._measure();
                    var itemsPerPage = this._sizes.rowsPerPage * this._sizes.columnsPerPage;
                    var targetPage = Math.min(Math.floor(this._keyboardBehavior.currentIndex / itemsPerPage) + 1, this._sizes.pages - 1);
                    this._keyboardBehavior.currentIndex = Math.min(itemsPerPage * targetPage, this._surfaceEl.children.length);
                    this._keyboardBehavior._focus();
                },

                _goPrev: function NavBarContainer_goPrev() {
                    this._measure();
                    var itemsPerPage = this._sizes.rowsPerPage * this._sizes.columnsPerPage;
                    var targetPage = Math.max(0, Math.floor(this._keyboardBehavior.currentIndex / itemsPerPage) - 1);
                    this._keyboardBehavior.currentIndex = Math.max(itemsPerPage * targetPage, 0);
                    this._keyboardBehavior._focus();
                },

                _currentPage: {
                    get: function () {
                        if (this.layout === _UI.Orientation.horizontal) {
                            this._measure();
                            if (this._sizes.viewportOffsetWidth > 0) {
                                return Math.min(this._sizes.pages - 1, Math.round(this._scrollPosition / this._sizes.viewportOffsetWidth));
                            }
                        }
                        return 0;
                    }
                },

                _resizeHandler: function NavBarContainer_resizeHandler() {
                    if (this._disposed) { return; }
                    if (!this._measured) { return; }
                    var viewportResized = this.layout === _UI.Orientation.horizontal
                            ? this._sizes.viewportOffsetWidth !== parseFloat(_Global.getComputedStyle(this._viewportEl).width)
                            : this._sizes.viewportOffsetHeight !== parseFloat(_Global.getComputedStyle(this._viewportEl).height);
                    if (!viewportResized) { return; }

                    this._measured = false;

                    if (!this._pendingResize) {
                        this._pendingResize = true;

                        this._resizeImplBound = this._resizeImplBound || this._resizeImpl.bind(this);

                        this._updateAppBarReference();

                        if (this._appBarEl && this._appBarEl.winControl && this._appBarEl.winControl.hidden) {
                            // Do resize lazily.
                            Scheduler.schedule(this._resizeImplBound, Scheduler.Priority.idle, null, "WinJS.UI.NavBarContainer._resizeImpl");
                            this._appBarEl.addEventListener('beforeshow', this._resizeImplBound);
                        } else {
                            // Do resize now
                            this._resizeImpl();
                        }
                    }
                },

                _resizeImpl: function NavBarContainer_resizeImpl() {
                    if (!this._disposed && this._pendingResize) {
                        this._pendingResize = false;
                        if (this._appBarEl) {
                            this._appBarEl.removeEventListener('beforeshow', this._resizeImplBound);
                        }

                        this._keyboardBehavior.currentIndex = 0;
                        if (this.element.contains(_Global.document.activeElement)) {
                            this._keyboardBehavior._focus(this._keyboardBehavior.currentIndex);
                        }
                        this._closeSplitIfOpen();
                        this._ensureVisible(this._keyboardBehavior.currentIndex, true);
                        this._updatePageUI();
                    }
                },

                _keyDownHandler: function NavBarContainer_keyDownHandler(ev) {
                    var keyCode = ev.keyCode;
                    if (!ev.altKey && (keyCode === Key.pageUp || keyCode === Key.pageDown)) {
                        var srcElement = ev.target;
                        if (_ElementUtilities._matchesSelector(srcElement, ".win-interactive, .win-interactive *")) {
                            return;
                        }

                        var index = this._keyboardBehavior.currentIndex;
                        this._measure();

                        var sizes = this._sizes;
                        var page = Math.floor(index / (sizes.columnsPerPage * sizes.rowsPerPage));

                        var scrollPositionTarget = null;
                        if (keyCode === Key.pageUp) {
                            if (this.layout === _UI.Orientation.horizontal) {
                                var indexOfFirstItemOnPage = page * sizes.columnsPerPage * sizes.rowsPerPage;
                                if (index === indexOfFirstItemOnPage && this._surfaceEl.children[index].winControl._buttonEl === _Global.document.activeElement) {
                                    // First item on page so go back 1 page.
                                    index = index - sizes.columnsPerPage * sizes.rowsPerPage;
                                } else {
                                    // Not first item on page so go to the first item on page.
                                    index = indexOfFirstItemOnPage;
                                }
                            } else {
                                var currentItem = this._surfaceEl.children[index];
                                var top = currentItem.offsetTop;
                                var bottom = top + currentItem.offsetHeight;
                                var scrollPosition = this._zooming ? this._zoomPosition : this._scrollPosition;

                                if (top >= scrollPosition && bottom < scrollPosition + sizes.viewportOffsetHeight) {
                                    // current item is fully on screen.
                                    while (index > 0 &&
                                        this._surfaceEl.children[index - 1].offsetTop > scrollPosition) {
                                        index--;
                                    }
                                }

                                if (this._keyboardBehavior.currentIndex === index) {
                                    var scrollPositionForOnePageAboveItem = bottom - sizes.viewportOffsetHeight;
                                    index = Math.max(0, index - 1);
                                    while (index > 0 &&
                                        this._surfaceEl.children[index - 1].offsetTop > scrollPositionForOnePageAboveItem) {
                                        index--;
                                    }
                                    if (index > 0) {
                                        scrollPositionTarget = this._surfaceEl.children[index].offsetTop - this._sizes.itemMarginTop;
                                    } else {
                                        scrollPositionTarget = 0;
                                    }
                                }
                            }

                            index = Math.max(index, 0);
                            this._keyboardBehavior.currentIndex = index;

                            var element = this._surfaceEl.children[index].winControl._buttonEl;

                            if (scrollPositionTarget !== null) {
                                this._scrollTo(scrollPositionTarget);
                            }

                            _ElementUtilities._setActive(element, this._viewportEl);
                        } else {
                            if (this.layout === _UI.Orientation.horizontal) {
                                var indexOfLastItemOnPage = (page + 1) * sizes.columnsPerPage * sizes.rowsPerPage - 1;

                                if (index === indexOfLastItemOnPage) {
                                    // Last item on page so go forward 1 page.
                                    index = index + sizes.columnsPerPage * sizes.rowsPerPage;
                                } else {
                                    // Not Last item on page so go to last item on page.
                                    index = indexOfLastItemOnPage;
                                }
                            } else {
                                var currentItem = this._surfaceEl.children[this._keyboardBehavior.currentIndex];
                                var top = currentItem.offsetTop;
                                var bottom = top + currentItem.offsetHeight;
                                var scrollPosition = this._zooming ? this._zoomPosition : this._scrollPosition;

                                if (top >= scrollPosition && bottom < scrollPosition + sizes.viewportOffsetHeight) {
                                    // current item is fully on screen.
                                    while (index < this._surfaceEl.children.length - 1 &&
                                        this._surfaceEl.children[index + 1].offsetTop + this._surfaceEl.children[index + 1].offsetHeight < scrollPosition + sizes.viewportOffsetHeight) {
                                        index++;
                                    }
                                }

                                if (index === this._keyboardBehavior.currentIndex) {
                                    var scrollPositionForOnePageBelowItem = top + sizes.viewportOffsetHeight;
                                    index = Math.min(this._surfaceEl.children.length - 1, index + 1);
                                    while (index < this._surfaceEl.children.length - 1 &&
                                        this._surfaceEl.children[index + 1].offsetTop + this._surfaceEl.children[index + 1].offsetHeight < scrollPositionForOnePageBelowItem) {
                                        index++;
                                    }

                                    if (index < this._surfaceEl.children.length - 1) {
                                        scrollPositionTarget = this._surfaceEl.children[index + 1].offsetTop - this._sizes.viewportOffsetHeight;
                                    } else {
                                        scrollPositionTarget = this._scrollLength - this._sizes.viewportOffsetHeight;
                                    }
                                }
                            }

                            index = Math.min(index, this._surfaceEl.children.length - 1);
                            this._keyboardBehavior.currentIndex = index;

                            var element = this._surfaceEl.children[index].winControl._buttonEl;

                            if (scrollPositionTarget !== null) {
                                this._scrollTo(scrollPositionTarget);
                            }

                            try {
                                _ElementUtilities._setActive(element, this._viewportEl);
                            } catch (e) {
                            }
                        }
                    }
                },

                _focusHandler: function NavBarContainer_focusHandler(ev) {
                    var srcElement = ev.target;
                    if (!this._surfaceEl.contains(srcElement)) {
                        // Forward focus from NavBarContainer, viewport or surface to the currentIndex.
                        this._skipEnsureVisible = true;
                        this._keyboardBehavior._focus(this._keyboardBehavior.currentIndex);
                    }
                },

                _itemsFocusHandler: function NavBarContainer_itemsFocusHandler(ev) {
                    // Find the item which is being focused and scroll it to view.
                    var srcElement = ev.target;
                    if (srcElement === this._surfaceEl) {
                        return;
                    }

                    while (srcElement.parentNode !== this._surfaceEl) {
                        srcElement = srcElement.parentNode;
                    }

                    var index = -1;
                    while (srcElement) {
                        index++;
                        srcElement = srcElement.previousSibling;
                    }

                    if (this._skipEnsureVisible) {
                        this._skipEnsureVisible = false;
                    } else {
                        this._ensureVisible(index);
                    }
                },

                _ensureVisible: function NavBarContainer_ensureVisible(index, withoutAnimation) {
                    this._measure();

                    if (this.layout === _UI.Orientation.horizontal) {
                        var page = Math.floor(index / (this._sizes.rowsPerPage * this._sizes.columnsPerPage));
                        this._scrollTo(page * this._sizes.viewportOffsetWidth, withoutAnimation);
                    } else {
                        var element = this._surfaceEl.children[index];
                        var maxScrollPosition;
                        if (index > 0) {
                            maxScrollPosition = element.offsetTop - this._sizes.itemMarginTop;
                        } else {
                            maxScrollPosition = 0;
                        }
                        var minScrollPosition;
                        if (index < this._surfaceEl.children.length - 1) {
                            minScrollPosition = this._surfaceEl.children[index + 1].offsetTop - this._sizes.viewportOffsetHeight;
                        } else {
                            minScrollPosition = this._scrollLength - this._sizes.viewportOffsetHeight;
                        }

                        var newScrollPosition = this._zooming ? this._zoomPosition : this._scrollPosition;
                        newScrollPosition = Math.max(newScrollPosition, minScrollPosition);
                        newScrollPosition = Math.min(newScrollPosition, maxScrollPosition);
                        this._scrollTo(newScrollPosition, withoutAnimation);
                    }
                },

                _scrollTo: function NavBarContainer_scrollTo(targetScrollPosition, withoutAnimation) {
                    this._measure();
                    if (this.layout === _UI.Orientation.horizontal) {
                        targetScrollPosition = Math.max(0, Math.min(this._scrollLength - this._sizes.viewportOffsetWidth, targetScrollPosition));
                    } else {
                        targetScrollPosition = Math.max(0, Math.min(this._scrollLength - this._sizes.viewportOffsetHeight, targetScrollPosition));
                    }

                    if (withoutAnimation) {
                        if (Math.abs(this._scrollPosition - targetScrollPosition) > 1) {
                            this._zooming = false;

                            this._scrollPosition = targetScrollPosition;
                            this._updatePageUI();
                            if (!this._duringForceLayout) {
                                this._closeSplitIfOpen();
                            }

                            var newScrollPos = {};
                            newScrollPos[(this.layout === _UI.Orientation.horizontal ? "scrollLeft" : "scrollTop")] = targetScrollPosition;
                            _ElementUtilities.setScrollPosition(this._viewportEl, newScrollPos);
                        }
                    } else {
                        if ((!this._zooming && Math.abs(this._scrollPosition - targetScrollPosition) > 1) || (this._zooming && Math.abs(this._zoomPosition - targetScrollPosition) > 1)) {
                            this._zoomPosition = targetScrollPosition;

                            this._zooming = true;

                            if (this.layout === _UI.Orientation.horizontal) {
                                this._viewportEl.style.msScrollSnapType = "none";
                                _ElementUtilities._zoomTo(this._viewportEl, { contentX: targetScrollPosition, contentY: 0, viewportX: 0, viewportY: 0 });
                            } else {
                                _ElementUtilities._zoomTo(this._viewportEl, { contentX: 0, contentY: targetScrollPosition, viewportX: 0, viewportY: 0 });
                            }

                            this._closeSplitIfOpen();
                        }
                    }
                },

                _MSManipulationStateChangedHandler: function NavBarContainer_MSManipulationStateChangedHandler(e) {
                    this._currentManipulationState = e.currentState;

                    if (e.currentState === e.MS_MANIPULATION_STATE_ACTIVE) {
                        this._viewportEl.style.msScrollSnapType = "";
                        this._zooming = false;
                    }

                    _Global.clearTimeout(this._manipulationStateTimeoutId);
                    // The extra stop event is firing when an zoomTo is called during another zoomTo and
                    // also the first zoomTo after a resize.
                    if (e.currentState === e.MS_MANIPULATION_STATE_STOPPED) {
                        this._manipulationStateTimeoutId = _Global.setTimeout(function () {
                            this._viewportEl.style.msScrollSnapType = "";
                            this._zooming = false;
                            this._updateCurrentIndexIfPageChanged();
                        }.bind(this), 100);
                    }
                },

                _scrollHandler: function NavBarContainer_scrollHandler() {
                    if (this._disposed) { return; }

                    this._measured = false;
                    if (!this._checkingScroll) {
                        var that = this;
                        this._checkingScroll = _BaseUtils._requestAnimationFrame(function () {
                            if (that._disposed) { return; }
                            that._checkingScroll = null;

                            var newScrollPosition = _ElementUtilities.getScrollPosition(that._viewportEl)[(that.layout === _UI.Orientation.horizontal ? "scrollLeft" : "scrollTop")];
                            if (newScrollPosition !== that._scrollPosition) {
                                that._scrollPosition = newScrollPosition;
                                that._closeSplitIfOpen();
                            }
                            that._updatePageUI();

                            if (!that._zooming && that._currentManipulationState === MS_MANIPULATION_STATE_STOPPED) {
                                that._updateCurrentIndexIfPageChanged();
                            }
                        });
                    }
                },

                _updateCurrentIndexIfPageChanged: function NavBarContainer_updateCurrentIndexIfPageChanged() {
                    // If you change pages via pagination arrows, mouse wheel, or panning we need to update the current
                    // item to be the first item on the new page.
                    if (this.layout === _UI.Orientation.horizontal) {
                        this._measure();
                        var currentPage = this._currentPage;
                        var firstIndexOnPage = currentPage * this._sizes.rowsPerPage * this._sizes.columnsPerPage;
                        var lastIndexOnPage = (currentPage + 1) * this._sizes.rowsPerPage * this._sizes.columnsPerPage - 1;

                        if (this._keyboardBehavior.currentIndex < firstIndexOnPage || this._keyboardBehavior.currentIndex > lastIndexOnPage) {
                            // Page change occurred.
                            this._keyboardBehavior.currentIndex = firstIndexOnPage;

                            if (this.element.contains(_Global.document.activeElement)) {
                                this._keyboardBehavior._focus(this._keyboardBehavior.currentIndex);
                            }
                        }
                    }
                },

                _measure: function NavBarContainer_measure() {
                    if (!this._measured) {
                        this._resizeImpl();
                        this._writeProfilerMark("measure,StartTM");

                        var sizes = this._sizes;

                        sizes.rtl = _Global.getComputedStyle(this._element).direction === "rtl";

                        var itemCount = this._surfaceEl.children.length;
                        if (itemCount > 0) {
                            if (!this._sizes.itemMeasured) {
                                this._writeProfilerMark("measureItem,StartTM");

                                var elementToMeasure = this._surfaceEl.firstElementChild;
                                // Clear inline margins set by NavBarContainer before measuring.
                                elementToMeasure.style.margin = "";
                                elementToMeasure.style.width = "";
                                var elementComputedStyle = _Global.getComputedStyle(elementToMeasure);
                                sizes.itemOffsetWidth = parseFloat(_Global.getComputedStyle(elementToMeasure).width);
                                if (elementToMeasure.offsetWidth === 0) {
                                    sizes.itemOffsetWidth = 0;
                                }
                                sizes.itemMarginLeft = parseFloat(elementComputedStyle.marginLeft);
                                sizes.itemMarginRight = parseFloat(elementComputedStyle.marginRight);
                                sizes.itemWidth = sizes.itemOffsetWidth + sizes.itemMarginLeft + sizes.itemMarginRight;
                                sizes.itemOffsetHeight = parseFloat(_Global.getComputedStyle(elementToMeasure).height);
                                if (elementToMeasure.offsetHeight === 0) {
                                    sizes.itemOffsetHeight = 0;
                                }
                                sizes.itemMarginTop = parseFloat(elementComputedStyle.marginTop);
                                sizes.itemMarginBottom = parseFloat(elementComputedStyle.marginBottom);
                                sizes.itemHeight = sizes.itemOffsetHeight + sizes.itemMarginTop + sizes.itemMarginBottom;
                                if (sizes.itemOffsetWidth > 0 && sizes.itemOffsetHeight > 0) {
                                    sizes.itemMeasured = true;
                                }
                                this._writeProfilerMark("measureItem,StopTM");
                            }

                            sizes.viewportOffsetWidth = parseFloat(_Global.getComputedStyle(this._viewportEl).width);
                            if (this._viewportEl.offsetWidth === 0) {
                                sizes.viewportOffsetWidth = 0;
                            }
                            sizes.viewportOffsetHeight = parseFloat(_Global.getComputedStyle(this._viewportEl).height);
                            if (this._viewportEl.offsetHeight === 0) {
                                sizes.viewportOffsetHeight = 0;
                            }

                            if (sizes.viewportOffsetWidth === 0 || sizes.itemOffsetHeight === 0) {
                                this._measured = false;
                            } else {
                                this._measured = true;
                            }

                            if (this.layout === _UI.Orientation.horizontal) {
                                this._scrollPosition = _ElementUtilities.getScrollPosition(this._viewportEl).scrollLeft;

                                sizes.leadingEdge = this._leftArrowEl.offsetWidth + parseInt(_Global.getComputedStyle(this._leftArrowEl).marginLeft) + parseInt(_Global.getComputedStyle(this._leftArrowEl).marginRight);
                                var usableSpace = sizes.viewportOffsetWidth - sizes.leadingEdge * 2;
                                sizes.maxColumns = sizes.itemWidth ? Math.max(1, Math.floor(usableSpace / sizes.itemWidth)) : 1;
                                sizes.rowsPerPage = Math.min(this.maxRows, Math.ceil(itemCount / sizes.maxColumns));
                                sizes.columnsPerPage = Math.min(sizes.maxColumns, itemCount);
                                sizes.pages = Math.ceil(itemCount / (sizes.columnsPerPage * sizes.rowsPerPage));
                                sizes.trailingEdge = sizes.leadingEdge;
                                sizes.extraSpace = usableSpace - (sizes.columnsPerPage * sizes.itemWidth);

                                this._scrollLength = sizes.viewportOffsetWidth * sizes.pages;

                                this._keyboardBehavior.fixedSize = sizes.rowsPerPage;
                                this._keyboardBehavior.fixedDirection = _KeyboardBehavior._KeyboardBehavior.FixedDirection.height;

                                this._surfaceEl.style.height = (sizes.itemHeight * sizes.rowsPerPage) + "px";
                                this._surfaceEl.style.width = this._scrollLength + "px";
                            } else {
                                this._scrollPosition = this._viewportEl.scrollTop;

                                sizes.leadingEdge = 0;
                                sizes.rowsPerPage = itemCount;
                                sizes.columnsPerPage = 1;
                                sizes.pages = 1;
                                sizes.trailingEdge = 0;

                                // Reminder there is margin collapsing so just use scrollHeight instead of itemHeight * itemCount
                                this._scrollLength = this._viewportEl.scrollHeight;

                                this._keyboardBehavior.fixedSize = sizes.columnsPerPage;
                                this._keyboardBehavior.fixedDirection = _KeyboardBehavior._KeyboardBehavior.FixedDirection.width;

                                this._surfaceEl.style.height = "";
                                this._surfaceEl.style.width = "";
                            }

                            this._updateGridStyles();
                        } else {
                            sizes.pages = 1;
                            this._hasPreviousContent = false;
                            this._hasNextContent = false;
                            this._surfaceEl.style.height = "";
                            this._surfaceEl.style.width = "";
                        }

                        this._writeProfilerMark("measure,StopTM");
                    }
                },

                _updateGridStyles: function NavBarContainer_updateGridStyles() {
                    var sizes = this._sizes;
                    var itemCount = this._surfaceEl.children.length;

                    for (var index = 0; index < itemCount; index++) {
                        var itemEl = this._surfaceEl.children[index];

                        var marginRight;
                        var marginLeft;
                        var width = "";

                        if (this.layout === _UI.Orientation.horizontal) {
                            var column = Math.floor(index / sizes.rowsPerPage);
                            var isFirstColumnOnPage = column % sizes.columnsPerPage === 0;
                            var isLastColumnOnPage = column % sizes.columnsPerPage === sizes.columnsPerPage - 1;

                            var extraTrailingMargin = sizes.trailingEdge;
                            if (this.fixedSize) {
                                extraTrailingMargin += sizes.extraSpace;
                            } else {
                                var spaceToDistribute = sizes.extraSpace - (sizes.maxColumns - sizes.columnsPerPage) * sizes.itemWidth;
                                width = (sizes.itemOffsetWidth + (spaceToDistribute / sizes.maxColumns)) + "px";
                            }

                            var extraMarginRight;
                            var extraMarginLeft;

                            if (sizes.rtl) {
                                extraMarginRight = (isFirstColumnOnPage ? sizes.leadingEdge : 0);
                                extraMarginLeft = (isLastColumnOnPage ? extraTrailingMargin : 0);
                            } else {
                                extraMarginRight = (isLastColumnOnPage ? extraTrailingMargin : 0);
                                extraMarginLeft = (isFirstColumnOnPage ? sizes.leadingEdge : 0);
                            }

                            marginRight = extraMarginRight + sizes.itemMarginRight + "px";
                            marginLeft = extraMarginLeft + sizes.itemMarginLeft + "px";
                        } else {
                            marginRight = "";
                            marginLeft = "";
                        }

                        if (itemEl.style.marginRight !== marginRight) {
                            itemEl.style.marginRight = marginRight;
                        }
                        if (itemEl.style.marginLeft !== marginLeft) {
                            itemEl.style.marginLeft = marginLeft;
                        }
                        if (itemEl.style.width !== width) {
                            itemEl.style.width = width;
                        }
                    }
                },

                _updatePageUI: function NavBarContainer_updatePageUI() {
                    this._measure();
                    var currentPage = this._currentPage;

                    this._hasPreviousContent = (currentPage !== 0);
                    this._hasNextContent = (currentPage < this._sizes.pages - 1);
                    this._updateArrows();

                    // Always output the pagination indicators so they reserves up space.
                    if (this._indicatorCount !== this._sizes.pages) {
                        this._indicatorCount = this._sizes.pages;
                        this._pageindicatorsEl.innerHTML = new Array(this._sizes.pages + 1).join('<span class="' + NavBarContainer._ClassName.indicator + '"></span>');
                    }

                    for (var i = 0; i < this._pageindicatorsEl.children.length; i++) {
                        if (i === currentPage) {
                            _ElementUtilities.addClass(this._pageindicatorsEl.children[i], NavBarContainer._ClassName.currentindicator);
                        } else {
                            _ElementUtilities.removeClass(this._pageindicatorsEl.children[i], NavBarContainer._ClassName.currentindicator);
                        }
                    }

                    if (this._sizes.pages > 1) {
                        this._viewportEl.style.overflowX = this._panningDisabled ? "hidden" : "";
                        this._pageindicatorsEl.style.visibility = "";
                    } else {
                        this._viewportEl.style.overflowX = "hidden";
                        this._pageindicatorsEl.style.visibility = "hidden";
                    }

                    if (this._sizes.pages <= 1 || this._layout !== _UI.Orientation.horizontal) {
                        this._ariaStartMarker.removeAttribute("aria-flowto");
                        this._ariaEndMarker.removeAttribute("x-ms-aria-flowfrom");
                    } else {
                        var firstIndexOnCurrentPage = currentPage * this._sizes.rowsPerPage * this._sizes.columnsPerPage;
                        var firstItem = this._surfaceEl.children[firstIndexOnCurrentPage].winControl._buttonEl;
                        _ElementUtilities._ensureId(firstItem);
                        this._ariaStartMarker.setAttribute("aria-flowto", firstItem.id);

                        var lastIndexOnCurrentPage = Math.min(this._surfaceEl.children.length - 1, (currentPage + 1) * this._sizes.rowsPerPage * this._sizes.columnsPerPage - 1);
                        var lastItem = this._surfaceEl.children[lastIndexOnCurrentPage].winControl._buttonEl;
                        _ElementUtilities._ensureId(lastItem);
                        this._ariaEndMarker.setAttribute("x-ms-aria-flowfrom", lastItem.id);
                    }
                },

                _closeSplitIfOpen: function NavBarContainer_closeSplitIfOpen() {
                    if (this._currentSplitNavItem) {
                        if (this._currentSplitNavItem.splitOpened) {
                            this._currentSplitNavItem._toggleSplit();
                        }
                        this._currentSplitNavItem = null;
                    }
                },

                _updateArrows: function NavBarContainer_updateArrows() {
                    var hasLeftContent = this._sizes.rtl ? this._hasNextContent : this._hasPreviousContent;
                    var hasRightContent = this._sizes.rtl ? this._hasPreviousContent : this._hasNextContent;

                    var that = this;
                    // Previous and next are the arrows, not states. On mouse hover the arrows fade in immediately. If you
                    // mouse out the arrows fade out after a delay. When you reach the last/first page, the corresponding
                    // arrow fades out immediately as well.
                    if ((this._mouseInViewport || this._panningDisabled) && hasLeftContent) {
                        this._leftArrowWaitingToFadeOut && this._leftArrowWaitingToFadeOut.cancel();
                        this._leftArrowWaitingToFadeOut = null;
                        this._leftArrowFadeOut && this._leftArrowFadeOut.cancel();
                        this._leftArrowFadeOut = null;
                        this._leftArrowEl.style.visibility = '';
                        this._leftArrowFadeIn = this._leftArrowFadeIn || Animations.fadeIn(this._leftArrowEl);
                    } else {
                        if (hasLeftContent) {
                            // If we need a delayed fade out and we are already running a delayed fade out just use that one, don't extend it.
                            // Otherwise create a delayed fade out.
                            this._leftArrowWaitingToFadeOut = this._leftArrowWaitingToFadeOut || Promise.timeout(_TransitionAnimation._animationTimeAdjustment(buttonFadeDelay));
                        } else {
                            // If we need a immediate fade out and already have a delayed fade out cancel that one and create an immediate one.
                            this._leftArrowWaitingToFadeOut && this._leftArrowWaitingToFadeOut.cancel();
                            this._leftArrowWaitingToFadeOut = Promise.wrap();
                        }
                        this._leftArrowWaitingToFadeOut.then(function () {
                            // After the delay cancel any fade in if running. If we already were fading out continue it otherwise start the fade out.
                            this._leftArrowFadeIn && this._leftArrowFadeIn.cancel();
                            this._leftArrowFadeIn = null;
                            this._leftArrowFadeOut = this._leftArrowFadeOut || Animations.fadeOut(this._leftArrowEl).then(function () {
                                that._leftArrowEl.style.visibility = 'hidden';
                            });
                        }.bind(this));
                    }

                    // Same pattern for Next arrow.
                    if ((this._mouseInViewport || this._panningDisabled) && hasRightContent) {
                        this._rightArrowWaitingToFadeOut && this._rightArrowWaitingToFadeOut.cancel();
                        this._rightArrowWaitingToFadeOut = null;
                        this._rightArrowFadeOut && this._rightArrowFadeOut.cancel();
                        this._rightArrowFadeOut = null;
                        this._rightArrowEl.style.visibility = '';
                        this._rightArrowFadeIn = this._rightArrowFadeIn || Animations.fadeIn(this._rightArrowEl);
                    } else {
                        if (hasRightContent) {
                            this._rightArrowWaitingToFadeOut = this._rightArrowWaitingToFadeOut || Promise.timeout(_TransitionAnimation._animationTimeAdjustment(buttonFadeDelay));
                        } else {
                            this._rightArrowWaitingToFadeOut && this._rightArrowWaitingToFadeOut.cancel();
                            this._rightArrowWaitingToFadeOut = Promise.wrap();
                        }
                        this._rightArrowWaitingToFadeOut.then(function () {
                            this._rightArrowFadeIn && this._rightArrowFadeIn.cancel();
                            this._rightArrowFadeIn = null;
                            this._rightArrowFadeOut = this._rightArrowFadeOut || Animations.fadeOut(this._rightArrowEl).then(function () {
                                that._rightArrowEl.style.visibility = 'hidden';
                            });
                        }.bind(this));
                    }
                },

                _navbarCommandInvokedHandler: function NavBarContainer_navbarCommandInvokedHandler(ev) {
                    var srcElement = ev.target;
                    var index = -1;
                    while (srcElement) {
                        index++;
                        srcElement = srcElement.previousSibling;
                    }

                    this._fireEvent(NavBarContainer._EventName.invoked, {
                        index: index,
                        navbarCommand: ev.target.winControl,
                        data: this._repeater ? this._repeater.data.getAt(index) : null
                    });
                },

                _navbarCommandSplitToggleHandler: function NavBarContainer_navbarCommandSplitToggleHandler(ev) {
                    var srcElement = ev.target;
                    var index = -1;
                    while (srcElement) {
                        index++;
                        srcElement = srcElement.previousSibling;
                    }

                    var navbarCommand = ev.target.winControl;

                    this._closeSplitIfOpen();

                    if (navbarCommand.splitOpened) {
                        this._currentSplitNavItem = navbarCommand;
                    }

                    this._fireEvent(NavBarContainer._EventName.splitToggle, {
                        opened: navbarCommand.splitOpened,
                        index: index,
                        navbarCommand: navbarCommand,
                        data: this._repeater ? this._repeater.data.getAt(index) : null
                    });
                },

                _fireEvent: function NavBarContainer_fireEvent(type, detail) {
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent(type, true, false, detail);
                    this.element.dispatchEvent(event);
                },

                _writeProfilerMark: function NavBarContainer_writeProfilerMark(text) {
                    var message = "WinJS.UI.NavBarContainer:" + this._id + ":" + text;
                    _WriteProfilerMark(message);
                    _Log.log && _Log.log(message, null, "navbarcontainerprofiler");
                },

                dispose: function NavBarContainer_dispose() {
                    /// <signature helpKeyword="WinJS.UI.NavBarContainer.dispose">
                    /// <summary locid="WinJS.UI.NavBarContainer.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;

                    if (this._appBarEl) {
                        this._appBarEl.removeEventListener('beforeshow', this._closeSplitAndResetBound);
                        this._appBarEl.removeEventListener('beforeshow', this._resizeImplBound);
                    }

                    Navigation.removeEventListener('navigated', this._closeSplitAndResetBound);

                    this._leftArrowWaitingToFadeOut && this._leftArrowWaitingToFadeOut.cancel();
                    this._leftArrowFadeOut && this._leftArrowFadeOut.cancel();
                    this._leftArrowFadeIn && this._leftArrowFadeIn.cancel();
                    this._rightArrowWaitingToFadeOut && this._rightArrowWaitingToFadeOut.cancel();
                    this._rightArrowFadeOut && this._rightArrowFadeOut.cancel();
                    this._rightArrowFadeIn && this._rightArrowFadeIn.cancel();

                    _ElementUtilities._resizeNotifier.unsubscribe(this._element, this._boundResizeHandler);

                    this._removeDataChangingEvents();
                    this._removeDataChangedEvents();
                }
            }, {
                // Names of classes used by the NavBarContainer.
                _ClassName: {
                    navbarcontainer: "win-navbarcontainer",
                    pageindicators: "win-navbarcontainer-pageindicator-box",
                    indicator: "win-navbarcontainer-pageindicator",
                    currentindicator: "win-navbarcontainer-pageindicator-current",
                    vertical: "win-navbarcontainer-vertical",
                    horizontal: "win-navbarcontainer-horizontal",
                    viewport: "win-navbarcontainer-viewport",
                    surface: "win-navbarcontainer-surface",
                    navarrow: "win-navbarcontainer-navarrow",
                    navleftarrow: "win-navbarcontainer-navleft",
                    navrightarrow: "win-navbarcontainer-navright"
                },
                _EventName: {
                    invoked: eventNames.invoked,
                    splitToggle: eventNames.splittoggle
                }
            });
            _Base.Class.mix(NavBarContainer, _Control.DOMEventMixin);
            return NavBarContainer;
        })
    });

});
