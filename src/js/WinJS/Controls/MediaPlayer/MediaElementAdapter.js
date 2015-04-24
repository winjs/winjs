// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/MediaPlayer/MediaElementAdapter', [
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_ErrorFromName',
    '../../Core/_Resources',
    '../../Navigation',
    '../../Utilities/_Control',
    '../../Utilities/_ElementUtilities'
], function mediaElementAdapterInitInit(exports, _Global, _Base, _ErrorFromName, _Resources, Navigation, _Control, _ElementUtilities) {
    "use strict";

    var utilities = _ElementUtilities;

    var strings = {
        get mediaElementAdapterConstructorNullParameter() { return _Resources._getWinJSString("ui/mediaElementAdapterConstructorNullParameter").value; },
    };

    var MediaElementAdapter = _Base.Class.define(function (mediaPlayer, existingMediaElement) {
        this.baseMediaElementAdapterConstructor(mediaPlayer, existingMediaElement);
    }, {
        _resetInternalState: function () {
            this.liveTime = 0;
            this.isPauseAllowed = true;
            this.isPlayAllowed = true;
            this.isLive = false;
            this.seekAllowed = true;
        },

        // Public Properties
        liveTime: {
            /// <field type="Object" locid="WinJS.UI.MediaElementAdapter.liveTime" helpKeyword="WinJS.UI.MediaElementAdapter.liveTime">
            /// Gets or sets the live time.
            /// </field>

            get: function () {
                return this._liveTime;
            },

            set: function (value) {
                this._liveTime = value;
            },
        },

        isLive: {
            /// <field type="Object" locid="WinJS.UI.MediaElementAdapter.isLive" helpKeyword="WinJS.UI.MediaElementAdapter.isLive">
            /// Gets or sets whether the content is a live stream.
            /// </field>

            get: function () {
                return this._isLive;
            },

            set: function (value) {
                this._isLive = value;
            },
        },

        pauseAllowed: {
            /// <field type="Object" locid="WinJS.UI.MediaElementAdapter.pauseAllowed" helpKeyword="WinJS.UI.MediaElementAdapter.pauseAllowed">
            /// Gets or sets a value that specifies whether the pause method can be executed.
            /// </field>

            get: function () {
                return this._pauseAllowed;
            },

            set: function (value) {

                this._pauseAllowed = value;

                if (value) {
                    this._mediaPlayer._playPauseButton.disabled = false;
                    if (this._smtControls) {
                        this._smtControls.isPauseEnabled = true;
                    }
                } else {
                    this._mediaPlayer._playPauseButton.disabled = true;
                    if (this._smtControls) {
                        this._smtControls.isPauseEnabled = false;
                    }
                }
            },
        },

        // The folloiwng property is purposedly not documented. It only exists to make it easier for app developers who created
        // apps prior to Windows 10 to migrate to Windows 10. The property forwards to the real property above.
        isPauseAllowed: {
            get: function () {
                return this.pauseAllowed;
            },

            set: function (value) {
                this.pauseAllowed = value;
            },
        },

        playAllowed: {
            /// <field type="Object" locid="WinJS.UI.MediaElementAdapter.playAllowed" helpKeyword="WinJS.UI.MediaElementAdapter.playAllowed">
            /// Gets or sets a value that specifies whether the play method can be executed.
            /// </field>

            get: function () {
                return this._playAllowed;
            },

            set: function (value) {

                this._playAllowed = value;

                if (value) {
                    this._mediaPlayer._playPauseButton.disabled = false;
                    if (this._smtControls) {
                        this._smtControls.isPlayEnabled = true;
                    }
                } else {
                    this._mediaPlayer._playPauseButton.disabled = true;
                    if (this._smtControls) {
                        this._smtControls.isPlayEnabled = false;
                    }
                }
            },
        },

        // The folloiwng property is purposedly not documented. It only exists to make it easier for app developers who created
        // apps prior to Windows 10 to migrate to Windows 10. The property forwards to the real property above.
        isPlayAllowed: {
            get: function () {
                return this.playAllowed;
            },

            set: function (value) {
                this.playAllowed = value;
            },
        },

        seekAllowed: {
            /// <field type="Object" locid="WinJS.UI.MediaElementAdapter.seekAllowed" helpKeyword="WinJS.UI.MediaElementAdapter.seekAllowed">
            /// Gets or sets a value that specifies whether the seek method can be executed.
            /// </field>

            get: function () {
                return this._seekAllowed;
            },

            set: function (value) {

                this._seekAllowed = value;
                if (value) {
                    if (this._mediaPlayer._chapterSkipBackButton) {
                        this._mediaPlayer._chapterSkipBackButton.disabled = false;
                    }
                    if (this._mediaPlayer._chapterSkipForwardButton) {
                        this._mediaPlayer._chapterSkipForwardButton.disabled = false;
                    }
                    if (this._mediaPlayer._fastForwardButton) {
                        this._mediaPlayer._fastForwardButton.disabled = false;
                        if (this._smtControls) {
                            this._smtControls.isFastForwardEnabled = true;
                        }
                    }
                    if (this._mediaPlayer._rewindButton) {
                        this._mediaPlayer._rewindButton.disabled = false;
                        if (this._smtControls) {
                            this._smtControls.isRewindEnabled = true;
                        }
                    }
                    if (this._mediaPlayer._timeSkipBackButton) {
                        this._mediaPlayer._timeSkipBackButton.disabled = false;
                    }
                    if (this._mediaPlayer._timeSkipForwardButton) {
                        this._mediaPlayer._timeSkipForwardButton.disabled = false;
                    }
                    utilities.removeClass(this._mediaPlayer._element, "win-mediaplayer-seekbar-disabled");
                } else {
                    if (this._mediaPlayer._chapterSkipBackButton) {
                        this._mediaPlayer._chapterSkipBackButton.disabled = true;
                    }
                    if (this._mediaPlayer._chapterSkipForwardButton) {
                        this._mediaPlayer._chapterSkipForwardButton.disabled = true;
                    }
                    if (this._mediaPlayer._fastForwardButton) {
                        this._mediaPlayer._fastForwardButton.disabled = true;
                        if (this._smtControls) {
                            this._smtControls.isFastForwardEnabled = false;
                        }
                    }
                    if (this._mediaPlayer._rewindButton) {
                        this._mediaPlayer._rewindButton.disabled = true;
                        if (this._smtControls) {
                            this._smtControls.isRewindEnabled = false;
                        }
                    }
                    if (this._mediaPlayer._timeSkipBackButton) {
                        this._mediaPlayer._timeSkipBackButton.disabled = true;
                    }
                    if (this._mediaPlayer._timeSkipForwardButton) {
                        this._mediaPlayer._timeSkipForwardButton.disabled = true;
                    }
                    utilities.addClass(this._mediaPlayer._element, "win-mediaplayer-seekbar-disabled");
                }
            },
        },

        // The folloiwng property is purposedly not documented. It only exists to make it easier for app developers who created
        // apps prior to Windows 10 to migrate to Windows 10. The property forwards to the real property above.
        isSeekAllowed: {
            get: function () {
                return this.seekAllowed;
            },

            set: function (value) {
                this.seekAllowed = value;
            },
        },

        mediaElement: {
            /// <field type="Object" locid="WinJS.UI.MediaElementAdapter.mediaElement" helpKeyword="WinJS.UI.MediaElementAdapter.mediaElement">
            /// Gets or sets a value the underlying media element. This is either a video or audio tag.
            /// </field>

            get: function () {
                return this._mediaElement;
            },

            set: function (value) {

                var oldMediaElement = this._mediaElement;
                this._mediaElement = value;

                this._resetInternalState();

                this._mediaPlayer._setupNewMediaElement(this._mediaElement, oldMediaElement);

                if (this._mediaPlayer &&
                    this._mediaPlayer.element) {
                    var dispatchedEvent = document.createEvent("Event");
                    dispatchedEvent.initEvent("mediaelementchanged", true, false);
                    this._mediaPlayer.element.dispatchEvent(dispatchedEvent);
                }
            },
        },
        baseMediaElementAdapterConstructor: function (mediaPlayer, existingMediaElement) {
            /// <signature helpKeyword="WinJS.UI.MediaElementAdapter.baseMediaElementAdapterConstructor">
            /// <summary locid="WinJS.UI.MediaElementAdapter.baseMediaElementAdapterConstructor">
            /// The base class constructor. If you are deriving from the MediaElementAdapter class, you
            /// must call this base class constructor.
            /// </summary>
            /// </signature>
            this._disposed = false;
            this._liveTime = 0;
            this._pauseAllowed = true;
            this._playAllowed = true;
            this._isLive = false;
            this._seekAllowed = true;
            this._mediaElement = null;
            this._mediaPlayer = null;
            this._smtControls = null;

            if (mediaPlayer) {
                this._mediaPlayer = mediaPlayer;
            } else {
                throw new _ErrorFromName("WinJS.UI.MediaElementAdapter.nullParameter", strings.mediaElementAdapterConstructorNullParameter);
            }

            if (utilities.hasWinRT &&
                Windows.Media.SystemMediaTransportControls) {
                this._smtControls = Windows.Media.SystemMediaTransportControls.getForCurrentView();
            }

            if (existingMediaElement) {
                this._mediaElement = existingMediaElement;
            } else {
                var containerElement = this._mediaPlayer._element;
                if (containerElement && containerElement.getElementsByTagName) {

                    // We check for whether there is an video tag or audio tag present
                    // in order to determine which mode we're in:
                    //      1. If we find a video tag, we assume we're in video mode.
                    //      2. If not, we check for an audio tag. If we find one, we assume we're in audio mode.
                    //      3. If don't find an audio tag, then we don'd create one and assume the app developer wants to assign one later.
                    this.mediaElement = containerElement.getElementsByTagName("video")[0];

                    if (!this.mediaElement) {
                        this.mediaElement = containerElement.getElementsByTagName("audio")[0];
                    }
                }
            }
        },

        dispose: function () {
            /// <signature helpKeyword="WinJS.UI.MediaElementAdapter.dispose">
            /// <summary locid="WinJS.UI.MediaElementAdapter.dispose">
            /// Releases MediaElementAdapter resources.
            /// </summary>
            /// </signature>

            if (this._disposed) {
                return;
            }
            this._disposed = true;

            if (this._mediaElement) {
                this._mediaElement.removeAttribute("src");
            }

            this._liveTime = null;
            this._mediaElement = null;
            this._mediaPlayer = null;
            this._smtControls = null;
        },

        nextTrack: function () {
            /// <signature helpKeyword="WinJS.UI.MediaElementAdapter.nextTrack">
            /// <summary locid="WinJS.UI.MediaElementAdapter.nextTrack">
            /// Skips to the next track in a playlist. This function is empty by default and
            /// meant to be overridden with a custom implementation.
            /// </summary>
            /// </signature>
        },

        pause: function () {
            /// <signature helpKeyword="WinJS.UI.MediaElementAdapter.pause">
            /// <summary locid="WinJS.UI.MediaElementAdapter.pause">
            /// Pauses the media.
            /// </summary>
            /// </signature>

            if (this._mediaElement &&
                this._pauseAllowed) {
                this._mediaElement.pause();
            }
        },

        play: function () {
            /// <signature helpKeyword="WinJS.UI.MediaElementAdapter.play">
            /// <summary locid="WinJS.UI.MediaElementAdapter.play">
            /// Sets the playbackRate to the default playbackRate for the media and plays the media.
            /// </summary>
            /// </signature>

            if (this._mediaElement &&
                this._playAllowed) {
                this._mediaElement.play();
            }
        },

        previousTrack: function () {
            /// <signature helpKeyword="WinJS.UI.MediaElementAdapter.previousTrack">
            /// <summary locid="WinJS.UI.MediaElementAdapter.previousTrack">
            /// Skips to the previous track in a playlist. This function is empty by default and
            /// meant to be overridden with a custom implementation.
            /// </summary>
            /// </signature>
        },

        seek: function (newTime) {
            /// <signature helpKeyword="WinJS.UI.MediaElementAdapter.seek">
            /// <summary locid="WinJS.UI.MediaElementAdapter.seek">
            /// Navigates to the specified position in the media.
            /// </summary>
            /// </signature>

            if (this._mediaElement &&
                this._seekAllowed) {
                this._mediaElement.currentTime = newTime;
            }
        },

        stop: function () {
            /// <signature helpKeyword="WinJS.UI.MediaElementAdapter.stop">
            /// <summary locid="WinJS.UI.MediaElementAdapter.stop">
            /// Navigates to the specified position in the media.
            /// </summary>
            /// </signature>

            // Stop seeks to the beginning of the media
            if (this._mediaElement &&
                this._seekAllowed) {
                if (this._mediaPlayer) {
                    this._mediaElement.currentTime = this._mediaPlayer.startTime;
                } else {
                    this._mediaElement.currentTime = 0;
                }
                this._mediaElement.pause();
            }
        }
    });

    _Base.Namespace.define("WinJS.UI", {
        // ErrorFromName establishes a simple pattern for returning error codes.
        //
        MediaElementAdapter: MediaElementAdapter
    });

    return MediaElementAdapter;

});