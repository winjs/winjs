// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../Core/_Global',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Promise'
    ], function stateInit(exports, _Global, _WinRT, _Base, _BaseUtils, Promise) {
    "use strict";

    function initWithWinRT() {
        var local, temp, roaming;

        var IOHelper = _Base.Class.define(
        function IOHelper_ctor(folder) {
            this.folder = folder;
            this._path = folder.path;
            if (folder.tryGetItemAsync) {
                this._tryGetItemAsync = folder.tryGetItemAsync.bind(folder);
            }
        }, {
            _tryGetItemAsync: function (fileName) {
                return this.folder.getFileAsync(fileName).then(null, function () { return false; });
            },

            exists: function (fileName) {
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
            },
            remove: function (fileName) {
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
                return this._tryGetItemAsync(fileName).then(function (fileItem) {
                    return fileItem ? fileItem.deleteAsync() : false;
                }).then(null, function () { return false; });
            },
            writeText: function (fileName, str) {
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
                var sto = _WinRT.Windows.Storage;
                var that = this;
                return that.folder.createFileAsync(fileName, sto.CreationCollisionOption.openIfExists).
                    then(function (fileItem) {
                        return sto.FileIO.writeTextAsync(fileItem, str);
                    });
            },

            readText: function (fileName, def) {
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
                var sto = _WinRT.Windows.Storage;
                return this._tryGetItemAsync(fileName).then(function (fileItem) {
                    return fileItem ? sto.FileIO.readTextAsync(fileItem) : def;
                }).then(null, function () { return def; });
            }

        }, {
            supportedForProcessing: false,
        });

        _Base.Namespace._moduleDefine(exports, "WinJS.Application", {
            /// <field type="Object" helpKeyword="WinJS.Application.local" locid="WinJS.Application.local">
            /// Allows access to create files in the application local storage, which is preserved across runs
            /// of an application and does not roam.
            /// </field>
            local: {
                get: function () {
                    if (!local) {
                        local = new IOHelper(_WinRT.Windows.Storage.ApplicationData.current.localFolder);
                    }
                    return local;
                }
            },
            /// <field type="Object" helpKeyword="WinJS.Application.temp" locid="WinJS.Application.temp">
            /// Allows access to create files in the application temp storage, which may be reclaimed
            /// by the system between application runs.
            /// </field>
            temp: {
                get: function () {
                    if (!temp) {
                        temp = new IOHelper(_WinRT.Windows.Storage.ApplicationData.current.temporaryFolder);
                    }
                    return temp;
                }
            },
            /// <field type="Object" helpKeyword="WinJS.Application.roaming" locid="WinJS.Application.roaming">
            /// Allows access to create files in the application roaming storage, which is preserved across runs
            /// of an application and roams with the user across multiple machines.
            /// </field>
            roaming: {
                get: function () {
                    if (!roaming) {
                        roaming = new IOHelper(_WinRT.Windows.Storage.ApplicationData.current.roamingFolder);
                    }
                    return roaming;
                }
            }
        });
    }

    function initWithStub() {
        var InMemoryHelper = _Base.Class.define(
            function InMemoryHelper_ctor() {
                this.storage = {};
            }, {
                exists: function (fileName) {
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
                    return Promise.as(this.storage[fileName] !== undefined);
                },
                remove: function (fileName) {
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
                    return Promise.as();
                },
                writeText: function (fileName, str) {
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
                    return Promise.as(str.length);
                },
                readText: function (fileName, def) {
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
                    return Promise.as(typeof result === "string" ? result : def);
                }
            }, {
                supportedForProcessing: false,
            }
        );

        _Base.Namespace._moduleDefine(exports, "WinJS.Application", {
            /// <field type="Object" helpKeyword="WinJS.Application.local" locid="WinJS.Application.local">
            /// Allows access to create files in the application local storage, which is preserved across runs
            /// of an application and does not roam.
            /// </field>
            local: new InMemoryHelper(),
            /// <field type="Object" helpKeyword="WinJS.Application.temp" locid="WinJS.Application.temp">
            /// Allows access to create files in the application temp storage, which may be reclaimed
            /// by the system between application runs.
            /// </field>
            temp: new InMemoryHelper(),
            /// <field type="Object" helpKeyword="WinJS.Application.roaming" locid="WinJS.Application.roaming">
            /// Allows access to create files in the application roaming storage, which is preserved across runs
            /// of an application and roams with the user across multiple machines.
            /// </field>
            roaming: new InMemoryHelper()
        });
    }

    if (_WinRT.Windows.Storage.FileIO && _WinRT.Windows.Storage.ApplicationData && _WinRT.Windows.Storage.CreationCollisionOption) {
        initWithWinRT();
    } else {
        initWithStub();
    }

    var sessionState = {};

    _Base.Namespace._moduleDefine(exports, "WinJS.Application", {
        sessionState: {
            get: function() {
                return sessionState;
            },
            set: function(value) {
                sessionState = value;
            }
        },
        _loadState: function (e) {
            // we only restore state if we are coming back from a clear termination from PLM
            //
            if (e.previousExecutionState === 3 /* ApplicationExecutionState.Terminated */) {
                return exports.local.readText("_sessionState.json", "{}").
                    then(function (str) {
                        var sessionState = JSON.parse(str);
                        if (sessionState && Object.keys(sessionState).length > 0) {
                            exports._sessionStateLoaded = true;
                        }
                        exports.sessionState = sessionState;
                    }).
                    then(null, function () {
                        exports.sessionState = {};
                    });
            }
            else {
                return Promise.as();
            }
        },
        _oncheckpoint: function (event, Application) {
            if (_Global.MSApp && _Global.MSApp.getViewOpener && _Global.MSApp.getViewOpener()) {
                // don't save state in child windows.
                return;
            }
            var sessionState = exports.sessionState;
            if ((sessionState && Object.keys(sessionState).length > 0) || exports._sessionStateLoaded) {
                var stateString;
                try {
                    stateString = JSON.stringify(sessionState);
                } catch (e) {
                    stateString = "";
                    Application.queueEvent({ type: "error", detail: e });
                }
                event.setPromise(
                    exports.local.writeText("_sessionState.json", stateString).
                        then(null, function (err) {
                            Application.queueEvent({ type: "error", detail: err });
                        })
                );
            }
        }
    });
});
