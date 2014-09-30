module ContentDialogTests {
    "use strict";
    
    export var ContentDialog = <typeof WinJS.UI.PrivateContentDialog>WinJS.UI.ContentDialog;
    
    export interface IContentDialogOptions {
        title: string;
        primaryCommandText: string;
        secondaryCommandText: string;
        primaryCommandDisabled: boolean;
        secondaryCommandDisabled: boolean;
    }
                
    export interface IPrivateContentDialogOptions extends IContentDialogOptions {
        innerHTML: string;
    }
    
    export module Utilities {
        
        export function assertValidKeys(object, validKeys) {
            Object.keys(object).forEach(function (key) {
                LiveUnit.Assert.areNotEqual(-1, validKeys.indexOf(key),
                    "Test provided invalid key: " + key + ". Valid properties are: " + validKeys.join(", "));
            });
        }
        
        export function makeCreateDialog(testRoot) {
            function createDialog(providedOptions={}): WinJS.UI.PrivateContentDialog {
                var defaultOptions: IPrivateContentDialogOptions = {
                    title: "A Title",
                    primaryCommandText: "OK",
                    secondaryCommandText: "Cancel",
                    primaryCommandDisabled: false,
                    secondaryCommandDisabled: false,
                    innerHTML: ""
                };
                assertValidKeys(providedOptions, Object.keys(defaultOptions));
                var options: IPrivateContentDialogOptions = WinJS.Utilities._merge(defaultOptions, providedOptions);
                
                var element = document.createElement("div");
                element.innerHTML = options.innerHTML;
                var dialog = new ContentDialog(element, options);
                testRoot.appendChild(dialog.element);
                return dialog;
            }
            return createDialog;
        }
        
        export function useSynchronousAnimations(dialog: WinJS.UI.PrivateContentDialog) {
            dialog._playEntranceAnimation = function () {
                return WinJS.Promise.wrap();
            };
            dialog._playExitAnimation = function () {
                return WinJS.Promise.wrap();
            };
            dialog._updateTabIndices = dialog._updateTabIndicesImpl;
            return dialog;
        }
    }
}