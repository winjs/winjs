// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="../TestLib/Helper.ts" />
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />
/// <deploy src="../TestData/" />

module CorsicaTests {

    "use strict";

    var S = WinJS.Utilities.Scheduler;
    var global: any = window;

    function schedulePromise(priority) {
        var s = new WinJS._Signal();
        S.schedule(s.complete.bind(s), priority, null, "Scheduled Promise");
        return s.promise;
    }

    interface IXHRRequest {
        type: string;
        url: string;
        async: boolean;
        user: string;
        password: string;
        headers: any;
    }

    class mockXMLHttpRequest {
        readyState = 0;
        _aborted = false;
        _readyStatePromise = WinJS.Promise.wrap<void>();
        _inheritedSchedulerPriority = S.currentPriority;
        _request: IXHRRequest;
        responseType: string;
        onreadystatechange;
        status: number;
        response;
        responseText: string;


        open(type: string, url: string, async: boolean, user: string, password: string) {

            this._readyStatePromise = this._readyStatePromise.then<void>(() => {
                this._request = {
                    type: type,
                    url: url,
                    async: async,
                    user: user,
                    password: password,
                    headers: {}
                };
                this.responseType = "text";
                this.readyState = 1;

                return this._fireonreadystatechange();
            });
        }

        _fireonreadystatechange() {
            if (this._request.async == true) {
                return WinJS.Promise.timeout().then(() => {
                    if (!this._aborted) {
                        this.onreadystatechange();
                    }
                    return schedulePromise(this._inheritedSchedulerPriority);
                });
            }
            else {
                this.onreadystatechange();
                return schedulePromise(this._inheritedSchedulerPriority);
            }
        }

        setRequestHeader(name, value) {
            this._request.headers[name] = value;
        }

        send(data) {
            this._readyStatePromise = this._readyStatePromise.
                then<void>(() => {
                    this.readyState = 2;
                    return this._fireonreadystatechange();
                }).
                then<void>(() => {
                    var nextState = () => {
                        var response = this.mockResponse(this._request, data);
                        this.status = response.status;
                        if (this.responseType == "blob") {
                            this.response = response.responseText;
                        }
                        else if (this.responseType == "text" || !this.responseType) {
                            this.responseText = response.responseText;
                        }
                        this.readyState = 4;
                        return this._fireonreadystatechange();
                    };

                    if (this._request.async) {
                        return WinJS.Promise.timeout().then(nextState);
                    } else {
                        return nextState();
                    }
                });
        }

        abort() {
            this.readyState = 0;
            this.onreadystatechange = null;
            this.status = 0;
            this._aborted = true;
            this._readyStatePromise.cancel();

            var that = this;
            this._readyStatePromise = WinJS.Promise.wrap().then(function () {
                that.readyState = 0;
                return that._fireonreadystatechange();
            }).then(function () {
                    that.onreadystatechange = null;
                });
        }

        //override me.
        mockResponse(request: IXHRRequest, data: any) {
            return { status: 400, responseText: "" };
        }
    }

    export class XHR {

        testSimpleGet(complete) {
            var oldXHR = global.XMLHttpRequest;
            global.XMLHttpRequest = mockXMLHttpRequest;
            mockXMLHttpRequest.prototype.mockResponse = function (request) {
                LiveUnit.Assert.areEqual('GET', request.type);
                LiveUnit.Assert.areEqual('SimpleFile.txt', request.url);
                LiveUnit.Assert.areEqual(true, request.async);
                return { status: 200, responseText: "42" };
            }

        try {
                var options = {
                    url: 'SimpleFile.txt'
                };

                var callback = function (success, response) {
                    LiveUnit.Assert.areEqual(true, success, "File not successfully retrieved with XHR");
                    LiveUnit.Assert.areEqual("42", response.responseText);
                    complete();
                }

            WinJS.xhr(options).
                    then(
                    function (req) { callback(true, req); },
                    function (req) { callback(false, req); }
                    );
            }
            finally {
                global.XMLHttpRequest = oldXHR;
            }
        }

        testSimpleGetBlob(complete) {
            var oldXHR = global.XMLHttpRequest;
            global.XMLHttpRequest = mockXMLHttpRequest;
            mockXMLHttpRequest.prototype.mockResponse = function (request) {
                LiveUnit.Assert.areEqual('GET', request.type);
                LiveUnit.Assert.areEqual('SimpleFile.txt', request.url);
                LiveUnit.Assert.areEqual('blob', this.responseType);
                LiveUnit.Assert.areEqual(true, request.async);
                return { status: 200, responseText: "42" };
            }

        try {
                var options = { url: 'SimpleFile.txt', responseType: 'blob' };

                var callback = function (success, response) {
                    LiveUnit.Assert.areEqual(true, success, "File not successfully retrieved with XHR");
                    LiveUnit.Assert.areEqual("42", response.response);
                    complete();
                }

            WinJS.xhr(options).
                    then(
                    function (req) { callback(true, req); },
                    function (req) { callback(false, req); }
                    );
            }
            finally {
                global.XMLHttpRequest = oldXHR;
            }
        }

        testSimpleGetError(complete) {
            var oldXHR = global.XMLHttpRequest;
            global.XMLHttpRequest = mockXMLHttpRequest;
            mockXMLHttpRequest.prototype.mockResponse = function (request) {
                LiveUnit.Assert.areEqual('GET', request.type);
                LiveUnit.Assert.areEqual('SimpleFile.txt', request.url);
                LiveUnit.Assert.areEqual(true, request.async);
                return { status: 404, responseText: "" };
            }

        try {
                var options = {
                    url: 'SimpleFile.txt'
                };

                var callback = function (success, response) {
                    LiveUnit.Assert.areEqual(false, success, "Expected file not to be retrieved.");
                    complete();
                }

            WinJS.xhr(options).
                    then(
                    function (req) { callback(true, req); },
                    function (req) { callback(false, req); }
                    );
            }
            finally {
                global.XMLHttpRequest = oldXHR;
            }
        }

        testPost(complete) {
            var oldXHR = global.XMLHttpRequest;
            global.XMLHttpRequest = mockXMLHttpRequest;
            mockXMLHttpRequest.prototype.mockResponse = function (request, data) {
                LiveUnit.Assert.areEqual('POST', request.type);
                LiveUnit.Assert.areEqual('posthandler.aspx', request.url);
                LiveUnit.Assert.areEqual(true, request.async);
                LiveUnit.Assert.areEqual("somedata", data);
                LiveUnit.Assert.areEqual("data1", request.headers["Foo"]);
                LiveUnit.Assert.areEqual("data2", request.headers["Bar"]);
                return { status: 200, responseText: "woot" };
            }

        try {
                var options = {
                    url: 'posthandler.aspx',
                    type: 'POST',
                    data: 'somedata',
                    headers: { "Foo": "data1", "Bar": "data2" }
                }

                var callback = function (success, response) {
                    LiveUnit.Assert.areEqual(true, success);
                    complete();
                }

            WinJS.xhr(options).
                    then(
                    function (req) { callback(true, req); },
                    function (req) { callback(false, req); }
                    );
            }
            finally {
                global.XMLHttpRequest = oldXHR;
            }
        }

        // Verifies that the complete and error handlers of the XHR promise
        //  are executed in the priority context at which the XHR was created.
        //
        testPriorityInheritance(complete) {
            var Scheduler = WinJS.Utilities.Scheduler,
                Priority = Scheduler.Priority,
                oldXHR = global.XMLHttpRequest;
            global.XMLHttpRequest = mockXMLHttpRequest;

            function test(priority, expectSuccess) {
                mockXMLHttpRequest.prototype.mockResponse = function (request, data) {
                    return expectSuccess ?
                        { status: 200, responseText: "woot" } :
                        { status: 404, responseText: "" };
                }

            return new WinJS.Promise(function (subTestComplete) {
                    Scheduler.schedule(function () {
                        var async = false;
                        var options = {
                            url: 'posthandler.aspx',
                            type: 'POST',
                            data: 'somedata',
                            headers: { "Foo": "data1", "Bar": "data2" }
                        }

                        var done = function (success) {
                            LiveUnit.Assert.isTrue(async, "Request should have completed asynchronously relative to creation of XHR");
                            LiveUnit.Assert.areEqual(success, expectSuccess, "Request unexpectedly completed (un)successfully");
                            LiveUnit.Assert.areEqual(priority, Scheduler.currentPriority, "Request completed in wrong priority context");
                            subTestComplete();
                        };

                        WinJS.xhr(options).
                            then(
                            function (req) { done(true); },
                            function (req) { done(false); }
                            );
                        async = true;
                    }, priority);
                });
            }

            var promise = WinJS.Promise.wrap();
            [Priority.high, Priority.normal, Priority.idle].forEach(function (priority) {
                [true, false].forEach(function (success) {
                    promise = promise.then(function () {
                        return test(priority, success);
                    });
                });
            });
            promise.then(function () {
                global.XMLHttpRequest = oldXHR;
                complete();
            });
        }

        testAbort(complete) {
            var oldXHR = global.XMLHttpRequest;
            global.XMLHttpRequest = mockXMLHttpRequest;
            mockXMLHttpRequest.prototype.mockResponse = function (request) {
                return { status: 200, responseText: "42" };
            }

        try {

                var options = {
                    url: 'SimpleFile.txt'
                };

                var hitCompleteCount = 0, hitErrorCount = 0;

                var request = WinJS.xhr(options);
                request.then(
                    function () { hitCompleteCount++; },
                    function () { hitErrorCount++; }
                    );
                request.cancel();
                global.setTimeout(function () {
                    LiveUnit.Assert.areEqual(0, hitCompleteCount);
                    LiveUnit.Assert.areEqual(1, hitErrorCount);
                    complete();
                }, 1);

            }
            finally {
                global.XMLHttpRequest = oldXHR;
            }
        }

        testReadyStateChange(complete) {
            var oldXHR = global.XMLHttpRequest;
            global.XMLHttpRequest = mockXMLHttpRequest;
            mockXMLHttpRequest.prototype.mockResponse = function (request) {
                return { status: 200, responseText: "42" };
            }

        try {
                var options = {
                    url: 'SimpleFile.txt',
                    async: false
                };


                var progress = [
                    { readyState: 1, status: undefined, responseText: undefined },
                    { readyState: 2, status: undefined, responseText: undefined }
                ];
                var progressPos = -1;

                var callback = function (success) {
                    LiveUnit.Assert.areEqual(true, success);
                    LiveUnit.Assert.areEqual(1, progressPos);
                    WinJS.Utilities._setImmediate(complete);
                }

            WinJS.xhr(options).
                    then(
                    function (req) {
                        LiveUnit.Assert.areEqual(4, req.readyState);
                        LiveUnit.Assert.areEqual(200, req.status);
                        LiveUnit.Assert.areEqual("42", req.responseText);
                    },
                    function (req) {
                        LiveUnit.Assert.fail("Response should be successful");
                    },
                    function (req) {
                        var expected = progress[++progressPos];

                        LiveUnit.Assert.areEqual(expected.readyState, req.readyState);
                        LiveUnit.Assert.areEqual(expected.status, req.status);
                        LiveUnit.Assert.areEqual(expected.responseText, req.responseText);
                    }
                    ).then(
                    function () { callback(true); },
                    function () { callback(false); });
            }
            finally {
                global.XMLHttpRequest = oldXHR;
            }
        }

        testXHR100(complete) {

            var fragmentFiles = ["FragmentBasic.html",
                "FragmentFindmeInternal.html",
                "FragmentWithExternalScriptAndStyles.html",
                "FragmentWithScriptAndStyles.html",
                "FragmentWithScriptAndStylesNoBody.html",
                "FragmentWithScriptAndStylesNoBodyNoLoad.html"];

            var numFragments = 200;
            var href;
            var xhrPromises = [];

            for (var i = 0; i < numFragments; i++) {
                // get one of the fragment files from the array
                href = fragmentFiles[i % fragmentFiles.length];
                xhrPromises.push(WinJS.xhr({ url: href }));
            }

            WinJS.Promise.join(xhrPromises).
                done(function (results) {
                    complete();
                },
                function (error) {
                    LiveUnit.Assert.fail("error from Promise.join: " + error);
                    complete();
                });
        }


        testCustomRequestInitializer(complete) {
            var isCallbackCalled = false;

            function customRequestInitializerFunction(req) {
                isCallbackCalled = true;
            }

            var oldXHR = global.XMLHttpRequest;
            global.XMLHttpRequest = mockXMLHttpRequest;
            mockXMLHttpRequest.prototype.mockResponse = function (request, data) {
                return { status: 200, responseText: "" };
            }

        try {
                var options = {
                    url: 'SimpleFile.txt',
                    customRequestInitializer: customRequestInitializerFunction
                };
                //
                var callback = function (success) {
                    LiveUnit.Assert.areEqual(true, isCallbackCalled, "customRequestInitializer is not called");
                    LiveUnit.Assert.areEqual(true, success, "File not successfully retrieved with XHR");
                    complete();
                }

            WinJS.xhr(options).
                    then(
                    function () { callback(true); },
                    function () { callback(false); }
                    );
            }
            finally {
                global.XMLHttpRequest = oldXHR;
            }
        }

        // Cordova returns status of '0' when successfully retrieving local
        // file system resources with the file:// protocol.
        testCordovaXHR(complete) {
            var oldXHR = global.XMLHttpRequest;
            global.XMLHttpRequest = mockXMLHttpRequest;
            mockXMLHttpRequest.prototype.mockResponse = function (request) {
                LiveUnit.Assert.areEqual('GET', request.type);
                LiveUnit.Assert.areEqual('file://SimpleFile.txt', request.url);
                LiveUnit.Assert.areEqual(true, request.async);
                return { status: 0, responseText: "42" };
            }

        try {
                var options = {
                    url: 'file://SimpleFile.txt'
                };

                var callback = function (success, response) {
                    LiveUnit.Assert.areEqual(true, success, "File not successfully retrieved with XHR");
                    LiveUnit.Assert.areEqual("42", response.responseText);
                    complete();
                }

            WinJS.xhr(options).
                    then(
                    function (req) { callback(true, req); },
                    function (req) { callback(false, req); }
                    );
            }
            finally {
                global.XMLHttpRequest = oldXHR;
            }
        }

    };
}

LiveUnit.registerTestClass("CorsicaTests.XHR");