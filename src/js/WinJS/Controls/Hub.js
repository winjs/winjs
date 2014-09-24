// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Log',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Animations',
    '../Animations/_TransitionAnimation',
    '../BindingList',
    '../ControlProcessor',
    '../Promise',
    '../_Signal',
    '../Scheduler',
    '../Utilities/_Control',
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    '../Utilities/_UI',
    './Hub/_Section',
    'require-style!less/desktop/controls'
    ], function hubInit(_Global, _Base, _BaseUtils, _ErrorFromName, _Events, _Log, _Resources, _WriteProfilerMark, Animations, _TransitionAnimation, BindingList, ControlProcessor, Promise, _Signal, Scheduler, _Control, _ElementUtilities, _Hoverable, _UI, _Section) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.Hub">
        /// Displays sections of content.
        /// </summary>
        /// <compatibleWith platform="Windows" minVersion="8.1"/>
        /// </field>
        /// <icon src="ui_winjs.ui.hub.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.hub.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.Hub">
        /// <div data-win-control="WinJS.UI.HubSection" data-win-options="{header: 'HubSection Header'}">HubSection Content</div>
        /// </div>]]></htmlSnippet>
        /// <event name="contentanimating" bubbles="true" locid="WinJS.UI.Hub_e:contentanimating">Raised when the Hub is about to play an entrance or a transition animation.</event>
        /// <event name="headerinvoked" bubbles="true" locid="WinJS.UI.Hub_e:headerinvoked">Raised when a header is invoked.</event>
        /// <event name="loadingstatechanged" bubbles="true" locid="WinJS.UI.Hub_e:loadingstatechanged">Raised when the loading state changes.</event>
        /// <part name="hub" class="win-hub" locid="WinJS.UI.Hub_part:hub">The entire Hub control.</part>
        /// <part name="progress" class="win-hub-progress" locid="WinJS.UI.Hub_part:progress">The progress indicator for the Hub.</part>
        /// <part name="viewport" class="win-hub-viewport" locid="WinJS.UI.Hub_part:viewport">The viewport of the Hub.</part>
        /// <part name="surface" class="win-hub-surface" locid="WinJS.UI.Hub_part:surface">The scrollable region of the Hub.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        Hub: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            function hubDefaultHeaderTemplate(section) {
                var element = _Global.document.createTextNode(typeof section.header === "object" ? JSON.stringify(section.header) : ('' + section.header));
                return element;
            }

            var createEvent = _Events._createEventProperty;
            var eventNames = {
                contentAnimating: "contentanimating",
                headerInvoked: "headerinvoked",
                loadingStateChanged: "loadingstatechanged"
            };

            // Delay time before progress dots are shown when loading hub section(s) on screen.
            var progressDelay = 500;

            var verticalNames = {
                scrollPos: "scrollTop",
                scrollSize: "scrollHeight",
                offsetPos: "offsetTop",
                offsetSize: "offsetHeight",
                oppositeOffsetSize: "offsetWidth",
                marginStart: "marginTop",
                marginEnd: "marginBottom",
                borderStart: "borderTopWidth",
                borderEnd: "borderBottomWidth",
                paddingStart: "paddingTop",
                paddingEnd: "paddingBottom"
            };
            var rtlHorizontalNames = {
                scrollPos: "scrollLeft",
                scrollSize: "scrollWidth",
                offsetPos: "offsetLeft",
                offsetSize: "offsetWidth",
                oppositeOffsetSize: "offsetHeight",
                marginStart: "marginRight",
                marginEnd: "marginLeft",
                borderStart: "borderRightWidth",
                borderEnd: "borderLeftWidth",
                paddingStart: "paddingRight",
                paddingEnd: "paddingLeft"
            };
            var ltrHorizontalNames = {
                scrollPos: "scrollLeft",
                scrollSize: "scrollWidth",
                offsetPos: "offsetLeft",
                offsetSize: "offsetWidth",
                oppositeOffsetSize: "offsetHeight",
                marginStart: "marginLeft",
                marginEnd: "marginRight",
                borderStart: "borderLeftWidth",
                borderEnd: "borderRightWidth",
                paddingStart: "paddingLeft",
                paddingEnd: "paddingRight"
            };

            var Hub = _Base.Class.define(function Hub_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.Hub.Hub">
                /// <summary locid="WinJS.UI.Hub.constructor">
                /// Creates a new Hub control.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.Hub.constructor_p:element">
                /// The DOM element that hosts the Hub control.
                /// </param>
                /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.Hub.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// Event names must begin with "on". For example, to provide a handler for the contentanimating event,
                /// add a property named "oncontentanimating" to the options object and set its value to the event handler.
                /// </param>
                /// <returns type="WinJS.UI.Hub" locid="WinJS.UI.Hub.constructor_returnValue">
                /// The new Hub.
                /// </returns>
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </signature>
                element = element || _Global.document.createElement("DIV");
                options = options || {};

                if (element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.Hub.DuplicateConstruction", strings.duplicateConstruction);
                }

                this._id = element.id || _ElementUtilities._uniqueID(element);
                this._writeProfilerMark("constructor,StartTM");

                this._windowKeyDownHandlerBound = this._windowKeyDownHandler.bind(this);
                _Global.addEventListener('keydown', this._windowKeyDownHandlerBound);

                // Attaching JS control to DOM element
                element.winControl = this;
                this._element = element;
                _ElementUtilities.addClass(this.element, Hub._ClassName.hub);
                _ElementUtilities.addClass(this.element, "win-disposable");

                this._viewportElement = _Global.document.createElement("DIV");
                this._viewportElement.className = Hub._ClassName.hubViewport;
                this._element.appendChild(this._viewportElement);
                this._viewportElement.setAttribute("role", "group");
                this._viewportElement.setAttribute("aria-label", strings.hubViewportAriaLabel);

                this._surfaceElement = _Global.document.createElement("DIV");
                this._surfaceElement.className = Hub._ClassName.hubSurface;
                this._viewportElement.appendChild(this._surfaceElement);

                // Start invisible so that you do not see the content loading until the sections are ready.
                this._visible = false;
                this._viewportElement.style.opacity = 0;

                if (!options.orientation) {
                    this._orientation = _UI.Orientation.horizontal;
                    _ElementUtilities.addClass(this.element, Hub._ClassName.hubHorizontal);
                }

                this._fireEntrance = true;
                this._animateEntrance = true;
                this._loadId = 0;
                this.runningAnimations = new Promise.wrap();
                this._currentIndexForSezo = 0;

                // This internally assigns this.sections which causes section to be used (even from options) before
                // scrollPosition or sectionOnScreen.
                this._parse();

                _Control.setOptions(this, options);

                _ElementUtilities._addEventListener(this.element, "focusin", this._focusin.bind(this), false);
                this.element.addEventListener("keydown", this._keyDownHandler.bind(this));
                this.element.addEventListener("click", this._clickHandler.bind(this));
                this._resizeHandlerBound = this._resizeHandler.bind(this);
                this.element.addEventListener("mselementresize", this._resizeHandlerBound);
                _ElementUtilities._resizeNotifier.subscribe(this.element, this._resizeHandlerBound);
                this._viewportElement.addEventListener("scroll", this._scrollHandler.bind(this));
                this._surfaceElement.addEventListener("mselementresize", this._contentResizeHandler.bind(this));

                this._handleSectionChangedBind = this._handleSectionChanged.bind(this);
                this._handleSectionInsertedBind = this._handleSectionInserted.bind(this);
                this._handleSectionMovedBind = this._handleSectionMoved.bind(this);
                this._handleSectionRemovedBind = this._handleSectionRemoved.bind(this);
                this._handleSectionReloadBind = this._handleSectionReload.bind(this);

                this._refresh();

                this._writeProfilerMark("constructor,StopTM");
            }, {
                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.Hub.element" helpKeyword="WinJS.UI.Hub.element">
                /// Gets the DOM element that hosts the Hub.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },
                /// <field type="String" oamOptionsDatatype="WinJS.UI.Orientation" locid="WinJS.UI.Hub.orientation" helpKeyword="WinJS.UI.Hub.orientation">
                /// Gets or sets the orientation of sections within the Hub.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                orientation: {
                    get: function () {
                        return this._orientation;
                    },
                    set: function (value) {
                        if (value === this._orientation) {
                            return;
                        }
                        this._measured = false;
                        // clear existing scroll before we switch orientation
                        if (this._names) { // handle setting orientation before we measure
                            var newScrollPos = {};
                            newScrollPos[this._names.scrollPos] = 0;
                            _ElementUtilities.setScrollPosition(this._viewportElement, newScrollPos);
                        }
                        if (value === _UI.Orientation.vertical) {
                            _ElementUtilities.removeClass(this.element, Hub._ClassName.hubHorizontal);
                            _ElementUtilities.addClass(this.element, Hub._ClassName.hubVertical);
                        } else {
                            value = _UI.Orientation.horizontal;
                            _ElementUtilities.removeClass(this.element, Hub._ClassName.hubVertical);
                            _ElementUtilities.addClass(this.element, Hub._ClassName.hubHorizontal);
                        }
                        this._orientation = value;
                        Scheduler.schedule(this._updateSnapList.bind(this), Scheduler.Priority.idle);
                    }
                },
                /// <field type="WinJS.Binding.List" locid="WinJS.UI.Hub.sections" helpKeyword="WinJS.UI.Hub.sections">
                /// Gets or sets the WinJS.Binding.List of HubSection objects that belong to this Hub.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                sections: {
                    get: function () {
                        if (this._pendingSections) {
                            return this._pendingSections;
                        }
                        return this._sections;
                    },
                    set: function (value) {
                        var resetScrollPosition = !this._pendingSections;
                        this._pendingSections = value;
                        this._refresh();
                        if (resetScrollPosition) {
                            this.scrollPosition = 0;
                        }
                    }
                },
                /// <field type="Object" locid="WinJS.UI.Hub.headerTemplate" helpKeyword="WinJS.UI.Hub.headerTemplate" potentialValueSelector="[data-win-control='WinJS.Binding.Template']">
                /// Gets or sets the WinJS.Binding.Template or template function that creates the DOM elements
                /// which represent the header for each HubSection. Each header can
                /// contain multiple DOM elements, but we recommend that it have a single
                /// root element.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                headerTemplate: {
                    get: function () {
                        if (this._pendingHeaderTemplate) {
                            return this._pendingHeaderTemplate;
                        }

                        if (!this._headerTemplate) {
                            this._headerTemplate = hubDefaultHeaderTemplate;
                        }

                        return this._headerTemplate;
                    },
                    set: function (value) {
                        this._pendingHeaderTemplate = value || hubDefaultHeaderTemplate;
                        this._refresh();
                    }
                },
                /// <field type="Number" integer="true" locid="WinJS.UI.Hub.scrollPosition" helpKeyword="WinJS.UI.Hub.scrollPosition">
                /// Gets or sets the position of the Hub's scrollbar.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                scrollPosition: {
                    get: function () {
                        if (+this._pendingScrollLocation === this._pendingScrollLocation) {
                            return this._pendingScrollLocation;
                        }

                        this._measure();
                        return this._scrollPosition;
                    },
                    set: function (value) {
                        value = Math.max(0, value);
                        if (this._pendingRefresh) {
                            // Unable to constrain length because sections may have changed.
                            this._pendingScrollLocation = value;
                            this._pendingSectionOnScreen = null;
                        } else {
                            this._measure();
                            var targetScrollPos = Math.max(0, Math.min(this._scrollLength - this._viewportSize, value));
                            this._scrollPosition = targetScrollPos;
                            var newScrollPos = {};
                            newScrollPos[this._names.scrollPos] = targetScrollPos;
                            _ElementUtilities.setScrollPosition(this._viewportElement, newScrollPos);
                        }
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.Hub.sectionOnScreen" helpKeyword="WinJS.UI.Hub.sectionOnScreen">
                /// Gets or sets the index of first section in view. This property is useful for restoring a previous view when your app launches or resumes.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                sectionOnScreen: {
                    get: function () {
                        if (+this._pendingSectionOnScreen === this._pendingSectionOnScreen) {
                            return this._pendingSectionOnScreen;
                        }

                        this._measure();
                        for (var i = 0; i < this._sectionSizes.length; i++) {
                            var sectionSize = this._sectionSizes[i];
                            if ((sectionSize.offset + sectionSize.size - sectionSize.borderEnd - sectionSize.paddingEnd) > (this._scrollPosition + this._startSpacer + sectionSize.borderStart + sectionSize.paddingStart)) {
                                return i;
                            }
                        }
                        return -1;
                    },
                    set: function (value) {
                        value = Math.max(0, value);
                        if (this._pendingRefresh) {
                            this._pendingSectionOnScreen = value;
                            this._pendingScrollLocation = null;
                        } else {
                            this._measure();
                            if (value >= 0 && value < this._sectionSizes.length) {
                                this._scrollToSection(value);
                            }
                        }
                    }
                },
                /// <field type="Number" integer="true" isAdvanced="true" locid="WinJS.UI.Hub.indexOfFirstVisible" helpKeyword="WinJS.UI.Hub.indexOfFirstVisible">
                /// Gets or sets the index of first section at least partially in view. Use for animations.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                indexOfFirstVisible: {
                    get: function () {
                        this._measure();
                        for (var i = 0; i < this._sectionSizes.length; i++) {
                            var sectionSize = this._sectionSizes[i];
                            if ((sectionSize.offset + sectionSize.size - sectionSize.borderEnd - sectionSize.paddingEnd) > this._scrollPosition) {
                                return i;
                            }
                        }
                        return -1;
                    }
                },
                /// <field type="Number" integer="true" isAdvanced="true" locid="WinJS.UI.Hub.indexOfLastVisible" helpKeyword="WinJS.UI.Hub.indexOfLastVisible">
                /// Gets or sets the index of last section at least partially in view. Use for animations.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                indexOfLastVisible: {
                    get: function () {
                        this._measure();
                        for (var i = this._sectionSizes.length - 1; i >= 0; i--) {
                            var sectionSize = this._sectionSizes[i];
                            if ((sectionSize.offset + sectionSize.paddingStart + sectionSize.borderStart) < (this._scrollPosition + this._viewportSize)) {
                                return i;
                            }
                        }
                        return -1;
                    }
                },

                /// <field type="Function" locid="WinJS.UI.Hub.onheaderinvoked" helpKeyword="WinJS.UI.Hub.onheaderinvoked">
                /// Raised  when the user clicks on an interactive header.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                onheaderinvoked: createEvent(eventNames.headerInvoked),

                /// <field type="Function" locid="WinJS.UI.Hub.onloadingstatechanged" helpKeyword="WinJS.UI.Hub.onloadingstatechanged">
                /// Raised when the loadingState of the Hub changes.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                onloadingstatechanged: createEvent(eventNames.loadingStateChanged),

                /// <field type="Function" locid="WinJS.UI.Hub.oncontentanimating" helpKeyword="WinJS.UI.Hub.oncontentanimating">
                /// Raised when Hub is about to play entrance, contentTransition, insert, or remove animations.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                oncontentanimating: createEvent(eventNames.contentAnimating),

                _refresh: function hub_refresh() {
                    if (this._pendingRefresh) {
                        return;
                    }

                    this._loadId++;
                    this._setState(Hub.LoadingState.loading);
                    // This is to coalesce property setting operations such as sections and scrollPosition.
                    this._pendingRefresh = true;

                    Scheduler.schedule(this._refreshImpl.bind(this), Scheduler.Priority.high);
                },
                _refreshImpl: function hub_refreshImpl() {
                    if (this._disposed) {
                        return;
                    }

                    var fadeOutAnimation = Promise.wrap();
                    if (this._pendingSections) {
                        this._animateEntrance = true;
                        this._fireEntrance = !this._visible;
                        if (!this._fireEntrance) {
                            this._visible = false;
                            this._viewportElement.style.opacity = 0;

                            if (_TransitionAnimation.isAnimationEnabled()) {
                                var animateTransition = this._fireEvent(Hub._EventName.contentAnimating, {
                                    type: Hub.AnimationType.contentTransition
                                });

                                if (animateTransition) {
                                    this._viewportElement.style["-ms-overflow-style"] = "none";
                                    fadeOutAnimation = Animations.fadeOut(this._viewportElement).then(function () {
                                        this._viewportElement.style["-ms-overflow-style"] = "";
                                    }.bind(this));
                                }
                                this._animateEntrance = animateTransition;
                            }
                        }
                    }

                    fadeOutAnimation.done(this._applyProperties.bind(this));
                },
                _applyProperties: function hub_applyProperties() {
                    if (this._disposed) {
                        return;
                    }

                    this._pendingRefresh = false;

                    var needsToLoadSections = false;
                    if (this._pendingSections) {
                        needsToLoadSections = true;
                        this._updateEvents(this._sections, this._pendingSections);
                        this._sections = this._pendingSections;
                        this._pendingSections = null;
                        // Remove any declaratively specified hub sections before attachSections.
                        while (this.element.firstElementChild !== this._viewportElement) {
                            var toRemove = this.element.firstElementChild;
                            toRemove.parentNode.removeChild(toRemove);
                        }
                        _ElementUtilities.empty(this._surfaceElement);
                    }

                    if (this._pendingHeaderTemplate) {
                        this._headerTemplate = this._pendingHeaderTemplate;
                        this._pendingHeaderTemplate = null;
                    }

                    this._assignHeaderTemplate();

                    if (needsToLoadSections) {
                        this._attachSections();
                    }

                    // Scroll after headers are rendered and sections are attached so the scroll thumb is correct.
                    if (+this._pendingSectionOnScreen === this._pendingSectionOnScreen) {
                        // If there are both pending section on screen and scroll location use section on screen.
                        this.sectionOnScreen = this._pendingSectionOnScreen;
                    } else if (+this._pendingScrollLocation === this._pendingScrollLocation) {
                        this.scrollPosition = this._pendingScrollLocation;
                    } else {
                        // Sections reset without sectionOnScreen or scrollPosition APIs.
                        this.scrollPosition = 0;
                    }

                    this._pendingSectionOnScreen = null;
                    this._pendingScrollLocation = null;

                    // Using current (or new) scroll location load the sections
                    this._setState(Hub.LoadingState.loading);
                    this._loadSections();
                },
                _handleSectionChanged: function hub_handleSectionChanged(ev) {
                    // Change is triggered by binding list setAt() API.
                    if (this._pendingSections) {
                        return;
                    }

                    var newSection = ev.detail.newValue;
                    var oldSection = ev.detail.oldValue;
                    newSection._setHeaderTemplate(this.headerTemplate);
                    if (newSection.element !== oldSection.element) {
                        if (newSection.element.parentNode === this._surfaceElement) {
                            throw new _ErrorFromName("WinJS.UI.Hub.DuplicateSection", strings.duplicateSection);
                        }

                        this._surfaceElement.insertBefore(newSection.element, oldSection.element);
                        this._surfaceElement.removeChild(oldSection.element);
                        this._measured = false;

                        this._setState(Hub.LoadingState.loading);
                        this._loadSections();
                    }
                },
                _handleSectionInserted: function hub_handleSectionInserted(ev) {
                    // Insert is triggered by binding list insert APIs such as splice(), push(), and unshift().
                    if (this._pendingSections) {
                        return;
                    }

                    var index = ev.detail.index;
                    var section = ev.detail.value;

                    if (section._animation) {
                        section._animation.cancel();
                    }

                    var animation;
                    var result = this._fireEvent(Hub._EventName.contentAnimating, {
                        type: Hub.AnimationType.insert,
                        index: index,
                        section: section
                    });

                    if (result) {

                        var affectedElements = [];

                        for (var i = index + 1; i < this.sections.length; i++) {
                            affectedElements.push(this.sections.getAt(i).element);
                        }

                        animation = new Animations._createUpdateListAnimation([section.element], [], affectedElements);
                    }

                    if (section.element.parentNode === this._surfaceElement) {
                        throw new _ErrorFromName("WinJS.UI.Hub.DuplicateSection", strings.duplicateSection);
                    }

                    section._setHeaderTemplate(this.headerTemplate);
                    if (index < this.sections.length - 1) {
                        this._surfaceElement.insertBefore(section.element, this.sections.getAt(index + 1).element);
                    } else {
                        this._surfaceElement.appendChild(section.element);
                    }
                    this._measured = false;

                    if (animation) {
                        var insertAnimation = animation.execute();
                        this.runningAnimations = Promise.join([this.runningAnimations, insertAnimation]);
                    }

                    this._setState(Hub.LoadingState.loading);
                    this._loadSections();
                },
                _handleSectionMoved: function hub_handleSectionMoved(ev) {
                    // Move is triggered by binding list move() API.
                    if (this._pendingSections) {
                        return;
                    }

                    var newIndex = ev.detail.newIndex;
                    var section = ev.detail.value;

                    if (newIndex < this.sections.length - 1) {
                        this._surfaceElement.insertBefore(section.element, this.sections.getAt(newIndex + 1).element);
                    } else {
                        this._surfaceElement.appendChild(section.element);
                    }
                    this._measured = false;

                    this._setState(Hub.LoadingState.loading);
                    this._loadSections();
                },
                _handleSectionRemoved: function hub_handleSectionRemoved(ev) {
                    // Removed is triggered by binding list removal APIs such as splice(), pop(), and shift().
                    if (this._pendingSections) {
                        return;
                    }

                    var section = ev.detail.value;
                    var index = ev.detail.index;

                    var animationPromise = Promise.wrap();
                    var result = this._fireEvent(Hub._EventName.contentAnimating, {
                        type: Hub.AnimationType.remove,
                        index: index,
                        section: section
                    });

                    if (result) {
                        var affectedElements = [];

                        for (var i = index; i < this.sections.length; i++) {
                            affectedElements.push(this.sections.getAt(i).element);
                        }

                        var animation = new Animations._createUpdateListAnimation([], [section.element], affectedElements);

                        this._measure();
                        var offsetTop = section.element.offsetTop;
                        var offsetLeft = section.element.offsetLeft;
                        section.element.style.position = "absolute";
                        section.element.style.top = offsetTop;
                        section.element.style.left = offsetLeft;
                        section.element.style.opacity = 0;
                        this._measured = false;

                        animationPromise = animation.execute().then(function () {
                            section.element.style.position = "";
                            section.element.style.top = "";
                            section.element.style.left = "";
                            section.element.style.opacity = 1;
                        }.bind(this));
                    }

                    animationPromise.done(function () {
                        if (!this._disposed) {
                            this._surfaceElement.removeChild(section.element);
                            this._measured = false;
                        }
                    }.bind(this));

                    // Store animation promise in case it is inserted before remove animation finishes.
                    section._animation = animationPromise;
                    this.runningAnimations = Promise.join([this.runningAnimations, animationPromise]);

                    this._setState(Hub.LoadingState.loading);
                    this._loadSections();
                },
                _handleSectionReload: function hub_handleSectionReload() {
                    // Reload is triggered by large operations on the binding list such as reverse(). This causes
                    // _pendingSections to be true which ignores future insert/remove/modified/moved events until the new
                    // sections list is applied.
                    this.sections = this.sections;
                },
                _updateEvents: function hub_updateEvents(oldSections, newSections) {
                    if (oldSections) {
                        oldSections.removeEventListener("itemchanged", this._handleSectionChangedBind);
                        oldSections.removeEventListener("iteminserted", this._handleSectionInsertedBind);
                        oldSections.removeEventListener("itemmoved", this._handleSectionMovedBind);
                        oldSections.removeEventListener("itemremoved", this._handleSectionRemovedBind);
                        oldSections.removeEventListener("reload", this._handleSectionReloadBind);
                    }

                    if (newSections) {
                        newSections.addEventListener("itemchanged", this._handleSectionChangedBind);
                        newSections.addEventListener("iteminserted", this._handleSectionInsertedBind);
                        newSections.addEventListener("itemmoved", this._handleSectionMovedBind);
                        newSections.addEventListener("itemremoved", this._handleSectionRemovedBind);
                        newSections.addEventListener("reload", this._handleSectionReloadBind);
                    }
                },
                _attachSections: function hub_attachSections() {
                    this._measured = false;
                    for (var i = 0; i < this.sections.length; i++) {
                        var section = this._sections.getAt(i);
                        if (section._animation) {
                            section._animation.cancel();
                        }
                        if (section.element.parentNode === this._surfaceElement) {
                            throw new _ErrorFromName("WinJS.UI.Hub.DuplicateSection", strings.duplicateSection);
                        }
                        this._surfaceElement.appendChild(section.element);
                    }
                },
                _assignHeaderTemplate: function hub_assignHeaderTemplate() {
                    this._measured = false;
                    for (var i = 0; i < this.sections.length; i++) {
                        var section = this._sections.getAt(i);
                        section._setHeaderTemplate(this.headerTemplate);
                    }
                },
                _loadSection: function hub_loadSection(index) {
                    var section = this._sections.getAt(index);
                    return section._process().then(function resetVisibility() {
                        var style = section.contentElement.style;
                        if (style.visibility !== "") {
                            style.visibility = "";
                        }
                    });
                },
                _loadSections: function hub_loadSections() {
                    // Used to know if another load has interrupted this one.
                    this._loadId++;
                    var loadId = this._loadId;
                    var that = this;
                    var onScreenItemsAnimatedPromise = Promise.wrap();
                    var sectionIndicesToLoad = [];
                    var allSectionsLoadedPromise = Promise.wrap();

                    function loadNextSectionAfterPromise(promise) {
                        promise.then(function () {
                            Scheduler.schedule(loadNextSection, Scheduler.Priority.idle);
                        });
                    }

                    function loadNextSection() {
                        if (loadId === that._loadId && !that._disposed) {
                            if (sectionIndicesToLoad.length) {
                                var index = sectionIndicesToLoad.shift();
                                var loadedPromise = that._loadSection(index);
                                loadNextSectionAfterPromise(loadedPromise);
                            } else {
                                allSectionsLoadedSignal.complete();
                            }
                        }
                    }

                    if (!this._showProgressPromise) {
                        this._showProgressPromise = Promise.timeout(progressDelay).then(function () {
                            if (this._disposed) {
                                return;
                            }

                            if (!this._progressBar) {
                                this._progressBar = _Global.document.createElement("progress");
                                _ElementUtilities.addClass(this._progressBar, Hub._ClassName.hubProgress);
                                this._progressBar.max = 100;
                            }
                            if (!this._progressBar.parentNode) {
                                this.element.insertBefore(this._progressBar, this._viewportElement);
                            }
                            this._showProgressPromise = null;
                        }.bind(this), function () {
                            this._showProgressPromise = null;
                        }.bind(this));
                    }

                    if (this.sections.length) {
                        var allSectionsLoadedSignal = new _Signal();
                        allSectionsLoadedPromise = allSectionsLoadedSignal.promise;
                        // Synchronously load the sections on screen.
                        var synchronousProcessPromises = [];
                        var start = Math.max(0, this.indexOfFirstVisible);
                        var end = Math.max(0, this.indexOfLastVisible);
                        for (var i = start; i <= end; i++) {
                            synchronousProcessPromises.push(this._loadSection(i));
                        }

                        // Determine the order to load the rest of the sections.
                        start--;
                        end++;
                        while (start >= 0 || end < this.sections.length) {
                            if (end < this.sections.length) {
                                sectionIndicesToLoad.push(end);
                                end++;
                            }
                            if (start >= 0) {
                                sectionIndicesToLoad.push(start);
                                start--;
                            }
                        }

                        var onScreenSectionsLoadedPromise = Promise.join(synchronousProcessPromises);

                        // In case there are overlapping load calls
                        onScreenSectionsLoadedPromise.done(function () {
                            if (loadId === this._loadId && !that._disposed) {
                                if (this._showProgressPromise) {
                                    this._showProgressPromise.cancel();
                                }

                                if (this._progressBar && this._progressBar.parentNode) {
                                    this._progressBar.parentNode.removeChild(this._progressBar);
                                }

                                Scheduler.schedule(function Hub_entranceAnimation() {
                                    if (loadId === this._loadId && !that._disposed) {
                                        if (!this._visible) {
                                            this._visible = true;
                                            this._viewportElement.style.opacity = 1;

                                            if (this._animateEntrance && _TransitionAnimation.isAnimationEnabled()) {
                                                var eventDetail = {
                                                    type: Hub.AnimationType.entrance
                                                };

                                                if (!this._fireEntrance || this._fireEvent(Hub._EventName.contentAnimating, eventDetail)) {
                                                    this._viewportElement.style["-ms-overflow-style"] = "none";
                                                    onScreenItemsAnimatedPromise = Animations.enterContent(this._viewportElement, [{ left: this._fireEntrance ? "100px" : "40px", top: "0px", rtlflip: true }], { mechanism: "transition" }).then(function () {
                                                        this._viewportElement.style["-ms-overflow-style"] = "";
                                                    }.bind(this));
                                                }
                                            }
                                            if (this._element === _Global.document.activeElement) {
                                                this._moveFocusIn(this.sectionOnScreen);
                                            }
                                        }
                                    }
                                }, Scheduler.Priority.high, this, "WinJS.UI.Hub.entranceAnimation");
                            }
                        }.bind(this));

                        loadNextSectionAfterPromise(onScreenSectionsLoadedPromise);
                    } else {
                        if (this._showProgressPromise) {
                            this._showProgressPromise.cancel();
                        }

                        if (this._progressBar && this._progressBar.parentNode) {
                            this._progressBar.parentNode.removeChild(this._progressBar);
                        }
                    }

                    Promise.join([this.runningAnimations, onScreenItemsAnimatedPromise, allSectionsLoadedPromise]).done(function () {
                        if (loadId === this._loadId && !that._disposed) {
                            this.runningAnimations = Promise.wrap();
                            this._setState(Hub.LoadingState.complete);
                            Scheduler.schedule(this._updateSnapList.bind(this), Scheduler.Priority.idle);
                        }
                    }.bind(this));
                },
                /// <field type="String" hidden="true" locid="WinJS.UI.Hub.loadingState" helpKeyword="WinJS.UI.Hub.loadingState">
                /// Gets a value that indicates whether the Hub is still loading or whether
                /// loading is complete.  This property can return one of these values:
                /// "loading" or "complete".
                /// </field>
                loadingState: {
                    get: function () {
                        return this._loadingState;
                    }
                },
                _setState: function Hub_setState(state) {
                    if (state !== this._loadingState) {
                        this._writeProfilerMark("loadingStateChanged:" + state + ",info");
                        this._loadingState = state;
                        var eventObject = _Global.document.createEvent("CustomEvent");
                        eventObject.initCustomEvent(Hub._EventName.loadingStateChanged, true, false, { loadingState: state });
                        this._element.dispatchEvent(eventObject);
                    }
                },
                _parse: function hub_parse() {
                    var hubSections = [];
                    var hubSectionEl = this.element.firstElementChild;

                    while (hubSectionEl !== this._viewportElement) {
                        ControlProcessor.processAll(hubSectionEl);

                        var hubSectionContent = hubSectionEl.winControl;
                        if (hubSectionContent) {
                            hubSections.push(hubSectionContent);
                        } else {
                            throw new _ErrorFromName("WinJS.UI.Hub.InvalidContent", strings.invalidContent);
                        }

                        var nextSectionEl = hubSectionEl.nextElementSibling;
                        hubSectionEl = nextSectionEl;
                    }

                    this.sections = new BindingList.List(hubSections);
                },
                _fireEvent: function hub_fireEvent(type, detail) {
                    // Returns true if ev.preventDefault() was not called
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent(type, true, true, detail);
                    return this.element.dispatchEvent(event);
                },

                _findHeaderTabStop: function hub_findHeaderTabStop(element) {
                    if (element.parentNode) {
                        if (_ElementUtilities._matchesSelector(element, ".win-hub-section-header-tabstop, .win-hub-section-header-tabstop *")) {
                            while (!_ElementUtilities.hasClass(element, "win-hub-section-header-tabstop")) {
                                element = element.parentElement;
                            }
                            return element;
                        }
                    }
                    return null;
                },
                _isHeaderInteractive: function hub_isHeaderInteractive(element) {
                    // Helper method to skip keyboarding and clicks with a header's sub interactive content
                    if (element.parentNode) {
                        return _ElementUtilities._matchesSelector(element, ".win-interactive, .win-interactive *");
                    }
                    return false;
                },
                _clickHandler: function hub_clickHandler(ev) {
                    var headerTabStopElement = this._findHeaderTabStop(ev.target);
                    if (headerTabStopElement && !this._isHeaderInteractive(ev.target)) {
                        var section = headerTabStopElement.parentElement.parentElement.winControl;
                        if (!section.isHeaderStatic) {
                            var sectionIndex = this.sections.indexOf(section);
                            this._fireEvent(Hub._EventName.headerInvoked, {
                                index: sectionIndex,
                                section: section
                            });
                        }
                    }
                },
                _resizeHandler: function hub_resizeHandler() {
                    // Viewport needs to be measured
                    this._measured = false;
                    Scheduler.schedule(this._updateSnapList.bind(this), Scheduler.Priority.idle);
                },
                _contentResizeHandler: function hub_contentResizeHandler() {
                    // Sections and scroll length need to be measured
                    this._measured = false;
                    Scheduler.schedule(this._updateSnapList.bind(this), Scheduler.Priority.idle);
                },
                _scrollHandler: function hub_scrollHandler() {
                    // Scroll location needs to be retrieved
                    this._measured = false;

                    if (this._pendingSections) {
                        return;
                    }

                    // Scroll events caused by users overwrite pending API modifications to scrollposition.
                    this._pendingScrollLocation = null;
                    this._pendingSectionOnScreen = null;

                    if (!this._pendingScrollHandler) {
                        this._pendingScrollHandler = _BaseUtils._requestAnimationFrame(function () {
                            this._pendingScrollHandler = null;

                            if (this._pendingSections) {
                                return;
                            }

                            if (this.loadingState !== Hub.LoadingState.complete) {
                                this._loadSections();
                            }
                        }.bind(this));
                    }
                },
                _measure: function hub_measure() {
                    // Any time a size changes (section growing, window resizing, etc) cachedSizes should be set to false
                    // and any time the variables need to be read again we should measure the variables. To avoid a lot of
                    // seperate layouts we measure the variables in a single batch.
                    if (!this._measured || this._scrollLength === 0) {
                        this._writeProfilerMark("measure,StartTM");
                        this._measured = true;

                        this._rtl = _Global.getComputedStyle(this._element, null).direction === "rtl";

                        if (this.orientation === _UI.Orientation.vertical) {
                            this._names = verticalNames;
                        } else {
                            if (this._rtl) {
                                this._names = rtlHorizontalNames;
                            } else {
                                this._names = ltrHorizontalNames;
                            }
                        }

                        this._viewportSize = this._viewportElement[this._names.offsetSize];
                        this._viewportOppositeSize = this._viewportElement[this._names.oppositeOffsetSize];
                        this._scrollPosition = _ElementUtilities.getScrollPosition(this._viewportElement)[this._names.scrollPos];
                        this._scrollLength = this._viewportElement[this._names.scrollSize];

                        var surfaceElementComputedStyle = _Global.getComputedStyle(this._surfaceElement);
                        this._startSpacer = parseFloat(surfaceElementComputedStyle[this._names.marginStart]) + parseFloat(surfaceElementComputedStyle[this._names.borderStart]) + parseFloat(surfaceElementComputedStyle[this._names.paddingStart]);
                        this._endSpacer = parseFloat(surfaceElementComputedStyle[this._names.marginEnd]) + parseFloat(surfaceElementComputedStyle[this._names.borderEnd]) + parseFloat(surfaceElementComputedStyle[this._names.paddingEnd]);

                        this._sectionSizes = [];
                        for (var i = 0; i < this.sections.length; i++) {
                            var section = this.sections.getAt(i);
                            var computedSectionStyle = _Global.getComputedStyle(section.element);
                            this._sectionSizes[i] = {
                                offset: section.element[this._names.offsetPos],
                                // Reminder: offsetWidth doesn't include margins and also rounds.
                                size: section.element[this._names.offsetSize],
                                marginStart: parseFloat(computedSectionStyle[this._names.marginStart]),
                                marginEnd: parseFloat(computedSectionStyle[this._names.marginEnd]),
                                borderStart: parseFloat(computedSectionStyle[this._names.borderStart]),
                                borderEnd: parseFloat(computedSectionStyle[this._names.borderEnd]),
                                paddingStart: parseFloat(computedSectionStyle[this._names.paddingStart]),
                                paddingEnd: parseFloat(computedSectionStyle[this._names.paddingEnd])
                            };

                            if (this._rtl && this.orientation === _UI.Orientation.horizontal) {
                                this._sectionSizes[i].offset = this._viewportSize - (this._sectionSizes[i].offset + this._sectionSizes[i].size);
                            }
                        }

                        this._writeProfilerMark("measure,StopTM");
                    }
                },
                _updateSnapList: function hub_updateSnapList() {
                    this._writeProfilerMark("updateSnapList,StartTM");
                    this._measure();

                    var snapList = "snapList(";
                    for (var i = 0; i < this._sectionSizes.length; i++) {
                        if (i > 0) {
                            snapList += ",";
                        }
                        var sectionSize = this._sectionSizes[i];
                        snapList += (sectionSize.offset - sectionSize.marginStart - this._startSpacer) + "px";
                    }
                    snapList += ")";

                    var snapListY = "";
                    var snapListX = "";
                    if (this.orientation === _UI.Orientation.vertical) {
                        snapListY = snapList;
                    } else {
                        snapListX = snapList;
                    }

                    if (this._lastSnapPointY !== snapListY) {
                        this._lastSnapPointY = snapListY;
                        this._viewportElement.style['-ms-scroll-snap-points-y'] = snapListY;
                    }

                    if (this._lastSnapPointX !== snapListX) {
                        this._lastSnapPointX = snapListX;
                        this._viewportElement.style['-ms-scroll-snap-points-x'] = snapListX;
                    }

                    this._writeProfilerMark("updateSnapList,StopTM");
                },
                _scrollToSection: function Hub_scrollToSection(index, withAnimation) {
                    this._measure();
                    var sectionSize = this._sectionSizes[index];
                    var scrollPositionToShowStartMargin = Math.min(this._scrollLength - this._viewportSize, sectionSize.offset - sectionSize.marginStart - this._startSpacer);

                    this._scrollTo(scrollPositionToShowStartMargin, withAnimation);
                },
                _ensureVisible: function hub_ensureVisible(index, withAnimation) {
                    this._measure();
                    var targetScrollPos = this._ensureVisibleMath(index, this._scrollPosition);
                    this._scrollTo(targetScrollPos, withAnimation);
                },
                _ensureVisibleMath: function hub_ensureVisibleMath(index, targetScrollPos) {
                    this._measure();
                    var sectionSize = this._sectionSizes[index];

                    var scrollPositionToShowStartMargin = Math.min(this._scrollLength - this._viewportSize, sectionSize.offset - sectionSize.marginStart - this._startSpacer);
                    var scrollPositionToShowEndMargin = Math.max(0, sectionSize.offset + sectionSize.size + sectionSize.marginEnd + this._endSpacer - this._viewportSize + 1);
                    if (targetScrollPos > scrollPositionToShowStartMargin) {
                        targetScrollPos = scrollPositionToShowStartMargin;
                    } else if (targetScrollPos < scrollPositionToShowEndMargin) {
                        targetScrollPos = Math.min(scrollPositionToShowStartMargin, scrollPositionToShowEndMargin);
                    }

                    return targetScrollPos;
                },
                _scrollTo: function hub_scrollTo(scrollPos, withAnimation) {
                    this._scrollPosition = scrollPos;
                    if (withAnimation) {
                        if (this.orientation === _UI.Orientation.vertical) {
                            _ElementUtilities._zoomTo(this._viewportElement, { contentX: 0, contentY: this._scrollPosition, viewportX: 0, viewportY: 0 });
                        } else {
                            _ElementUtilities._zoomTo(this._viewportElement, { contentX: this._scrollPosition, contentY: 0, viewportX: 0, viewportY: 0 });
                        }
                    } else {
                        var newScrollPos = {};
                        newScrollPos[this._names.scrollPos] = this._scrollPosition;
                        _ElementUtilities.setScrollPosition(this._viewportElement, newScrollPos);
                    }
                },
                _windowKeyDownHandler: function hub_windowKeyDownHandler(ev) {
                    // Include tab and shift tab. Note: Alt Key + Tab and Windows Key + Tab do not fire keydown with ev.key === "Tab".
                    if (ev.keyCode === Key.tab) {
                        this._tabSeenLast = true;

                        var that = this;
                        _BaseUtils._yieldForEvents(function () {
                            that._tabSeenLast = false;
                        });
                    }
                },
                _focusin: function hub_focusin(ev) {
                    // On focus we call ensureVisible to handle the tab or shift/tab to header. However if the
                    // focus was caused by a pointer down event we skip the focus.
                    if (this._tabSeenLast) {
                        var headerTabStopElement = this._findHeaderTabStop(ev.target);
                        if (headerTabStopElement && !this._isHeaderInteractive(ev.target)) {
                            var sectionIndex = this.sections.indexOf(headerTabStopElement.parentElement.parentElement.winControl);
                            if (sectionIndex > -1) {
                                this._ensureVisible(sectionIndex, true);
                            }
                        }
                    }

                    // Always remember the focused section for SemanticZoom.
                    var sectionElement = ev.target;
                    while (sectionElement && !_ElementUtilities.hasClass(sectionElement, _Section.HubSection._ClassName.hubSection)) {
                        sectionElement = sectionElement.parentElement;
                    }
                    if (sectionElement) {
                        var sectionIndex = this.sections.indexOf(sectionElement.winControl);
                        if (sectionIndex > -1) {
                            this._currentIndexForSezo = sectionIndex;
                        }
                    }

                    if (ev.target === this.element) {
                        var indexToFocus;
                        if (+this._sectionToFocus === this._sectionToFocus && this._sectionToFocus >= 0 && this._sectionToFocus < this.sections.length) {
                            indexToFocus = this._sectionToFocus;
                            this._sectionToFocus = null;
                        } else {
                            indexToFocus = this.sectionOnScreen;
                        }

                        this._moveFocusIn(indexToFocus);
                    }
                },
                _moveFocusIn: function hub_moveFocusIn(indexToFocus) {
                    if (indexToFocus >= 0) {
                        for (var i = indexToFocus; i < this.sections.length; i++) {
                            var section = this.sections.getAt(i);

                            var focusAttempt = _ElementUtilities._trySetActive(section._headerTabStopElement, this._viewportElement);

                            if (focusAttempt) {
                                return;
                            }

                            if (_ElementUtilities._setActiveFirstFocusableElement(section.contentElement, this._viewportElement)) {
                                return;
                            }
                        }

                        for (var i = indexToFocus - 1; i >= 0; i--) {
                            var section = this.sections.getAt(i);

                            if (_ElementUtilities._setActiveFirstFocusableElement(section.contentElement, this._viewportElement)) {
                                return;
                            }

                            var focusAttempt = _ElementUtilities._trySetActive(section._headerTabStopElement, this._viewportElement);

                            if (focusAttempt) {
                                return;
                            }
                        }
                    }
                },
                _keyDownHandler: function hub_keyDownHandler(ev) {
                    var leftKey = this._rtl ? Key.rightArrow : Key.leftArrow;
                    var rightKey = this._rtl ? Key.leftArrow : Key.rightArrow;

                        if (ev.keyCode === Key.upArrow || ev.keyCode === Key.downArrow || ev.keyCode === Key.leftArrow || ev.keyCode === Key.rightArrow || ev.keyCode === Key.pageUp || ev.keyCode === Key.pageDown) {
                        var headerTabStopElement = this._findHeaderTabStop(ev.target);
                        if (headerTabStopElement && !this._isHeaderInteractive(ev.target)) {
                            var currentSection = this.sections.indexOf(headerTabStopElement.parentElement.parentElement.winControl);
                            var targetSectionIndex;
                            var useEnsureVisible = false;
                            // Page up/down go to the next/previous header and line it up with the app header. Up/Right/Down/Left
                            // move focus to the next/previous header and move it on screen (app header distance from either edge).
                            if (ev.keyCode === Key.pageDown ||
                                (this.orientation === _UI.Orientation.horizontal && ev.keyCode === rightKey) ||
                                (this.orientation === _UI.Orientation.vertical && ev.keyCode === Key.downArrow)) {
                                // Do not include hidden headers.
                                for (var i = currentSection + 1; i < this.sections.length; i++) {
                                    if (this._tryFocus(i)) {
                                        targetSectionIndex = i;
                                        break;
                                    }
                                }
                            } else if (ev.keyCode === Key.pageUp ||
                                (this.orientation === _UI.Orientation.horizontal && ev.keyCode === leftKey) ||
                                (this.orientation === _UI.Orientation.vertical && ev.keyCode === Key.upArrow)) {
                                // Do not include hidden headers.
                                for (var i = currentSection - 1; i >= 0; i--) {
                                    if (this._tryFocus(i)) {
                                        targetSectionIndex = i;
                                        break;
                                    }
                                }
                            }
                            if (ev.keyCode === Key.upArrow || ev.keyCode === Key.downArrow || ev.keyCode === Key.leftArrow || ev.keyCode === Key.rightArrow) {
                                useEnsureVisible = true;
                            }

                            if (+targetSectionIndex === targetSectionIndex) {
                                if (useEnsureVisible) {
                                    this._ensureVisible(targetSectionIndex, true);
                                } else {
                                    this._scrollToSection(targetSectionIndex, true);
                                }
                            }

                            ev.preventDefault();
                        }
                    } else if (ev.keyCode === Key.home || ev.keyCode === Key.end) {
                        // Home/End scroll to start/end and leave focus where it is.
                        this._measure();
                        var maxScrollPos = Math.max(0, this._scrollLength - this._viewportSize);
                        this._scrollTo(ev.keyCode === Key.home ? 0 : maxScrollPos, true);
                        ev.preventDefault();
                    }
                },
                _tryFocus: function hub_tryFocus(index) {
                    var targetSection = this.sections.getAt(index);

                    _ElementUtilities._setActive(targetSection._headerTabStopElement, this._viewportElement);

                    return _Global.document.activeElement === targetSection._headerTabStopElement;
                },
                /// <field type="Object" locid="WinJS.UI.Hub.zoomableView" helpKeyword="WinJS.UI.Hub.zoomableView" isAdvanced="true">
                /// Gets a ZoomableView. This API supports the SemanticZoom infrastructure
                /// and is not intended to be used directly from your code.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                zoomableView: {
                    get: function zoomableView_get() {
                        if (!this._zoomableView) {
                            this._zoomableView = new ZoomableView(this);
                        }

                        return this._zoomableView;
                    }
                },
                _getPanAxis: function hub_getPanAxis() {
                    return this.orientation === _UI.Orientation.horizontal ? "horizontal" : "vertical";
                },
                _configureForZoom: function hub_configureForZoom() {
                    // Nothing to configure.
                },
                _setCurrentItem: function hub_setCurrentItem(x, y) {
                    var offset;
                    if (this.orientation === _UI.Orientation.horizontal) {
                        offset = x;
                    } else {
                        offset = y;
                    }

                    this._measure();
                    offset = offset + this._scrollPosition;
                    this._currentIndexForSezo = this._sectionSizes.length - 1;
                    for (var i = 1; i < this._sectionSizes.length; i++) {
                        var sectionSize = this._sectionSizes[i];
                        if (sectionSize.offset - sectionSize.marginStart > offset) {
                            this._currentIndexForSezo = i - 1;
                            break;
                        }
                    }
                },
                _getCurrentItem: function hub_getCurrentItem() {
                    var itemPosition;
                    if (this._sectionSizes.length > 0) {
                        this._measure();
                        var index = Math.max(0, Math.min(this._currentIndexForSezo, this._sectionSizes.length));
                        var sectionSize = this._sectionSizes[index];
                        if (this.orientation === _UI.Orientation.horizontal) {
                            itemPosition = {
                                left: Math.max(0, sectionSize.offset - sectionSize.marginStart - this._scrollPosition),
                                top: 0,
                                width: sectionSize.size,
                                height: this._viewportOppositeSize
                            };
                        } else {
                            itemPosition = {
                                left: 0,
                                top: Math.max(0, sectionSize.offset - sectionSize.marginStart - this._scrollPosition),
                                width: this._viewportOppositeSize,
                                height: sectionSize.size,
                            };
                        }

                        var section = this.sections.getAt(index);
                        // BUGBUG: 53301 ListView and Hub should document what they expect to be returned from the
                        // getCurrentItem so that positionItem apis line up. ListView zoomed out expects an object with
                        // groupIndexHint, groupKey, or groupDescription. Hub expects an object with index.
                        return Promise.wrap({ item: { data: section, index: index, groupIndexHint: index }, position: itemPosition });
                    }
                },
                _beginZoom: function hub_beginZoom() {
                    // Hide scroll thumb.
                    this._viewportElement.style["-ms-overflow-style"] = "none";
                },
                _positionItem: function hub_positionItem(item, position) {
                    if (item.index >= 0 && item.index < this._sectionSizes.length) {
                        this._measure();
                        var sectionSize = this._sectionSizes[item.index];

                        var offsetFromViewport;
                        if (this.orientation === _UI.Orientation.horizontal) {
                            offsetFromViewport = position.left;
                        } else {
                            offsetFromViewport = position.top;
                        }

                        this._sectionToFocus = item.index;

                        var targetScrollPosition = sectionSize.offset - offsetFromViewport;
                        // clamp section:
                        var targetScrollPosition = this._ensureVisibleMath(item.index, targetScrollPosition);

                        this._scrollPosition = targetScrollPosition;
                        var newScrollPos = {};
                        newScrollPos[this._names.scrollPos] = this._scrollPosition;
                        _ElementUtilities.setScrollPosition(this._viewportElement, newScrollPos);
                    }
                },
                _endZoom: function hub_endZoom() {
                    // Show scroll thumb.
                    this._viewportElement.style["-ms-overflow-style"] = "";
                },
                _writeProfilerMark: function hub_writeProfilerMark(text) {
                    var message = "WinJS.UI.Hub:" + this._id + ":" + text;
                    _WriteProfilerMark(message);
                    _Log.log && _Log.log(message, null, "hubprofiler");
                },
                dispose: function hub_dispose() {
                    /// <signature helpKeyword="WinJS.UI.Hub.dispose">
                    /// <summary locid="WinJS.UI.Hub.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;

                    _Global.removeEventListener('keydown', this._windowKeyDownHandlerBound);
                    _ElementUtilities._resizeNotifier.unsubscribe(this.element, this._resizeHandlerBound);

                    this._updateEvents(this._sections);

                    for (var i = 0; i < this.sections.length; i++) {
                        this.sections.getAt(i).dispose();
                    }
                }
            }, {
                /// <field locid="WinJS.UI.Hub.AnimationType" helpKeyword="WinJS.UI.Hub.AnimationType">
                /// Specifies whether the Hub animation is an entrance animation or a transition animation.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                AnimationType: {
                    /// <field locid="WinJS.UI.Hub.AnimationType.entrance" helpKeyword="WinJS.UI.Hub.AnimationType.entrance">
                    /// The animation plays when the Hub is first displayed.
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </field>
                    entrance: "entrance",
                    /// <field locid="WinJS.UI.Hub.AnimationType.contentTransition" helpKeyword="WinJS.UI.Hub.AnimationType.contentTransition">
                    /// The animation plays when the Hub is changing its content.
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </field>
                    contentTransition: "contentTransition",
                    /// <field locid="WinJS.UI.Hub.AnimationType.insert" helpKeyword="WinJS.UI.Hub.AnimationType.insert">
                    /// The animation plays when a section is inserted into the Hub.
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </field>
                    insert: "insert",
                    /// <field locid="WinJS.UI.Hub.AnimationType.remove" helpKeyword="WinJS.UI.Hub.AnimationType.remove">
                    /// The animation plays when a section is removed into the Hub.
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </field>
                    remove: "remove",
                },
                /// <field locid="WinJS.UI.Hub.LoadingState" helpKeyword="WinJS.UI.Hub.LoadingState">
                /// Gets the current loading state of the Hub.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                LoadingState: {
                    /// <field locid="WinJS.UI.Hub.LoadingState.loading" helpKeyword="WinJS.UI.Hub.LoadingState.loading">
                    /// The Hub is loading sections.
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </field>
                    loading: "loading",
                    /// <field locid="WinJS.UI.Hub.LoadingState.complete" helpKeyword="WinJS.UI.Hub.LoadingState.complete">
                    /// All sections are loaded and animations are complete.
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </field>
                    complete: "complete"
                },
                // Names of classes used by the Hub.
                _ClassName: {
                    hub: "win-hub",
                    hubSurface: "win-hub-surface",
                    hubProgress: "win-hub-progress",
                    hubViewport: "win-hub-viewport",
                    hubVertical: "win-hub-vertical",
                    hubHorizontal: "win-hub-horizontal",
                },
                // Names of events fired by the Hub.
                _EventName: {
                    contentAnimating: eventNames.contentAnimating,
                    headerInvoked: eventNames.headerInvoked,
                    loadingStateChanged: eventNames.loadingStateChanged
                },
            });

            _Base.Class.mix(Hub, _Control.DOMEventMixin);

            var ZoomableView = _Base.Class.define(function ZoomableView_ctor(hub) {
                this._hub = hub;
            }, {
                getPanAxis: function () {
                    return this._hub._getPanAxis();
                },
                configureForZoom: function (isZoomedOut, isCurrentView, triggerZoom, prefetchedPages) {
                    this._hub._configureForZoom(isZoomedOut, isCurrentView, triggerZoom, prefetchedPages);
                },
                setCurrentItem: function (x, y) {
                    this._hub._setCurrentItem(x, y);
                },
                getCurrentItem: function () {
                    return this._hub._getCurrentItem();
                },
                beginZoom: function () {
                    this._hub._beginZoom();
                },
                positionItem: function (item, position) {
                    return this._hub._positionItem(item, position);
                },
                endZoom: function (isCurrentView) {
                    this._hub._endZoom(isCurrentView);
                }
            });

            var strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get duplicateSection() { return "Hub duplicate sections: Each HubSection must be unique"; },
                get invalidContent() { return "Invalid content: Hub content must be made up of HubSections."; },
                get hubViewportAriaLabel() { return _Resources._getWinJSString("ui/hubViewportAriaLabel").value; }
            };

            return Hub;
        })
    });

});