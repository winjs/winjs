// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
///<reference path="../../../../typings/winjs/winjs.d.ts" />
export declare var _animationFactor: number;
export declare function _animationTimeAdjustment(adjustment: number): string;
export declare function isAnimationEnabled(): boolean;
export declare function executeTransition(element: HTMLElement, props: any): WinJS.Promise<any>;
