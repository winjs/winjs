// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    './_Global',
    './_WinRT',
    './_Base',
    './_Events'
    ], function resourcesInit(exports, _Global, _WinRT, _Base, _Events) {
    "use strict";

    var appxVersion = "$(TARGET_DESTINATION)";
    var developerPrefix = "Developer.";
    if (appxVersion.indexOf(developerPrefix) === 0) {
        appxVersion = appxVersion.substring(developerPrefix.length);
    }

    function _getWinJSString(id) {
        return getString("ms-resource://" + appxVersion + "/" + id);
    }

    var resourceMap;
    var mrtEventHook = false;
    var contextChangedET = "contextchanged";
    var resourceContext;

    var ListenerType = _Base.Class.mix(_Base.Class.define(null, { /* empty */ }, { supportedForProcessing: false }), _Events.eventMixin);
    var listeners = new ListenerType();
    var createEvent = _Events._createEventProperty;

    var strings = {
        get malformedFormatStringInput() { return "Malformed, did you mean to escape your '{0}'?"; },
    };

    _Base.Namespace.define("WinJS.Resources", {
        _getWinJSString: _getWinJSString
    });

    function formatString(string) {
        var args = arguments;
        if (args.length > 1) {
            string = string.replace(/({{)|(}})|{(\d+)}|({)|(})/g, function (unused, left, right, index, illegalLeft, illegalRight) {
                if (illegalLeft || illegalRight) { throw formatString(strings.malformedFormatStringInput, illegalLeft || illegalRight); }
                return (left && "{") || (right && "}") || args[(index | 0) + 1];
            });
        }
        return string;
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.Resources", {
        addEventListener: function (type, listener, useCapture) {
            /// <signature helpKeyword="WinJS.Resources.addEventListener">
            /// <summary locid="WinJS.Resources.addEventListener">
            /// Registers an event handler for the specified event.
            /// </summary>
            /// <param name='type' type="String" locid='WinJS.Resources.addEventListener_p:type'>
            /// The name of the event to handle.
            /// </param>
            /// <param name='listener' type="Function" locid='WinJS.Resources.addEventListener_p:listener'>
            /// The listener to invoke when the event gets raised.
            /// </param>
            /// <param name='useCapture' type="Boolean" locid='WinJS.Resources.addEventListener_p:useCapture'>
            /// Set to true to register the event handler for the capturing phase; set to false to register for the bubbling phase.
            /// </param>
            /// </signature>
            if (_WinRT.Windows.ApplicationModel.Resources.Core.ResourceManager && !mrtEventHook) {
                if (type === contextChangedET) {
                    try {
                        var resContext = exports._getResourceContext();
                        if (resContext) {
                            resContext.qualifierValues.addEventListener("mapchanged", function (e) {
                                exports.dispatchEvent(contextChangedET, { qualifier: e.key, changed: e.target[e.key] });
                            }, false);

                        } else {
                            // The API can be called in the Background thread (web worker).
                            _WinRT.Windows.ApplicationModel.Resources.Core.ResourceManager.current.defaultContext.qualifierValues.addEventListener("mapchanged", function (e) {
                                exports.dispatchEvent(contextChangedET, { qualifier: e.key, changed: e.target[e.key] });
                            }, false);
                        }
                        mrtEventHook = true;
                    } catch (e) {
                    }
                }
            }
            listeners.addEventListener(type, listener, useCapture);
        },
        removeEventListener: listeners.removeEventListener.bind(listeners),
        dispatchEvent: listeners.dispatchEvent.bind(listeners),

        _formatString: formatString,

        _getStringWinRT: function (resourceId) {
            if (!resourceMap) {
                var mainResourceMap = _WinRT.Windows.ApplicationModel.Resources.Core.ResourceManager.current.mainResourceMap;
                try {
                    resourceMap = mainResourceMap.getSubtree('Resources');
                }
                catch (e) {
                }
                if (!resourceMap) {
                    resourceMap = mainResourceMap;
                }
            }

            var stringValue;
            var langValue;
            var resCandidate;
            try {
                var resContext = exports._getResourceContext();
                if (resContext) {
                    resCandidate = resourceMap.getValue(resourceId, resContext);
                } else {
                    resCandidate = resourceMap.getValue(resourceId);
                }

                if (resCandidate) {
                    stringValue = resCandidate.valueAsString;
                    if (stringValue === undefined) {
                        stringValue = resCandidate.toString();
                    }
                }
            }
            catch (e) { }

            if (!stringValue) {
                return exports._getStringJS(resourceId);
            }

            try {
                langValue = resCandidate.getQualifierValue("Language");
            }
            catch (e) {
                return { value: stringValue };
            }

            return { value: stringValue, lang: langValue };
        },

        _getStringJS: function (resourceId) {
            var str = _Global.strings && _Global.strings[resourceId];
            if (typeof str === "string") {
                str = { value: str };
            }
            return str || { value: resourceId, empty: true };
        },

        _getResourceContext: function () {
            if (_Global.document) {
                if (!resourceContext) {
                    resourceContext = _WinRT.Windows.ApplicationModel.Resources.Core.ResourceContext.getForCurrentView();
                }
            }
            return resourceContext;
        },

        oncontextchanged: createEvent(contextChangedET)
        
    });

    var getStringImpl = _WinRT.Windows.ApplicationModel.Resources.Core.ResourceManager ? exports._getStringWinRT : exports._getStringJS;

    var getString = function (resourceId) {
        /// <signature helpKeyword="WinJS.Resources.getString">
        /// <summary locid='WinJS.Resources.getString'>
        /// Retrieves the resource string that has the specified resource id.
        /// </summary>
        /// <param name='resourceId' type="Number" locid='WinJS.Resources.getString._p:resourceId'>
        /// The resource id of the string to retrieve.
        /// </param>
        /// <returns type='Object' locid='WinJS.Resources.getString_returnValue'>
        /// An object that can contain these properties:
        /// 
        /// value:
        /// The value of the requested string. This property is always present.
        /// 
        /// empty:
        /// A value that specifies whether the requested string wasn't found.
        /// If its true, the string wasn't found. If its false or undefined,
        /// the requested string was found.
        /// 
        /// lang:
        /// The language of the string, if specified. This property is only present
        /// for multi-language resources.
        /// 
        /// </returns>
        /// </signature>          

        return getStringImpl(resourceId);
    };

    _Base.Namespace._moduleDefine(exports, null, {
        _formatString: formatString,
        _getWinJSString: _getWinJSString
    });

    _Base.Namespace._moduleDefine(exports, "WinJS.Resources", {
        getString: {
            get: function() {
                return getString;
            },
            set: function(value) {
                getString = value;
            }
        }
    });

});
