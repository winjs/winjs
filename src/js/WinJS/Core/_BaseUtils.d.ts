﻿// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

import Promise = require("../Promise");

export declare var hasWinRT: boolean;

export declare function _setImmediate(callback: Function): number;
export declare function _setHasWinRT(value: boolean): void;
export declare function _setIsiOS(value: boolean): void;
export declare function _isiOS(func: any): any;
export declare function _shallowCopy(obj: any): any;
export declare function _merge(a: any, b: any): any;
export declare function _mergeAll(list: any): any;
export declare function _yieldForEvents(handler: Function): void;

export interface IBrowserStyleEquivalent {
	cssName: string;
	scriptName: string;
}
export declare var _browserStyleEquivalents: { [styleName: string]: IBrowserStyleEquivalent  };

export declare function ready(callback?: Function, async?: boolean): Promise<void>;
