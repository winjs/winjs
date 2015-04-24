// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

/**
 * Represents a command to be displayed in a Menu object.
**/
export interface Layout {
    full: string;
    partial: string;
}

/**
 * An enumeration of Media commands that the transport bar buttons support.
**/
export interface MediaCommand {
    audioTracks: string;
    cast: string;
    chapterSkipBack: string;
    chapterSkipForward: string;
    closedCaptions: string;
    fastForward: string;
    goToLive: string;
    nextTrack: string;
    pause: string;
    play: string;
    playbackRate: string;
    playFromBeginning: string;
    previousTrack: string;
    rewind: string;
    seek: string;
    stop: string;
    timeSkipBack: string;
    timeSkipForward: string;
    volume: string;
    zoom: string;
}

/**
 * The types of timeline markers supported by the MediaPlayer.
**/
export interface MarkerType {
    advertisement: string;
    chapter: string;
    custom: string;
}