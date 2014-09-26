// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

import Promise = require("Promise");

/**
 * Provides functions and objects for scheduling and managing asynchronous tasks.
**/

//#region Enumerations

/**
 * Represents a priority for a job managed by the Scheduler.
**/
export declare enum Priority {
    /**
     * A priority higher than the normal priority level.
    **/
    aboveNormal,
    /**
     * A priority less than the normal priority level.
    **/
    belowNormal,
    /**
     * A high priority.
    **/
    high,
    /**
     * The idle priority for work items.
    **/
    idle,
    /**
     * The highest priority.
    **/
    max,
    /**
     * The lowest priority.
    **/
    min,
    /**
     * The normal priority for work items.
    **/
    normal
}

//#endregion Enumerations

//#region Interfaces

/**
 * Represents a work item that's executed by the Scheduler.
**/
export interface IJob {
    //#region Methods

    /**
     * Cancels the job.
    **/
    cancel(): void;

    /**
     * Pauses the job.
    **/
    pause(): void;

    /**
     * Resumes the job.
    **/
    resume(): void;

    //#endregion Methods

    //#region Properties

    /**
     * Gets a value that indicates whether the job has successfully completed.
    **/
    completed: boolean;

    /**
     * Gets the unique numeric identifier assigned to the job.
    **/
    id: number;

    /**
     * Gets or sets the name of the job.
    **/
    name: string;

    /**
     * Gets or sets the owner of the job.
    **/
    owner: IOwnerToken;

    /**
     * Gets or sets the priority of the job.
    **/
    priority: Priority;

    //#endregion Properties

}

/**
 * Provides a control mechanism that allows a job to cooperatively yield. This object is passed to your work function when you schedule it.
**/
export interface IJobInfo {
    //#region Methods

    /**
     * Uses a Promise to determine how long the scheduler should wait before rescheduling the job after it yields.
     * @param promise Once the work item yields, the scheduler will wait for this Promise to complete before rescheduling the job.
    **/
    setPromise(promise: Promise<any>): void;

    /**
     * Specifies the next unit of work to run once this job yields.
     * @param work The next unit of work to run once this job yields.
    **/
    setWork(work: Function): void;

    //#endregion Methods

    //#region Properties

    /**
     * Gets the work item associated with this IJobInfo.
    **/
    job: IJob;

    /**
     * Gets a value that specifies whether the job should yield.
    **/
    shouldYield: boolean;

    //#endregion Properties

}

/**
 * Represents an object that owns jobs. You can use this object to cancel a set of jobs.
**/
export interface IOwnerToken {
    //#region Methods

    /**
     * Synchronously cancels the job that this token owns, including paused and blocked jobs.
    **/
    cancelAll(): void;

    //#endregion Methods

}

//#endregion Interfaces

//#region Properties

/**
 * Gets the current priority at which the caller is executing.
    **/
export declare var currentPriority: Priority;

//#endregion Properties

//#region Functions

/**
 * Creates and returns a new IOwnerToken which can be set to the owner property of one or more jobs.
 * @returns A new IOwnerToken which can be set to the owner property of one or more jobs.
**/
export declare function createOwnerToken(): IOwnerToken;

/**
 * Runs the specified callback in a high priority context.
 * @param callback The callback to run in a high priority callback.
 * @returns The return value of the callback.
**/
export declare function execHigh<U>(callback: () => U): U;

/**
 * Returns a string representation of the scheduler's state for diagnostic purposes. The jobs and drain requests are displayed in the order in which they are currently expected to be processed. The current job and drain request are marked by an asterisk.
 * @returns A string representation of the scheduler's state for diagnostic purposes. The jobs and drain requests are displayed in the order in which they are currently expected to be processed. The current job and drain request are marked by an asterisk.
**/
export declare function retrieveState(): string;

/**
 * Runs jobs in the scheduler without timeslicing until all jobs at the specified priority and higher have executed.
 * @param priority The priority to which the scheduler should drain. The default is -15.
 * @param name An optional description of the drain request for diagnostics.
 * @returns A Promise which completes when the drain has finished. Canceling this Promise cancels the drain request. This Promise will never enter an error state.
**/
export declare function requestDrain(priority?: Priority, name?: string): Promise<any>;

/**
 * Schedules the specified function to execute asynchronously.
 * @param work A function that represents the work item to be scheduled. When called the work item will receive as its first argument an object which allows the work item to ask the scheduler if it should yield cooperatively and if so allows the work item to either provide a function to be run as a continuation or a WinJS.Promise which will when complete provide a function to run as a continuation. Provide these fields for the object: shouldYield, setWork(work), setPromise(promise), job.
 * @param priority The priority of the work item. If you don't specify a priority, it defaults to WinJS.Utilities.Scheduler.Priority.normal.
 * @param thisArg A "this" instance to be bound to the work item. The default value is null.
 * @param name A description of the work item for diagnostics. The default value is an empty string.
 * @returns The job instance that represents this work item.
**/
export declare function schedule(work: (jobInfo: IJobInfo) => any, priority?: Priority, thisArg?: any, name?: string): IJob;

/**
 * Schedules a job to complete the returned Promise at WinJS.Utilities.Scheduler.Priority.aboveNormal priority.
 * @param promiseValue The value returned by the completed Promise.
 * @param jobName A string that describes the job for diagnostic purposes.
 * @returns A Promise that completes within a job of aboveNormal priority.
**/
export declare function schedulePromiseAboveNormal<U>(promiseValue?: U, jobName?: string): Promise<U>;

/**
 * Schedules a job to complete the returned Promise at WinJS.Utilities.Scheduler.Priority.belowNormal priority.
 * @param promiseValue The value returned by the completed Promise.
 * @param jobName A string that describes the job for diagnostic purposes.
 * @returns A Promise that completes within a job of belowNormal priority.
**/
export declare function schedulePromiseBelowNormal<U>(promiseValue?: U, jobName?: string): Promise<U>;

/**
 * Schedules a job to complete the returned Promise at WinJS.Utilities.Scheduler.Priority.high priority.
 * @param promiseValue The value returned by the completed Promise.
 * @param jobName A string that describes the job for diagnostic purposes.
 * @returns A Promise that completes within a job of high priority.
**/
export declare function schedulePromiseHigh<U>(promiseValue?: U, jobName?: string): Promise<U>;

/**
 * Schedules a job to complete the returned Promise at WinJS.Utilities.Scheduler.Priority.Idle priority.
 * @param promiseValue The value returned by the completed Promise.
 * @param jobName A string that describes the job for diagnostic purposes.
 * @returns A Promise that completes within a job of idle priority.
**/
export declare function schedulePromiseIdle<U>(promiseValue?: U, jobName?: string): Promise<U>;

/**
 * Schedules a job to complete the returned Promise at WinJS.Utilities.Scheduler.Priority.normal priority.
 * @param promiseValue The value returned by the completed Promise.
 * @param jobName A string that describes the job for diagnostic purposes.
 * @returns A Promise that completes within a job of normal priority.
**/
export declare function schedulePromiseNormal<U>(promiseValue?: U, jobName?: string): Promise<U>;

//#endregion Functions

