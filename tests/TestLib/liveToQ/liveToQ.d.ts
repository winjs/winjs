// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

declare module LiveUnit {
    module LoggingCore {
        function logComment(message: string): void;
    }
    module Assert {
        function areEqual(expected: any, actual: any, message?: string): void;
        function areNotEqual(left: any, right: any, message?:string): void;
        function fail(message: string): void;
        function isFalse(falsy: any, message?: string): void;
        function isTrue(truthy: any, message?: string): void;
        function isNull(obj: any, message?: string): void;
        function isNotNull(obj: any, message?: string): void;
    }

    function GetWrappedCallback(func: any): any;
    function registerTestClass(moduleName: string): void;
}