// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <dictionary>appbar,Flyout,Flyouts,Statics</dictionary>
define([
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Log',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Animations',
    '../_Signal',
    '../_LightDismissService',
    '../Utilities/_Dispose',
    '../Utilities/_ElementUtilities',
    '../Utilities/_KeyboardBehavior',
    '../Utilities/_Hoverable',
    './_LegacyAppBar/_Constants',
    './Flyout/_Overlay'
], function flyoutInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Events, _Log, _Resources, _WriteProfilerMark, Animations, _Signal, _LightDismissService, _Dispose, _ElementUtilities, _KeyboardBehavior, _Hoverable, _Constants, _Overlay) {
    "use strict";

    // Implementation details:
    //
    // The WinJS Flyout is a low policy control for popup ui and can host any arbitrary HTML that an app would like to display. Flyout derives from the private WinJS
    // _Overlay class, and relies on _Overlay to create the hide and show animations as well as fire all beforeshow, aftershow, beforehide, afterhide.  Flyout also has a
    // child class, WinJS Menu, which is a high policy control for popup ui and has many more restrictions on the content it can host.
    //
    // All of the following information pertains to both Flyouts and Menus, but for simplicity only the term flyout is used. Notes on Menu specific implementation details are
    // covered separately in the Menu class.
    //
    // The responsibilities of the WinJS Flyout include:
    //
    //  - On screen positioning:
    //      - A showing Flyout can be positioned in one of two ways
    //          - Relative to another element, as specified by the flyout "anchor", "placement", and "alignment" properties and the flyout.show() method
    //          - At a location specified by a mouse event, as specified in the parameters to the flyout.showAt(MouseEvent) method.
    //      - A shown Flyout always wants to stay within bounds of the visual viewport in the users App. In IE11, Edge, Win 8.1 apps and Win 10 apps, the Flyout uses CSS
    //        position: -ms-device-fixed; which will cause its top, left, bottom & right CSS properties be styled in relation to the visual viewport.
    //      - In other browsers -ms-device-fixed positioning doesn't exist and the Flyout falls back to CSS position: fixed; which will cause its top, left, bottom & right
    //        CSS properties be styled in relation to the layout viewport.
    //      - See http://quirksmode.org/mobile/viewports2.html for more details on the difference between layout viewport and visual viewport.
    //      - Being able to position the Flyout relative to the visual viewport is particularly important in windows 8.1 apps and Windows 10 apps (as opposed to the web),
    //        because the Flyout is also concerned with getting out of the way of the Windows IHM (virtual keyboard). When the IHM starts to show or hide, the Flyout reacts to
    //        a WinRT event, if the IHM would occlude part of a Flyout, the Flyout will move itself  up and out of the way, normally pinning its bottom edge to the top edge of
    //        the IHM.
    //      - Computing this is quite tricky as the IHM is a system pane and not actually in the DOM. Flyout uses the private _KeyboardInfo component to help calculate the top
    //        and bottom coordinates of the "visible document" which is essentially the top and bottom of the visual viewport minus any IHM occlusion.
    //      - The Flyout is not optimized for scenarios involving optical zoom. How and where the Flyout is affected when an optical zoom (pinch zoom) occurs will vary based on
    //        the type of positioning being used for the environment.
    //
    //  - Rendering
    //      - By default the flyout has a minimum height and minmium width defined in CSS, but no maximums, instead preferring to allow its element to  grow to the size of its
    //        content.
    //      - If a showing Flyout would be taller than the height of the "visible document" the flyout's show logic will temporarily constrain the max-height of the flyout
    //        element to fit tightly within the upper and lower bounds of the "visible document", for as long as the flyout remains shown. While in this state the Flyout will
    //        acquire a vertical scrollbar.
    //
    //  - Cascading Behavior:
    //      - Starting in WinJS 4, flyouts, can be cascaded. Previous versions of WinJS did not allow more than one instance of a flyout to be shown at the same time.
    //        Attempting to do so would first cause any other shown flyout to hide.
    //      - Now any flyout can be shown as part of a cascade of other flyouts, allowing any other ancestor flyouts in the same cascade can remain open.
    //      - The Flyout class relies on a private singleton _CascadeManager component to manage all flyouts in the current cascade. Here are some important implementation
    //        details for _CascadeManager:
    //          - The cascade is represented as a stack data structure and should only ever contain flyouts that are shown.
    //          - If only one flyout is shown, it is considered to be in a cascade of length 1.
    //          - A flyout "A" is considered to have an ancestor in the current cascade if flyout A's "anchor" property points to any element contained by ANY of the flyouts
    //            in the current cascade, including the flyout elements themselves.
    //          - Any time a flyout "A" transitions from hidden to shown, it is always added to the top of the stack.
    //              - Only one cascade of flyouts can be shown at a time. If flyout "A" is about to be shown, and has no ancestors in the current cascade, all flyouts in the
    //                current cascade must first be hidden and popped from the stack, then flyout "A" may be shown and pushed into the stack as the head flyout in a new cascade.
    //              - If flyout "A" had an ancestor flyout in the cascade, flyout "A" will be put into the stack directly above its ancestor.
    //              - If in the above scenario, the ancestor flyout already had other descendant flyouts on top of it in the stack, before flyout "A" can finish showing, all of
    //                those flyouts are first popped off the stack and hidden,  then flyout "A" is pushed into the stack directly above its ancestor.
    //          - Any time a flyout "A" is hidden, it is removed from the stack and no longer in the cascade. If that flyout also had any descendant flyouts in the cascade,
    //            they are all hidden and removed from the stack as well. Any of flyout A's ancestor flyouts that were already in the cascade will remain there.
    //
    //  - Light Dismiss
    //      - Cascades of flyouts are light dismissible, but an individual flyout is not.
    //          - The WinJS Flyout implements a private LightDismissableLayer component to track focus and interpret light dismiss cues for all flyouts in the cascade.
    //            The LightDismissableLayer is stored as a property on the _CascadeManager
    //          - Normally when a lightdismissable control loses focus, it would trigger light dismiss, but that is not always the desired scenario for flyouts in the cascade.
    //              - When focus moves from any Flyout in the cascade, to an element outside of the cascade, all flyouts in the cascade should light dismiss.
    //              - When focus moves from an ancestor flyout "A" in the cascade, to descendant flyout "B" also in the cascade, no flyouts should light dismiss. A common
    //                scenario for this is when flyout B first shows itself, since flyouts always take focus immediately after showing.
    //              - When flyout "A" receives focus, all of A's descendant flyouts in the cascade should light dismiss. A common scenario for this is when a user clicks on an
    //                ancestor flyout in the cascade, all descendant flyouts will close. WinJS Menu implements one exception to this rule where sometimes the immediate
    //                descendant of the ancestor flyout would be allowed to remain open.
    //          - The LightDismissibleLayer helps WinJS _LightDismissService dynamically manage the z-indices of all flyouts in the cascade. Flyouts as light dismissable
    //            overlays are subject to the same stacking context pitfalls as any other light dismissible overlay:
    //            https://github.com/winjs/winjs/wiki/Dismissables-and-Stacking-Contexts and therefore every flyout should always be defined as a direct child of the
    //            <body> element.
    //      - Debugging Tip: Light dismiss can make debugging shown flyouts tricky. A good idea is to temporarily suspend the light dismiss cue that triggers when clicking
    //        outside of the current window. This can be achieved by executing the following code in the JavaScript console window:
    //        "WinJS.UI._LightDismissService._setDebug(true)"


    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.Flyout">
        /// Displays lightweight UI that is either informational, or requires user interaction.
        /// Unlike a dialog, a Flyout can be light dismissed by clicking or tapping off of it.
        /// </summary>
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        /// <name locid="WinJS.UI.Flyout_name">Flyout</name>
        /// <icon src="ui_winjs.ui.flyout.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.flyout.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.Flyout"></div>]]></htmlSnippet>
        /// <event name="beforeshow" locid="WinJS.UI.Flyout_e:beforeshow">Raised just before showing a flyout.</event>
        /// <event name="aftershow" locid="WinJS.UI.Flyout_e:aftershow">Raised immediately after a flyout is fully shown.</event>
        /// <event name="beforehide" locid="WinJS.UI.Flyout_e:beforehide">Raised just before hiding a flyout.</event>
        /// <event name="afterhide" locid="WinJS.UI.Flyout_e:afterhide">Raised immediately after a flyout is fully hidden.</event>
        /// <part name="flyout" class="win-flyout" locid="WinJS.UI.Flyout_part:flyout">The Flyout control itself.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        Flyout: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            function getDimension(element, property) {
                return _ElementUtilities.convertToPixels(element, _ElementUtilities._getComputedStyle(element, null)[property]);
            }

            function measureElement(element) {
                return {
                    marginTop: getDimension(element, "marginTop"),
                    marginBottom: getDimension(element, "marginBottom"),
                    marginLeft: getDimension(element, "marginLeft"),
                    marginRight: getDimension(element, "marginRight"),
                    totalWidth: _ElementUtilities.getTotalWidth(element),
                    totalHeight: _ElementUtilities.getTotalHeight(element),
                    contentWidth: _ElementUtilities.getContentWidth(element),
                    contentHeight: _ElementUtilities.getContentHeight(element),
                };
            }

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/flyoutAriaLabel").value; },
                get noAnchor() { return "Invalid argument: Flyout anchor element not found in DOM."; },
                get badPlacement() { return "Invalid argument: Flyout placement should be 'top' (default), 'bottom', 'left', 'right', 'auto', 'autohorizontal', or 'autovertical'."; },
                get badAlignment() { return "Invalid argument: Flyout alignment should be 'center' (default), 'left', or 'right'."; },
                get noCoordinates() { return "Invalid argument: Flyout coordinates must contain a valid x,y pair."; },
            };

            var createEvent = _Events._createEventProperty;

            // _LightDismissableLayer is an ILightDismissable which manages a set of ILightDismissables.
            // It acts as a proxy between the LightDismissService and the light dismissables it manages.
            // It enables multiple dismissables to be above the click eater at the same time.
            var _LightDismissableLayer = _Base.Class.define(function _LightDismissableLayer_ctor(onLightDismiss) {
                this._onLightDismiss = onLightDismiss;
                this._currentlyFocusedClient = null;
                this._clients = []; // Array of ILightDismissables
            }, {
                // Dismissables should call this as soon as they are ready to be shown. More specifically, they should call this:
                //   - After they are in the DOM and ready to receive focus (e.g. style.display cannot be "none")
                //   - Before their entrance animation is played
                shown: function _LightDismissableLayer_shown(client /*: ILightDismissable */) {
                    client._focusable = true;
                    var index = this._clients.indexOf(client);
                    if (index === -1) {
                        this._clients.push(client);
                        client.onShow(this);
                        if (!_LightDismissService.isShown(this)) {
                            _LightDismissService.shown(this);
                        } else {
                            _LightDismissService.updated(this);
                            this._activateTopFocusableClientIfNeeded();
                        }
                    }
                },

                // Dismissables should call this at the start of their exit animation. A "hiding",
                // dismissable will still be rendered with the proper z-index but it will no
                // longer be given focus. Also, focus is synchronously moved out of this dismissable.
                hiding: function _LightDismissableLayer_hiding(client /*: ILightDismissable */) {
                    var index = this._clients.indexOf(client);
                    if (index !== -1) {
                        this._clients[index]._focusable = false;
                        this._activateTopFocusableClientIfNeeded();
                    }
                },

                // Dismissables should call this when they are done being dismissed (i.e. after their exit animation has finished)
                hidden: function _LightDismissableLayer_hidden(client /*: ILightDismissable */) {
                    var index = this._clients.indexOf(client);
                    if (index !== -1) {
                        this._clients.splice(index, 1);
                        client.setZIndex("");
                        client.onHide();
                        if (this._clients.length === 0) {
                            _LightDismissService.hidden(this);
                        } else {
                            _LightDismissService.updated(this);
                            this._activateTopFocusableClientIfNeeded();
                        }
                    }
                },

                keyDown: function _LightDismissableLayer_keyDown(client /*: ILightDismissable */, eventObject) {
                    _LightDismissService.keyDown(this, eventObject);
                },
                keyUp: function _LightDismissableLayer_keyUp(client /*: ILightDismissable */, eventObject) {
                    _LightDismissService.keyUp(this, eventObject);
                },
                keyPress: function _LightDismissableLayer_keyPress(client /*: ILightDismissable */, eventObject) {
                    _LightDismissService.keyPress(this, eventObject);
                },

                // Used by tests.
                clients: {
                    get: function _LightDismissableLayer_clients_get() {
                        return this._clients;
                    }
                },

                _clientForElement: function _LightDismissableLayer_clientForElement(element) {
                    for (var i = this._clients.length - 1; i >= 0; i--) {
                        if (this._clients[i].containsElement(element)) {
                            return this._clients[i];
                        }
                    }
                    return null;
                },

                _focusableClientForElement: function _LightDismissableLayer_focusableClientForElement(element) {
                    for (var i = this._clients.length - 1; i >= 0; i--) {
                        if (this._clients[i]._focusable && this._clients[i].containsElement(element)) {
                            return this._clients[i];
                        }
                    }
                    return null;
                },

                _getTopmostFocusableClient: function _LightDismissableLayer_getTopmostFocusableClient() {
                    for (var i = this._clients.length - 1; i >= 0; i--) {
                        var client = this._clients[i];
                        if (client && client._focusable) {
                            return client;
                        }
                    }
                    return null;
                },

                _activateTopFocusableClientIfNeeded: function _LightDismissableLayer_activateTopFocusableClientIfNeeded() {
                    var topClient = this._getTopmostFocusableClient();
                    if (topClient && _LightDismissService.isTopmost(this)) {
                        // If the last input type was keyboard, use focus() so a keyboard focus visual is drawn.
                        // Otherwise, use setActive() so no focus visual is drawn.
                        var useSetActive = !_KeyboardBehavior._keyboardSeenLast;
                        topClient.onTakeFocus(useSetActive);
                    }
                },

                // ILightDismissable
                //

                setZIndex: function _LightDismissableLayer_setZIndex(zIndex) {
                    this._clients.forEach(function (client, index) {
                        client.setZIndex(zIndex + index);
                    }, this);
                },
                getZIndexCount: function _LightDismissableLayer_getZIndexCount() {
                    return this._clients.length;
                },
                containsElement: function _LightDismissableLayer_containsElement(element) {
                    return !!this._clientForElement(element);
                },
                onTakeFocus: function _LightDismissableLayer_onTakeFocus(useSetActive) {
                    // Prefer the client that has focus
                    var client = this._focusableClientForElement(_Global.document.activeElement);

                    if (!client && this._clients.indexOf(this._currentlyFocusedClient) !== -1 && this._currentlyFocusedClient._focusable) {
                        // Next try the client that had focus most recently
                        client = this._currentlyFocusedClient;
                    }

                    if (!client) {
                        // Finally try the client at the top of the stack
                        client = this._getTopmostFocusableClient();
                    }

                    this._currentlyFocusedClient = client;
                    client && client.onTakeFocus(useSetActive);
                },
                onFocus: function _LightDismissableLayer_onFocus(element) {
                    this._currentlyFocusedClient = this._clientForElement(element);
                    this._currentlyFocusedClient && this._currentlyFocusedClient.onFocus(element);
                },
                onShow: function _LightDismissableLayer_onShow(service /*: ILightDismissService */) { },
                onHide: function _LightDismissableLayer_onHide() {
                    this._currentlyFocusedClient = null;
                },
                onKeyInStack: function _LightDismissableLayer_onKeyInStack(info /*: IKeyboardInfo*/) {
                    // A keyboard event occurred in the light dismiss stack. Notify the flyouts to
                    // give them the opportunity to handle this evnet.
                    var index = this._clients.indexOf(this._currentlyFocusedClient);
                    if (index !== -1) {
                        var clients = this._clients.slice(0, index + 1);
                        for (var i = clients.length - 1; i >= 0 && !info.propagationStopped; i--) {
                            if (clients[i]._focusable) {
                                clients[i].onKeyInStack(info);
                            }
                        }
                    }
                },
                onShouldLightDismiss: function _LightDismissableLayer_onShouldLightDismiss(info) {
                    return _LightDismissService.DismissalPolicies.light(info);
                },
                onLightDismiss: function _LightDismissableLayer_onLightDismiss(info) {
                    this._onLightDismiss(info);
                }
            });

            // Singleton class for managing cascading flyouts
            var _CascadeManager = _Base.Class.define(function _CascadeManager_ctor() {
                var that = this;
                this._dismissableLayer = new _LightDismissableLayer(function _CascadeManager_onLightDismiss(info) {
                    if (info.reason === _LightDismissService.LightDismissalReasons.escape) {
                        that.collapseFlyout(that.getAt(that.length - 1));
                    } else {
                        that.collapseAll();
                    }
                });
                this._cascadingStack = [];
                this._handleKeyDownInCascade_bound = this._handleKeyDownInCascade.bind(this);
                this._inputType = null;
            },
            {
                appendFlyout: function _CascadeManager_appendFlyout(flyoutToAdd) {
                    // PRECONDITION: this.reentrancyLock must be false. appendFlyout should only be called from baseFlyoutShow() which is the function responsible for preventing reentrancy.
                    _Log.log && this.reentrancyLock && _Log.log('_CascadeManager is attempting to append a Flyout through reentrancy.', "winjs _CascadeManager", "error");

                    if (this.indexOf(flyoutToAdd) < 0) {
                        // IF the anchor element for flyoutToAdd is contained within another flyout,
                        // && that flyout is currently in the cascadingStack, consider that flyout to be the parent of flyoutToAdd:
                        //  Remove from the cascadingStack, any subflyout descendants of the parent flyout.
                        // ELSE flyoutToAdd isn't anchored to any of the Flyouts in the existing cascade
                        //  Collapse the entire cascadingStack to start a new cascade.
                        // FINALLY:
                        //  add flyoutToAdd to the end of the cascading stack. Monitor it for events.

                        var collapseFn = this.collapseAll;
                        if (flyoutToAdd._positionRequest instanceof PositionRequests.AnchorPositioning) {
                            var indexOfParentFlyout = this.indexOfElement(flyoutToAdd._positionRequest.anchor);
                            if (indexOfParentFlyout >= 0) {
                                collapseFn = function collapseFn() {
                                    this.collapseFlyout(this.getAt(indexOfParentFlyout + 1));
                                };
                            }
                        }
                        collapseFn.call(this);

                        flyoutToAdd.element.addEventListener("keydown", this._handleKeyDownInCascade_bound, false);
                        this._cascadingStack.push(flyoutToAdd);
                    }
                },
                collapseFlyout: function _CascadeManager_collapseFlyout(flyout) {
                    // Synchronously removes flyout param and its subflyout descendants from the _cascadingStack.
                    // Synchronously calls hide on all removed flyouts.

                    if (!this.reentrancyLock && flyout && this.indexOf(flyout) >= 0) {
                        this.reentrancyLock = true;
                        var signal = new _Signal();
                        this.unlocked = signal.promise;

                        var subFlyout;
                        while (this.length && flyout !== subFlyout) {
                            subFlyout = this._cascadingStack.pop();
                            subFlyout.element.removeEventListener("keydown", this._handleKeyDownInCascade_bound, false);
                            subFlyout._hide(); // We use the reentrancyLock to prevent reentrancy here.
                        }

                        if (this._cascadingStack.length === 0) {
                            // The cascade is empty so clear the input type. This gives us the opportunity
                            // to recalculate the input type when the next cascade starts.
                            this._inputType = null;
                        }

                        this.reentrancyLock = false;
                        this.unlocked = null;
                        signal.complete();
                    }
                },
                flyoutShown: function _CascadeManager_flyoutShown(flyout) {
                    this._dismissableLayer.shown(flyout._dismissable);
                },
                flyoutHiding: function _CascadeManager_flyoutHiding(flyout) {
                    this._dismissableLayer.hiding(flyout._dismissable);
                },
                flyoutHidden: function _CascadeManager_flyoutHidden(flyout) {
                    this._dismissableLayer.hidden(flyout._dismissable);
                },
                collapseAll: function _CascadeManager_collapseAll() {
                    // Empties the _cascadingStack and hides all flyouts.
                    var headFlyout = this.getAt(0);
                    if (headFlyout) {
                        this.collapseFlyout(headFlyout);
                    }
                },
                indexOf: function _CascadeManager_indexOf(flyout) {
                    return this._cascadingStack.indexOf(flyout);
                },
                indexOfElement: function _CascadeManager_indexOfElement(el) {
                    // Returns an index cooresponding to the Flyout in the cascade whose element contains the element in question.
                    // Returns -1 if the element is not contained by any Flyouts in the cascade.
                    var indexOfAssociatedFlyout = -1;
                    for (var i = 0, len = this.length; i < len; i++) {
                        var currentFlyout = this.getAt(i);
                        if (currentFlyout.element.contains(el)) {
                            indexOfAssociatedFlyout = i;
                            break;
                        }
                    }
                    return indexOfAssociatedFlyout;
                },
                length: {
                    get: function _CascadeManager_getLength() {
                        return this._cascadingStack.length;
                    }
                },
                getAt: function _CascadeManager_getAt(index) {
                    return this._cascadingStack[index];
                },
                handleFocusIntoFlyout: function _CascadeManager_handleFocusIntoFlyout(event) {
                    // When a flyout in the cascade recieves focus, we close all subflyouts beneath it.
                    var index = this.indexOfElement(event.target);
                    if (index >= 0) {
                        var subFlyout = this.getAt(index + 1);
                        this.collapseFlyout(subFlyout);
                    }
                },
                // Compute the input type that is associated with the cascading stack on demand. Allows
                // each Flyout in the cascade to adjust its sizing based on the current input type
                // and to do it in a way that is consistent with the rest of the Flyouts in the cascade.
                inputType: {
                    get: function _CascadeManager_inputType_get() {
                        if (!this._inputType) {
                            this._inputType = _KeyboardBehavior._lastInputType;
                        }
                        return this._inputType;
                    }
                },
                // Used by tests.
                dismissableLayer: {
                    get: function _CascadeManager_dismissableLayer_get() {
                        return this._dismissableLayer;
                    }
                },
                _handleKeyDownInCascade: function _CascadeManager_handleKeyDownInCascade(event) {
                    var rtl = _ElementUtilities._getComputedStyle(event.target).direction === "rtl",
                        leftKey = rtl ? Key.rightArrow : Key.leftArrow,
                        target = event.target;

                    if (event.keyCode === leftKey) {
                        // Left key press in a SubFlyout will close that subFlyout and any subFlyouts cascading from it.
                        var index = this.indexOfElement(target);
                        if (index >= 1) {
                            var subFlyout = this.getAt(index);
                            this.collapseFlyout(subFlyout);
                            // Prevent document scrolling
                            event.preventDefault();
                        }
                    } else if (event.keyCode === Key.alt || event.keyCode === Key.F10) {
                        this.collapseAll();
                    }
                }
            });

            var AnimationOffsets = {
                top: { top: "50px", left: "0px", keyframe: "WinJS-showFlyoutTop" },
                bottom: { top: "-50px", left: "0px", keyframe: "WinJS-showFlyoutBottom" },
                left: { top: "0px", left: "50px", keyframe: "WinJS-showFlyoutLeft" },
                right: { top: "0px", left: "-50px", keyframe: "WinJS-showFlyoutRight" },
            };

            var PositionRequests = {
                AnchorPositioning: _Base.Class.define(function AnchorPositioning_ctor(anchor, placement, alignment) {

                    // We want to position relative to an anchor element. Anchor element is required.

                    // Dereference the anchor if necessary
                    if (typeof anchor === "string") {
                        anchor = _Global.document.getElementById(anchor);
                    } else if (anchor && anchor.element) {
                        anchor = anchor.element;
                    }

                    if (!anchor) {
                        // We expect an anchor
                        throw new _ErrorFromName("WinJS.UI.Flyout.NoAnchor", strings.noAnchor);
                    }

                    this.anchor = anchor;
                    this.placement = placement;
                    this.alignment = alignment;
                },
                {
                    getTopLeft: function AnchorPositioning_getTopLeft(flyoutMeasurements, isRtl) {
                        // This determines our positioning.  We have 8 placements, the 1st four are explicit, the last 4 are automatic:
                        // * top - position explicitly on the top of the anchor, shrinking and adding scrollbar as needed.
                        // * bottom - position explicitly below the anchor, shrinking and adding scrollbar as needed.
                        // * left - position left of the anchor, shrinking and adding a vertical scrollbar as needed.
                        // * right - position right of the anchor, shrinking and adding a vertical scroolbar as needed.
                        // * _cascade - Private placement algorithm used by MenuCommand._activateFlyoutCommand.
                        // * auto - Automatic placement.
                        // * autohorizontal - Automatic placement (only left or right).
                        // * autovertical - Automatic placement (only top or bottom).
                        // Auto tests the height of the anchor and the flyout.  For consistency in orientation, we imagine
                        // that the anchor is placed in the vertical center of the display.  If the flyout would fit above
                        // that centered anchor, then we will place the flyout vertically in relation to the anchor, otherwise
                        // placement will be horizontal.
                        // Vertical auto or autovertical placement will be positioned on top of the anchor if room, otherwise below the anchor.
                        //   - this is because touch users would be more likely to obscure flyouts below the anchor.
                        // Horizontal auto or autohorizontal placement will be positioned to the left of the anchor if room, otherwise to the right.
                        //   - this is because right handed users would be more likely to obscure a flyout on the right of the anchor.
                        // All three auto placements will add a vertical scrollbar if necessary.
                        //

                        var anchorBorderBox;

                        try {
                            // Anchor needs to be in DOM.
                            anchorBorderBox = this.anchor.getBoundingClientRect();
                        }
                        catch (e) {
                            throw new _ErrorFromName("WinJS.UI.Flyout.NoAnchor", strings.noAnchor);
                        }

                        var nextLeft;
                        var nextTop;
                        var doesScroll;
                        var nextAnimOffset;
                        var verticalMarginBorderPadding = (flyoutMeasurements.totalHeight - flyoutMeasurements.contentHeight);
                        var nextContentHeight = flyoutMeasurements.contentHeight;

                        function configureVerticalWithScroll(anchorBorderBox) {
                            // Won't fit top or bottom. Pick the one with the most space and add a scrollbar.
                            if (topHasMoreRoom(anchorBorderBox)) {
                                // Top
                                nextContentHeight = spaceAbove(anchorBorderBox) - verticalMarginBorderPadding;
                                nextTop = _Overlay._Overlay._keyboardInfo._visibleDocTop;
                                nextAnimOffset = AnimationOffsets.top;
                            } else {
                                // Bottom
                                nextContentHeight = spaceBelow(anchorBorderBox) - verticalMarginBorderPadding;
                                nextTop = _Constants.pinToBottomEdge;
                                nextAnimOffset = AnimationOffsets.bottom;
                            }
                            doesScroll = true;
                        }

                        // If the anchor is centered vertically, would the flyout fit above it?
                        function fitsVerticallyWithCenteredAnchor(anchorBorderBox, flyoutMeasurements) {
                            // Returns true if the flyout would always fit at least top
                            // or bottom of its anchor, regardless of the position of the anchor,
                            // as long as the anchor never changed its height, nor did the height of
                            // the visualViewport change.
                            return ((_Overlay._Overlay._keyboardInfo._visibleDocHeight - anchorBorderBox.height) / 2) >= flyoutMeasurements.totalHeight;
                        }

                        function spaceAbove(anchorBorderBox) {
                            return anchorBorderBox.top - _Overlay._Overlay._keyboardInfo._visibleDocTop;
                        }

                        function spaceBelow(anchorBorderBox) {
                            return _Overlay._Overlay._keyboardInfo._visibleDocBottom - anchorBorderBox.bottom;
                        }

                        function topHasMoreRoom(anchorBorderBox) {
                            return spaceAbove(anchorBorderBox) > spaceBelow(anchorBorderBox);
                        }

                        // See if we can fit in various places, fitting in the main view,
                        // ignoring viewport changes, like for the IHM.
                        function fitTop(bottomConstraint, flyoutMeasurements) {
                            nextTop = bottomConstraint - flyoutMeasurements.totalHeight;
                            nextAnimOffset = AnimationOffsets.top;
                            return (nextTop >= _Overlay._Overlay._keyboardInfo._visibleDocTop &&
                                    nextTop + flyoutMeasurements.totalHeight <= _Overlay._Overlay._keyboardInfo._visibleDocBottom);
                        }

                        function fitBottom(topConstraint, flyoutMeasurements) {
                            nextTop = topConstraint;
                            nextAnimOffset = AnimationOffsets.bottom;
                            return (nextTop >= _Overlay._Overlay._keyboardInfo._visibleDocTop &&
                                    nextTop + flyoutMeasurements.totalHeight <= _Overlay._Overlay._keyboardInfo._visibleDocBottom);
                        }

                        function fitLeft(leftConstraint, flyoutMeasurements) {
                            nextLeft = leftConstraint - flyoutMeasurements.totalWidth;
                            nextAnimOffset = AnimationOffsets.left;
                            return (nextLeft >= 0 && nextLeft + flyoutMeasurements.totalWidth <= _Overlay._Overlay._keyboardInfo._visualViewportWidth);
                        }

                        function fitRight(rightConstraint, flyoutMeasurements) {
                            nextLeft = rightConstraint;
                            nextAnimOffset = AnimationOffsets.right;
                            return (nextLeft >= 0 && nextLeft + flyoutMeasurements.totalWidth <= _Overlay._Overlay._keyboardInfo._visualViewportWidth);
                        }

                        function centerVertically(anchorBorderBox, flyoutMeasurements) {
                            nextTop = anchorBorderBox.top + anchorBorderBox.height / 2 - flyoutMeasurements.totalHeight / 2;
                            if (nextTop < _Overlay._Overlay._keyboardInfo._visibleDocTop) {
                                nextTop = _Overlay._Overlay._keyboardInfo._visibleDocTop;
                            } else if (nextTop + flyoutMeasurements.totalHeight >= _Overlay._Overlay._keyboardInfo._visibleDocBottom) {
                                // Flag to pin to bottom edge of visual document.
                                nextTop = _Constants.pinToBottomEdge;
                            }
                        }

                        function alignHorizontally(anchorBorderBox, flyoutMeasurements, alignment) {
                            if (alignment === "center") {
                                nextLeft = anchorBorderBox.left + anchorBorderBox.width / 2 - flyoutMeasurements.totalWidth / 2;
                            } else if (alignment === "left") {
                                nextLeft = anchorBorderBox.left;
                            } else if (alignment === "right") {
                                nextLeft = anchorBorderBox.right - flyoutMeasurements.totalWidth;
                            } else {
                                throw new _ErrorFromName("WinJS.UI.Flyout.BadAlignment", strings.badAlignment);
                            }
                            if (nextLeft < 0) {
                                nextLeft = 0;
                            } else if (nextLeft + flyoutMeasurements.totalWidth >= _Overlay._Overlay._keyboardInfo._visualViewportWidth) {
                                // Flag to pin to right edge of visible document.
                                nextLeft = _Constants.pinToRightEdge;
                            }
                        }

                        var currentAlignment = this.alignment;

                        // Check fit for requested placement, doing fallback if necessary
                        switch (this.placement) {
                            case "top":
                                if (!fitTop(anchorBorderBox.top, flyoutMeasurements)) {
                                    // Didn't fit, needs scrollbar
                                    nextTop = _Overlay._Overlay._keyboardInfo._visibleDocTop;
                                    doesScroll = true;
                                    nextContentHeight = spaceAbove(anchorBorderBox) - verticalMarginBorderPadding;
                                }
                                alignHorizontally(anchorBorderBox, flyoutMeasurements, currentAlignment);
                                break;
                            case "bottom":
                                if (!fitBottom(anchorBorderBox.bottom, flyoutMeasurements)) {
                                    // Didn't fit, needs scrollbar
                                    nextTop = _Constants.pinToBottomEdge;
                                    doesScroll = true;
                                    nextContentHeight = spaceBelow(anchorBorderBox) - verticalMarginBorderPadding;
                                }
                                alignHorizontally(anchorBorderBox, flyoutMeasurements, currentAlignment);
                                break;
                            case "left":
                                if (!fitLeft(anchorBorderBox.left, flyoutMeasurements)) {
                                    // Didn't fit, just shove it to edge
                                    nextLeft = 0;
                                }
                                centerVertically(anchorBorderBox, flyoutMeasurements);
                                break;
                            case "right":
                                if (!fitRight(anchorBorderBox.right, flyoutMeasurements)) {
                                    // Didn't fit, just shove it to edge
                                    nextLeft = _Constants.pinToRightEdge;
                                }
                                centerVertically(anchorBorderBox, flyoutMeasurements);
                                break;
                            case "autovertical":
                                if (!fitTop(anchorBorderBox.top, flyoutMeasurements)) {
                                    // Didn't fit above (preferred), so go below.
                                    if (!fitBottom(anchorBorderBox.bottom, flyoutMeasurements)) {
                                        // Didn't fit, needs scrollbar
                                        configureVerticalWithScroll(anchorBorderBox);
                                    }
                                }
                                alignHorizontally(anchorBorderBox, flyoutMeasurements, currentAlignment);
                                break;
                            case "autohorizontal":
                                if (!fitLeft(anchorBorderBox.left, flyoutMeasurements)) {
                                    // Didn't fit left (preferred), so go right.
                                    if (!fitRight(anchorBorderBox.right, flyoutMeasurements)) {
                                        // Didn't fit,just shove it to edge
                                        nextLeft = _Constants.pinToRightEdge;
                                    }
                                }
                                centerVertically(anchorBorderBox, flyoutMeasurements);
                                break;
                            case "auto":
                                // Auto, if the anchor was in the vertical center of the display would we fit above it?
                                if (fitsVerticallyWithCenteredAnchor(anchorBorderBox, flyoutMeasurements)) {
                                    // It will fit above or below the anchor
                                    if (!fitTop(anchorBorderBox.top, flyoutMeasurements)) {
                                        // Didn't fit above (preferred), so go below.
                                        fitBottom(anchorBorderBox.bottom, flyoutMeasurements);
                                    }
                                    alignHorizontally(anchorBorderBox, flyoutMeasurements, currentAlignment);
                                } else {
                                    // Won't fit above or below, try a side
                                    if (!fitLeft(anchorBorderBox.left, flyoutMeasurements) &&
                                        !fitRight(anchorBorderBox.right, flyoutMeasurements)) {
                                        // Didn't fit left or right either
                                        configureVerticalWithScroll(anchorBorderBox);
                                        alignHorizontally(anchorBorderBox, flyoutMeasurements, currentAlignment);
                                    } else {
                                        centerVertically(anchorBorderBox, flyoutMeasurements);
                                    }
                                }
                                break;
                            case "_cascade":

                                // Vertical Alignment:
                                // PREFERRED:
                                // When there is enough room to align a subMenu to either the top or the bottom of its
                                // anchor element, the subMenu prefers to be top aligned.
                                // FALLBACK:
                                // When there is enough room to bottom align a subMenu but not enough room to top align it,
                                // then the subMenu will align to the bottom of its anchor element.
                                // LASTRESORT:
                                // When there is not enough room to top align or bottom align the subMenu to its anchor,
                                // then the subMenu will be center aligned to it's anchor's vertical midpoint.
                                if (!fitBottom(anchorBorderBox.top - flyoutMeasurements.marginTop, flyoutMeasurements) && !fitTop(anchorBorderBox.bottom + flyoutMeasurements.marginBottom, flyoutMeasurements)) {
                                    centerVertically(anchorBorderBox, flyoutMeasurements);
                                }

                                // Cascading Menus should overlap their ancestor menu horizontally by 4 pixels and we have a
                                // unit test to verify that behavior. Because we don't have access to the ancestor flyout we
                                // need to specify the overlap in terms of our anchor element. There is a 1px border around
                                // the menu that contains our anchor we need to overlap our anchor by 3px to ensure that we
                                // overlap the containing Menu by 4px.
                                var horizontalOverlap = 3;

                                // Horizontal Placement:
                                // PREFERRED:
                                // When there is enough room to fit a subMenu on either side of the anchor,
                                // the subMenu prefers to go on the right hand side.
                                // FALLBACK:
                                // When there is only enough room to fit a subMenu on the left side of the anchor,
                                // the subMenu is placed to the left of the parent menu.
                                // LASTRESORT:
                                // When there is not enough room to fit a subMenu on either side of the anchor,
                                // the subMenu is pinned to the right edge of the window.
                                var beginRight = anchorBorderBox.right - flyoutMeasurements.marginLeft - horizontalOverlap;
                                var beginLeft = anchorBorderBox.left + flyoutMeasurements.marginRight + horizontalOverlap;

                                if (isRtl) {
                                    if (!fitLeft(beginLeft, flyoutMeasurements) && !fitRight(beginRight, flyoutMeasurements)) {
                                        // Doesn't fit on either side, pin to the left edge.
                                        nextLeft = 0;
                                        nextAnimOffset = AnimationOffsets.left;
                                    }
                                } else {
                                    if (!fitRight(beginRight, flyoutMeasurements) && !fitLeft(beginLeft, flyoutMeasurements)) {
                                        // Doesn't fit on either side, pin to the right edge of the visible document.
                                        nextLeft = _Constants.pinToRightEdge;
                                        nextAnimOffset = AnimationOffsets.right;
                                    }
                                }

                                break;
                            default:
                                // Not a legal placement value
                                throw new _ErrorFromName("WinJS.UI.Flyout.BadPlacement", strings.badPlacement);
                        }

                        return {
                            left: nextLeft,
                            top: nextTop,
                            animOffset: nextAnimOffset,
                            doesScroll: doesScroll,
                            contentHeight: nextContentHeight,
                            verticalMarginBorderPadding: verticalMarginBorderPadding,
                        };
                    },
                }),
                CoordinatePositioning: _Base.Class.define(function CoordinatePositioning_ctor(coordinates) {
                    // Normalize coordinates since they could be a mouse/pointer event object or an {x,y} pair.
                    if (coordinates.clientX === +coordinates.clientX &&
                        coordinates.clientY === +coordinates.clientY) {

                        var temp = coordinates;

                        coordinates = {
                            x: temp.clientX,
                            y: temp.clientY,
                        };

                    } else if (coordinates.x !== +coordinates.x ||
                        coordinates.y !== +coordinates.y) {

                        // We expect an x,y pair of numbers.
                        throw new _ErrorFromName("WinJS.UI.Flyout.NoCoordinates", strings.noCoordinates);
                    }
                    this.coordinates = coordinates;
                }, {
                    getTopLeft: function CoordinatePositioning_getTopLeft(flyoutMeasurements, isRtl) {
                        // This determines our positioning.
                        // The top left corner of the Flyout border box is rendered at the specified coordinates

                        // Place the top left of the Flyout's border box at the specified coordinates.
                        // If we are in RTL, position the top right of the Flyout's border box instead.
                        var currentCoordinates = this.coordinates;
                        var widthOfBorderBox = (flyoutMeasurements.totalWidth - flyoutMeasurements.marginLeft - flyoutMeasurements.marginRight);
                        var adjustForRTL = isRtl ? widthOfBorderBox : 0;

                        var verticalMarginBorderPadding = (flyoutMeasurements.totalHeight - flyoutMeasurements.contentHeight);
                        var nextContentHeight = flyoutMeasurements.contentHeight;
                        var nextTop = currentCoordinates.y - flyoutMeasurements.marginTop;
                        var nextLeft = currentCoordinates.x - flyoutMeasurements.marginLeft - adjustForRTL;

                        if (nextTop < 0) {
                            // Overran top, pin to top edge.
                            nextTop = 0;
                        } else if (nextTop + flyoutMeasurements.totalHeight > _Overlay._Overlay._keyboardInfo._visibleDocBottom) {
                            // Overran bottom, pin to bottom edge.
                            nextTop = _Constants.pinToBottomEdge;
                        }

                        if (nextLeft < 0) {
                            // Overran left, pin to left edge.
                            nextLeft = 0;
                        } else if (nextLeft + flyoutMeasurements.totalWidth > _Overlay._Overlay._keyboardInfo._visualViewportWidth) {
                            // Overran right, pin to right edge.
                            nextLeft = _Constants.pinToRightEdge;
                        }

                        return {
                            left: nextLeft,
                            top: nextTop,
                            verticalMarginBorderPadding: verticalMarginBorderPadding,
                            contentHeight: nextContentHeight,
                            doesScroll: false,
                            animOffset: AnimationOffsets.top,
                        };
                    },
                }),
            };

            var Flyout = _Base.Class.derive(_Overlay._Overlay, function Flyout_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.Flyout.Flyout">
                /// <summary locid="WinJS.UI.Flyout.constructor">
                /// Creates a new Flyout control.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.Flyout.constructor_p:element">
                /// The DOM element that hosts the control.
                /// </param>
                /// <param name="options" type="Object" domElement="false" locid="WinJS.UI.Flyout.constructor_p:options">
                /// The set of properties and values to apply to the new Flyout.
                /// </param>
                /// <returns type="WinJS.UI.Flyout" locid="WinJS.UI.Flyout.constructor_returnValue">The new Flyout control.</returns>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </signature>

                // Simplify checking later
                options = options || {};

                // Make sure there's an input element
                this._element = element || _Global.document.createElement("div");
                this._id = this._element.id || _ElementUtilities._uniqueID(this._element);
                this._writeProfilerMark("constructor,StartTM");

                this._baseFlyoutConstructor(this._element, options);

                var _elms = this._element.getElementsByTagName("*");
                var firstDiv = this._addFirstDiv();
                firstDiv.tabIndex = _ElementUtilities._getLowestTabIndexInList(_elms);
                var finalDiv = this._addFinalDiv();
                finalDiv.tabIndex = _ElementUtilities._getHighestTabIndexInList(_elms);

                // Handle "esc" & "tab" key presses
                this._element.addEventListener("keydown", this._handleKeyDown, true);

                this._writeProfilerMark("constructor,StopTM");
                return this;
            }, {
                _lastMaxHeight: null,

                _baseFlyoutConstructor: function Flyout_baseFlyoutContstructor(element, options) {
                    // Flyout constructor

                    // We have some options with defaults
                    this._placement = "auto";
                    this._alignment = "center";

                    // Call the base overlay constructor helper
                    this._baseOverlayConstructor(element, options);

                    // Start flyouts hidden
                    this._element.style.visibilty = "hidden";
                    this._element.style.display = "none";

                    // Attach our css class
                    _ElementUtilities.addClass(this._element, _Constants.flyoutClass);

                    var that = this;
                    // Each flyout has an ILightDismissable that is managed through the
                    // CascasdeManager rather than by the _LightDismissService directly.
                    this._dismissable = new _LightDismissService.LightDismissableElement({
                        element: this._element,
                        tabIndex: this._element.hasAttribute("tabIndex") ? this._element.tabIndex : -1,
                        onLightDismiss: function () {
                            that.hide();
                        },
                        onTakeFocus: function (useSetActive) {
                            if (!that._dismissable.restoreFocus()) {
                                if (!_ElementUtilities.hasClass(that.element, _Constants.menuClass)) {
                                    // Put focus on the first child in the Flyout
                                    that._focusOnFirstFocusableElementOrThis();
                                } else {
                                    // Make sure the menu has focus, but don't show a focus rect
                                    _Overlay._Overlay._trySetActive(that._element);
                                }
                            }
                        }
                    });

                    // Make sure we have an ARIA role
                    var role = this._element.getAttribute("role");
                    if (role === null || role === "" || role === undefined) {
                        if (_ElementUtilities.hasClass(this._element, _Constants.menuClass)) {
                            this._element.setAttribute("role", "menu");
                        } else {
                            this._element.setAttribute("role", "dialog");
                        }
                    }
                    var label = this._element.getAttribute("aria-label");
                    if (label === null || label === "" || label === undefined) {
                        this._element.setAttribute("aria-label", strings.ariaLabel);
                    }

                    // Base animation is popIn, but our flyout has different arguments
                    this._currentAnimateIn = this._flyoutAnimateIn;
                    this._currentAnimateOut = this._flyoutAnimateOut;

                    _ElementUtilities._addEventListener(this.element, "focusin", this._handleFocusIn.bind(this), false);
                },

                /// <field type="String" locid="WinJS.UI.Flyout.anchor" helpKeyword="WinJS.UI.Flyout.anchor">
                /// Gets or sets the Flyout control's anchor. The anchor element is the HTML element which the Flyout originates from and is positioned relative to.
                /// (This setting can be overridden when you call the show method.)
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                anchor: {
                    get: function () {
                        return this._anchor;
                    },
                    set: function (value) {
                        this._anchor = value;
                    }
                },

                /// <field type="String" defaultValue="auto" oamOptionsDatatype="WinJS.UI.Flyout.placement" locid="WinJS.UI.Flyout.placement" helpKeyword="WinJS.UI.Flyout.placement">
                /// Gets or sets the default placement of this Flyout. (This setting can be overridden when you call the show method.)
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                placement: {
                    get: function () {
                        return this._placement;
                    },
                    set: function (value) {
                        if (value !== "top" && value !== "bottom" && value !== "left" && value !== "right" && value !== "auto" && value !== "autohorizontal" && value !== "autovertical") {
                            // Not a legal placement value
                            throw new _ErrorFromName("WinJS.UI.Flyout.BadPlacement", strings.badPlacement);
                        }
                        this._placement = value;
                    }
                },

                /// <field type="String" defaultValue="center" oamOptionsDatatype="WinJS.UI.Flyout.alignment" locid="WinJS.UI.Flyout.alignment" helpKeyword="WinJS.UI.Flyout.alignment">
                /// Gets or sets the default alignment for this Flyout. (This setting can be overridden when you call the show method.)
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                alignment: {
                    get: function () {
                        return this._alignment;
                    },
                    set: function (value) {
                        if (value !== "right" && value !== "left" && value !== "center") {
                            // Not a legal alignment value
                            throw new _ErrorFromName("WinJS.UI.Flyout.BadAlignment", strings.badAlignment);
                        }
                        this._alignment = value;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.Flyout.disabled" helpKeyword="WinJS.UI.Flyout.disabled">Disable a Flyout, setting or getting the HTML disabled attribute.  When disabled the Flyout will no longer display with show(), and will hide if currently visible.</field>
                disabled: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return !!this._element.disabled;
                    },
                    set: function (value) {
                        // Force this check into a boolean because our current state could be a bit confused since we tie to the DOM element
                        value = !!value;
                        var oldValue = !!this._element.disabled;
                        if (oldValue !== value) {
                            this._element.disabled = value;
                            if (!this.hidden && this._element.disabled) {
                                this.hide();
                            }
                        }
                    }
                },

                /// <field type="Function" locid="WinJS.UI.Flyout.onbeforeshow" helpKeyword="WinJS.UI.Flyout.onbeforeshow">
                /// Occurs immediately before the control is shown.
                /// </field>
                onbeforeshow: createEvent(_Overlay._Overlay.beforeShow),

                /// <field type="Function" locid="WinJS.UI.Flyout.onaftershow" helpKeyword="WinJS.UI.Flyout.onaftershow">
                /// Occurs immediately after the control is shown.
                /// </field>
                onaftershow: createEvent(_Overlay._Overlay.afterShow),

                /// <field type="Function" locid="WinJS.UI.Flyout.onbeforehide" helpKeyword="WinJS.UI.Flyout.onbeforehide">
                /// Occurs immediately before the control is hidden.
                /// </field>
                onbeforehide: createEvent(_Overlay._Overlay.beforeHide),

                /// <field type="Function" locid="WinJS.UI.Flyout.onafterhide" helpKeyword="WinJS.UI.Flyout.onafterhide">
                /// Occurs immediately after the control is hidden.
                /// </field>
                onafterhide: createEvent(_Overlay._Overlay.afterHide),

                _dispose: function Flyout_dispose() {
                    _Dispose.disposeSubTree(this.element);
                    this._hide();
                    Flyout._cascadeManager.flyoutHidden(this);
                    this.anchor = null;
                },

                show: function (anchor, placement, alignment) {
                    /// <signature helpKeyword="WinJS.UI.Flyout.show">
                    /// <summary locid="WinJS.UI.Flyout.show">
                    /// Shows the Flyout, if hidden, regardless of other states.
                    /// </summary>
                    /// <param name="anchor" type="HTMLElement" domElement="true" locid="WinJS.UI.Flyout.show_p:anchor">
                    /// The DOM element, or ID of a DOM element to anchor the Flyout, overriding the anchor property for this time only.
                    /// </param>
                    /// <param name="placement" type="Object" domElement="false" locid="WinJS.UI.Flyout.show_p:placement">
                    /// The placement of the Flyout to the anchor: 'auto' (default), 'top', 'bottom', 'left', or 'right'.  This parameter overrides the placement property for this show only.
                    /// </param>
                    /// <param name="alignment" type="Object" domElement="false" locid="WinJS.UI.Flyout.show:alignment">
                    /// For 'top' or 'bottom' placement, the alignment of the Flyout to the anchor's edge: 'center' (default), 'left', or 'right'.
                    /// This parameter overrides the alignment property for this show only.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    this._writeProfilerMark("show,StartTM"); // The corresponding "stop" profiler mark is handled in _Overlay._baseEndShow().

                    // Pick up defaults
                    this._positionRequest = new PositionRequests.AnchorPositioning(
                        anchor || this._anchor,
                        placement || this._placement,
                        alignment || this._alignment
                    );

                    this._show();
                },

                _show: function Flyout_show() {
                    this._baseFlyoutShow();
                },

                /// <signature helpKeyword="WinJS.UI.Flyout.showAt">
                /// <summary locid="WinJS.UI.Flyout.showAt">
                /// Shows the Flyout, if hidden, at the specified (x,y) coordinates.
                /// </summary>
                /// <param name="coordinates" type="Object" locid="WinJS.UI.Flyout.showAt_p:coordinates">
                /// An Object specifying the (X,Y) position to render the top left corner of the Flyout. commands to show.
                /// The coordinates object may be a MouseEventObj, or an Object in the shape of {x:number, y:number}.
                /// </param>
                /// </signature>
                showAt: function Flyout_showAt(coordinates) {
                    this._writeProfilerMark("show,StartTM"); // The corresponding "stop" profiler mark is handled in _Overlay._baseEndShow().

                    this._positionRequest = new PositionRequests.CoordinatePositioning(coordinates);

                    this._show();
                },

                hide: function () {
                    /// <signature helpKeyword="WinJS.UI.Flyout.hide">
                    /// <summary locid="WinJS.UI.Flyout.hide">
                    /// Hides the Flyout, if visible, regardless of other states.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    // Just wrap the private one, turning off keyboard invoked flag
                    this._writeProfilerMark("hide,StartTM"); // The corresponding "stop" profiler mark is handled in _Overlay._baseEndHide().
                    this._hide();
                },

                _hide: function Flyout_hide() {

                    // First close all subflyout descendants in the cascade.
                    // Any calls to collapseFlyout through reentrancy should nop.
                    Flyout._cascadeManager.collapseFlyout(this);

                    if (this._baseHide()) {
                        Flyout._cascadeManager.flyoutHiding(this);
                    }
                },

                _beforeEndHide: function Flyout_beforeEndHide() {
                    Flyout._cascadeManager.flyoutHidden(this);
                },

                _baseFlyoutShow: function Flyout_baseFlyoutShow() {
                    if (this.disabled || this._disposed) {
                        // Don't do anything.
                        return;
                    }

                    // If we're animating (eg baseShow is going to fail), or the cascadeManager is in the middle of
                    // updating the cascade, then don't mess up our current state.
                    // Add this flyout to the correct position in the cascadingStack, first collapsing flyouts
                    // in the current stack that are not anchored ancestors to this flyout.
                    Flyout._cascadeManager.appendFlyout(this);

                    // If we're animating (eg baseShow is going to fail), or the cascadeManager is in the
                    // middle of updating the cascade, then we have to try again later.
                    if (this._element.winAnimating) {
                        // Queue us up to wait for the current animation to finish.
                        // _checkDoNext() is always scheduled after the current animation completes.
                        this._doNext = "show";
                    } else if (Flyout._cascadeManager.reentrancyLock) {
                        // Queue us up to wait for the current animation to finish.
                        // Schedule a call to _checkDoNext() for when the cascadeManager unlocks.
                        this._doNext = "show";
                        var that = this;
                        Flyout._cascadeManager.unlocked.then(function () { that._checkDoNext(); });
                    } else {
                        // We call our base _baseShow to handle the actual animation
                        if (this._baseShow()) {
                            // (_baseShow shouldn't ever fail because we tested winAnimating above).
                            if (!_ElementUtilities.hasClass(this.element, "win-menu")) {
                                // Verify that the firstDiv is in the correct location.
                                // Move it to the correct location or add it if not.
                                var _elms = this._element.getElementsByTagName("*");
                                var firstDiv = this.element.querySelectorAll(".win-first");
                                if (this.element.children.length && !_ElementUtilities.hasClass(this.element.children[0], _Constants.firstDivClass)) {
                                    if (firstDiv && firstDiv.length > 0) {
                                        firstDiv.item(0).parentNode.removeChild(firstDiv.item(0));
                                    }

                                    firstDiv = this._addFirstDiv();
                                }
                                firstDiv.tabIndex = _ElementUtilities._getLowestTabIndexInList(_elms);

                                // Verify that the finalDiv is in the correct location.
                                // Move it to the correct location or add it if not.
                                var finalDiv = this.element.querySelectorAll(".win-final");
                                if (!_ElementUtilities.hasClass(this.element.children[this.element.children.length - 1], _Constants.finalDivClass)) {
                                    if (finalDiv && finalDiv.length > 0) {
                                        finalDiv.item(0).parentNode.removeChild(finalDiv.item(0));
                                    }

                                    finalDiv = this._addFinalDiv();
                                }
                                finalDiv.tabIndex = _ElementUtilities._getHighestTabIndexInList(_elms);
                            }

                            Flyout._cascadeManager.flyoutShown(this);
                        }
                    }
                },

                _lightDismiss: function Flyout_lightDismiss() {
                    Flyout._cascadeManager.collapseAll();
                },

                // Find our new flyout position.
                _ensurePosition: function Flyout_ensurePosition() {
                    this._keyboardMovedUs = false;

                    // Remove old height restrictions and scrolling.
                    this._clearAdjustedStyles();

                    this._setAlignment();

                    // Set up the new position, and prep the offset for showPopup.
                    var flyoutMeasurements = measureElement(this._element);
                    var isRtl = _ElementUtilities._getComputedStyle(this._element).direction === "rtl";
                    this._currentPosition = this._positionRequest.getTopLeft(flyoutMeasurements, isRtl);

                    // Adjust position
                    if (this._currentPosition.top < 0) {
                        // Overran bottom, attach to bottom.
                        this._element.style.bottom = _Overlay._Overlay._keyboardInfo._visibleDocBottomOffset + "px";
                        this._element.style.top = "auto";
                    } else {
                        // Normal, set top
                        this._element.style.top = this._currentPosition.top + "px";
                        this._element.style.bottom = "auto";
                    }
                    if (this._currentPosition.left < 0) {
                        // Overran right, attach to right
                        this._element.style.right = "0px";
                        this._element.style.left = "auto";
                    } else {
                        // Normal, set left
                        this._element.style.left = this._currentPosition.left + "px";
                        this._element.style.right = "auto";
                    }

                    // Adjust height/scrollbar
                    if (this._currentPosition.doesScroll) {
                        _ElementUtilities.addClass(this._element, _Constants.scrollsClass);
                        this._lastMaxHeight = this._element.style.maxHeight;
                        this._element.style.maxHeight = this._currentPosition.contentHeight + "px";
                    }

                    // May need to adjust if the IHM is showing.
                    if (_Overlay._Overlay._keyboardInfo._visible) {
                        // Use keyboard logic
                        this._checkKeyboardFit();

                        if (this._keyboardMovedUs) {
                            this._adjustForKeyboard();
                        }
                    }
                },


                _clearAdjustedStyles: function Flyout_clearAdjustedStyles() {
                    // Move to 0,0 in case it is off screen, so that it lays out at a reasonable size
                    this._element.style.top = "0px";
                    this._element.style.bottom = "auto";
                    this._element.style.left = "0px";
                    this._element.style.right = "auto";

                    // Clear height restrictons and scrollbar class
                    _ElementUtilities.removeClass(this._element, _Constants.scrollsClass);
                    if (this._lastMaxHeight !== null) {
                        this._element.style.maxHeight = this._lastMaxHeight;
                        this._lastMaxHeight = null;
                    }

                    // Clear Alignment
                    _ElementUtilities.removeClass(this._element, "win-rightalign");
                    _ElementUtilities.removeClass(this._element, "win-leftalign");
                },

                _setAlignment: function Flyout_setAlignment() {
                    // Alignment
                    switch (this._positionRequest.alignment) {
                        case "left":
                            _ElementUtilities.addClass(this._element, "win-leftalign");
                            break;
                        case "right":
                            _ElementUtilities.addClass(this._element, "win-rightalign");
                            break;
                        default:
                            break;
                    }
                },

                _showingKeyboard: function Flyout_showingKeyboard(event) {
                    if (this.hidden) {
                        return;
                    }

                    // The only way that we can be showing a keyboard when a flyout is up is because the input was
                    // in the flyout itself, in which case we'll be moving ourselves.  There is no practical way
                    // for the application to override this as the focused element is in our flyout.
                    event.ensuredFocusedElementInView = true;

                    // See if the keyboard is going to force us to move
                    this._checkKeyboardFit();

                    if (this._keyboardMovedUs) {
                        // Pop out immediately, then move to new spot
                        this._element.style.opacity = 0;
                        var that = this;
                        _Global.setTimeout(function () { that._adjustForKeyboard(); that._baseAnimateIn(); }, _Overlay._Overlay._keyboardInfo._animationShowLength);
                    }
                },

                _resize: function Flyout_resize() {
                    // If hidden and not busy animating, then nothing to do
                    if (!this.hidden || this._animating) {

                        // This should only happen if the IHM is dismissing,
                        // the only other way is for viewstate changes, which
                        // would dismiss any flyout.
                        if (this._needToHandleHidingKeyboard) {
                            // Hiding keyboard, update our position, giving the anchor a chance to update first.
                            var that = this;
                            _BaseUtils._setImmediate(function () {
                                if (!that.hidden || that._animating) {
                                    that._ensurePosition();
                                }
                            });
                            this._needToHandleHidingKeyboard = false;
                        }
                    }
                },

                // If you were not pinned to the bottom, you might have to be now.
                _checkKeyboardFit: function Flyout_checkKeyboardFit() {
                    // Special Flyout positioning rules to determine if the Flyout needs to adjust its
                    // position because of the IHM. If the Flyout needs to adjust for the IHM, it will reposition
                    // itself to be pinned to either the top or bottom edge of the visual viewport.
                    // - Too Tall, above top, or below bottom.

                    var keyboardMovedUs = false;
                    var viewportHeight = _Overlay._Overlay._keyboardInfo._visibleDocHeight;
                    var adjustedMarginBoxHeight = this._currentPosition.contentHeight + this._currentPosition.verticalMarginBorderPadding;
                    if (adjustedMarginBoxHeight > viewportHeight) {
                        // The Flyout is now too tall to fit in the viewport, pin to top and adjust height.
                        keyboardMovedUs = true;
                        this._currentPosition.top = _Constants.pinToBottomEdge;
                        this._currentPosition.contentHeight = viewportHeight - this._currentPosition.verticalMarginBorderPadding;
                        this._currentPosition.doesScroll = true;
                    } else if (this._currentPosition.top >= 0 &&
                        this._currentPosition.top + adjustedMarginBoxHeight > _Overlay._Overlay._keyboardInfo._visibleDocBottom) {
                        // Flyout clips the bottom of the viewport. Pin to bottom.
                        this._currentPosition.top = _Constants.pinToBottomEdge;
                        keyboardMovedUs = true;
                    } else if (this._currentPosition.top === _Constants.pinToBottomEdge) {
                        // We were already pinned to the bottom, so our position on screen will change
                        keyboardMovedUs = true;
                    }

                    // Signals use of basic fadein animation
                    this._keyboardMovedUs = keyboardMovedUs;
                },

                _adjustForKeyboard: function Flyout_adjustForKeyboard() {
                    // Keyboard moved us, update our metrics as needed
                    if (this._currentPosition.doesScroll) {
                        // Add scrollbar if we didn't already have scrollsClass
                        if (!this._lastMaxHeight) {
                            _ElementUtilities.addClass(this._element, _Constants.scrollsClass);
                            this._lastMaxHeight = this._element.style.maxHeight;
                        }
                        // Adjust height
                        this._element.style.maxHeight = this._currentPosition.contentHeight + "px";
                    }

                    // Update top/bottom
                    this._checkScrollPosition(true);
                },

                _hidingKeyboard: function Flyout_hidingKeyboard() {
                    // If we aren't visible and not animating, or haven't been repositioned, then nothing to do
                    // We don't know if the keyboard moved the anchor, so _keyboardMovedUs doesn't help here
                    if (!this.hidden || this._animating) {

                        // Snap to the final position
                        // We'll either just reveal the current space or resize the window
                        if (_Overlay._Overlay._keyboardInfo._isResized) {
                            // Flag resize that we'll need an updated position
                            this._needToHandleHidingKeyboard = true;
                        } else {
                            // Not resized, update our final position, giving the anchor a chance to update first.
                            var that = this;
                            _BaseUtils._setImmediate(function () {
                                if (!that.hidden || that._animating) {
                                    that._ensurePosition();
                                }
                            });
                        }
                    }
                },

                _checkScrollPosition: function Flyout_checkScrollPosition(showing) {
                    if (this.hidden && !showing) {
                        return;
                    }

                    if (typeof this._currentPosition !== 'undefined') {
                        // May need to adjust top by viewport offset
                        if (this._currentPosition.top < 0) {
                            // Need to attach to bottom
                            this._element.style.bottom = _Overlay._Overlay._keyboardInfo._visibleDocBottomOffset + "px";
                            this._element.style.top = "auto";
                        } else {
                            // Normal, attach to top
                            this._element.style.top = this._currentPosition.top + "px";
                            this._element.style.bottom = "auto";
                        }
                    }
                },

                // AppBar flyout animations
                _flyoutAnimateIn: function Flyout_flyoutAnimateIn() {
                    if (this._keyboardMovedUs) {
                        return this._baseAnimateIn();
                    } else {
                        this._element.style.opacity = 1;
                        this._element.style.visibility = "visible";
                        return Animations.showPopup(this._element, (typeof this._currentPosition !== 'undefined') ? this._currentPosition.animOffset : 0);
                    }
                },

                _flyoutAnimateOut: function Flyout_flyoutAnimateOut() {
                    if (this._keyboardMovedUs) {
                        return this._baseAnimateOut();
                    } else {
                        this._element.style.opacity = 0;
                        return Animations.hidePopup(this._element, (typeof this._currentPosition !== 'undefined') ? this._currentPosition.animOffset : 0);
                    }
                },

                // Hide all other flyouts besides this one
                _hideAllOtherFlyouts: function Flyout_hideAllOtherFlyouts(thisFlyout) {
                    var flyouts = _Global.document.querySelectorAll("." + _Constants.flyoutClass);
                    for (var i = 0; i < flyouts.length; i++) {
                        var flyoutControl = flyouts[i].winControl;
                        if (flyoutControl && !flyoutControl.hidden && (flyoutControl !== thisFlyout)) {
                            flyoutControl.hide();
                        }
                    }
                },

                _handleKeyDown: function Flyout_handleKeyDown(event) {
                    if ((event.keyCode === Key.space || event.keyCode === Key.enter)
                         && (this === _Global.document.activeElement)) {
                        event.preventDefault();
                        event.stopPropagation();
                        this.winControl.hide();
                    } else if (event.shiftKey && event.keyCode === Key.tab
                          && this === _Global.document.activeElement
                          && !event.altKey && !event.ctrlKey && !event.metaKey) {
                        event.preventDefault();
                        event.stopPropagation();
                        this.winControl._focusOnLastFocusableElementOrThis();
                    }
                },

                _handleFocusIn: function Flyout_handleFocusIn(event) {
                    if (!this.element.contains(event.relatedTarget)) {
                        Flyout._cascadeManager.handleFocusIntoFlyout(event);
                    }
                    // Else focus is only moving between elements in the flyout.
                    // Doesn't need to be handled by cascadeManager.
                },

                // Create and add a new first div as the first child
                _addFirstDiv: function Flyout_addFirstDiv() {
                    var firstDiv = _Global.document.createElement("div");
                    firstDiv.className = _Constants.firstDivClass;
                    firstDiv.style.display = "inline";
                    firstDiv.setAttribute("role", "menuitem");
                    firstDiv.setAttribute("aria-hidden", "true");

                    // add to beginning
                    if (this._element.children[0]) {
                        this._element.insertBefore(firstDiv, this._element.children[0]);
                    } else {
                        this._element.appendChild(firstDiv);
                    }

                    var that = this;
                    _ElementUtilities._addEventListener(firstDiv, "focusin", function () { that._focusOnLastFocusableElementOrThis(); }, false);

                    return firstDiv;
                },

                // Create and add a new final div as the last child
                _addFinalDiv: function Flyout_addFinalDiv() {
                    var finalDiv = _Global.document.createElement("div");
                    finalDiv.className = _Constants.finalDivClass;
                    finalDiv.style.display = "inline";
                    finalDiv.setAttribute("role", "menuitem");
                    finalDiv.setAttribute("aria-hidden", "true");

                    this._element.appendChild(finalDiv);
                    var that = this;
                    _ElementUtilities._addEventListener(finalDiv, "focusin", function () { that._focusOnFirstFocusableElementOrThis(); }, false);

                    return finalDiv;
                },

                _writeProfilerMark: function Flyout_writeProfilerMark(text) {
                    _WriteProfilerMark("WinJS.UI.Flyout:" + this._id + ":" + text);
                }
            },
            {
                _cascadeManager: new _CascadeManager(),
            });
            return Flyout;
        })
    });

});