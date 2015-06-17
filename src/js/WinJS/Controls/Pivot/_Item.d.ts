import Promise = require("../../Promise");

export declare class PivotItem {
    contentElement: HTMLElement;
    element: HTMLElement;
    header: string;
    dispose(): void;

    _process(): Promise<any>;
}