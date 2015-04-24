// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
var MediaPlayerTests;
(function (MediaPlayerTests) {
    var Utilities;
    (function (Utilities) {
        "use strict";

        // Useful Info: video and audio element ready states
        //  HAVE_NOTHING = 0;
        //  HAVE_METADATA = 1;
        //  HAVE_CURRENT_DATA = 2;
        //  HAVE_FUTURE_DATA = 3;
        //  HAVE_ENOUGH_DATA = 4;

        // We use a fake mediaElement for tests because:
        // * Significantly increases the speed of the tests
        // * Allows for easier test authoring, because it is easy to put a fake media element into arbitrary states,
        //   but very difficult to do with a real video or audio element.
        // * Tests are more resilient. A true video or audio tag can fail intermittently for reason unrelated to WinJS
        //   or the test being run. This fake video or audio tag is unlikely to.
        WinJS.Namespace.define("Test", {
            MockMediaElement: WinJS.Class.define(function _ctor() {
                this._src = null;
                this._duration = 0;

                this.element = document.createElement("div");

                this.error;
                this.crossOrigin;
                this.buffered;
                this._currentTime = 0;
                this.defaultPlaybackRate;
                this.seekable;
                this.loop = false;
                this.controls = false;
                this.defaultMuted;
                this.textTracks = [];
                this.videoWidth;
                this.networkState;
                this.readyState;
                this._playbackRate = 1;
                this.ended;
                this.mediaGroup;
                this.volume;
                this.audioTracks;
                this.width;
                this.videoHeight;
                this.currentSrc;
                this.preload = true;
                this.seeking;
                this.paused = true;
                this.played;
                this.autoplay;
                this.controller;
                this.muted;
                this.videoTracks;
                this.height;
                this.poster;
            }, {
                // Private members
                fireEvent: function (eventName) {
                    this.dispatchEvent(eventName, {});
                },
                currentSrc: {
                    get: function () {
                        return this.src;
                    },
                    set: function (value) {
                        this.src = value;
                    }
                },
                currentTime: {
                    get: function () {
                        return this._currentTime;
                    },
                    set: function (value) {
                        this._currentTime = value;

                        // Raise a bunch of events
                        this.fireEvent("seeking");
                        this.fireEvent("seeked");
                        this.fireEvent("timeupdate");
                    }
                },
                duration: {
                    get: function () {
                        return this._duration;
                    },
                    set: function (value) {
                        this._duration = value;

                        this.fireEvent("durationchange");
                    }
                },
                playbackRate: {
                    get: function () {
                        return this._playbackRate;
                    },
                    set: function (value) {
                        this._playbackRate = value;

                        this.fireEvent("ratechange");
                    }
                },
                src: {
                    get: function () {
                        return this._src;
                    },
                    set: function (value) {
                        if (this._src) {
                            this.fireEvent("emptied");
                        }

                        this._src = value;

                        // Raise a bunch of events
                        if (this.autoplay) {
                            this.fireEvent("loadstart");
                            this.fireEvent("loadedmetadata");
                            this.fireEvent("progress");
                            this.fireEvent("canplay");
                            this.fireEvent("canplaythrough");
                            this.fireEvent("playing");
                            this.readyState = 3;
                            this.paused = false;
                        }
                    }
                },
                pause: function () {
                    this.paused = true;
                    this.fireEvent("pause");
                },
                play: function () {
                    this.paused = false;
                    this.fireEvent("play");
                    this.fireEvent("playing");
                },
                getElementsByTagName: function (tagName) {
                    var elements = {
                        length: 0
                    };
                    if (tagName === "track") {
                        elements = this.textTracks;
                    }
                    return elements;
                },
                removeAttribute: function () {
                    // No-op
                }
            }, {
                // static members
            })
        });

        Test.prototype = Test.MockMediaElement;
        WinJS.Class.mix(Test.MockMediaElement, WinJS.UI.DOMEventMixin);

    })(Utilities = MediaPlayerTests.Utilities || (MediaPlayerTests.Utilities = {}));
})(MediaPlayerTests || (MediaPlayerTests = {}));
