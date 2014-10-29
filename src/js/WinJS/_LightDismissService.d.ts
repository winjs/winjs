// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

interface IShouldReceiveLightDismissInfo {
	reason: string;
	topLevel: boolean;
	stopProgation(): void;
	preventDefault(): void;
}

interface ILightDismissInfo {
	reason: string;
	topLevel: boolean;
}

export interface ILightDismissable {
	ld_shouldReceiveLightDismiss(IShouldReceiveLightDismissInfo): boolean;
	ld_lightDismiss(ILightDismissInfo): void;
	ld_becameTopLevel(): void;
	ld_requiresClickEater(): boolean;
	ld_setZIndex(zIndex: number): void;
	ld_containsElement(element: HTMLElement): boolean;
}

export declare class LightDismissableElement implements ILightDismissable {
	ld_shouldReceiveLightDismiss(IShouldReceiveLightDismissInfo): boolean;
	ld_lightDismiss(ILightDismissInfo): void;
	ld_becameTopLevel(): void;
	ld_requiresClickEater(): boolean;
	ld_setZIndex(zIndex: number): void;
	ld_containsElement(element: HTMLElement): boolean;
}

export declare function shown(client: ILightDismissable): void;
export declare function hidden(client: ILightDismissable): void;
export declare function isTopLevel(client: ILightDismissable): boolean;
export declare function forceLayout(): void;