// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

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
