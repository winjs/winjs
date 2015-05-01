// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
import Flyout = require("../Controls/Flyout");

/**
 * Represents a command to be displayed in a Menu object.
**/
export declare class MediaPlayer {
    //#region Constructors

    /**
     * Creates a new MenuCommand object.
     * @constructor
     * @param element The DOM element that hosts the MediaPlayer control.
     * @param options Each property of the options object corresponds to one of the control's properties or events.
    **/
    constructor(element?: HTMLElement, options?: any);

    //#endregion Constructors

    //#region Methods

    /**
     * Adds a new timeline marker.
     * @param time The marker time.
     * @param type The marker type.
     * @param data The marker data.
     * @param extraClass An extra class that can be used to style the marker.
    **/
    addMarker(time: number, type: string, data: any, extraClass: string): void;

    /**
     * Seeks to the previous chapter marker.
    **/
    chapterSkipBack(): void;

    /**
     * Seeks to the next chapter marker.
    **/
    chapterSkipForward(): void;

    /**
     * Disposes this control.
    **/
    dispose(): void;

    /**
     * Increases the playback rate of the media.
    **/
    fastForward(): void;

    /**
     * Navigates to the real-time position in live streamed media.
    **/
    goToLive(): void;

    /**
     * Hides all the UI associated with the MediaPlayer.
    **/
    hideControls(): void;

    /**
     * Plays the next track.
    **/
    nextTrack(): void;

    /**
     * Pauses the media.
    **/
    pause(): void;

    /**
     * Sets the playbackRate to the default playbackRate for the media and plays the media.
    **/
    play(): void;

    /**
     * Plays the next track.
    **/
    previousTrack(): void;

    /**
     * The time of the marker to remove.
    **/
    removeMarker(): void;

    /**
     * Decreases the playbackRate of the media.
    **/
    rewind(): void;

    /**
     * The position in seconds to seek to.
    **/
    seek(): void;

    /**
     * Sets the metadata fields for the given peice of media. This method should be called before changing the video stream.
     * @param contentType The type of content that will be played by the mediaPlayer.
     * @param metadata A collection of name value pairs that provide additional information about the current media.
    **/
    setContentMetadata(contentType: string, metadata: any): void;

    /**
     * Displays the UI associated with the MediaPlayer.
    **/
    showControls(): void;

    /**
     * Stops the media.
    **/
    stop(): void;

    /**
     * Moves the current timeline position backward by a short interval.
    **/
    timeSkipBack(): void;

    /**
     * Moves the current timeline position forward short interval.
    **/
    timeSkipForward(): void;

    //#endregion Properties

    //#region Properties

    /**
     * Gets a property that specifies whether the transport controls are visible.
    **/
    controlsVisible: boolean;

    /**
     * The following property only exists to make it easier for app developers who created apps prior 
     * to Windows 10 to migrate to Windows 10. Developers are recommended to use the above property instead.
    **/
    isControlsVisible: boolean;

    /**
     * Gets or sets maximum playback position of the media. By default, the value is the duration of the media.
    **/
    endTime: boolean;

    /**
     * The DOM element that hosts the MediaPlayer control.
    **/
    element: HTMLElement;

    /**
     * Gets or sets a value indicating whether the MediaPlayer is using a layout that minimized space used, but only has room for a limited number of
     * commands or a layout that has room for a lot of commands, but takes up more space.
    **/
    compact: boolean;

    /**
     * Gets or sets a value indicating whether the MediaPlayer is full screen.
    **/
    fullScreen: boolean;

    /**
     * The following property only exists to make it easier for app developers who created apps prior 
     * to Windows 10 to migrate to Windows 10. Developers are recommended to use the above property instead.
    **/
    isFullScreen: boolean;

    /**
     * Gets or sets a value indicating whether to use thumbnails for fast forward, rewind and scrubbing. If true, the fast forward, rewind and scrub operations
     * will pause the mediaElement and cycle thumbnails as the user changes position. If false, the fast forward, rewind operations will increase or decrease
     * the mediaElement's playbackRate and the scrub operation will move the position.
    **/
    thumbnailEnabled: boolean;

    /**
     * The following property is purposely not documented. It only exists to make it easier for app developers who created
     * apps prior to Windows 10 to migrate to Windows 10. The property forwards to the real property above.
    **/
    isThumbnailEnabled: boolean;

    /**
     * Gets or sets the MediaPlayer's marker collection.
    **/
    markers: any;

    /**
     * Gets or sets an interface that your application can implement to have more control over synchronization between
     * the MediaPlayer and your media.
    **/
    mediaElementAdapter: any;

    /**
     * Gets or sets the playback mode, which specifies how many transport controls are shown.
     **/
    layout: string;

    /**
     * Gets or sets minimum playback position of the media. By default the value is zero.
     **/
    startTime: number;

    /**
     * Gets the current time as it is represented in the UI. While fast forwarding or rewinding, this property may be different than the video or audio
     * tag's 'currentTime' property. This is because during an fast forward or rewind operation, the media is paused while the timeline animates to
     * simulate a fast forward or rewind operation.
     **/
    targetCurrentTime: number;

    /**
     * Gets the playbackRate as it is represented in the UI. While fast forwarding or rewinding, this property may be different than the video or audio
     * tag's 'playbackRate' property. This is because during an fast forward or rewind operation, the media is paused while the timeline animates to
     * simulate a fast forward or rewind operation.
     **/
    targetPlaybackRate: number;

    /**
     * Gets or sets a function that converts raw time data from the video or audio tag into text to display in the UI of the MediaPlayer.
     **/
    timeFormatter: any;

    /**
     * Sets the path to the current thumbnail image to display.
     **/
    thumbnailImage: string;

    /**
     * Gets or sets whether the CAST button is visible.
     **/
    castButtonVisible: boolean;

    /**
     * Gets or sets whether the cast button is enabled.
     **/
    castButtonEnabled: boolean;

    /**
     * Gets or sets whether the chapter skip back button is visible.
     **/
    chapterSkipBackButtonVisible: boolean;

    /**
     * Gets or sets whether the chapter skip back button is enabled.
     **/
    chapterSkipBackButtonEnabled: boolean;

    /**
     * Gets or sets whether the chapter skip forward button is visible.
     **/
    chapterSkipForwardButtonVisible: boolean;

    /**
     * Gets or sets whether the chapter skip forward button is enabled.
     **/
    chapterSkipForwardButtonEnabled: boolean;

    /**
     * Gets or sets whether the fast forward button is visible.
     **/
    fastForwardButtonVisible: boolean;

    /**
     * Gets or sets whether the fast forward button is enabled.
     **/
    fastForwardButtonEnabled: boolean;

    /**
     * Gets or sets whether the full screen button is visible.
     **/
    fullscreenButtonVisible: boolean;

    /**
     * Gets or sets whether the more button is enabled.
     **/
    fullscreenButtonEnabled: boolean;

    /**
     * Gets or sets whether the LIVE button is visible.
     **/
    goToLiveButtonVisible: boolean;

    /**
     * Gets or sets whether the LIVE button is enabled.
     **/
    goToLiveButtonEnabled: boolean;

    /**
     * Gets or sets whether the next track button is visible.
     **/
    nextTrackButtonVisible: boolean;

    /**
     * Gets or sets whether the next track button is enabled.
     **/
    nextTrackButtonEnabled: boolean;

    /**
     * Gets or sets whether the play from beginning button is visible.
     **/
    playFromBeginningButtonVisible: boolean;

    /**
     * Gets or sets whether the play from beginning button is enabled.
     **/
    playFromBeginningButtonEnabled: boolean;

    /**
     * Gets or sets whether the play / pause button is visible.
     **/
    playPauseButtonVisible: boolean;

    /**
     * Gets or sets whether the play / pause button is enabled.
     **/
    playPauseButtonEnabled: boolean;

    /**
     * Gets or sets whether the playback rate button is visible.
     **/
    playbackRateButtonVisible: boolean;

    /**
     * Gets or sets whether the playback rate button is enabled.
     **/
    playbackRateButtonEnabled: boolean;

    /**
     * Gets or sets whether the previous track button is enabled.
     **/
    previousTrackButtonEnabled: boolean;

    /**
     * Gets or sets whether the rewind button is visible.
     **/
    rewindButtonVisible: boolean;

    /**
     * Gets or sets whether the rewind button is enabled.
     **/
    rewindButtonEnabled: boolean;

    /**
     * Gets or sets whether the seek bar is visible.
     **/
    seekBarVisible: boolean;

    /**
     * Gets or sets whether the seeking is enabled.
     **/
    seekingEnabled: boolean;

    /**
     * Gets or sets whether the stop button is visible.
     **/
    stopButtonVisible: boolean;

    /**
     * Gets or sets whether the stop button is enabled.
     **/
    stopButtonEnabled: boolean;

    /**
     * Gets or sets whether the time skip back button is visible.
     **/
    timeSkipBackButtonVisible: boolean;

    /**
     * Gets or sets whether the time skip back button is enabled.
     **/
    timeSkipBackButtonEnabled: boolean;

    /**
     * Gets or sets whether the time skip forward button is visible.
     **/
    timeSkipForwardButtonVisible: boolean;

    /**
     * Gets or sets whether the time skip forward button is enabled.
     **/
    timeSkipForwardButtonEnabled: boolean;

    /**
     * Gets or sets whether the volume button is visible.
     **/
    volumeButtonVisible: boolean;

    /**
     * Gets or sets whether the volume button is enabled.
     **/
    volumeButtonEnabled: boolean;

    /**
     * Gets or sets whether the zoom button is visible.
     **/
    zoomButtonVisible: boolean;

    /**
     * Gets or sets whether the zoom button is enabled.
     **/
    zoomButtonEnabled: boolean;

    //#endregion Properties
}

