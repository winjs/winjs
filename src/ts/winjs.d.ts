// 1) multi-typed properties
// 2) Missing explicit enums, open bug, could also use a TS-only solution by create another file wints.ts for shimming
// 3) Deprecation: should we support deprecated APIs in TS or this is a good place to get rid of them?

declare var Debug: any;
declare var setImmediate: (callback: any) => void;

interface Element {
    winControl?: any;
}

interface Event {
    detail: any;
}

declare module Windows {
    var ApplicationModel;
    var Data;
    var Foundation;
    var Globalization;
    var Phone;
    var Storage;
    var UI;
}

declare module WinJS {

    interface KeyValuePair<K, V> {
        key: K;
        value: V;
    }

    interface Option<T1, T2> { }

    interface IDisposable {
        dispose();
    }

    class Promise<T> {
        static _cancelBlocker;
        static _getStack;

        static cancel: Promise<any>;

        static onerror: (e: CustomEvent) => any;

        static dispatchEvent(type: "error", details);
        static dispatchEvent(type: string, details);
        static addEventListener(type: "error", listener: (e: CustomEvent) => any);
        static addEventListener(type: string, listener: (e: CustomEvent) => any);
        static removeEventListener(type: "error", listener: (e: CustomEvent) => any);
        static removeEventListener(type: string, listener: (e: CustomEvent) => any);

        static any<T>(values: Promise<T>[]): Promise<KeyValuePair<string, Promise<T>>>;
        static as<P>(value?: Promise<P>): Promise<P>;
        static as<T>(value?: T): Promise<T>;
        static is(value): boolean;
        static join<T>(values: Promise<T>[]): Promise<T[]>;
        static join<T>(values: { [keys: string]: Promise<T> }): Promise<{ [keys: string]: T }>;
        static join(values: any): Promise<any>;
        static thenEach<T>(values: Promise<T>[], complete: (result: T) => any, e?: Function, p?: Function): Promise<T[]>;
        static thenEach<T>(values: { [keys: string]: Promise<T> }, complete: (result: any) => any, e?: Function, p?: Function): Promise<{ [keys: string]: T }>;
        static timeout(timeout: number): Promise<any>;
        static timeout<T>(timeout: number, promise: Promise<T>): Promise<T>;
        static wrap<T>(value?: Promise<T>): Promise<T>;
        static wrap<T>(value?: T): Promise<T>;
        static wrapError(error?: any): Promise<any>;

        constructor(init: (c: (result?: T) => void, e: (error?) => void, p: (progress?) => void) => any, onCancel?: Function);

        supportedForProcessing: boolean;

        cancel();
        done(complete: (result: T) => any, error?: (error) => any, progress?: (prog: any) => any);
        then(complete?: void, error?: void): Promise<T>;
        then<U>(complete: (result: T) => Promise<U>, error?: (error) => any, progress?: (prog: any) => any): Promise<U>;
        then<U>(complete: (result: T) => U, error?: (error) => any, progress?: (prog: any) => any): Promise<U>;
        then<U>(complete: void, error: (error) => Promise<U>, progress?: (prog: any) => any): Promise<U>;
        then<U>(complete: void, error: (error) => U, progress?: (prog: any) => any): Promise<U>;
    }

    module Application {
        var local: IOHelper;
        var roaming: IOHelper;
        var sessionState: any;
        var temp: IOHelper;

        var onactivated: (e: any) => any;
        var oncheckpoint: (e: any) => any;
        var onerror: (e: any) => any;
        var onloaded: (e: any) => any;
        var onready: (e: any) => any;
        var onsettings: (e: any) => any;
        var onunload: (e: any) => any;
        function dispatchEvent(type: "activated", details);
        function dispatchEvent(type: "checkpoint", details);
        function dispatchEvent(type: "error", details);
        function dispatchEvent(type: "loaded", details);
        function dispatchEvent(type: "ready", details);
        function dispatchEvent(type: "settings", details);
        function dispatchEvent(type: "unload", details);
        function dispatchEvent(type: string, details);
        function addEventListener(type: "activated", listener: (e: CustomEvent) => any);
        function addEventListener(type: "checkpoint", listener: (e: CustomEvent) => any);
        function addEventListener(type: "error", listener: (e: CustomEvent) => any);
        function addEventListener(type: "loaded", listener: (e: CustomEvent) => any);
        function addEventListener(type: "ready", listener: (e: CustomEvent) => any);
        function addEventListener(type: "settings", listener: (e: CustomEvent) => any);
        function addEventListener(type: "unload", listener: (e: CustomEvent) => any);
        function addEventListener(type: string, listener: (e: CustomEvent) => any);
        function removeEventListener(type: "activated", listener: (e: CustomEvent) => any);
        function removeEventListener(type: "checkpoint", listener: (e: CustomEvent) => any);
        function removeEventListener(type: "error", listener: (e: CustomEvent) => any);
        function removeEventListener(type: "loaded", listener: (e: CustomEvent) => any);
        function removeEventListener(type: "ready", listener: (e: CustomEvent) => any);
        function removeEventListener(type: "settings", listener: (e: CustomEvent) => any);
        function removeEventListener(type: "unload", listener: (e: CustomEvent) => any);
        function removeEventListener(type: string, listener: (e: CustomEvent) => any);

        function setPromise(promise: Promise<any>);
        function checkpoint();
        function queueEvent(eventRecord: any);
        function start();
        function stop();

        class IOHelper {
            exists(fileName: string): Promise<boolean>;
            readText(fileName: string, def: string): Promise<string>;
            remove(fileName: string): Promise<any>;
            writeText(fileName: string, text: string): Promise<number>;
        }
    }

    module Binding {
        var dynamicObservableMixin;
        var mixin;
        var observableMixin;
        var optimizeBindingReferences: boolean;

        function addClassOneTime(source: any, sourceProperties: string[], dest: HTMLElement);
        function as<T>(data: T): T;                             // bad?
        function bind(name: string, action: Function);
        function converter<T, U>(convert: (value: T) => U): IBindingInitializer;
        function defaultBind(source: any, sourceProperties: string[], dest: any, destProperties: string[]);
        function define<T>(data: T): (init?: T) => void;        // not quite
        function expandProperties(shape: any): any;             // TODO
        function initializer<T>(customInitializer: T): T;       // is this right?
        function notify(name: string, newValue: string, oldValue: string): Promise<any>;
        function oneTime(source: any, sourceProperties: string[], dest: any, destProperties: string[]);
        function processAll(rootElement: HTMLElement, dataContext: any, skipRoot: boolean, bindingCache: any, defaultInitializer?: IBindingInitializer): Promise<HTMLElement[]>; // TODO: dataContext, bindingCache?
        function setAttribute(source: any, sourceProperties: string[], dest: any, destProperties: string[]);
        function setAttributeOneTime(source: any, sourceProperties: string[], dest: any, destProperties: string[]);
        function unwrap<T>(data: T): T;                         // bad?

        interface IBindingInitializer {
            (source: any, sourceProperties: string[], dest: any, destProperties: string[]);
        }

        class FilteredListProjection<T> extends ListProjection<T> {
            notifyMutated(index: number);
            setAt(index: number, newValue: T);
        }

        class GroupListProjection<T> extends ListProjection<T> {
            getItemFromKey(key: string): T;
        }

        class GroupSortedListProjection<T> extends GroupListProjection<T> {
            groups: List<T>;
        }

        class ListProjection<T> {
            length: number;
            getItem(index: number): { key: string; data: T };   // Almost a KVP...
            indexOfKey(key: string): number;
        }

        class List<T> {
            constructor(data?: T[]);

            length: number;

            getAt(index: number): T;

            dataSource: any;

            // TODO: incomplete
        }

        class SortedListProjection<T> extends ListProjection<T> {
            notifyMutated(index: number);
            setAt(index: number, newValue: T);
        }

        interface ITemplateOptions {
            // TODO
        }
        class Template<T> implements IDisposable {
            static _debugBreakOnRender;
            static _interpretAll;

            constructor(element?: HTMLElement, options?: ITemplateOptions);

            bindingInitializer: any; // TODO
            debugBreakOnRender: boolean;
            disableOptimizedProcessing: boolean;
            extractChild: boolean;
            element: HTMLElement;
            isDeclarativeControlContainer: boolean;

            dispose();

            render: {
                <U>(dataContext: T, container?: U): Promise<U>;

                value<U>(href: string, dataContext: T, container: U): Promise<U>;
            };
        }
    }

    module Navigation {
        var canGoBack: boolean;
        var canGoForward: boolean;
        var history: INavigationHistory;
        var location: string;
        var state: any;

        var onbeforenavigate: (e: CustomEvent) => any;
        var onnavigated: (e: CustomEvent) => any;
        var onbeforenavigate: (e: CustomEvent) => any;
        function dispatchEvent(type: "beforenavigate", details);
        function dispatchEvent(type: "navigated", details);
        function dispatchEvent(type: "navigating", details);
        function dispatchEvent(type: string, details);
        function addEventListener(type: "beforenavigate", listener: (e: CustomEvent) => any, capture?: boolean);
        function addEventListener(type: "navigated", listener: (e: CustomEvent) => any, capture?: boolean);
        function addEventListener(type: "navigating", listener: (e: CustomEvent) => any, capture?: boolean);
        function addEventListener(type: string, listener: (e: CustomEvent) => any, capture?: boolean);
        function removeEventListener(type: "beforenavigate", listener: (e: CustomEvent) => any);
        function removeEventListener(type: "navigated", listener: (e: CustomEvent) => any, useCapture?: boolean );
        function removeEventListener(type: "navigating", listener: (e: CustomEvent) => any, useCapture?: boolean );
        function removeEventListener(type: string, listener: (e: CustomEvent) => any, useCapture?: boolean );

        function setPromise(promise: Promise<any>);
        function back(distance?: number): Promise<boolean>;
        function forward(distance?: number): Promise<boolean>;
        function navigate(location: any, initialState?: any): Promise<boolean>;

        interface INavigationHistory {
            backStack: string[];
            current: { location: string; initialPlaceholder: boolean; };
            forwardStack: string[];
        }
    }

    module Resources {
        function processAll(rootElement?: HTMLElement);

        var oncontextchanged: (e: CustomEvent) => any;
        //function dispatchEvent(type: "contextchanged", details);
        //function addEventListener(type: "contextchanged", listener: (e: CustomEvent) => any);
        //function removeEventListener(type: "contextchanged", listener: (e: CustomEvent) => any);
    }

    module UI {
        // Static members
        function computeDataSourceGroups<T>(listDataSource: IListDataSource<T>, groupKey: (item: T) => string, groupData: (item: T) => any, options?: { groupCountEstimate: number; batchSize: number; });
        function disableAnimations();
        function enableAnimations();
        function eventHandler(handler: Function): Function;
        function executeAnimation(element: any, animation: any);        // TODO
        function executeTransition(element, transitions);              // TODO
        function getItemsFromRanges<T>(dataSuorce: IListDataSource<T>, ranges: ISelectionRange[]): Promise<IItem<T>[]>;
        function isAnimationEnabled(): boolean;
        function processAll(values?): Promise<any>;
        function process(element: HTMLElement): Promise<any>;
        function scopedSelect(selector: string, element: HTMLElement): HTMLElement;
        function setControl(element: HTMLElement, control: any);
        function setOptions(control: any, options: any);

        // Enums
        enum AppBarIcon {
            // TODO
        }

        enum CountResult {
            unknown
        }

        enum CountError {
            noResponse
        }

        enum DataSourceStatus {
            ready,
            waiting,
            failure
        }

        enum EditError {
            noResponse,
            notPermitted,
            noLongerMeaningful,
            canceled
        }

        enum FetchError {
            noResponse,
            doesNotExist
        }

        enum GroupHeaderTapBehavior {
            invoke,
            none
        }

        enum HeaderPosition {
            left,
            top
        }

        enum ListViewAnimationType {
            entrance,
            contentTransition
        }

        enum ObjectType {
            groupHeader,
            item
        }

        enum Orientation {
            horizontal,
            vertical
        }

        enum PageNavigationAnimation {
            turnstile,
            slide,
            enterPage,
            continuum
        }

        enum SelectionMode {
            none,
            single,
            multi
        }

        enum SwipeBehavior {
            select,
            none
        }

        enum TapBehavior {
            directSelect,
            toggleSelect,
            invokeOnly,
            none
        }

        // Interfaces
        interface IAsyncTemplate<T> {
            renderItem: (itemPromise: IItemPromise<T>) => IAsyncRenderResult;
        }

        interface IAsyncRenderFunction<T> {
            (itemPromise: IItemPromise<T>): Option<HTMLElement, IAsyncRenderResult>;
        }

        interface IAsyncRenderResult {
            element: Option<HTMLElement, Promise<HTMLElement>>;
            renderComplete: Promise<any>;
        }

        interface IFetchResult {
            // TODO
        }

        interface IItem<T> {
            data: T;
            groupKey?: string;
            handle?: string;
            index?: number;
            key?: string;
        }

        interface IItemPromise<T> extends Promise<T> {
            handle: string;
            index: number;

            onerror: (e: CustomEvent) => any;
            dispatchEvent(type: "error", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "error", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "error", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            retain();
            release();
        }

        interface ILayout2 {
            // TODO
        }

        interface ILayoutSite2 {
            // TODO
        }

        interface IListBinding {
            // TODO
        }

        interface IListDataAdapter {
            // TODO
        }

        interface IListDataSource<T> {
            // TODO
        }

        interface IListNotificationHandler {
            // TODO
        }

        interface ISelection {
            // TODO
        }

        interface ISelectionRange {
            // TODO
        }

        interface ISyncTemplate<T> {
            render: ISyncRenderFunction<T>;
        }

        interface ISyncRenderFunction<T> {
            (item: T): HTMLElement;
        }

        interface IZoomableView {
            // TODO
        }

        // Controls
        interface IAppBarOptions {
            // TODO
        }
        class AppBar implements IDisposable {
            static _ElementWithFocusPreviousToAppBar: any;
            static _hideLightDismissAppBars: any;
            static _isAppBarOrChild: any;
            static _isWithinAppBarOrChild: any;
            static _toggleAppBarEdgy: any;

            constructor(element?: HTMLElement, options?: IAppBarOptions);

            commands: Option<AppBarCommand, AppBarCommand[]>;   // 1)
            disabled: boolean;
            element: HTMLElement;
            hidden: boolean;
            layout: string;                                     // 2)
            placement: string;                                  // 2)
            sticky: boolean;

            onafterhide: (e: CustomEvent) => any;
            onaftershow: (e: CustomEvent) => any;
            onbeforehide: (e: CustomEvent) => any;
            onbeforeshow: (e: CustomEvent) => any;
            dispatchEvent(type: "afterhide", details);
            dispatchEvent(type: "aftershow", details);
            dispatchEvent(type: "beforehide", details);
            dispatchEvent(type: "beforeshow", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "afterhide", listener: (e: CustomEvent) => any);
            addEventListener(type: "aftershow", listener: (e: CustomEvent) => any);
            addEventListener(type: "beforehide", listener: (e: CustomEvent) => any);
            addEventListener(type: "beforeshow", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "afterhide", listener: (e: CustomEvent) => any);
            removeEventListener(type: "aftershow", listener: (e: CustomEvent) => any);
            removeEventListener(type: "beforehide", listener: (e: CustomEvent) => any);
            removeEventListener(type: "beforeshow", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
            getCommandById(id: string): AppBarCommand;
            hide();
            hideCommands(commands: Option<AppBarCommand[], { [index: number]: string }>, immediate?: boolean);      // 1) 3)
            show();
            showCommands(commands: Option<AppBarCommand[], { [index: number]: string }>, immediate?: boolean);      // 1) 3)
            showOnlyCommands(commands: Option<AppBarCommand[], { [index: number]: string }>, immediate?: boolean);  // 1) 3)
        }

        interface IAppBarCommandOptions {
            // TODO
        }
        class AppBarCommand implements IDisposable {
            constructor(element?: HTMLElement, options?: IAppBarCommandOptions);

            disabled: boolean;
            element: HTMLElement;
            extraClass: string;
            firstElementFocus: HTMLElement;
            flyout: Flyout;
            hidden: boolean;
            icon: string;
            id: string;
            label: string;
            lastElementFocus: HTMLElement;
            section: string;
            selected: boolean;
            tooltip: string;
            type: string;

            onclick: (e: CustomEvent) => any;
            dispatchEvent(type: "click", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "click", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "click", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
        }

        interface IBackButtonOptions {
            // TODO
        }
        class BackButton implements IDisposable {
            constructor(element?: HTMLElement, options?: IBackButtonOptions);

            element: HTMLElement;

            dispose();
            refresh();
        }

        class CellSpanningLayout {
            // TODO
        }

        interface IDatePickerOptions {
            // TODO
        }
        class DatePicker implements IDisposable {
            constructor(element?: HTMLElement, options?: IDatePickerOptions);

            calendar: string;                                       // 2)
            current: Date;
            datePattern: string;
            disabled: boolean;
            element: HTMLElement;
            maxYear: number;
            minYear: number;
            monthPattern: string;
            yearPattern: string;

            onchange: (e: CustomEvent) => any;
            dispatchEvent(type: "change", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "change", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "change", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
            raiseEvent(type: string, eventProperties);              // 3)
        }

        class DOMEventMixin {
            // TODO: is this necessary?
        }

        interface IFlipViewCustomAnimationOptions {
            next?: (outgoingPage: number, incomingPage: number) => Promise<any>;
            previous?: (outgoingPage: number, incomingPage: number) => Promise<any>;
            jump?: (outgoingPage: number, incomingPage: number) => Promise<any>;
        }
        interface IFlipViewOptions {
            // TODO
        }
        class FlipView<T> implements IDisposable {
            constructor(element?: HTMLElement, options?: IFlipViewOptions);

            currentPage: number;
            element: HTMLElement;
            itemDataSource: IListDataSource<T>;
            itemSpacing: number;
            itemTemplate: Option<IAsyncTemplate<T>, IAsyncRenderFunction<T>>;       // 1)
            orientation: string;                                                    // 2)

            ondatasourcecountchanged: (e: CustomEvent) => any;
            onpagecompleted: (e: CustomEvent) => any;
            onpageselected: (e: CustomEvent) => any;
            onpagevisibilitychanged: (e: CustomEvent) => any;
            dispatchEvent(type: "datasourcecountchanged", details);
            dispatchEvent(type: "pagecompleted", details);
            dispatchEvent(type: "pageselected", details);
            dispatchEvent(type: "pagevisibilitychanged", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "datasourcecountchanged", listener: (e: CustomEvent) => any);
            addEventListener(type: "pagecompleted", listener: (e: CustomEvent) => any);
            addEventListener(type: "pageselected", listener: (e: CustomEvent) => any);
            addEventListener(type: "pagevisibilitychanged", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "datasourcecountchanged", listener: (e: CustomEvent) => any);
            removeEventListener(type: "pagecompleted", listener: (e: CustomEvent) => any);
            removeEventListener(type: "pageselected", listener: (e: CustomEvent) => any);
            removeEventListener(type: "pagevisibilitychanged", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            count(): Promise<number>;                                               // 1) How to include count error?
            dispose();
            forceLayout();
            next(): boolean;
            previous(): boolean;
            setCustomAnimations(animations: IFlipViewCustomAnimationOptions);
        }

        interface IFlyoutOptions {
        }
        class Flyout {
            constructor(element?: HTMLElement, options?: IFlyoutOptions);

            alignment: string;                  // 2)
            anchor: HTMLElement;
            element: HTMLElement;
            hidden: boolean;
            placement: string;                  // 2)

            onafterhide: (e: CustomEvent) => any;
            onaftershow: (e: CustomEvent) => any;
            onbeforehide: (e: CustomEvent) => any;
            onbeforeshow: (e: CustomEvent) => any;
            dispatchEvent(type: "afterhide", details);
            dispatchEvent(type: "aftershow", details);
            dispatchEvent(type: "beforehide", details);
            dispatchEvent(type: "beforeshow", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "afterhide", listener: (e: CustomEvent) => any);
            addEventListener(type: "aftershow", listener: (e: CustomEvent) => any);
            addEventListener(type: "beforehide", listener: (e: CustomEvent) => any);
            addEventListener(type: "beforeshow", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "afterhide", listener: (e: CustomEvent) => any);
            removeEventListener(type: "aftershow", listener: (e: CustomEvent) => any);
            removeEventListener(type: "beforehide", listener: (e: CustomEvent) => any);
            removeEventListener(type: "beforeshow", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
            hide();
            show();
        }

        //interface IGridLayoutOptions {
        //    // TODO
        //}
        //class GridLayout implements IGridLayoutOptions {
        //    constructor(options?: IGridLayoutOptions)

        //    calculateFirstVisible(beginScrollPosition: number, wholeItem: boolean): Promise<any>
        //    calculateLastVisible(endScrollPosition: number, wholeItem: boolean): Promise<any>
        //}
        var GridLayout; // TODO placeholder to get src files to compile. Should have formal Class definition before release.

        interface IHubOptions {
            // TODO
        }
        class Hub<T> implements IDisposable {
            constructor(element?: HTMLElement, options?: IHubOptions);

            element: HTMLElement;
            headerTemplate: Option<ISyncTemplate<T>, ISyncRenderFunction<T>>
            indexOfFirstVisisble: number;
            indexOfLastVisible: number;
            loadingState: string;                   // 2)
            orientation: Orientation;
            scrollPosition: number;
            sectionOnScreen: number;
            sections: Binding.List<T>;
            zoomableView: IZoomableView;

            oncontentanimating: (e: CustomEvent) => any;
            onheaderinvoked: (e: CustomEvent) => any;
            onloadingstatechanged: (e: CustomEvent) => any;
            dispatchEvent(type: "contentanimating", details);
            dispatchEvent(type: "headerinvoked", details);
            dispatchEvent(type: "loadingstatechanged", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "contentanimating", listener: (e: CustomEvent) => any);
            addEventListener(type: "headerinvoked", listener: (e: CustomEvent) => any);
            addEventListener(type: "loadingstatechanged", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "contentanimating", listener: (e: CustomEvent) => any);
            removeEventListener(type: "headerinvoked", listener: (e: CustomEvent) => any);
            removeEventListener(type: "loadingstatechanged", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
        }

        interface IHubSectionOptions {
            // TODO
        }
        class HubSection implements IDisposable {
            constructor(element?: HTMLElement, options?: IHubSectionOptions);

            contentElement: HTMLElement;
            element: HTMLElement;
            header: any;                // string? ask mikemas
            isHeaderStatic: boolean;

            dispose();
        }

        interface HTMLControlOptions {
            uri: string;
        }
        class HTMLControl {
            constructor(element: HTMLElement, options: HTMLControlOptions);
        }

        interface ItemContainerOptions {
            // TODO
        }
        class ItemContainer implements IDisposable {
            static _ClassName: any;
            static _containerClass: any;

            constructor(element?: HTMLElement, options?: ItemContainerOptions);

            element: HTMLElement;
            draggable: boolean;
            selected: boolean;
            selectionDisabled: boolean;
            swipeBehavior: SwipeBehavior;
            swipeOrientation: Orientation;
            tapBehavior: TapBehavior;

            invoked: (e: CustomEvent) => any;
            selectionchanged: (e: CustomEvent) => any;
            selectionchanging: (e: CustomEvent) => any;
            dispatchEvent(type: "invoked", details);
            dispatchEvent(type: "selectionchanged", details);
            dispatchEvent(type: "selectionchanging", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "invoked", listener: (e: CustomEvent) => any);
            addEventListener(type: "selectionchanged", listener: (e: CustomEvent) => any);
            addEventListener(type: "selectionchanging", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "invoked", listener: (e: CustomEvent) => any);
            removeEventListener(type: "selectionchanged", listener: (e: CustomEvent) => any);
            removeEventListener(type: "selectionchanging", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
            forceLayout();
        }

        class ListLayout {
            // TODO
        }

        interface IListViewEntity {
            index: number;
            type: ObjectType;
        }
        interface IListViewItem {
            index?: number;
            key?: string;
            hasFocus?: boolean;
            showFocus?: boolean;
        }
        interface IListViewResetFunction<T> {
            (data: T, element: HTMLElement);
        }
        interface IListViewOptions {
            // TODO
        }
        class ListView<I, H> implements IDisposable {
            constructor(element?: HTMLElement, options?: IListViewOptions);

            automaticallyLoadPages: boolean;
            currentItem: IListViewItem;
            element: HTMLElement;
            groupDataSource: IListDataSource<H>;
            groupHeaderTemplate: Option<IAsyncTemplate<H>, IAsyncRenderFunction<H>>;
            groupHeaderTapBehavior: GroupHeaderTapBehavior;
            indexOfFirstVisible: number;
            indexOfLastVisible: number;
            itemDataSource: IListDataSource<I>;
            itemsDraggable: boolean;
            itemsReorderable: boolean;
            itemTemplate: Option<IAsyncTemplate<I>, IAsyncRenderFunction<I>>;
            layout: ILayout2;
            loadingBehavior: string;    // 2)
            loadingState: string;       // 2)
            maxDeferredItemCleanup: number;
            pagesToLoadThreshold: number;
            pagesToLoad: number;
            resetGroupHeader: IListViewResetFunction<H>;
            resetItem: IListViewResetFunction<I>;
            scrollPosition: number;
            selection: ISelection;
            selectionMode: SelectionMode;
            swipeBehavior: SwipeBehavior;
            tapBehavior: TapBehavior;
            zoomableView: IZoomableView;

            oncontentanimating: (e: CustomEvent) => any;
            ongroupheaderinvoked: (e: CustomEvent) => any;
            onitemdragstart: (e: CustomEvent) => any;
            onitemdragenter: (e: CustomEvent) => any;
            onitemdragend: (e: CustomEvent) => any;
            onitemdragbetween: (e: CustomEvent) => any;
            onitemdragleave: (e: CustomEvent) => any;
            onitemdragchanged: (e: CustomEvent) => any;
            onitemdragdrop: (e: CustomEvent) => any;
            oniteminvoked: (e: CustomEvent) => any;
            onkeyboardnavigating: (e: CustomEvent) => any;
            onloadingstatechanged: (e: CustomEvent) => any;
            onselectionchanging: (e: CustomEvent) => any;
            onselectionchanged: (e: CustomEvent) => any;
            dispatchEvent(type: "contentanimating", details);
            dispatchEvent(type: "groupheaderinvoked", details);
            dispatchEvent(type: "itemdragstart", details);
            dispatchEvent(type: "itemdragenter", details);
            dispatchEvent(type: "itemdragend", details);
            dispatchEvent(type: "itemdragbetween", details);
            dispatchEvent(type: "itemdragleave", details);
            dispatchEvent(type: "itemdragchanged", details);
            dispatchEvent(type: "itemdragdrop", details);
            dispatchEvent(type: "iteminvoked", details);
            dispatchEvent(type: "keyboardnavigating", details);
            dispatchEvent(type: "loadingstatechanged", details);
            dispatchEvent(type: "selectionchanging", details);
            dispatchEvent(type: "selectionchanged", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "contentanimating", listener: (e: CustomEvent) => any);
            addEventListener(type: "groupheaderinvoked", listener: (e: CustomEvent) => any);
            addEventListener(type: "itemdragstart", listener: (e: CustomEvent) => any);
            addEventListener(type: "itemdragenter", listener: (e: CustomEvent) => any);
            addEventListener(type: "itemdragend", listener: (e: CustomEvent) => any);
            addEventListener(type: "itemdragbetween", listener: (e: CustomEvent) => any);
            addEventListener(type: "itemdragleave", listener: (e: CustomEvent) => any);
            addEventListener(type: "itemdragchanged", listener: (e: CustomEvent) => any);
            addEventListener(type: "itemdragdrop", listener: (e: CustomEvent) => any);
            addEventListener(type: "iteminvoked", listener: (e: CustomEvent) => any);
            addEventListener(type: "keyboardnavigating", listener: (e: CustomEvent) => any);
            addEventListener(type: "loadingstatechanged", listener: (e: CustomEvent) => any);
            addEventListener(type: "selectionchanging", listener: (e: CustomEvent) => any);
            addEventListener(type: "selectionchanged", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "contentanimating", listener: (e: CustomEvent) => any);
            removeEventListener(type: "groupheaderinvoked", listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemdragstart", listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemdragenter", listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemdragend", listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemdragbetween", listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemdragleave", listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemdragchanged", listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemdragdrop", listener: (e: CustomEvent) => any);
            removeEventListener(type: "iteminvoked", listener: (e: CustomEvent) => any);
            removeEventListener(type: "keyboardnavigating", listener: (e: CustomEvent) => any);
            removeEventListener(type: "loadingstatechanged", listener: (e: CustomEvent) => any);
            removeEventListener(type: "selectionchanging", listener: (e: CustomEvent) => any);
            removeEventListener(type: "selectionchanged", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
            elementFromIndex: HTMLElement;
            ensureVisible: Option<number, IListViewEntity>;
            forceLayout();
            indexOfElement(element: HTMLElement): number;
            loadMorePages();
            recalculateItemPosition();

            static triggerDispose();
        }

        interface IMenuOptions extends IFlyoutOptions {
            commands?: Option<MenuCommand, MenuCommand[]>;
        }
        class Menu extends Flyout {
            static _focusOnNextElement: any;
            static _focusOnPreviousElement: any;

            constructor(element?: HTMLElement, options?: IMenuOptions);

            commands: Option<MenuCommand, MenuCommand[]>;
        }

        interface IMenuCommandOptions {
            // TODO
        }
        class MenuCommand implements IDisposable {
            disabled: boolean;
            element: HTMLElement;
            extraClass: string;
            flyout: Flyout;
            hidden: boolean;
            id: string;
            label: string;
            selected: boolean;
            type: string;

            constructor(element?: HTMLElement, options?: IMenuCommandOptions);

            dispose();
        }

        interface NavBarOptions extends IAppBarOptions {
            onchildrenprocessed?: (e: CustomEvent) => any;
        }
        class NavBar extends AppBar {
            static _ClassName: any;
            static _EventName: any;

            constructor(element?: HTMLElement, options?: NavBarOptions);

            onchildrenprocessed: (e: CustomEvent) => any;
            dispatchEvent(type: "afterhide", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "childrenprocessed", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "childrenprocessed", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);
        }

        interface INavBarCommandOptions {
            // TODO
        }
        class NavBarCommand implements IDisposable {
            static _ClassName: any;
            static _EventName: any;

            element: HTMLElement;
            icon: string;
            label: string;
            location: any;
            splitButton: boolean;
            splitOpened: boolean;
            state: any;
            tooltip: string;

            constructor(element?: HTMLElement, options?: INavBarCommandOptions);

            dispatchEvent(type: string, details);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
        }

        interface INavBarContainer {
            // TODO
        }
        class NavBarContainer<T> implements IDisposable {
            static _ClassName: any;
            static _EventName: any;

            constructor(element?: HTMLElement, options?: INavBarContainer);

            currentIndex: number;
            data: Binding.List<T>
            element: HTMLElement;
            fixedSize: boolean;
            layout: Orientation;
            template: Option<ISyncTemplate<T>, ISyncRenderFunction<T>>;
            maxRows: number;

            oninvoked: (e: CustomEvent) => any;
            onsplittoggle: (e: CustomEvent) => any;
            dispatchEvent(type: "invoked", details);
            dispatchEvent(type: "splittoggle", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "invoked", listener: (e: CustomEvent) => any);
            addEventListener(type: "splittoggle", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "invoked", listener: (e: CustomEvent) => any);
            removeEventListener(type: "splittoggle", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
            forceLayout();
        }

        interface IRatingOptions {
            // TODO
        }
        class Rating implements IDisposable {
            constructor(element?: HTMLElement, options?: IRatingOptions);

            averageRating: number;
            disabled: boolean;
            element: HTMLElement;
            enableClear: boolean;
            maxRating: number;
            tooltipStrings: string[];
            userRating: number;

            oncancel: (e: CustomEvent) => any;
            onchange: (e: CustomEvent) => any;
            onpreviewchange: (e: CustomEvent) => any;
            dispatchEvent(type: "cancel", details);
            dispatchEvent(type: "change", details);
            dispatchEvent(type: "previewchange", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "cancel", listener: (e: CustomEvent) => any);
            addEventListener(type: "change", listener: (e: CustomEvent) => any);
            addEventListener(type: "previewchange", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "cancel", listener: (e: CustomEvent) => any);
            removeEventListener(type: "change", listener: (e: CustomEvent) => any);
            removeEventListener(type: "previewchange", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
        }

        interface RepeaterOptions<T> {
            data?: Binding.List<T>;
            template?: Option<ISyncTemplate<T>, ISyncRenderFunction<T>>;   // 1)

            onitemchanged?: (e: CustomEvent) => any;
            onitemchanging?: (e: CustomEvent) => any;
            oniteminserted?: (e: CustomEvent) => any;
            oniteminserting?: (e: CustomEvent) => any;
            onitemmoved?: (e: CustomEvent) => any;
            onitemmoving?: (e: CustomEvent) => any;
            onitemremoved?: (e: CustomEvent) => any;
            onitemremoving?: (e: CustomEvent) => any;
            onitemsloaded?: (e: CustomEvent) => any;
            onitemsreloaded?: (e: CustomEvent) => any;
            onitemsreloading?: (e: CustomEvent) => any;
        }
        class Repeater<T> implements RepeaterOptions<T>, IDisposable {
            constructor(element?: HTMLElement, options?: RepeaterOptions<T>);

            element: HTMLElement;
            length: number;
            data: Binding.List<T>;
            template: Option<ISyncTemplate<T>, ISyncRenderFunction<T>>;   // 1)

            onitemchanged: (e: CustomEvent) => any;
            onitemchanging: (e: CustomEvent) => any;
            oniteminserted: (e: CustomEvent) => any;
            oniteminserting: (e: CustomEvent) => any;
            onitemmoved: (e: CustomEvent) => any;
            onitemmoving: (e: CustomEvent) => any;
            onitemremoved: (e: CustomEvent) => any;
            onitemremoving: (e: CustomEvent) => any;
            onitemsloaded: (e: CustomEvent) => any;
            onitemsreloaded: (e: CustomEvent) => any;
            onitemsreloading: (e: CustomEvent) => any;
            dispatchEvent(type: "itemchanged", details);
            dispatchEvent(type: "itemchanging", details);
            dispatchEvent(type: "iteminserted", details);
            dispatchEvent(type: "iteminserting", details);
            dispatchEvent(type: "itemmoved", details);
            dispatchEvent(type: "itemmoving", details);
            dispatchEvent(type: "itemremoved", details);
            dispatchEvent(type: "itemremoving", details);
            dispatchEvent(type: "itemsloaded", details);
            dispatchEvent(type: "itemsreloaded", details);
            dispatchEvent(type: "itemsreloading", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "itemchanged", listener: (e: CustomEvent) => any);
            addEventListener(type: "itemchanging", listener: (e: CustomEvent) => any);
            addEventListener(type: "iteminserted", listener: (e: CustomEvent) => any);
            addEventListener(type: "iteminserting", listener: (e: CustomEvent) => any);
            addEventListener(type: "itemmoved", listener: (e: CustomEvent) => any);
            addEventListener(type: "itemmoving", listener: (e: CustomEvent) => any);
            addEventListener(type: "itemremoved", listener: (e: CustomEvent) => any);
            addEventListener(type: "itemremoving", listener: (e: CustomEvent) => any);
            addEventListener(type: "itemsloaded", listener: (e: CustomEvent) => any);
            addEventListener(type: "itemsreloaded", listener: (e: CustomEvent) => any);
            addEventListener(type: "itemsreloading", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemchanged", listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemchanging", listener: (e: CustomEvent) => any);
            removeEventListener(type: "iteminserted", listener: (e: CustomEvent) => any);
            removeEventListener(type: "iteminserting", listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemmoved", listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemmoving", listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemremoved", listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemremoving", listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemsloaded", listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemsreloaded", listener: (e: CustomEvent) => any);
            removeEventListener(type: "itemsreloading", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
            elementFromIndex(index: number): HTMLElement;
        }

        interface SearchBoxOptions {
            // TODO
        }
        class SearchBox implements IDisposable {
            static _Constants: any;
            static _EventName: any;
            static _getKeyModifiers: any;
            static _hitIntersectionReducer: any;
            static _hitStartPositionAscendingSorter: any;
            static _isTypeToSearchKey: any;
            static _sortAndMergeHits: any;

            constructor(element?: HTMLElement, options?: SearchBoxOptions);

            chooseSuggestionOnEnter: boolean;
            disabled: boolean;
            element: HTMLElement;
            focusOnKeyboardInput: boolean;
            placeholderText: string;
            queryText: string;
            searchHistoryContext: string;
            searchHistoryDisabled: boolean;

            onquerychanged: (e: CustomEvent) => any;
            onquerysubmitted: (e: CustomEvent) => any;
            onresultsuggestionchosen: (e: CustomEvent) => any;
            onsuggestionsrequested: (e: CustomEvent) => any;
            dispatchEvent(type: "querychanged", details);
            dispatchEvent(type: "querysubmitted", details);
            dispatchEvent(type: "resultsuggestionchosen", details);
            dispatchEvent(type: "suggestionsrequested", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "querychanged", listener: (e: CustomEvent) => any);
            addEventListener(type: "querysubmitted", listener: (e: CustomEvent) => any);
            addEventListener(type: "resultsuggestionchosen", listener: (e: CustomEvent) => any);
            addEventListener(type: "suggestionsrequested", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "querychanged", listener: (e: CustomEvent) => any);
            removeEventListener(type: "querysubmitted", listener: (e: CustomEvent) => any);
            removeEventListener(type: "resultsuggestionchosen", listener: (e: CustomEvent) => any);
            removeEventListener(type: "suggestionsrequested", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
            setLocalContentSuggestionSetting(settings: any); // TODO
        }

        interface ISemanticZoomOptions {
            // TODO
        }
        class SemanticZoom implements IDisposable {
            constructor(element?: HTMLElement, options?: ISemanticZoomOptions);

            element: HTMLElement;
            enableButton: boolean;
            isDeclarativeControlContainer: boolean;
            locked: boolean;
            zoomedOut: boolean;
            zoomFactor: number;

            onzoomchanged: (e: CustomEvent) => any;
            dispatchEvent(type: "zoomchanged", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "zoomchanged", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "zoomchanged", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
            forceLayout();
        }

        interface ISettingsFlyoutOptions {
            // TODO
        }
        class SettingsFlyout implements IDisposable {
            static _onSettingsCommand;
            static populateSettings(e: any): void;
            static show(): void;
            static showSettings(id: string, path: any);        // What is path?

            constructor(element?: HTMLElement, options?: ISettingsFlyoutOptions);

            element: HTMLElement;
            hidden: boolean;
            settingsCommandId: string;
            width: number;

            onafterhide: (e: CustomEvent) => any;
            onaftershow: (e: CustomEvent) => any;
            onbeforehide: (e: CustomEvent) => any;
            onbeforeshow: (e: CustomEvent) => any;
            dispatchEvent(type: "afterhide", details);
            dispatchEvent(type: "aftershow", details);
            dispatchEvent(type: "beforehide", details);
            dispatchEvent(type: "beforeshow", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "afterhide", listener: (e: CustomEvent) => any);
            addEventListener(type: "aftershow", listener: (e: CustomEvent) => any);
            addEventListener(type: "beforehide", listener: (e: CustomEvent) => any);
            addEventListener(type: "beforeshow", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "afterhide", listener: (e: CustomEvent) => any);
            removeEventListener(type: "aftershow", listener: (e: CustomEvent) => any);
            removeEventListener(type: "beforehide", listener: (e: CustomEvent) => any);
            removeEventListener(type: "beforeshow", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
            hide();
            populateSettings(e: CustomEvent);
            show();
        }

        interface IStorageDataSourceOptions {
            // TODO? StorageDataSource has no public properties to set or events to handle...
        }
        class StorageDataSource<T> {
            constructor(query: any, options?: IStorageDataSourceOptions);       // TODO

            loadThumbnail(item: IItem<T>, image: HTMLImageElement);
        }

        interface ITabContainerOptions {
            // TODO
        }
        class TabContainer implements IDisposable {
            constructor(element: HTMLElement, options?: ITabContainerOptions);

            childFocus: HTMLElement;
            tabIndex: number;

            dispose();
        }

        interface ITimePickerOptions {
            // TODO
        }
        class TimePicker implements IDisposable {
            constructor(element?: HTMLElement, options?: ITimePickerOptions);

            clock: string;      // 2)
            current: Date;
            disabled: boolean;
            element: HTMLElement;
            hourPattern: string;
            minuteIncrement: number;
            minutePattern: string;
            periodPattern: string;

            onchange: (e: CustomEvent) => any;
            dispatchEvent(type: "change", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "change", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "change", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
        }

        interface IToggleSwitchOptions {
            // TODO
        }
        class ToggleSwitch implements IDisposable {
            constructor(element?: HTMLElement, options?: IToggleSwitchOptions);

            checked: boolean;
            disabled: boolean;
            element: HTMLElement;
            labelOff: string;
            labelOn: string;
            title: string;

            onchange: (e: CustomEvent) => any;
            dispatchEvent(type: "change", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "change", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "change", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            dispose();
            handleEvent(event);                             // 3)
            raiseEvent(type: string, eventProperties);      // 3)
        }

        interface ITooltipOptions {
            // TODO
        }
        class Tooltip implements IDisposable {
            constructor(element?: HTMLElement, options?: ITooltipOptions);

            contentElement: HTMLElement;
            element: HTMLElement;
            extraClass: string;
            innerHTML: string;
            infotip: boolean;
            placement: string;                      // 2)

            onbeforeclose: (e: CustomEvent) => any;
            onbeforeopen: (e: CustomEvent) => any;
            onclosed: (e: CustomEvent) => any;
            onbeforeshow: (e: CustomEvent) => any;
            dispatchEvent(type: "beforeclose", details);
            dispatchEvent(type: "beforeopen", details);
            dispatchEvent(type: "closed", details);
            dispatchEvent(type: "opened", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "beforeclose", listener: (e: CustomEvent) => any);
            addEventListener(type: "beforeopen", listener: (e: CustomEvent) => any);
            addEventListener(type: "closed", listener: (e: CustomEvent) => any);
            addEventListener(type: "opened", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "beforeclose", listener: (e: CustomEvent) => any);
            removeEventListener(type: "beforeopen", listener: (e: CustomEvent) => any);
            removeEventListener(type: "closed", listener: (e: CustomEvent) => any);
            removeEventListener(type: "opened", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);

            close();
            dispose();
            open(type: string);                     // 2)
        }

        interface IViewBoxOptions {
            // TODO? ViewBox has no publicly settable properties or events to handle
        }
        class ViewBox implements IDisposable {
            constructor(element?: HTMLElement, options?: IViewBoxOptions);

            element: HTMLElement;

            dispose();
            forceLayout();
        }

        interface IVirtualizedDataSourceOptions {
            onstatuschanged?: (e: CustomEvent) => any;
        }
        class VirtualizedDataSource {
            constructor(listDataAdapter: IListDataAdapter, options?: IVirtualizedDataSourceOptions);

            onstatuschanged: (e: CustomEvent) => any;
            dispatchEvent(type: "statuschanged", details);
            dispatchEvent(type: string, details);
            addEventListener(type: "statuschanged", listener: (e: CustomEvent) => any);
            addEventListener(type: string, listener: (e: CustomEvent) => any);
            removeEventListener(type: "statuschanged", listener: (e: CustomEvent) => any);
            removeEventListener(type: string, listener: (e: CustomEvent) => any);
        }

        module Animation {
            interface AnimationExecuter {
                execute(): Promise<any>;
            }

            interface OffsetDescriptor {
                left?: number;
                right?: number;
                top?: number;
                bottom?: number;
                rtlflip?: boolean;
            }

            function createAddToListAnimation(added: HTMLElement, effected: HTMLElement): AnimationExecuter;
            function createAddToListAnimation(added: HTMLElement, effected: HTMLElement[]): AnimationExecuter;
            function createAddToListAnimation(added: HTMLElement[], effected: HTMLElement): AnimationExecuter;
            function createAddToListAnimation(added: HTMLElement[], effected: HTMLElement[]): AnimationExecuter;

            function createDeleteFromListAnimation(deleted: HTMLElement, remaining: HTMLElement): AnimationExecuter;
            function createDeleteFromListAnimation(deleted: HTMLElement, remaining: HTMLElement[]): AnimationExecuter;
            function createDeleteFromListAnimation(deleted: HTMLElement[], remaining: HTMLElement): AnimationExecuter;
            function createDeleteFromListAnimation(deleted: HTMLElement[], remaining: HTMLElement[]): AnimationExecuter;

            function createRepositionAnimation(element: HTMLElement): AnimationExecuter;
            function createRepositionAnimation(elements: HTMLElement[]): AnimationExecuter;
            function createRepositionAnimation(elements: any): AnimationExecuter;

            function enterContent(element: HTMLElement, offset: OffsetDescriptor, options: any): Promise<any>; // that "options" parameter is just weird, see MSDN.
            function enterContent(elements: HTMLElement[], offsets: OffsetDescriptor[], options: any): Promise<any>;
            function enterContent(elements: any, offsets: any, options: any): Promise<any>;

            function enterPage(elements: HTMLElement[], offsets?: OffsetDescriptor[]): Promise<any>;
            function enterPage(element: HTMLElement, offset: OffsetDescriptor): Promise<any>;
            function enterPage(elements: any, offsets: any): Promise<any>;

            function fadeIn(shown: HTMLElement[]): Promise<any>;
            function fadeIn(shown: HTMLElement): Promise<any>;
            function fadeIn(shown: any): Promise<any>;

            function fadeOut(hidden: HTMLElement): Promise<any>;
            function fadeOut(hidden: HTMLElement[]): Promise<any>;
            function fadeOut(hidden: any): Promise<any>;

            function hideEdgeUI(element: HTMLElement, offset: OffsetDescriptor, options: any): Promise<any>; // that "options" parameter is just weird, see MSDN.
            function hideEdgeUI(elements: HTMLElement[], offsets: OffsetDescriptor[], options: any): Promise<any>;
            function hideEdgeUI(elements: any, offsets: any, options: any): Promise<any>;

            function hidePopup(elements: HTMLElement[], offsets?: OffsetDescriptor[]): Promise<any>;
            function hidePopup(element: HTMLElement, offset?: OffsetDescriptor): Promise<any>;
            function hidePopup(elements: any, offsets: any): Promise<any>;

            function showEdgeUI(element: HTMLElement, offset: OffsetDescriptor, options: any): Promise<any>; // that "options" parameter is just weird, see MSDN.
            function showEdgeUI(elements: HTMLElement[], offsets: OffsetDescriptor[], options: any): Promise<any>;
            function showEdgeUI(elements: any, offsets: any, options: any): Promise<any>;

            function showPopup(elements: HTMLElement[], offsets?: OffsetDescriptor[]): Promise<any>;
            function showPopup(element: HTMLElement, offset: OffsetDescriptor): Promise<any>;
            function showPopup(elements: any, offsets: any): Promise<any>;

            function showPanel(elements: HTMLElement[], offsets?: OffsetDescriptor[]): Promise<any>;
            function showPanel(element: HTMLElement, offset: OffsetDescriptor): Promise<any>;
            function showPanel(elements: any, offsets: any): Promise<any>;

            function slideDown(outgoingElement: HTMLElement): Promise<any>;
            function slideDown(outgoingElements: HTMLElement[]): Promise<any>;
            function slideDown(outgoingElements: any): Promise<any>;

            function slideUp(incomingElement: HTMLElement): Promise<any>;
            function slideUp(incomingElement: HTMLElement[]): Promise<any>;
            function slideUp(incomingElement: any): Promise<any>;

            function swipeReveal(targets: HTMLElement[], offsets?: OffsetDescriptor[]): Promise<any>;
            function swipeReveal(target: HTMLElement, offset?: OffsetDescriptor): Promise<any>;
            function swipeReveal(target: any, offset: any): Promise<any>;
        }

        module Fragments {
            function cache(href: string): Promise<any>;
            function clearCache(href: string);
            function render(href: string, element?: HTMLElement): Promise<HTMLElement>;
            function renderCopy(href: string, element?: HTMLElement): Promise<HTMLElement>;
        }

        module Pages {
            function define(uri: string, members?: IPageControlMembers): PageControl;
            function get(uri: string): any;
            function render(uri: string, element: HTMLElement, options?: any, parentedPromise?: Promise<any>): Promise<any>;

            interface IPageControlMembers {
                error?: (error: any) => void;
                init?: (element: HTMLElement, options?: any) => Promise<any>;
                load?: (uri: string) => Promise<HTMLElement[]>;
                processed?: (element: HTMLElement, options?: any) => Promise<any>;
                ready?: (element: HTMLElement, options?: any) => Promise<any>;
                render?: (element: HTMLElement, options?: any, loadResult?: Promise<HTMLElement>) => void;
            }

            class PageControl {
            }
        }

        module TrackTabBehavior {
            function attach(element: HTMLElement, tabIndex: number);
            function detach(element: HTMLElement, tabIndex?: number);
        }
    }

    module Utilities {

        enum Key {
            a,
            add,
            dash,
            downArrow,
            equal,
            end,
            enter,
            escape,
            F10,
            home,
            leftArrow, 
            num0,
            num9,
            numPad0,
            numPad9,           
            menu,
            pageDown,
            pageUp,
            rightArrow,
            space,
            subtract,
            tab,
            upArrow,
        }

        interface IRect {
            left: number;
            top: number;
            width: number;
            height: number;
        }

        class QueryCollection {
            constructor(items?: HTMLElement[]);

            addClass(name: string): QueryCollection;
            children(element: HTMLElement): QueryCollection;
            clearStyle(name: string): QueryCollection;
            control(ctor: any, options: any): QueryCollection;
            forEach(callbackFn: (item: HTMLElement, index: number) => any, thisArg?: any): QueryCollection;
            get(index: number): HTMLElement;
            getAttribute(name: string): string;
            hasClass(name: string): boolean;
            id(id: string): QueryCollection;
            include(items: HTMLElement[]);
            listen(eventType: string, listener: (e: Event) => any, capture: boolean);
            query(query: string): QueryCollection;
            removeClass(name: string): QueryCollection;
            removeEventListener(eventType: string, listener: (e: Event) => any, capture: boolean): QueryCollection;
            setAttribute(name: string, value: string): QueryCollection;
            setStyle(name: string, value: string): QueryCollection;
            template(templateElement: HTMLElement, data: any, renderDonePromiseCallback?: (promise: Promise<HTMLElement>) => any): QueryCollection;
            toggleClass(name: string): QueryCollection;
        }
        function addClass<T extends HTMLElement>(element: T, className: string): T;
        function children(element: HTMLElement): QueryCollection;
        function convertToPixels(element: HTMLElement, value: string): number;
        function data(element: HTMLElement): any;
        function empty<T extends HTMLElement>(element: T): T;
        function eventWithinElement(element: HTMLElement, event: Event): boolean;
        function getContentHeight(element: HTMLElement): number;
        function getContentWidth(element: HTMLElement): number;
        function getPosition(element: HTMLElement): IRect;
        function getRelativeLeft(element: HTMLElement, parent: HTMLElement): number;
        function getRelativeTop(element: HTMLElement, parent: HTMLElement): number;
        function getTotalHeight(element: HTMLElement): number;
        function getTotalWidth(element: HTMLElement): number;
        function hasClass(element: Element, className: string): boolean;
        function id(id: string): QueryCollection;
        function query(query: string, element: HTMLElement): QueryCollection;
        function removeClass<T extends HTMLElement>(element: T, className: string): T;
        function toggleClass<T extends HTMLElement>(element: T, className: string): T;
    }
}
