// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

module Application {
    "use strict";

    var nav = WinJS.Navigation;

    export var navigator;

    export class PageControlNavigator {

        _element = null;
        home = "";
        _lastNavigationPromise = WinJS.Promise.as();

        constructor(element, options) {
            this._element = element || document.createElement("div");
            this._element.appendChild(this._createPageElement());

            this.home = options.home;

            nav.addEventListener('navigating', this._navigating.bind(this), false);
            nav.addEventListener('navigated', this._navigated.bind(this), false);

            Application.navigator = this;

        }
        // This is the currently loaded Page object.
        get pageControl() {
            return this.pageElement && this.pageElement.winControl;
        }

        // This is the root element of the current page.
        get pageElement() {
            return this._element.firstElementChild;
        }


        // Creates a container for a new page to be loaded into.
        _createPageElement() {
            var element = document.createElement("div");
            element.style.width = "100%";
            element.style.height = "100%";
            return element;
        }

        // Retrieves a list of animation elements for the current page.
        // If the page does not define a list, animate the entire page.
        _getAnimationElements() {
            if (this.pageControl && this.pageControl.getAnimationElements) {
                return this.pageControl.getAnimationElements();
            }
            return this.pageElement;
        }
        _navigated() {
            WinJS.UI.Animation.enterPage(this._getAnimationElements()).done();
        }

        // Responds to navigation by adding new pages to the DOM.
        _navigating(args) {
            var newElement = this._createPageElement();
            var parentedComplete;
            var parented = new WinJS.Promise(function (c) { parentedComplete = c; });

            this._lastNavigationPromise.cancel();

            this._lastNavigationPromise = WinJS.Promise.timeout().then(function () {
                return WinJS.UI.Pages.render(args.detail.location, newElement, args.detail.state, parented);
            }).then(function parentElement(control) {
                    var oldElement = this.pageElement;

                    // Dispose BackButton control
                    var innerButtonElement = document.getElementById('innerButton');
                    if (innerButtonElement && innerButtonElement.winControl) {
                        innerButtonElement.winControl.dispose();
                    }

                    if (oldElement.winControl && oldElement.winControl.unload) {
                        oldElement.winControl.unload();
                    }
                    this._element.appendChild(newElement);
                    this._element.removeChild(oldElement);
                    oldElement.textContent = "";
                    //this._updateBackButton();
                    parentedComplete();
                }.bind(this));

            args.detail.setPromise(this._lastNavigationPromise);
        }
    }

}
