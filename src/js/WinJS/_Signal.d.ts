// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

import Promise = require("Promise");

declare class _Signal<T> {
    constructor(onCancel?: Function);
    promise: Promise<T>; // readonly
    cancel(): void;
    complete(value?: T): void;
    error(value: any): void;
    progress(value: any): void;
}
export = _Signal;
