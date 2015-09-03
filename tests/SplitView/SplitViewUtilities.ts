module SplitViewTests {
    "use strict";
    
    export var SplitView = <typeof WinJS.UI.PrivateSplitView>WinJS.UI.SplitView;
    
    export interface ISplitViewOptions {
        panePlacement: string;
        closedDisplayMode: string;
        openedDisplayMode: string;
        paneOpened: boolean;
    }
                
    export interface IPrivateSplitViewOptions extends ISplitViewOptions {
        paneHTML: string;
        contentHTML: string;
    }
    
    export module Utilities {
        export function makeCreateSplitView(testRoot) {
            function createSplitView(providedOptions={}): WinJS.UI.PrivateSplitView {
                var defaultOptions: IPrivateSplitViewOptions = {
                    panePlacement: "left",
                    closedDisplayMode: "inline",
                    openedDisplayMode: "overlay",
                    paneOpened: false,
                    paneHTML: "<button>Button 1</button><button>Button 2</button>",
                    contentHTML: "Some content"
                };
                Helper.Assert.areKeysValid(providedOptions, Object.keys(defaultOptions));
                var options: IPrivateSplitViewOptions = WinJS.Utilities._merge(defaultOptions, providedOptions);
                
                var element = document.createElement("div");
                element.innerHTML = "<div>" + options.paneHTML + "</div>" + options.contentHTML;
                testRoot.appendChild(element);
                var splitView = new SplitView(element, options);
                
                // Apply some background colors so we can see the SplitView.
                splitView.paneElement.style.backgroundColor = "steelblue";
                splitView.contentElement.style.backgroundColor = "lightsteelblue";
                
                return splitView;
            }
            return createSplitView;
        }
        
        export function useSynchronousAnimations(splitView: WinJS.UI.PrivateSplitView) {
            splitView._playShowAnimation = function () {
                return WinJS.Promise.wrap();
            };
            splitView._playHideAnimation = function () {
                return WinJS.Promise.wrap();
            };
            splitView._updateTabIndices = splitView._updateTabIndicesImpl;
            return splitView;
        }
        
        export function hookAfterPrepareAnimationOnce(splitView: WinJS.UI.PrivateSplitView, callback: Function): void {
            var originalFn = splitView._prepareAnimation;
            splitView._prepareAnimation = () => {
                splitView._prepareAnimation = originalFn;
                var value = originalFn.apply(splitView, arguments);
                callback.apply(null, arguments);
                return value;
            };
        }
        
        export function hookBeforeClearAnimationOnce(splitView: WinJS.UI.PrivateSplitView, callback: Function): void {
            var originalFn = splitView._clearAnimation;
            splitView._clearAnimation = () => {
                splitView._clearAnimation = originalFn;
                callback.apply(null, arguments);
                var value = originalFn.apply(splitView, arguments);
                return value;
            };
        }
    }
}