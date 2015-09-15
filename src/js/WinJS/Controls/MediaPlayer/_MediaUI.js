// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/MediaPlayer/_MediaUI', [
    'exports',
    '../../Core/_BaseCoreUtils',
    '../../Core/_Base'
], function mediaUIInit(exports, _BaseCoreUtils, _Base) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field locid="WinJS.UI.MediaCommand" helpKeyword="WinJS.UI.MediaCommand">
        /// An enumeration of Media commands that the transport bar buttons support.
        /// </field>
        MediaCommand: {
            /// <field type="String" locid="WinJS.UI.MediaCommand.audioTracks" helpKeyword="WinJS.UI.MediaCommand.audioTracks">
            /// Invokes a menu that allows the viewer to select an audio track.
            /// </field>
            audioTracks: "audioTracks",

            /// <field type="String" locid="WinJS.UI.MediaCommand.cast" helpKeyword="WinJS.UI.MediaCommand.cast">
            /// Play the current media on a remote screen.
            /// </field>
            cast: "cast",

            /// <field type="String" locid="WinJS.UI.MediaCommand.chapterSkipBack" helpKeyword="WinJS.UI.MediaCommand.chapterSkipBack">
            /// Seeks to the previous chapter.
            /// </field>
            chapterSkipBack: "chapterSkipBack",

            /// <field type="String" locid="WinJS.UI.MediaCommand.chapterSkipForward" helpKeyword="WinJS.UI.MediaCommand.chapterSkipForward">
            /// Seeks to the next chapter marker.
            /// </field>
            chapterSkipForward: "chapterSkipForward",

            /// <field type="String" locid="WinJS.UI.MediaCommand.closedcaptions" helpKeyword="WinJS.UI.MediaCommand.closedcaptions">
            /// Invokes a menu that allows the user to choose a closed captions setting.
            /// </field>
            closedCaptions: "closedCaptions",

            /// <field type="String" locid="WinJS.UI.MediaCommand.fastForward" helpKeyword="WinJS.UI.MediaCommand.fastForward">
            /// Increases the playback rate of the media.
            /// </field>
            fastForward: "fastForward",

            /// <field type="String" locid="WinJS.UI.MediaCommand.goToLive" helpKeyword="WinJS.UI.MediaCommand.goToLive">
            /// Navigates to the real-time position in live streamed media.
            /// </field>
            goToLive: "goToLive",

            /// <field type="String" locid="WinJS.UI.MediaCommand.nextTrack" helpKeyword="WinJS.UI.MediaCommand.nextTrack">
            /// Plays the next track.
            /// </field>
            nextTrack: "nextTrack",

            /// <field type="String" locid="WinJS.UI.MediaCommand.pause" helpKeyword="WinJS.UI.MediaCommand.pause">
            /// Pauses the media.
            /// </field>
            pause: "pause",

            /// <field type="String" locid="WinJS.UI.MediaCommand.play" helpKeyword="WinJS.UI.MediaCommand.play">
            /// Sets the playbackRate to the default playbackRate for the media and plays the media.
            /// </field>
            play: "play",

            /// <field type="String" locid="WinJS.UI.MediaCommand.play" helpKeyword="WinJS.UI.MediaCommand.play">
            /// Allows the viewer to select a playback rate for the media.
            /// </field>
            playbackRate: "playbackRate",

            /// <field type="String" locid="WinJS.UI.MediaCommand.playFromBeginning" helpKeyword="WinJS.UI.MediaCommand.playFromBeginning">
            /// Seeks to the beginning of the timeline and starts playing.
            /// </field>
            playFromBeginning: "playFromBeginning",

            /// <field type="String" locid="WinJS.UI.MediaCommand.previousTrack" helpKeyword="WinJS.UI.MediaCommand.previousTrack">
            /// Plays the previous track.
            /// </field>
            previousTrack: "previousTrack",

            /// <field type="String" locid="WinJS.UI.MediaCommand.rewind" helpKeyword="WinJS.UI.MediaCommand.rewind">
            /// Decreases the playbackRate of the media.
            /// </field>
            rewind: "rewind",

            /// <field type="String" locid="WinJS.UI.MediaCommand.seek" helpKeyword="WinJS.UI.MediaCommand.seek">
            /// Navigates to the specified position in the media.
            /// </field>
            seek: "seek",

            /// <field type="String" locid="WinJS.UI.MediaCommand.stop" helpKeyword="WinJS.UI.MediaCommand.stop">
            /// Stops the media.
            /// </field>
            stop: "stop",

            /// <field type="String" locid="WinJS.UI.MediaCommand.timeskipBack" helpKeyword="WinJS.UI.MediaCommand.timeskipBack">
            /// Moves the current timeline position backward by a short interval.
            /// </field>
            timeSkipBack: "timeSkipBack",

            /// <field type="String" locid="WinJS.UI.MediaCommand.timeSkipForward" helpKeyword="WinJS.UI.MediaCommand.timeSkipForward">
            /// Moves the current timeline position forward short interval.
            /// </field>
            timeSkipForward: "timeSkipForward",

            /// <field type="String" locid="WinJS.UI.MediaCommand.zoom" helpKeyword="WinJS.UI.MediaCommand.zoom">
            /// Shows UI that allows the viewer to change the volume.
            /// </field>
            volume: "volume",

            /// <field type="String" locid="WinJS.UI.MediaCommand.zoom" helpKeyword="WinJS.UI.MediaCommand.zoom">
            /// Toggles the display mode between letterbox and native.
            /// </field>
            zoom: "zoom"
        },

        /// <field locid="WinJS.UI.MediaCommand" helpKeyword="WinJS.UI.MediaCommand">
        /// The types of timeline markers supported by the MediaPlayer.
        /// </field>
        MarkerType: {
            /// <field type="String" locid="WinJS.UI.MarkerType.advertisement" helpKeyword="WinJS.UI.MarkerType.advertisement">
            /// The marker represents the beginning of an advertisement.
            /// </field>
            advertisement: "advertisement",

            /// <field type="String" locid="WinJS.UI.MarkerType.chapter" helpKeyword="WinJS.UI.MarkerType.chapter">
            /// The markers represents the beginning of a chapter.
            /// </field>
            chapter: "chapter",

            /// <field type="String" locid="WinJS.UI.MarkerType.custom" helpKeyword="WinJS.UI.MarkerType.custom">
            /// The markers represents a custom event.
            /// </field>
            custom: "custom"
        }
    });
});