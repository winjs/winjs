// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
import _Global = require("./Core/_Global");

import _BaseUtils = require("./Core/_BaseUtils");
import _ElementUtilities = require("./Utilities/_ElementUtilities");

interface ListeningModeEvent extends Event {
    label: string;
    state: string;
}

interface ListeningModeTransitionHandler {
    /**
     * Transitions the element from 'inactive' to 'active' state
    **/
    activate(element: HTMLElement, label: string): void;

    /**
     * Transitions the element from 'active' to 'disambiguation' state
    **/
    disambiguate(element: HTMLElement, label: string): void;

    /**
     * Transitions the element from 'disambiguation' to 'active' state
    **/
    reactivate(element: HTMLElement, label: string): void;

    /**
     * Transitions the element to the 'inactive' state
    **/
    deactivate(element: HTMLElement): void;
}

var Properties = {
    origContent: "_vuiOrigContent"
};

var ClassNames = {
    active: "win-vui-active",
    disambiguation: "win-vui-disambiguation",
};

var EventNames = {
    ListeningModeStateChanged: "listeningmodestatechanged"
};

var ListeningModeStates = {
    active: "active",
    disambiguation: "disambiguation",
    inactive: "inactive",
};

function _handleListeningModeStateChanged(e: ListeningModeEvent) {
    var target = <HTMLElement>e.target;
    var transitionHandler: ListeningModeTransitionHandler = Handlers[target.tagName];
    if (!transitionHandler) {
        return;
    }

    switch (e.state) {
        case ListeningModeStates.active:
            if (target[Properties.origContent] || _ElementUtilities.hasClass(target, ClassNames.active)) {
                _ElementUtilities.removeClass(target, ClassNames.disambiguation);
                transitionHandler.reactivate(target, e.label);
            } else {
                _ElementUtilities.addClass(target, ClassNames.active);
                transitionHandler.activate(target, e.label);
            }
            break;

        case ListeningModeStates.disambiguation:
            _ElementUtilities.addClass(target, ClassNames.active);
            _ElementUtilities.addClass(target, ClassNames.disambiguation);
            transitionHandler.disambiguate(target, e.label);
            break;

        case ListeningModeStates.inactive:
            _ElementUtilities.removeClass(target, ClassNames.active);
            _ElementUtilities.removeClass(target, ClassNames.disambiguation);
            transitionHandler.deactivate(target);
            break;
    }
}

module Handlers {
    // The static classes in this module correspond to the element tag name they are handling
    export class BUTTON {
        static activate(element: HTMLElement, label: string) {
            var origContent: any;
            if (element.childElementCount) {
                origContent = [];
                while (element.childElementCount) {
                    origContent.push(element.removeChild(element.children[0]));
                }
            } else {
                origContent = element.innerHTML;
            }
            element[Properties.origContent] = origContent;
            element.textContent = label;
        }

        static disambiguate(element: HTMLElement, label: string) {
            element.textContent = label;
        }

        static reactivate(element: HTMLElement, label: string) {
            element.textContent = label;
        }

        static deactivate(element: HTMLElement) {
            var origContent = element[Properties.origContent];
            if (typeof origContent === "string") {
                element.innerHTML = origContent;
            } else {
                element.innerHTML = "";
                origContent.forEach((node: Node) => element.appendChild(node));
            }
            delete element[Properties.origContent];
        }
    }
}


if (_Global.document) {
    // We are subscribing for the capture phase to allow subsequent handlers to overwrite the default behavior.
    _Global.document.addEventListener(EventNames.ListeningModeStateChanged, _handleListeningModeStateChanged, true);
}