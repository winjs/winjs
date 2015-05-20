// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

// Additional WinRT type definitions can be found at 
// https://github.com/borisyankov/DefinitelyTyped/blob/master/winrt/winrt.d.ts
export declare module Windows {

    export module Foundation {
        export interface Point {
            x: number;
            y: number;
        }

        export interface Rect {
            x: number;
            y: number;
            width: number;
            height: number;
        }
    }
}

export declare module Windows {
    export module Foundation {
        export module Collections {
            export enum CollectionChange {
                reset,
                itemInserted,
                itemRemoved,
                itemChanged,
            }
            export interface IVectorChangedEventArgs {
                collectionChange: Windows.Foundation.Collections.CollectionChange;
                index: number;
            }
            export interface IPropertySet extends Windows.Foundation.Collections.IObservableMap<string, any>, Windows.Foundation.Collections.IMap<string, any>, Windows.Foundation.Collections.IIterable<Windows.Foundation.Collections.IKeyValuePair<string, any>> {
            }
            export class PropertySet implements Windows.Foundation.Collections.IPropertySet, Windows.Foundation.Collections.IObservableMap<string, any>, Windows.Foundation.Collections.IMap<string, any>, Windows.Foundation.Collections.IIterable<Windows.Foundation.Collections.IKeyValuePair<string, any>> {
                size: number;
                onmapchanged: any/* TODO */;
                lookup(key: string): any;
                hasKey(key: string): boolean;
                getView(): Windows.Foundation.Collections.IMapView<string, any>;
                insert(key: string, value: any): boolean;
                remove(key: string): void;
                clear(): void;
                first(): Windows.Foundation.Collections.IIterator<Windows.Foundation.Collections.IKeyValuePair<string, any>>;
            }
            export interface IIterable<T> {
                first(): Windows.Foundation.Collections.IIterator<T>;
            }
            export interface IIterator<T> {
                current: T;
                hasCurrent: boolean;
                moveNext(): boolean;
                getMany(): { items: T[]; returnValue: number; };
            }
            export interface IVectorView<T> extends Windows.Foundation.Collections.IIterable<T> {
                size: number;
                getAt(index: number): T;
                indexOf(value: T): { index: number; returnValue: boolean; };
                getMany(startIndex: number): { items: T[]; returnValue: number; };

                toString(): string;
                toLocaleString(): string;
                concat(...items: T[][]): T[];
                join(seperator: string): string;
                pop(): T;
                push(...items: T[]): void;
                reverse(): T[];
                shift(): T;
                slice(start: number): T[];
                slice(start: number, end: number): T[];
                sort(): T[];
                sort(compareFn: (a: T, b: T) => number): T[];
                splice(start: number): T[];
                splice(start: number, deleteCount: number, ...items: T[]): T[];
                unshift(...items: T[]): number;
                lastIndexOf(searchElement: T): number;
                lastIndexOf(searchElement: T, fromIndex: number): number;
                every(callbackfn: (value: T, index: number, array: T[]) => boolean): boolean;
                every(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg: any): boolean;
                some(callbackfn: (value: T, index: number, array: T[]) => boolean): boolean;
                some(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg: any): boolean;
                forEach(callbackfn: (value: T, index: number, array: T[]) => void): void;
                forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg: any): void;
                map(callbackfn: (value: T, index: number, array: T[]) => any): any[];
                map(callbackfn: (value: T, index: number, array: T[]) => any, thisArg: any): any[];
                filter(callbackfn: (value: T, index: number, array: T[]) => boolean): T[];
                filter(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg: any): T[];
                reduce(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: T[]) => any): any;
                reduce(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: T[]) => any, initialValue: any): any;
                reduceRight(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: T[]) => any): any;
                reduceRight(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: T[]) => any, initialValue: any): any;
                length: number;
            }
            export interface IVector<T> extends Windows.Foundation.Collections.IIterable<T> {
                size: number;
                getAt(index: number): T;
                getView(): Windows.Foundation.Collections.IVectorView<T>;
                indexOf(value: T): { index: number; returnValue: boolean; };
                setAt(index: number, value: T): void;
                insertAt(index: number, value: T): void;
                removeAt(index: number): void;
                append(value: T): void;
                removeAtEnd(): void;
                clear(): void;
                getMany(startIndex: number): { items: T[]; returnValue: number; };
                replaceAll(items: T[]): void;

                toString(): string;
                toLocaleString(): string;
                concat(...items: T[][]): T[];
                join(seperator: string): string;
                pop(): T;
                push(...items: T[]): void;
                reverse(): T[];
                shift(): T;
                slice(start: number): T[];
                slice(start: number, end: number): T[];
                sort(): T[];
                sort(compareFn: (a: T, b: T) => number): T[];
                splice(start: number): T[];
                splice(start: number, deleteCount: number, ...items: T[]): T[];
                unshift(...items: T[]): number;
                lastIndexOf(searchElement: T): number;
                lastIndexOf(searchElement: T, fromIndex: number): number;
                every(callbackfn: (value: T, index: number, array: T[]) => boolean): boolean;
                every(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg: any): boolean;
                some(callbackfn: (value: T, index: number, array: T[]) => boolean): boolean;
                some(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg: any): boolean;
                forEach(callbackfn: (value: T, index: number, array: T[]) => void): void;
                forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg: any): void;
                map(callbackfn: (value: T, index: number, array: T[]) => any): any[];
                map(callbackfn: (value: T, index: number, array: T[]) => any, thisArg: any): any[];
                filter(callbackfn: (value: T, index: number, array: T[]) => boolean): T[];
                filter(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg: any): T[];
                reduce(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: T[]) => any): any;
                reduce(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: T[]) => any, initialValue: any): any;
                reduceRight(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: T[]) => any): any;
                reduceRight(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: T[]) => any, initialValue: any): any;
                length: number;
            }
            export interface IKeyValuePair<K, V> {
                key: K;
                value: V;
            }
            export interface IMap<K, V> extends Windows.Foundation.Collections.IIterable<Windows.Foundation.Collections.IKeyValuePair<K, V>> {
                size: number;
                lookup(key: K): V;
                hasKey(key: K): boolean;
                getView(): Windows.Foundation.Collections.IMapView<K, V>;
                insert(key: K, value: V): boolean;
                remove(key: K): void;
                clear(): void;
            }
            export interface IMapView<K, V> extends Windows.Foundation.Collections.IIterable<Windows.Foundation.Collections.IKeyValuePair<K, V>> {
                size: number;
                lookup(key: K): V;
                hasKey(key: K): boolean;
                split(): { first: Windows.Foundation.Collections.IMapView<K, V>; second: Windows.Foundation.Collections.IMapView<K, V>; };
            }
            export interface VectorChangedEventHandler<T> {
                (sender: Windows.Foundation.Collections.IObservableVector<T>, event: Windows.Foundation.Collections.IVectorChangedEventArgs): void;
            }
            export interface IObservableVector<T> extends Windows.Foundation.Collections.IVector<T>, Windows.Foundation.Collections.IIterable<T> {
                onvectorchanged: any/* TODO */;
            }
            export interface IMapChangedEventArgs<K> {
                collectionChange: Windows.Foundation.Collections.CollectionChange;
                key: K;
            }
            export interface MapChangedEventHandler<K, V> {
                (sender: Windows.Foundation.Collections.IObservableMap<K, V>, event: Windows.Foundation.Collections.IMapChangedEventArgs<K>): void;
            }
            export interface IObservableMap<K, V> extends Windows.Foundation.Collections.IMap<K, V>, Windows.Foundation.Collections.IIterable<Windows.Foundation.Collections.IKeyValuePair<K, V>> {
                onmapchanged: any/* TODO */;
            }
        }
    }
}

export declare module Windows {
    export module UI {
        export class Color {
            a: number;
            r: number;
            g: number;
            b: number;
        }

        export module ViewManagement {
            export enum UIColorType {
                background,
                foreground,
                accentDark3,
                accentDark2,
                accentDark1,
                accent,
                accentLight1,
                accentLight2,
                accentLight3,
                complement
            }

            export class InputPaneVisibilityEventArgs {
                ensuredFocusedElementInView: boolean;
                occludedRect: Windows.Foundation.Rect;
            }
            export class InputPane {
                occludedRect: Windows.Foundation.Rect;
                onshowing: any/* TODO */;
                onhiding: any/* TODO */;
                addEventListener(type: string, listener: Function, capture?: boolean): void;
                removeEventListener(type: string, listener: Function, capture?: boolean): void;
                static getForCurrentView(): Windows.UI.ViewManagement.InputPane;
            }

            export class UISettings {
                oncolorvalueschanged: Function;

                addEventListener(type: string, listener: Function): void;
                removeEventListener(type: string, listener: Function): void;

                getColorValue(type: UIColorType): Color;
            }
        }
    }
}

export declare module Windows {
    export module UI {
        export module Core {
            export module AnimationMetrics {
                export enum PropertyAnimationType {
                    scale,
                    translation,
                    opacity,
                }
                export interface IPropertyAnimation {
                    control1: Windows.Foundation.Point;
                    control2: Windows.Foundation.Point;
                    delay: number;
                    duration: number;
                    type: Windows.UI.Core.AnimationMetrics.PropertyAnimationType;
                }
                export interface IScaleAnimation extends Windows.UI.Core.AnimationMetrics.IPropertyAnimation {
                    finalScaleX: number;
                    finalScaleY: number;
                    initialScaleX: number;
                    initialScaleY: number;
                    normalizedOrigin: Windows.Foundation.Point;
                }
                export interface IOpacityAnimation extends Windows.UI.Core.AnimationMetrics.IPropertyAnimation {
                    finalOpacity: number;
                    initialOpacity: number;
                }
                export enum AnimationEffect {
                    expand,
                    collapse,
                    reposition,
                    fadeIn,
                    fadeOut,
                    addToList,
                    deleteFromList,
                    addToGrid,
                    deleteFromGrid,
                    addToSearchGrid,
                    deleteFromSearchGrid,
                    addToSearchList,
                    deleteFromSearchList,
                    showEdgeUI,
                    showPanel,
                    hideEdgeUI,
                    hidePanel,
                    showPopup,
                    hidePopup,
                    pointerDown,
                    pointerUp,
                    dragSourceStart,
                    dragSourceEnd,
                    transitionContent,
                    reveal,
                    hide,
                    dragBetweenEnter,
                    dragBetweenLeave,
                    swipeSelect,
                    swipeDeselect,
                    swipeReveal,
                    enterPage,
                    transitionPage,
                    crossFade,
                    peek,
                    updateBadge,
                }
                export enum AnimationEffectTarget {
                    primary,
                    added,
                    affected,
                    background,
                    content,
                    deleted,
                    deselected,
                    dragSource,
                    hidden,
                    incoming,
                    outgoing,
                    outline,
                    remaining,
                    revealed,
                    rowIn,
                    rowOut,
                    selected,
                    selection,
                    shown,
                    tapped,
                }
                export interface IAnimationDescription {
                    animations: Windows.Foundation.Collections.IVectorView<Windows.UI.Core.AnimationMetrics.IPropertyAnimation>;
                    delayLimit: number;
                    staggerDelay: number;
                    staggerDelayFactor: number;
                    zOrder: number;
                }
                export interface IAnimationDescriptionFactory {
                    createInstance(effect: Windows.UI.Core.AnimationMetrics.AnimationEffect, target: Windows.UI.Core.AnimationMetrics.AnimationEffectTarget): Windows.UI.Core.AnimationMetrics.AnimationDescription;
                }
                export class AnimationDescription implements Windows.UI.Core.AnimationMetrics.IAnimationDescription {
                    constructor(effect: Windows.UI.Core.AnimationMetrics.AnimationEffect, target: Windows.UI.Core.AnimationMetrics.AnimationEffectTarget);
                    animations: Windows.Foundation.Collections.IVectorView<Windows.UI.Core.AnimationMetrics.IPropertyAnimation>;
                    delayLimit: number;
                    staggerDelay: number;
                    staggerDelayFactor: number;
                    zOrder: number;
                }
            }
        }
    }
}

