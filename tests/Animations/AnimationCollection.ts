// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

interface IAnimation {
    name: string;
    duration: number;
    hasStagger: boolean;
    delayFactor?: number;
    delay?: number;
    delayCap?: number;
    animationCheckPoint?: number;
}

module AnimationCollection {
    export var Animations:IAnimation[] = [
        { "name": "SlideUp", "duration": 350, "hasStagger": false },
        { "name": "SlideDown", "duration": 250, "hasStagger": false },
        { "name": "SlideLeftIn", "duration": 350, "hasStagger": false },
        { "name": "SlideLeftOut", "duration": 350, "hasStagger": false },
        { "name": "SlideRightIn", "duration": 350, "hasStagger": false },
        { "name": "SlideRightOut", "duration": 350, "hasStagger": false },
        { "name": "TurnstileForwardIn", "duration": 300, "hasStagger": true, "delayFactor": 1, "delay": 50, "delayCap": 1000 },
        { "name": "TurnstileForwardOut", "duration": 128, "hasStagger": true, "delayFactor": 1, "delay": 50, "delayCap": 1000 },
        { "name": "TurnstileBackwardIn", "duration": 300, "hasStagger": true, "delayFactor": 1, "delay": 50, "delayCap": 1000 },
        { "name": "TurnstileBackwardOut", "duration": 128, "hasStagger": true, "delayFactor": 1, "delay": 50, "delayCap": 1000 },
        { "name": "ContinuumForwardIn", "duration": 350, "hasStagger": false },
        { "name": "ContinuumForwardOut", "duration": 152, "hasStagger": false },
        { "name": "ContinuumBackwardIn", "duration": 250, "hasStagger": false },
        { "name": "ContinuumBackwardOut", "duration": 167, "hasStagger": false },
        { "name": "FadeIn", "duration": 250, "hasStagger": false }, //changed duration from 167 -> 250
        { "name": "FadeOut", "duration": 167, "hasStagger": false },
        { "name": "Expand", "duration": 367, "hasStagger": false, animationCheckPoint: 300 },
        { "name": "Collapse", "duration": 534, "hasStagger": false, animationCheckPoint: 90 },
        { "name": "Reposition", "duration": 367, "hasStagger": true, "delay": 33, "delayFactor": 1, "delayCap": 280 },
        { "name": "ShowEdgeUI", "duration": 367, "hasStagger": false, "animationCheckPoint": 200 },
        { "name": "HideEdgeUI", "duration": 367, "hasStagger": false, "animationCheckPoint": 200 },
        { "name": "ShowPanel", "duration": 550, "hasStagger": false, "animationCheckPoint": 300 },
        { "name": "HidePanel", "duration": 550, "hasStagger": false, "animationCheckPoint": 200 },
        { "name": "ShowPopup", "duration": 330, "hasStagger": false, "animationCheckPoint": 150 },
        { "name": "HidePopup", "duration": 330, "hasStagger": false, "animationCheckPoint": 70 },
        { "name": "PointerDown", "duration": 120, "hasStagger": false },
        { "name": "PointerUp", "duration": 120, "hasStagger": false },
        { "name": "DragSourceStart", "duration": 240, "hasStagger": false },
        { "name": "DragSourceEnd", "duration": 500, "hasStagger": false },
        { "name": "DragBetweenEnter", "duration": 200, "hasStagger": false },
        { "name": "DragBetweenLeave", "duration": 200, "hasStagger": false },
        { "name": "SwipeReveal", "duration": 300, "hasStagger": false, "animationCheckPoint": 150 },
        { "name": "SwipeSelect", "duration": 300, "hasStagger": false, "animationCheckPoint": 150 },
        { "name": "SwipeDeselect", "duration": 300, "hasStagger": false, "animationCheckPoint": 150 },
        { "name": "CrossSlideReveal", "duration": 200, "hasStagger": false },
        { "name": "EnterPage", "duration": 1000, "hasStagger": true, "delayFactor": 1, "delay": 83, "delayCap": 250, "animationCheckPoint": 450 },
        { "name": "EnterContent", "duration": 550, "hasStagger": false, "animationCheckPoint": 150 },
        { "name": "ExitContent", "duration": 80, "hasStagger": false, "animationCheckPoint": 60 },
        { "name": "CrossFade", "duration": 480, "hasStagger": false },
        { "name": "TransitionContent", "duration": 1000, "hasStagger": false },
        { "name": "AddToList", "duration": 400, "hasStagger": false, "animationCheckPoint": 325 },
        { "name": "DeleteFromList", "duration": 460, "hasStagger": false, "animationCheckPoint": 80 },
        { "name": "AddToSearchList", "duration": 400, "hasStagger": false },
        { "name": "DeleteFromSearchList", "duration": 460, "hasStagger": false },
        { "name": "Reveal", "duration": 450, "hasStagger": false, "animationCheckPoint": 200 },
        { "name": "Hide", "duration": 200, "hasStagger": false, "animationCheckPoint": 150 },
        { "name": "UpdateBadge", "duration": 1333, "hasStagger": false, "animationCheckPoint": 300 },
        { "name": "Peek", "duration": 2000, "hasStagger": false, "animationCheckPoint": 1000 }
    ];
};

AnimationCollection.Animations = AnimationCollection.Animations.map(function (animation) {
    animation.duration = WinJS.UI._animationTimeAdjustment(animation.duration);
    animation.delay = WinJS.UI._animationTimeAdjustment(animation.delay);
    animation.delayCap = WinJS.UI._animationTimeAdjustment(animation.delayCap);
    return animation;
});
