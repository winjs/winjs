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
    vuiData: "_winVuiData"
};

var ClassNames = {
    active: "win-vui-active",
    disambiguation: "win-vui-disambiguation",
};

var EventNames = {
    ListeningModeStateChanged: "ListeningStateChanged"
};

var ListeningModeStates = {
    active: "active",
    disambiguation: "disambiguation",
    inactive: "inactive",
};

function _handleListeningModeStateChanged(e: ListeningModeEvent) {
    if (e.defaultPrevented) {
        return;
    }

    var target = <HTMLElement>e.target;
    var transitionHandler: ListeningModeTransitionHandler = Handlers[target.tagName];
    if (!transitionHandler) {
        return;
    }

    switch (e.state) {
        case ListeningModeStates.active:
            if (target[Properties.vuiData] || _ElementUtilities.hasClass(target, ClassNames.active)) {
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
    // The name of the exported variables are exactly the same as the tag name of the element they are handling
    interface IButtonVuiData {
        nodes: Node[];
        width: string;
        height: string;
    }
    export var BUTTON: ListeningModeTransitionHandler = {
        activate: (element: HTMLElement, label: string) => {
            var vuiData: IButtonVuiData = {
                nodes: [],
                width: element.style.width,
                height: element.style.height
            };

            // Freeze button size
            var cs = _ElementUtilities._getComputedStyle(element);
            element.style.width = cs.width;
            element.style.height = cs.height;

            // Store nodes: Use element.childNodes to retain elements and textNodes
            while (element.childNodes.length) {
                vuiData.nodes.push(element.removeChild(element.childNodes[0]));
            }

            element[Properties.vuiData] = vuiData;
            element.textContent = label;
        },

        disambiguate: (element: HTMLElement, label: string) => {
            element.textContent = label;
        },

        reactivate: (element: HTMLElement, label: string) => {
            element.textContent = label;
        },

        deactivate: (element: HTMLElement) => {
            element.innerHTML = "";

            var vuiData = <IButtonVuiData>element[Properties.vuiData];
            element.style.width = vuiData.width;
            element.style.height = vuiData.height;
            vuiData.nodes.forEach((node: Node) => element.appendChild(node));

            delete element[Properties.vuiData];
        }
    }
}


if (_Global.document) {
    _Global.document.addEventListener(EventNames.ListeningModeStateChanged, _handleListeningModeStateChanged);
}