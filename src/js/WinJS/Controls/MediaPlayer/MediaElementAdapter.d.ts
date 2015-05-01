// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

/**
 * Represents an interface in between a WinJS.UI.MediaPlayer and a video or audio HTML element.
**/
export declare class MediaElementAdapter {
    //#region Constructors

    /**
     * Creates a new MenuCommand object.
     * @constructor
     * @param element The DOM element that will host the control.
     * @param existingMediaElement A WinJS.UI.MediaPlayer that is associated with this mediaElementAdapter.
    **/
    constructor(mediaPlayer: any, existingMediaElement: HTMLElement);

    //#endregion Constructors

    //#region Methods

    /**
     * Disposes this control.
    **/
    dispose(): void;

    /**
     * The base class constructor. If you are deriving from the MediaElementAdapter class, you
     * must call this base class constructor.
     * @param element The DOM element that will host the control.
     * @param existingMediaElement A WinJS.UI.MediaPlayer that is associated with this mediaElementAdapter.
    **/
    baseMediaElementAdapterConstructor(mediaPlayer: any, existingMediaElement: HTMLElement): void;

    /**
    * Skips to the next track in a playlist. This function is empty by default and
    * meant to be overridden with a custom implementation.
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
    * Skips to the previous track in a playlist. This function is empty by default and
    * meant to be overridden with a custom implementation.
    **/
    previousTrack(): void;

    /**
    * Skips to the previous track in a playlist. This function is empty by default and
    * meant to be overridden with a custom implementation.
    * @param newTime The new time to set the media to.
    **/
    seek(newTime: number): void;

    /**
    * Navigates to the specified position in the media.
    **/
    stop(): void;

    //#endregion Methods

    //#region Properties

    /**
     * Gets or sets the live time.
    **/
    liveTime: number;

    /**
     * Gets or sets whether the content is a live stream.
    **/
    isLive: boolean;

    /**
     * Gets or sets a value that specifies whether the pause method can be executed.
    **/
    pauseAllowed: boolean;

    /**
     * The following property only exists to make it easier for app developers who created apps prior 
     * to Windows 10 to migrate to Windows 10. Developers are recommended to use the above property instead.
    **/
    isPauseAllowed: boolean;

    /**
     * Gets or sets a value that specifies whether the play method can be executed.
    **/
    playAllowed: boolean;

    /**
     * The following property only exists to make it easier for app developers who created apps prior 
     * to Windows 10 to migrate to Windows 10. Developers are recommended to use the above property instead.
    **/
    isPlayAllowed: boolean;

    /**
     * Gets or sets a value that specifies whether the seek method can be executed.
    **/
    seekAllowed: boolean;

    /**
     * The following property only exists to make it easier for app developers who created apps prior 
     * to Windows 10 to migrate to Windows 10. Developers are recommended to use the above property instead.
    **/
    isSeekAllowed: boolean;

    /**
     * Gets or sets a value the underlying media element. This is either a video or audio tag.
    **/
    mediaElement: HTMLElement;

    //#endregion Properties
}

