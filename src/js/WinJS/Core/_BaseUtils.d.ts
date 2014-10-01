// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

export declare var hasWinRT: boolean;
export declare function _setHasWinRT(value: boolean): void;
export declare function _setIsiOS(value: boolean): void;
export declare var hasWinRT: boolean;
export declare function _isiOS(func: any): any;
export declare function _shallowCopy(obj: any): any;
export declare function _merge(a: any, b: any): any;
export declare function _mergeAll(list: any): any;

export interface IBrowserStyleEquivalent {
	cssName: string;
	scriptName: string;
}
export declare var _browserStyleEquivalents: { [styleName: string]: IBrowserStyleEquivalent  };
