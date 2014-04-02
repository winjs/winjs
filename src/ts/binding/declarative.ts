// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function declarativeInit(WinJS, global) {
    "use strict";

    var uid = (Math.random() * 1000) >> 0;

    // If we have proper weak references then we can move away from using the element's ID property
    //
    var optimizeBindingReferences = WinJS.Utilities.hasWinRT && global.msSetWeakWinRTProperty && global.msGetWeakWinRTProperty;

    var strings = {
        get attributeBindingSingleProperty() { return WinJS.Resources._getWinJSString("base/attributeBindingSingleProperty").value; },
        get cannotBindToThis() { return WinJS.Resources._getWinJSString("base/cannotBindToThis").value; },
        get creatingNewProperty() { return WinJS.Resources._getWinJSString("base/creatingNewProperty").value; },
        get duplicateBindingDetected() { return WinJS.Resources._getWinJSString("base/duplicateBindingDetected").value; },
        get elementNotFound() { return WinJS.Resources._getWinJSString("base/elementNotFound").value; },
        get errorInitializingBindings() { return WinJS.Resources._getWinJSString("base/errorInitializingBindings").value; },
        get propertyDoesNotExist() { return WinJS.Resources._getWinJSString("base/propertyDoesNotExist").value; },
        get idBindingNotSupported() { return WinJS.Resources._getWinJSString("base/idBindingNotSupported").value; },
        get nestedDOMElementBindingNotSupported() { return WinJS.Resources._getWinJSString("base/nestedDOMElementBindingNotSupported").value; }
    }

    var markSupportedForProcessing = WinJS.Utilities.markSupportedForProcessing;
    var requireSupportedForProcessing = WinJS.Utilities.requireSupportedForProcessing;

    function registerAutoDispose(bindable, callback) {
        var d = bindable._autoDispose;
        d && d.push(callback);
    }
    function autoDispose(bindable) {
        bindable._autoDispose = (bindable._autoDispose || []).filter(function (callback) { return callback(); });
    }

    function checkBindingToken(element, bindingId) {
        if (element) {
            if (element.winBindingToken === bindingId) {
                return element;
            }
            else {
                WinJS.log && WinJS.log(WinJS.Resources._formatString(strings.duplicateBindingDetected, element.id), "winjs binding", "error");
            }
        }
        else {
            return element;
        }
    }

    function setBindingToken(element) {
        if (element.winBindingToken) {
            return element.winBindingToken;
        }

        var bindingToken = "_win_bind" + (uid++);
        Object.defineProperty(element, "winBindingToken", { configurable: false, writable: false, enumerable: false, value: bindingToken });
        return bindingToken;
    }

    function initializerOneBinding(bind, ref, bindingId, source, e, pend, cacheEntry) {
        var initializer = bind.initializer;
        if (initializer) {
            initializer = initializer.winControl || initializer["data-win-control"] || initializer;
        }
        if (initializer instanceof Function) {
            var result = initializer(source, bind.source, e, bind.destination);

            if (cacheEntry) {
                if (result && result.cancel) {
                    cacheEntry.bindings.push(function () { result.cancel(); });
                }
                else {
                    // notify the cache that we encountered an uncancellable thing
                    //
                    cacheEntry.nocache = true;
                }
            }
            return result;
        }
        else if (initializer && initializer.render) {
            pend.count++;

            // notify the cache that we encountered an uncancellable thing
            //
            if (cacheEntry) {
                cacheEntry.nocache = true;
            }

            requireSupportedForProcessing(initializer.render).call(initializer, getValue(source, bind.source), e).
                then(function () {
                    pend.checkComplete();
                });
        }
    }

    function makeBinding(ref, bindingId, pend, bindable, bind, cacheEntry) {
        var first = true;
        var bindResult;
        var canceled = false;

        autoDispose(bindable);

        var resolveWeakRef = function () {
            if (canceled) { return; }

            var found = checkBindingToken(WinJS.Utilities._getWeakRefElement(ref), bindingId);
            if (!found) {
                WinJS.log && WinJS.log(WinJS.Resources._formatString(strings.elementNotFound, ref), "winjs binding", "info");
                if (bindResult) {
                    bindResult.cancel();
                }
            }
            return found;
        }
        var bindingAction = function (v) {
            var found = resolveWeakRef();
            if (found) {
                nestedSet(found, bind.destination, v);
            }
            if (first) {
                pend.checkComplete();
                first = false;
            }
        };
        registerAutoDispose(bindable, resolveWeakRef);

        bindResult = bindWorker(bindable, bind.source, bindingAction);
        if (bindResult) {
            var cancel = bindResult.cancel;
            bindResult.cancel = function () {
                canceled = true;
                return cancel.call(bindResult);
            };
            if (cacheEntry) {
                cacheEntry.bindings.push(function () { bindResult.cancel(); });
            }
        }

        return bindResult;
    }

    function sourceOneBinding(bind, ref, bindingId, source, e, pend, cacheEntry) {
        var bindable;
        if (source !== global) {
            source = WinJS.Binding.as(source);
        }
        if (source._getObservable) {
            bindable = source._getObservable();
        }
        if (bindable) {
            pend.count++;
            // declarative binding must use a weak ref to the target element
            //
            return makeBinding(ref, bindingId, pend, bindable, bind, cacheEntry);
        }
        else {
            nestedSet(e, bind.destination, getValue(source, bind.source));
        }
    }

    function filterIdBinding(declBind, bindingStr) {
        for (var bindIndex = declBind.length - 1; bindIndex >= 0; bindIndex--) {
            var bind = declBind[bindIndex];
            var dest = bind.destination;
            if (dest.length === 1 && dest[0] === "id") {
                if (WinJS.validation) {
                    throw new WinJS.ErrorFromName("WinJS.Binding.IdBindingNotSupported", WinJS.Resources._formatString(strings.idBindingNotSupported, bindingStr));
                }
                WinJS.log && WinJS.log(WinJS.Resources._formatString(strings.idBindingNotSupported, bindingStr), "winjs binding", "error");
                declBind.splice(bindIndex, 1);
            }
        }
        return declBind;
    }

    function calcBinding(bindingStr, bindingCache) {
        if (bindingCache) {
            var declBindCache = bindingCache.expressions[bindingStr];
            var declBind;
            if (!declBindCache) {
                declBind = filterIdBinding(WinJS.Binding._bindingParser(bindingStr, global), bindingStr);
                bindingCache.expressions[bindingStr] = declBind;
            }
            if (!declBind) {
                declBind = declBindCache;
            }
            return declBind;
        }
        else {
            return filterIdBinding(WinJS.Binding._bindingParser(bindingStr, global), bindingStr);
        }
    }

    function declarativeBindImpl(rootElement, dataContext, skipRoot, bindingCache, defaultInitializer, c, e, p) {
        WinJS.Utilities._writeProfilerMark("WinJS.Binding:processAll,StartTM");

        var pend = {
            count: 0,
            checkComplete: function checkComplete() {
                this.count--;
                if (this.count === 0) {
                    WinJS.Utilities._writeProfilerMark("WinJS.Binding:processAll,StopTM");
                    c();
                }
            }
        };
        var baseElement = (rootElement || document.body);
        var selector = "[data-win-bind],[data-win-control]";
        var elements = baseElement.querySelectorAll(selector);
        var neg;
        if (!skipRoot && baseElement.getAttribute("data-win-bind")) {
            neg = baseElement;
        }

        pend.count++;
        var source = dataContext || global;

        WinJS.Utilities._DOMWeakRefTable_fastLoadPath = true;
        try {
            var baseElementData = WinJS.Utilities.data(baseElement);
            baseElementData.winBindings = baseElementData.winBindings || [];

            for (var i = (neg ? -1 : 0), l = elements.length; i < l; i++) {
                var element = i < 0 ? neg : elements[i];

                // If we run into a declarative control container (e.g. Binding.Template) we don't process its
                //  children, but we do give it an opportunity to process them later using this data context.
                //
                if (element.winControl && element.winControl.constructor && element.winControl.constructor.isDeclarativeControlContainer) {
                    i += element.querySelectorAll(selector).length;

                    var idcc = element.winControl.constructor.isDeclarativeControlContainer;
                    if (typeof idcc === "function") {
                        idcc = requireSupportedForProcessing(idcc);
                        idcc(element.winControl, function (element) {
                            return WinJS.Binding.processAll(element, dataContext, false, bindingCache, defaultInitializer);
                        });
                    }
                }

                // In order to catch controls above we may have elements which don't have bindings, skip them
                //
                if (!element.hasAttribute("data-win-bind")) {
                    continue;
                }

                var original = element.getAttribute("data-win-bind");
                var declBind = calcBinding(original, bindingCache);

                if (!declBind.implemented) {
                    for (var bindIndex = 0, bindLen = declBind.length; bindIndex < bindLen; bindIndex++) {
                        var bind = declBind[bindIndex];
                        bind.initializer = bind.initializer || defaultInitializer;
                        if (bind.initializer) {
                            bind.implementation = initializerOneBinding;
                        }
                        else {
                            bind.implementation = sourceOneBinding;
                        }
                    }
                    declBind.implemented = true;
                }

                pend.count++;

                var bindingId = setBindingToken(element);
                var ref = optimizeBindingReferences ? bindingId : element.id;

                if (!ref) {
                    // We use our own counter here, as the IE "uniqueId" is only
                    // global to a document, which means that binding against
                    // unparented DOM elements would get duplicate IDs.
                    //
                    // The elements may not be parented at this point, but they
                    // will be parented by the time the binding action is fired.
                    //
                    element.id = ref = bindingId;
                }

                WinJS.Utilities._createWeakRef(element, ref);
                var elementData = WinJS.Utilities.data(element);
                elementData.winBindings = null;
                var cacheEntry;
                if (bindingCache && bindingCache.elements) {
                    cacheEntry = bindingCache.elements[ref];
                    if (!cacheEntry) {
                        bindingCache.elements[ref] = cacheEntry = { bindings: [] };
                    }
                }

                for (var bindIndex2 = 0, bindLen2 = declBind.length; bindIndex2 < bindLen2; bindIndex2++) {
                    var bind2 = declBind[bindIndex2];
                    var cancel2 = bind2.implementation(bind2, ref, bindingId, source, element, pend, cacheEntry);
                    if (cancel2) {
                        elementData.winBindings = elementData.winBindings || [];
                        elementData.winBindings.push(cancel2);
                        baseElementData.winBindings.push(cancel2);
                    }
                }
                pend.count--;
            }
        }
        finally {
            WinJS.Utilities._DOMWeakRefTable_fastLoadPath = false;
        }
        pend.checkComplete();
    }

    function declarativeBind(rootElement, dataContext, skipRoot, bindingCache, defaultInitializer) {
        /// <signature helpKeyword="WinJS.Binding.declarativeBind">
        /// <summary locid="WinJS.Binding.declarativeBind">
        /// Binds values from the specified data context to elements that are descendants of the specified root element
        /// and have declarative binding attributes (data-win-bind).
        /// </summary>
        /// <param name="rootElement" type="DOMElement" optional="true" locid="WinJS.Binding.declarativeBind_p:rootElement">
        /// The element at which to start traversing to find elements to bind to. If this parameter is omitted, the entire document
        /// is searched.
        /// </param>
        /// <param name="dataContext" type="Object" optional="true" locid="WinJS.Binding.declarativeBind_p:dataContext">
        /// The object to use for default data binding.
        /// </param>
        /// <param name="skipRoot" type="Boolean" optional="true" locid="WinJS.Binding.declarativeBind_p:skipRoot">
        /// If true, the elements to be bound skip the specified root element and include only the children.
        /// </param>
        /// <param name="bindingCache" optional="true" locid="WinJS.Binding.declarativeBind_p:bindingCache">
        /// The cached binding data.
        /// </param>
        /// <param name="defaultInitializer" optional="true" locid="WinJS.Binding.declarativeBind_p:defaultInitializer">
        /// The binding initializer to use in the case that one is not specified in a binding expression. If not
        /// provided the behavior is the same as WinJS.Binding.defaultBind.
        /// </param>
        /// <returns type="WinJS.Promise" locid="WinJS.Binding.declarativeBind_returnValue">
        /// A promise that completes when each item that contains binding declarations has
        /// been processed and the update has started.
        /// </returns>
        /// </signature>

        return new WinJS.Promise(function (c, e, p) {
            declarativeBindImpl(rootElement, dataContext, skipRoot, bindingCache, defaultInitializer, c, e, p);
        }).then(null, function (e) {
            WinJS.log && WinJS.log(WinJS.Resources._formatString(strings.errorInitializingBindings, e && e.message), "winjs binding", "error");
            return WinJS.Promise.wrapError(e);
        });
    }

    function converter(convert) {
        /// <signature helpKeyword="WinJS.Binding.converter">
        /// <summary locid="WinJS.Binding.converter">
        /// Creates a default binding initializer for binding between a source
        /// property and a destination property with a provided converter function
        /// that is executed on the value of the source property.
        /// </summary>
        /// <param name="convert" type="Function" locid="WinJS.Binding.converter_p:convert">
        /// The conversion that operates over the result of the source property
        /// to produce a value that is set to the destination property.
        /// </param>
        /// <returns type="Function" locid="WinJS.Binding.converter_returnValue">
        /// The binding initializer.
        /// </returns>
        /// </signature>
        var userConverter = function (source, sourceProperties, dest, destProperties, initialValue) {
            var bindingId = setBindingToken(dest);
            var ref = optimizeBindingReferences ? bindingId : dest.id;

            if (!ref) {
                dest.id = ref = bindingId;
            }

            WinJS.Utilities._createWeakRef(dest, ref);

            var bindable;
            if (source !== global) {
                source = WinJS.Binding.as(source);
            }
            if (source._getObservable) {
                bindable = source._getObservable();
            }
            if (bindable) {
                var counter = 0;
                var workerResult = bindWorker(WinJS.Binding.as(source), sourceProperties, function (v) {
                    if (++counter === 1) {
                        if (v === initialValue) {
                            return;
                        }
                    }
                    var found = checkBindingToken(WinJS.Utilities._getWeakRefElement(ref), bindingId);
                    if (found) {
                        nestedSet(found, destProperties, convert(requireSupportedForProcessing(v)));
                    }
                    else if (workerResult) {
                        WinJS.log && WinJS.log(WinJS.Resources._formatString(strings.elementNotFound, ref), "winjs binding", "info");
                        workerResult.cancel();
                    }
                });
                return workerResult;
            } else {
                var value = getValue(source, sourceProperties);
                if (value !== initialValue) {
                    nestedSet(dest, destProperties, convert(value));
                }
            }
        };
        return markSupportedForProcessing(userConverter);
    }

    function getValue(obj, path) {
        if (obj !== global) {
            obj = requireSupportedForProcessing(obj);
        }
        if (path) {
            for (var i = 0, len = path.length; i < len && (obj !== null && obj !== undefined) ; i++) {
                obj = requireSupportedForProcessing(obj[path[i]]);
            }
        }
        return obj;
    }

    function nestedSet(dest, destProperties, v) {
        requireSupportedForProcessing(v);
        dest = requireSupportedForProcessing(dest);
        for (var i = 0, len = (destProperties.length - 1) ; i < len; i++) {
            dest = requireSupportedForProcessing(dest[destProperties[i]]);
            if (!dest) {
                WinJS.log && WinJS.log(WinJS.Resources._formatString(strings.propertyDoesNotExist, destProperties[i], destProperties.join(".")), "winjs binding", "error");
                return;
            }
            else if (dest instanceof Node) {
                WinJS.log && WinJS.log(WinJS.Resources._formatString(strings.nestedDOMElementBindingNotSupported, destProperties[i], destProperties.join(".")), "winjs binding", "error");
                return;
            }
        }
        if (destProperties.length === 0) {
            WinJS.log && WinJS.log(strings.cannotBindToThis, "winjs binding", "error");
            return;
        }
        var prop = destProperties[destProperties.length - 1];
        if (WinJS.log) {
            if (dest[prop] === undefined) {
                WinJS.log(WinJS.Resources._formatString(strings.creatingNewProperty, prop, destProperties.join(".")), "winjs binding", "warn");
            }
        }
        dest[prop] = v;
    }

    function attributeSet(dest, destProperties, v) {
        dest = requireSupportedForProcessing(dest);
        if (!destProperties || destProperties.length !== 1 || !destProperties[0]) {
            WinJS.log && WinJS.log(strings.attributeBindingSingleProperty, "winjs binding", "error");
            return;
        }
        dest.setAttribute(destProperties[0], v);
    }

    function setAttribute(source, sourceProperties, dest, destProperties, initialValue) {
        /// <signature helpKeyword="WinJS.Binding.setAttribute">
        /// <summary locid="WinJS.Binding.setAttribute">
        /// Creates a one-way binding between the source object and
        /// an attribute on the destination element.
        /// </summary>
        /// <param name="source" type="Object" locid="WinJS.Binding.setAttribute_p:source">
        /// The source object.
        /// </param>
        /// <param name="sourceProperties" type="Array" locid="WinJS.Binding.setAttribute_p:sourceProperties">
        /// The path on the source object to the source property.
        /// </param>
        /// <param name="dest" type="Object" locid="WinJS.Binding.setAttribute_p:dest">
        /// The destination object (must be a DOM element).
        /// </param>
        /// <param name="destProperties" type="Array" locid="WinJS.Binding.setAttribute_p:destProperties">
        /// The path on the destination object to the destination property, this must be a single name.
        /// </param>
        /// <param name="initialValue" optional="true" locid="WinJS.Binding.setAttribute_p:initialValue">
        /// The known initial value of the target, if the source value is the same as this initial
        /// value (using ===) then the target is not set the first time.
        /// </param>
        /// <returns type="{ cancel: Function }" locid="WinJS.Binding.setAttribute_returnValue">
        /// An object with a cancel method that is used to coalesce bindings.
        /// </returns>
        /// </signature>

        var bindingId = setBindingToken(dest);
        var ref = optimizeBindingReferences ? bindingId : dest.id;

        if (!ref) {
            dest.id = ref = bindingId;
        }

        WinJS.Utilities._createWeakRef(dest, ref);

        var bindable;
        if (source !== global) {
            source = WinJS.Binding.as(source);
        }
        if (source._getObservable) {
            bindable = source._getObservable();
        }
        if (bindable) {
            var counter = 0;
            var workerResult = bindWorker(bindable, sourceProperties, function (v) {
                if (++counter === 1) {
                    if (v === initialValue) {
                        return;
                    }
                }
                var found = checkBindingToken(WinJS.Utilities._getWeakRefElement(ref), bindingId);
                if (found) {
                    attributeSet(found, destProperties, requireSupportedForProcessing(v));
                }
                else if (workerResult) {
                    WinJS.log && WinJS.log(WinJS.Resources._formatString(strings.elementNotFound, ref), "winjs binding", "info");
                    workerResult.cancel();
                }
            });
            return workerResult;
        } else {
            var value = getValue(source, sourceProperties);
            if (value !== initialValue) {
                attributeSet(dest, destProperties, value);
            }
        }
    }
    function setAttributeOneTime(source, sourceProperties, dest, destProperties) {
        /// <signature helpKeyword="WinJS.Binding.setAttributeOneTime">
        /// <summary locid="WinJS.Binding.setAttributeOneTime">
        /// Sets an attribute on the destination element to the value of the source property
        /// </summary>
        /// <param name="source" type="Object" locid="WinJS.Binding.setAttributeOneTime_p:source">
        /// The source object.
        /// </param>
        /// <param name="sourceProperties" type="Array" locid="WinJS.Binding.setAttributeOneTime_p:sourceProperties">
        /// The path on the source object to the source property.
        /// </param>
        /// <param name="dest" type="Object" locid="WinJS.Binding.setAttributeOneTime_p:dest">
        /// The destination object (must be a DOM element).
        /// </param>
        /// <param name="destProperties" type="Array" locid="WinJS.Binding.setAttributeOneTime_p:destProperties">
        /// The path on the destination object to the destination property, this must be a single name.
        /// </param>
        /// </signature>
        return attributeSet(dest, destProperties, getValue(source, sourceProperties));
    }

    function addClassOneTime(source, sourceProperties, dest) {
        /// <signature helpKeyword="WinJS.Binding.addClassOneTime">
        /// <summary locid="WinJS.Binding.addClassOneTime">
        /// Adds a class on the destination element to the value of the source property
        /// </summary>
        /// <param name="source" type="Object" locid="WinJS.Binding.addClassOneTime:source">
        /// The source object.
        /// </param>
        /// <param name="sourceProperties" type="Array" locid="WinJS.Binding.addClassOneTime:sourceProperties">
        /// The path on the source object to the source property.
        /// </param>
        /// <param name="dest" type="Object" locid="WinJS.Binding.addClassOneTime:dest">
        /// The destination object (must be a DOM element).
        /// </param>
        /// </signature>
        dest = requireSupportedForProcessing(dest);
        dest.classList.add(getValue(source, sourceProperties));
    }

    var defaultBindImpl = converter(function defaultBind_passthrough(v) { return v; });

    function defaultBind(source, sourceProperties, dest, destProperties, initialValue) {
        /// <signature helpKeyword="WinJS.Binding.defaultBind">
        /// <summary locid="WinJS.Binding.defaultBind">
        /// Creates a one-way binding between the source object and
        /// the destination object.
        /// </summary>
        /// <param name="source" type="Object" locid="WinJS.Binding.defaultBind_p:source">
        /// The source object.
        /// </param>
        /// <param name="sourceProperties" type="Array" locid="WinJS.Binding.defaultBind_p:sourceProperties">
        /// The path on the source object to the source property.
        /// </param>
        /// <param name="dest" type="Object" locid="WinJS.Binding.defaultBind_p:dest">
        /// The destination object.
        /// </param>
        /// <param name="destProperties" type="Array" locid="WinJS.Binding.defaultBind_p:destProperties">
        /// The path on the destination object to the destination property.
        /// </param>
        /// <param name="initialValue" optional="true" locid="WinJS.Binding.defaultBind_p:initialValue">
        /// The known initial value of the target, if the source value is the same as this initial
        /// value (using ===) then the target is not set the first time.
        /// </param>
        /// <returns type="{ cancel: Function }" locid="WinJS.Binding.defaultBind_returnValue">
        /// An object with a cancel method that is used to coalesce bindings.
        /// </returns>
        /// </signature>

        return defaultBindImpl(source, sourceProperties, dest, destProperties, initialValue);
    }
    function bindWorker(bindable, sourceProperties, func) {
        if (sourceProperties.length > 1) {
            var root = {};
            var current = root;
            for (var i = 0, l = sourceProperties.length - 1; i < l; i++) {
                current = current[sourceProperties[i]] = {};
            }
            current[sourceProperties[sourceProperties.length - 1]] = func;

            return WinJS.Binding.bind(bindable, root, true);
        }
        else if (sourceProperties.length === 1) {
            bindable.bind(sourceProperties[0], func, true);
            return {
                cancel: function () {
                    bindable.unbind(sourceProperties[0], func);
                    this.cancel = noop;
                }
            };
        }
        else {
            // can't bind to object, so we just push it through
            //
            func(bindable);
        }
    }
    function noop() { }
    function oneTime(source, sourceProperties, dest, destProperties) {
        /// <signature helpKeyword="WinJS.Binding.oneTime">
        /// <summary locid="WinJS.Binding.oneTime">
        /// Sets the destination property to the value of the source property.
        /// </summary>
        /// <param name="source" type="Object" locid="WinJS.Binding.oneTime_p:source">
        /// The source object.
        /// </param>
        /// <param name="sourceProperties" type="Array" locid="WinJS.Binding.oneTime_p:sourceProperties">
        /// The path on the source object to the source property.
        /// </param>
        /// <param name="dest" type="Object" locid="WinJS.Binding.oneTime_p:dest">
        /// The destination object.
        /// </param>
        /// <param name="destProperties" type="Array" locid="WinJS.Binding.oneTime_p:destProperties">
        /// The path on the destination object to the destination property.
        /// </param>
        /// <returns type="{ cancel: Function }" locid="WinJS.Binding.oneTime_returnValue">
        /// An object with a cancel method that is used to coalesce bindings.
        /// </returns>
        /// </signature>
        nestedSet(dest, destProperties, getValue(source, sourceProperties));
        return { cancel: noop };
    }

    function initializer(customInitializer) {
        /// <signature helpKeyword="WinJS.Binding.initializer">
        /// <summary locid="WinJS.Binding.initializer">
        /// Marks a custom initializer function as being compatible with declarative data binding.
        /// </summary>
        /// <param name="customInitializer" type="Function" locid="WinJS.Binding.initializer_p:customInitializer">
        /// The custom initializer to be marked as compatible with declarative data binding.
        /// </param>
        /// <returns type="Function" locid="WinJS.Binding.initializer_returnValue">
        /// The input customInitializer.
        /// </returns>
        /// </signature>
        return markSupportedForProcessing(customInitializer);
    }

    WinJS.Namespace.define("WinJS.Binding", {
        processAll: declarativeBind,
        oneTime: initializer(oneTime),
        defaultBind: initializer(defaultBind),
        converter: converter,
        initializer: initializer,
        setAttribute: initializer(setAttribute),
        setAttributeOneTime: initializer(setAttributeOneTime),
        addClassOneTime: initializer(addClassOneTime),
    });

})(WinJS, this);
