// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
module WinJS.Application {
    "use strict";

    var global:any = self;
    /// <field type="Object" helpKeyword="WinJS.Application.local" locid="WinJS.Application.local">
    /// Allows access to create files in the application local storage, which is preserved across runs
    /// of an application and does not roam.
    /// </field>
    export var local:IStorageHelper;
    /// <field type="Object" helpKeyword="WinJS.Application.temp" locid="WinJS.Application.temp">
    /// Allows access to create files in the application temp storage, which may be reclaimed
    /// by the system between application runs.
    /// </field>
    export var temp:IStorageHelper;
    /// <field type="Object" helpKeyword="WinJS.Application.roaming" locid="WinJS.Application.roaming">
    /// Allows access to create files in the application roaming storage, which is preserved across runs
    /// of an application and roams with the user across multiple machines.
    /// </field>
    export var roaming:IStorageHelper;

    export interface IStorageHelper {
        exists(fileName:string):WinJS.IPromise<boolean>;
        remove(fileName:string):WinJS.IPromise<any>;
        writeText(fileName:string, str:string):WinJS.IPromise<number>;
        readText(fileName:string, def:string):WinJS.IPromise<string>;
    }

    class IOHelper implements IStorageHelper {

        static supportedForProcessing = false;

        private folder:any;
        private _path:string;

        constructor(folder) {
            this.folder = folder;
            this._path = folder.path;
            if (folder.tryGetItemAsync) {
                this._tryGetItemAsync = folder.tryGetItemAsync.bind(folder);
            }

        }

        private _tryGetItemAsync(fileName:string) {
            return this.folder.getFileAsync(fileName).then(null, function () { return false; });
        }

        public exists(fileName:string):WinJS.IPromise<boolean> {
            /// <signature helpKeyword="WinJS.Application.IOHelper.exists">
            /// <summary locid="WinJS.Application.IOHelper.exists">
            /// Determines if the specified file exists in the container
            /// </summary>
            /// <param name="fileName" type="String" locid="WinJS.Application.IOHelper.exists_p:fileName">
            /// The file which may exist within this folder
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Application.IOHelper.exists_returnValue">
            /// Promise with either true (file exists) or false.
            /// </returns>
            /// </signature>
            return this._tryGetItemAsync(fileName).then(function (fileItem) {
                return fileItem ? true : false;
            });
        }   

        public remove(fileName:string):WinJS.IPromise<any> {
            /// <signature helpKeyword="WinJS.Application.IOHelper.remove">
            /// <summary locid="WinJS.Application.IOHelper.remove">
            /// Delets a file in the container
            /// </summary>
            /// <param name="fileName" type="String" locid="WinJS.Application.IOHelper.remove_p:fileName">
            /// The file to be deleted
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Application.IOHelper.remove_returnValue">
            /// Promise which is fulfilled when the file has been deleted
            /// </returns>
            /// </signature>
            var that = this;
            return this._tryGetItemAsync(fileName).then(function (fileItem) {
                return fileItem ? fileItem.deleteAsync() : false;
            }).then(null, function () { return false; });
        }

        public writeText(fileName:string, str:string):WinJS.IPromise<number> {
            /// <signature helpKeyword="WinJS.Application.IOHelper.writeText">
            /// <summary locid="WinJS.Application.IOHelper.writeText">
            /// Writes a file to the container with the specified text
            /// </summary>
            /// <param name="fileName" type="String" locid="WinJS.Application.IOHelper.writeText_p:fileName">
            /// The file to write to
            /// </param>
            /// <param name="str" type="String" locid="WinJS.Application.IOHelper.writeText_p:str">
            /// Content to be written to the file
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Application.IOHelper.writeText_returnValue">
            /// Promise with the count of characters written
            /// </returns>
            /// </signature>
            var sto = Windows.Storage;
            var that = this;
            return that.folder.createFileAsync(fileName, sto.CreationCollisionOption.openIfExists).
                then(function (fileItem) {
                    if (sto.FileIO) {
                        return sto.FileIO.writeTextAsync(fileItem, str);
                    }
                    else {
                        return sto.StorageHelpers.writeAllTextUsingFileAsync(fileItem, str);
                    }
                });
        }

        public readText(fileName:string, def:string):WinJS.IPromise<string> {
            /// <signature helpKeyword="WinJS.Application.IOHelper.readText">
            /// <summary locid="WinJS.Application.IOHelper.readText">
            /// Reads the contents of a file from the container, if the file
            /// doesn't exist, def is returned.
            /// </summary>
            /// <param name="fileName" type="String" locid="WinJS.Application.IOHelper.readText_p:fileName">
            /// The file to read from
            /// </param>
            /// <param name="def" type="String" locid="WinJS.Application.IOHelper.readText_p:def">
            /// Default value to be returned if the file failed to open
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Application.IOHelper.readText_returnValue">
            /// Promise containing the contents of the file, or def.
            /// </returns>
            /// </signature>
            var sto = Windows.Storage;
            return this._tryGetItemAsync(fileName).then(function (fileItem) {
                return fileItem ? sto.FileIO.readTextAsync(fileItem) : def;
            }).then(null, function () { return def; });
        }

    }

    class InMemoryHelper implements IStorageHelper {

        private storage:any;
        static supportedForProcessing = false;

        constructor() {
            this.storage = {};
        }

        public exists(fileName:string):WinJS.IPromise<boolean> {
            /// <signature helpKeyword="WinJS.Application.InMemoryHelper.exists">
            /// <summary locid="WinJS.Application.InMemoryHelper.exists">
            /// Determines if the specified file exists in the container
            /// </summary>
            /// <param name="fileName" type="String" locid="WinJS.Application.InMemoryHelper.exists_p:fileName">
            /// The filename which may exist within this folder
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Application.InMemoryHelper.exists_returnValue">
            /// Promise with either true (file exists) or false.
            /// </returns>
            /// </signature>
            // force conversion to boolean
            //
            return WinJS.Promise.as(this.storage[fileName] !== undefined);
        }

        public remove(fileName:string):WinJS.IPromise<any> {
            /// <signature helpKeyword="WinJS.Application.InMemoryHelper.remove">
            /// <summary locid="WinJS.Application.InMemoryHelper.remove">
            /// Deletes a file in the container
            /// </summary>
            /// <param name="fileName" type="String" locid="WinJS.Application.InMemoryHelper.remove_p:fileName">
            /// The file to be deleted
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Application.InMemoryHelper.remove_returnValue">
            /// Promise which is fulfilled when the file has been deleted
            /// </returns>
            /// </signature>
            delete this.storage[fileName];
            return WinJS.Promise.as();
        }

        public writeText(fileName:string, str:string):WinJS.IPromise<number> {
            /// <signature helpKeyword="WinJS.Application.InMemoryHelper.writeText">
            /// <summary locid="WinJS.Application.InMemoryHelper.writeText">
            /// Writes a file to the container with the specified text
            /// </summary>
            /// <param name="fileName" type="String" locid="WinJS.Application.InMemoryHelper.writeText_p:fileName">
            /// The filename to write to
            /// </param>
            /// <param name="str" type="String" locid="WinJS.Application.InMemoryHelper.writeText_p:str">
            /// Content to be written to the file
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Application.InMemoryHelper.writeText_returnValue">
            /// Promise with the count of characters written
            /// </returns>
            /// </signature>
            this.storage[fileName] = str;
            return WinJS.Promise.as(str.length);
        }
        public readText(fileName:string, def:string):WinJS.IPromise<string> {
            /// <signature helpKeyword="WinJS.Application.InMemoryHelper.readText">
            /// <summary locid="WinJS.Application.InMemoryHelper.readText">
            /// Reads the contents of a file from the container, if the file
            /// doesn't exist, def is returned.
            /// </summary>
            /// <param name="fileName" type="String" locid="WinJS.Application.InMemoryHelper.readText_p:fileName">
            /// The filename to read from
            /// </param>
            /// <param name="def" type="String" locid="WinJS.Application.InMemoryHelper.readText_p:def">
            /// Default value to be returned if the file failed to open
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Application.InMemoryHelper.readText_returnValue">
            /// Promise containing the contents of the file, or def.
            /// </returns>
            /// </signature>
            var result = this.storage[fileName];
            return WinJS.Promise.as(typeof result === "string" ? result : def);
        }


    }

    function initWithWinRT() {
        var local, temp, roaming;

        Object.defineProperties(WinJS.Application, {
            /// <field type="Object" helpKeyword="WinJS.Application.local" locid="WinJS.Application.local">
            /// Allows access to create files in the application local storage, which is preserved across runs
            /// of an application and does not roam.
            /// </field>
            local: {
                get: function () {
                    if (!local) {
                        local = new IOHelper(Windows.Storage.ApplicationData.current.localFolder);
                    }
                    return local;
                },
                enumerable: true
            },
            /// <field type="Object" helpKeyword="WinJS.Application.temp" locid="WinJS.Application.temp">
            /// Allows access to create files in the application temp storage, which may be reclaimed
            /// by the system between application runs.
            /// </field>
            temp: {
                get: function () {
                    if (!temp) {
                        temp = new IOHelper(Windows.Storage.ApplicationData.current.temporaryFolder);
                    }
                    return temp;
                },
                enumerable: true
            },
            /// <field type="Object" helpKeyword="WinJS.Application.roaming" locid="WinJS.Application.roaming">
            /// Allows access to create files in the application roaming storage, which is preserved across runs
            /// of an application and roams with the user across multiple machines.
            /// </field>
            roaming: {
                get: function () {
                    if (!roaming) {
                        roaming = new IOHelper(Windows.Storage.ApplicationData.current.roamingFolder);
                    }
                    return roaming;
                },
                enumerable: true
            }
        });
    };

    function initWithStub() {
        local = new InMemoryHelper();
        temp = new InMemoryHelper();
        roaming = new InMemoryHelper();
    }

    if (WinJS.Utilities.hasWinRT) {
        initWithWinRT();
    }
    else {
        initWithStub();
    }

    
    export var sessionState: {};
    export function _loadState(e):WinJS.IPromise<any> {
        var app = WinJS.Application;

        // we only restore state if we are coming back from a clear termination from PLM
        //
        if (e.previousExecutionState === 3 /* ApplicationExecutionState.Terminated */) {
            return app.local.readText("_sessionState.json", "{}").
                then(function (str) {
                    var sessionState = JSON.parse(str);
                    if (sessionState && Object.keys(sessionState).length > 0) {
                        app._sessionStateLoaded = true;
                    }
                    app.sessionState = sessionState;
                }).
                then(null, function (err) {
                    app.sessionState = {};
                });
        }
        else {
            return WinJS.Promise.as();
        }
    };

    export function _oncheckpoint(e) {
        if (global.MSApp && MSApp.getViewOpener && MSApp.getViewOpener()) {
            // don't save state in child windows.
            return;
        }
        var app = WinJS.Application;
        var sessionState = app.sessionState;
        if ((sessionState && Object.keys(sessionState).length > 0) || app._sessionStateLoaded) {
            var stateString;
            try {
                stateString = JSON.stringify(sessionState)
            } catch (e) {
                stateString = "";
                WinJS.Application.queueEvent({ type: "error", detail: e });
            }
            e.setPromise(
                app.local.writeText("_sessionState.json", stateString).
                    then(null, function (err) {
                        app.queueEvent({ type: "error", detail: err });
                    })
            );
        }
    }
}
