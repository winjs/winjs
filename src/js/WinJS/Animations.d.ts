// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

import Promise = require("Promise");

/**
 * Provides access to the Windows animations. These functions provide developers with the ability to use animations in their custom controls that are consistent with animations used by Windows controls.
**/

//#region Functions

/**
 * Creates an object that performs an animation that adds an item or items to a list.
 * @param added Element or elements to add to the list.
 * @param affected Element or elements affected by the added items.
 * @returns An object whose execute method is used to execute the animation. The execute method returns a Promise that completes when the animation is finished.
**/
export declare function createAddToListAnimation(added: any, affected: any): IAnimationMethodResponse;

/**
 * Creates an object that performs an animation that adds an item or items to a list.
 * @param added Element or elements to add to the list.
 * @param removed Element or elements to remove from the list.
 * @param affected Element or elements affected by the added items.
 * @returns An object whose execute method is used to execute the animation. The execute method returns a Promise that completes when the animation is finished.
**/
export declare function _createUpdateListAnimation(added: any, removed: any, affected: any): IAnimationMethodResponse;

/**
 * Creates an object that performs an animation that adds an item or items to a list of search results.
 * @param added Element or elements to add to the list.
 * @param affected Element or elements affected by the added items.
 * @returns An object whose execute method is used to execute the animation. The execute method returns a Promise that completes when the animation is finished.
**/
export declare function createAddToSearchListAnimation(added: any, affected: any): IAnimationMethodResponse;

/**
 * Creates an object that performs an animation that collapses a list.
 * @param hidden Element or elements hidden as a result of the collapse.
 * @param affected Element or elements affected by the hidden items.
 * @returns An object whose execute method is used to execute the animation. The execute method returns a Promise that completes when the animation is finished.
**/
export declare function createCollapseAnimation(hidden: any, affected: any): IAnimationMethodResponse;

/**
 * Creates an object that performs an animation that removes an item or items from a list.
 * @param deleted Element or elements to delete from the list.
 * @param remaining Element or elements affected by the removal of the deleted items.
 * @returns An object whose execute method is used to execute the animation. The execute method returns a Promise that completes when the animation is finished.
**/
export declare function createDeleteFromListAnimation(deleted: any, remaining: any): IAnimationMethodResponse;

/**
 * Creates an object that performs an animation that removes an item or items from a list of search results.
 * @param deleted Element or elements to delete from the list.
 * @param remaining Element or elements affected by the removal of the deleted items.
 * @returns An object whose execute method is used to execute the animation. The execute method returns a Promise that completes when the animation is finished.
**/
export declare function createDeleteFromSearchListAnimation(deleted: any, remaining: any): IAnimationMethodResponse;

/**
 * Creates an object that performs an animation that expands a list.
 * @param revealed Element or elements revealed by the expansion.
 * @param affected Element or elements affected by the newly revealed items.
 * @returns An object whose execute method is used to execute the animation. The execute method returns a Promise that completes when the animation is finished.
**/
export declare function createExpandAnimation(revealed: any, affected: any): IAnimationMethodResponse;

/**
 * Creates an object that performs a peek animation.
 * @param element Element or elements involved in the peek.
 * @returns An object whose execute method is used to execute the animation. The execute method returns a Promise that completes when the animation is finished.
**/
export declare function createPeekAnimation(element: any): IAnimationMethodResponse;

/**
 * Creates an object that performs an animation that moves an item or items.
 * @param element Element or elements involved in the reposition.
 * @returns An object whose execute method is used to execute the animation. The execute method returns a Promise object that completes when the animation is finished.
**/
export declare function createRepositionAnimation(element: any): IAnimationMethodResponse;

/**
 * Performs an animation that fades an item or items in, fading out existing items that occupy the same space.
 * @param incoming Element or elements being faded in.
 * @param outgoing Element or elements being replaced.
 * @returns An object that completes when the animation has finished.
**/
export declare function crossFade(incoming: any, outgoing: any): Promise<any>;

/**
 * Performs an animation when a dragged object is moved such that dropping it in that position would move other items. The potentially affected items are animated out of the way to show where the object would be dropped.
 * @param target Element or elements that the dragged object would cause to be moved if it were dropped.
 * @param offset Initial offsets where the animated objects begin relative to their final position at the end of the animation. Set this parameter to null to use the recommended default offset. Note When the incoming parameter specifies an array of elements, the offset parameter can specify an offset array with each item specified for its corresponding element array item. If the array of offsets is smaller than the array of elements, the last offset is applied to all remaining elements.
 * @returns An object that completes when the animation is finished.
**/
export declare function dragBetweenEnter(target: any, offset?: any): Promise<any>;

/**
 * Performs an animation when a dragged object is moved away from items that it had previously involved in a dragBetweenEnter animation. The affected objects are animated back to their original positions.
 * @param target Element or elements that the dragged object would no longer cause to be displaced, due to its moving away. This should be the same element or element collection passed as the target parameter in the dragBetweenEnter animation.
 * @returns An object that completes when the animation is finished.
**/
export declare function dragBetweenLeave(target: any): Promise<any>;

/**
 * Performs an animation when the user finishes dragging an object.
 * @param dragSource Element or elements that were dragged.
 * @param offset Initial offset from the drop point. The dropped object begins at the offset and animates to its final position at the drop point. Note When the element parameter specifies an array of elements, the offset parameter can specify an offset array with each item specified for its corresponding element array item. If the array of offsets is smaller than the array of elements, the last offset is applied to all remaining elements.
 * @param affected Element or elements whose position the dropped object affects. Typically, this is all other items in a reorderable list. This should be the same element or element collection passed as the affected parameter in the dragSourceStart animation.
 * @returns An object that completes when the animation is finished.
**/
export declare function dragSourceEnd(dragSource: any, offset?: any, affected?: any): Promise<any>;

/**
 * Performs an animation when the user begins to drag an object.
 * @param dragSource Element or elements being dragged.
 * @param affected Element or elements whose position is affected by the movement of the dragged object. Typically, this is all other items in a reorderable list.
 * @returns An object that completes when the animation is finished.
**/
export declare function dragSourceStart(dragSource: any, affected?: any): Promise<any>;

/**
 * Performs an animation that displays one or more elements on a page.
 * @param incoming Element or elements that compose the incoming content.
 * @param offset Initial offsets where the animated objects begin relative to their final position at the end of the animation. Set this parameter to null to use the recommended default offset. Note When the incoming parameter specifies an array of elements, the offset parameter can specify an offset array with each item specified for its corresponding element array item. If the array of offsets is smaller than the array of elements, the last offset is applied to all remaining elements.
 * @param options Optional. Set this value to { mechanism: "transition" } to play the animation using CSS transitions instead of the default CSS animations. In some cases this can result in improved performance.
 * @returns An object that completes when the animation is finished.
**/
export declare function enterContent(incoming: any, offset?: any, options?: any): Promise<any>;

/**
 * Performs an animation that shows a new page of content, either when transitioning between pages in a running app or when displaying the first content in a newly launched app.
 * @param element Element or an array of elements that represent the content. If element refers to an array of elements, the elements enter in array order.
 * @param offset An initial offset where the element or elements begin relative to their final position at the end of the animation. Set this parameter to null to use the recommended default offset. Note When the element parameter specifies an array of elements, the offset parameter can specify an offset array with each item specified for its corresponding element array item. If the array of offsets is smaller than the array of elements, the last offset is applied to all remaining elements.
 * @returns An object that completes when the animation is finished.
**/
export declare function enterPage(element: any, offset?: any): Promise<any>;

/**
 * Performs an animation that hides one or more elements on a page.
 * @param outgoing Element or elements that compose the outgoing content.
 * @param offset Initial offsets where the animated objects begin relative to their final position at the end of the animation. Set this parameter to null to use the recommended default offset. Note When the incoming parameter specifies an array of elements, the offset parameter can specify an offset array with each item specified for its corresponding element array item. If the array of offsets is smaller than the array of elements, the last offset is applied to all remaining elements.
 * @returns An object that completes when the animation is finished.
**/
export declare function exitContent(outgoing: any, offset?: any): Promise<any>;

/**
 * Performs an animation that dismisses the current page when transitioning between pages in an app.
 * @param outgoing Element or elements that compose the outgoing page.
 * @param offset Initial offsets where the animated objects begin relative to their final position at the end of the animation. Set this parameter to null to use the recommended default offset. Note When the incoming parameter specifies an array of elements, the offset parameter can specify an offset array with each item specified for its corresponding element array item. If the array of offsets is smaller than the array of elements, the last offset is applied to all remaining elements.
 * @returns An object that completes when the animation is finished.
**/
export declare function exitPage(outgoing: any, offset?: any): Promise<any>;

/**
 * Performs an animation that fades an item or set of items into view.
 * @param shown Element or elements being faded in.
 * @returns An object that completes when the animation has finished. Use this object when subsequent actions need this animation to finish before they take place.
**/
export declare function fadeIn(shown: any): Promise<any>;

/**
 * Performs an animation that fades an item or set of items out of view.
 * @param hidden Element or elements being faded out.
 * @returns An object that completes when the animation is finished.
**/
export declare function fadeOut(hidden: any): Promise<any>;

/**
 * Performs an animation that hides edge-based user interface (UI).
 * @param element Element or elements that are being hidden.
 * @param offset Initial offsets where the animated objects begin relative to their final position at the end of the animation. Offsets should be the chosen so that the elements end the animation just off-screen. Note When the element parameter specifies an array of elements, the offset parameter can specify an offset array with each item specified for its corresponding element array item. If the array of offsets is smaller than the array of elements, the last offset is applied to all remaining elements.
 * @param options Optional. Set this value to { mechanism: "transition" } to play the animation using CSS transitions instead of the default CSS animations. In some cases this can result in improved performance.
 * @returns An object that completes when the animation is finished.
**/
export declare function hideEdgeUI(element: any, offset?: any, options?: any): Promise<any>;

/**
 * Performs an animation that hides a panel.
 * @param element Element or elements that are being hidden.
 * @param offset Initial offsets where the animated objects begin relative to their final position at the end of the animation. Offsets should be the chosen so that the elements end the animation just off-screen. Note When the element parameter specifies an array of elements, the offset parameter can specify an offset array with each item specified for its corresponding element array item. If the array of offsets is smaller than the array of elements, the last offset is applied to all remaining elements.
 * @returns An object that completes when the animation is finished.
**/
export declare function hidePanel(element: any, offset?: any): Promise<any>;

/**
 * Performs an animation that removes pop-up user interface (UI).
 * @param element Element or elements that are being hidden.
 * @returns An object that completes when the animation is finished.
**/
export declare function hidePopup(element: any): Promise<any>;

/**
 * Performs an animation when a pointer is pressed on an object.
 * @param element Element or elements on which the pointer is pressed.
 * @returns An object that completes when the animation is finished.
**/
export declare function pointerDown(element: any): Promise<any>;

/**
 * Performs an animation when a pointer is released.
 * @param element Element or elements that the pointer was pressed on.
 * @returns An object that completes when the animation is finished.
**/
export declare function pointerUp(element: any): Promise<any>;

/**
 * Performs an animation that slides a narrow, edge-based user interface (UI) into view.
 * @param element Element or elements that are being shown.
 * @param offset Initial offsets where the animated objects begin relative to their final position at the end of the animation. Offsets should be the chosen so that the elements begin the animation from just off-screen. Note When the element parameter specifies an array of elements, the offset parameter can specify an offset array with each item specified for its corresponding element array item. If the array of offsets is smaller than the array of elements, the last offset is applied to all remaining elements.
 * @param options Optional. Set this value to { mechanism: "transition" } to play the animation using CSS transitions instead of the default CSS animations. In some cases this can result in improved performance.
 * @returns An object that completes when the animation is finished.
**/
export declare function showEdgeUI(element: any, offset?: any, options?: any): Promise<any>;

/**
 * Performs an animation that slides a large panel user interface (UI) into view.
 * @param element Element or elements that are being shown.
 * @param offset Initial offsets where the animated objects begin relative to their final position at the end of the animation. Offsets should be the chosen so that the elements begin the animation from just off-screen. Note When the element parameter specifies an array of elements, the offset parameter can specify an offset array with each item specified for its corresponding element array item. If the array of offsets is smaller than the array of elements, the last offset is applied to all remaining elements.
 * @returns An object that completes when the animation is finished.
**/
export declare function showPanel(element: any, offset?: any): Promise<any>;

/**
 * Performs an animation that displays a pop-up user interface (UI).
 * @param element Element or elements that are being shown.
 * @param offset Initial offsets where the animated objects begin relative to their final position at the end of the animation. Offsets should be the chosen so that the elements begin the animation from just off-screen. Set this parameter to null to use the recommended default offset. Note When the element parameter specifies an array of elements, the offset parameter can specify an offset array with each item specified for its corresponding element array item. If the array of offsets is smaller than the array of elements, the last offset is applied to all remaining elements.
 * @returns An object that completes when the animation is finished.
**/
export declare function showPopup(element: any, offset?: any): Promise<any>;

/**
 * Performs a deselection animation in response to a swipe interaction.
 * @param deselected Element or elements that become unselected.
 * @param selection Element or elements that represent the selection, typically a check mark.
 * @returns An object that completes when the animation is finished.
**/
export declare function swipeDeselect(deselected: any, selection: any): Promise<any>;

/**
 * Performs an animation that reveals an item or items in response to a swipe interaction.
 * @param target Element or elements being revealed.
 * @param offset An initial offset where the animated objects begin relative to their final position at the end of the animation. Set this parameter to null to use the recommended default offset. Note When the incoming parameter specifies an array of elements, the offset parameter can specify an offset array with each item specified for its corresponding element array item. If the array of offsets is smaller than the array of elements, the last offset is applied to all remaining elements.
 * @returns An object that completes when the animation is finished.
**/
export declare function swipeReveal(target: any, offset?: any): Promise<any>;

/**
 * Performs a selection animation in response to a swipe interaction.
 * @param selected Element or elements being selected.
 * @param selection Element or elements that show that something is selected, typically a check mark.
 * @returns An object that completes when the animation is finished.
**/
export declare function swipeSelect(selected: any, selection: any): Promise<any>;

/**
 * Performs an animation that updates a badge.
 * @param incoming Element or elements that comprise the new badge.
 * @param offset Initial offsets where incoming animated objects begin relative to their final position at the end of the animation. Set this parameter to null to use the recommended default offset. Note When the incoming parameter specifies an array of elements, the offset parameter can specify an offset array with each item specified for its corresponding element array item. If the array of offsets is smaller than the array of elements, the last offset is applied to all remaining elements.
 * @returns An object that completes when the animation is finished.
**/
export declare function updateBadge(incoming: any, offset?: any): Promise<any>;

/**
 * Execute a slide up animation.
 * @param incoming Single element or collection of elements to animate sliding up.
 * @returns A Promise that completes when the animation is finished.
**/
export declare function slideUp(incoming: any): Promise<any>;

/**
 * Execute a slide down animation.
 * @param incoming Single element or collection of elements to animate sliding down.
 * @returns A Promise that completes when the animation is finished.
**/
export declare function slideDown(incoming: any): Promise<any>;

/**
 * Execute a slide in from right to left animation.
 * @param page The page containing all elements to slide.
 * @param first First element or collection of elements to animate sliding in.
 * @param second Second element or collection of elements to animate sliding in, which will be offset slightly farther than the first.
 * @param third Third element or collection of elements to animate sliding in, which will be offset slightly farther than the second.
 * @returns A Promise that completes when the animation is finished.
**/
export declare function slideLeftIn(page: any, first: any, second: any, third: any): Promise<any>;

/**
 * Execute a slide out from right to left animation.
 * @param page The page containing all elements to slide.
 * @param first First element or collection of elements to animate sliding out.
 * @param second Second element or collection of elements to animate sliding out, which will be offset slightly farther than the first.
 * @param third Third element or collection of elements to animate sliding out, which will be offset slightly farther than the second.
 * @returns A Promise that completes when the animation is finished.
**/
export declare function slideLeftOut(page: any, first: any, second: any, third: any): Promise<any>;

/**
 * Execute a slide in from left to right animation.
 * @param page The page containing all elements to slide.
 * @param first First element or collection of elements to animate sliding in.
 * @param second Second element or collection of elements to animate sliding in, which will be offset slightly farther than the first.
 * @param third Third element or collection of elements to animate sliding in, which will be offset slightly farther than the second.
 * @returns A Promise that completes when the animation is finished.
**/
export declare function slideRightIn(page: any, first: any, second: any, third: any): Promise<any>;

/**
 * Execute a slide out from left to right animation.
 * @param page The page containing all elements to slide.
 * @param first First element or collection of elements to animate sliding out.
 * @param second Second element or collection of elements to animate sliding out, which will be offset slightly farther than the first.
 * @param third Third element or collection of elements to animate sliding out, which will be offset slightly farther than the second.
 * @returns A Promise that completes when the animation is finished.
**/
export declare function slideRightOut(page: any, first: any, second: any, third: any): Promise<any>;

/**
 * Execute a continuum animation, scaling up the incoming page while scaling, rotating, and translating the incoming item.
 * @param page Single element to be scaled up that is the page root and does not contain the incoming item.
 * @param itemRoot Root of the item that will be translated as part of the continuum animation.
 * @param itemContent Content of the item that will be scaled and rotated as part of the continuum animation.
 * @returns A Promise that completes when the animation is finished.
**/
export declare function continuumForwardIn(page: any, itemRoot: any, itemContent: any): Promise<any>;

/**
 * Execute a continuum animation, scaling down the outgoing page while scaling, rotating, and translating the outgoing item.
 * @param page Single element to be scaled down that is the page root and contains the outgoing item.
 * @param item Single element to be scaled, rotated, and translated away from the outgoing page.
 * @returns A Promise that completes when the animation is finished.
**/
export declare function continuumForwardOut(page: any, item: any): Promise<any>;

/**
 * Execute a continuum animation, scaling down the incoming page while scaling, rotating, and translating the incoming item.
 * @param page Single element to be scaled down that is the page root and contains the incoming item.
 * @param item Single element to be scaled, rotated, and translated into its final position on the page.
 * @returns A Promise that completes when the animation is finished.
**/
export declare function continuumBackwardIn(page: any, item: any): Promise<any>;

/**
 * Execute a continuum animation, scaling down the outgoing page while.
 * @param page Single element to be scaled down that is the page root.
 * @returns A Promise that completes when the animation is finished.
**/
export declare function continuumBackwardOut(page: any): Promise<any>;

/**
 * Execute a turnstile forward in animation.
 * @param incoming Single element or collection of elements to animate.
 * @returns A Promise that completes when the animation is finished.
**/
export declare function turnstileForwardIn(incoming: any): Promise<any>;

/**
 * Execute a turnstile forward out animation.
 * @param outgoing Single element or collection of elements to animate.
 * @returns A Promise that completes when the animation is finished.
**/
export declare function turnstileForwardOut(outgoing: any): Promise<any>;

/**
 * Execute a turnstile backward in animation.
 * @param incoming Single element or collection of elements to animate.
 * @returns A Promise that completes when the animation is finished.
**/
export declare function turnstileBackwardIn(incoming: any): Promise<any>;

/**
 * Execute a turnstile backward out animation.
 * @param outgoing Single element or collection of elements to animate.
 * @returns A Promise that completes when the animation is finished.
**/
export declare function turnstileBackwardOut(outgoing: any): Promise<any>;


//#endregion export declare functions

//#region Interfaces

export interface IAnimationMethodResponse {
    execute(): Promise<any>;
}

//#endregion Interfaces

