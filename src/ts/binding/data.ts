// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function dataInit(WinJS) {
    "use strict";


    var strings = {
        get exceptionFromBindingInitializer() { return WinJS.Resources._getWinJSString("base/exceptionFromBindingInitializer").value; },
        get propertyIsUndefined() { return WinJS.Resources._getWinJSString("base/propertyIsUndefined").value; },
        get unsupportedDataTypeForBinding() { return WinJS.Resources._getWinJSString("base/unsupportedDataTypeForBinding").value; },
    };

    var observableMixin = {
        _listeners: null,
        _pendingNotifications: null,
        _notifyId: 0,

        _getObservable: function () {
            return this;
        },

        _cancel: function (name) {
            var v = this._pendingNotifications;
            var hit = false;
            if (v) {
                var k = Object.keys(v);
                for (var i = k.length - 1; i >= 0; i--) {
                    var entry = v[k[i]];
                    if (entry.target === name) {
                        if (entry.promise) {
                            entry.promise.cancel();
                            entry.promise = null;
                        }
                        delete v[k[i]];
                        hit = true;
                    }
                }
            }
            return hit;
        },

        notify: function (name, newValue, oldValue) {
            /// <signature helpKeyword="WinJS.Binding.observableMixin.notify">
            /// <summary locid="WinJS.Binding.observableMixin.notify">
            /// Notifies listeners that a property value was updated.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.Binding.observableMixin.notify_p:name">The name of the property that is being updated.</param>
            /// <param name="newValue" type="Object" locid="WinJS.Binding.observableMixin.notify_p:newValue">The new value for the property.</param>
            /// <param name="oldValue" type="Object" locid="WinJS.Binding.observableMixin.notify_p:oldValue">The old value for the property.</param>
            /// <returns type="WinJS.Promise" locid="WinJS.Binding.observableMixin.notify_returnValue">A promise that is completed when the notifications are complete.</returns>
            /// </signature>
            var listeners = this._listeners && this._listeners[name];
            if (listeners) {
                var that = this;

                // Handle the case where we are updating a value that is currently updating
                //
                that._cancel(name);

                // Starting new work, we cache the work description and queue up to do the notifications
                //
                that._pendingNotifications = that._pendingNotifications || {};
                var x = that._notifyId++;
                var cap:any = that._pendingNotifications[x] = { target: name };

                var cleanup = function () {
                    delete that._pendingNotifications[x];
                }

                // Binding guarantees async notification, so we do timeout()
                //
                cap.promise = WinJS.Utilities.Scheduler.schedulePromiseNormal(null, "WinJS.Binding.observableMixin.notify").
                    then(function () {
                        // cap.promise is removed after canceled, so we use this as a signal
                        // to indicate that we should abort early
                        //
                        for (var i = 0, l = listeners.length; i < l && cap.promise; i++) {
                            try {
                                listeners[i](newValue, oldValue);
                            }
                            catch (e) {
                                WinJS.log && WinJS.log(WinJS.Resources._formatString(strings.exceptionFromBindingInitializer, e.toString()), "winjs binding", "error");
                            }
                        }
                        cleanup();
                        return newValue;
                    });

                return cap.promise;
            }

            return WinJS.Promise.as();
        },

        bind: function (name, action) {
            /// <signature helpKeyword="WinJS.Binding.observableMixin.bind">
            /// <summary locid="WinJS.Binding.observableMixin.bind">
            /// Links the specified action to the property specified in the name parameter.
            /// This function is invoked when the value of the property may have changed.
            /// It is not guaranteed that the action will be called only when a value has actually changed,
            /// nor is it guaranteed that the action will be called for every value change. The implementation
            /// of this function coalesces change notifications, such that multiple updates to a property
            /// value may result in only a single call to the specified action.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.Binding.observableMixin.bind_p:name">
            /// The name of the property to which to bind the action.
            /// </param>
            /// <param name="action" type="function" locid="WinJS.Binding.observableMixin.bind_p:action">
            /// The function to invoke asynchronously when the property may have changed.
            /// </param>
            /// <returns type="Object" locid="WinJS.Binding.observableMixin.bind_returnValue">
            /// This object is returned.
            /// </returns>
            /// </signature>

            this._listeners = this._listeners || {};
            var listeners = this._listeners[name] = this._listeners[name] || [];

            // duplicate detection, multiple binds with the same action should have no effect
            //
            var found = false;
            for (var i = 0, l = listeners.length; i < l; i++) {
                if (listeners[i] === action) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                listeners.push(action);

                // out of band notification, we want to avoid a broadcast to all listeners
                // so we can't just call notify.
                //
                action(unwrap(this[name]));
            }
            return this;
        },

        unbind: function (name, action) {
            /// <signature helpKeyword="WinJS.Binding.observableMixin.unbind">
            /// <summary locid="WinJS.Binding.observableMixin.unbind">
            /// Removes one or more listeners from the notification list for a given property.
            /// </summary>
            /// <param name="name" type="String" optional="true" locid="WinJS.Binding.observableMixin.unbind_p:name">
            /// The name of the property to unbind. If this parameter is omitted, all listeners
            /// for all events are removed.
            /// </param>
            /// <param name="action" type="function" optional="true" locid="WinJS.Binding.observableMixin.unbind_p:action">
            /// The function to remove from the listener list for the specified property. If this parameter is omitted, all listeners
            /// are removed for the specific property.
            /// </param>
            /// <returns type="Object" locid="WinJS.Binding.observableMixin.unbind_returnValue">
            /// This object is returned.
            /// </returns>
            /// </signature>

            this._listeners = this._listeners || {};

            if (name && action) {
                // this assumes we rarely have more than one
                // listener, so we optimize to not do a lot of
                // array manipulation, although it means we
                // may do some extra GC churn in the other cases...
                //
                var listeners = this._listeners[name];
                if (listeners) {
                    var nl;
                    for (var i = 0, l = listeners.length; i < l; i++) {
                        if (listeners[i] !== action) {
                            (nl = nl || []).push(listeners[i]);
                        }
                    }
                    this._listeners[name] = nl;
                }

                // we allow any pending notification sweep to complete,
                // which means that "unbind" inside of a notification
                // will not prevent that notification from occuring.
                //
            }
            else if (name) {
                this._cancel(name);
                delete this._listeners[name];
            }
            else {
                var that = this;
                if (that._pendingNotifications) {
                    var v = that._pendingNotifications;
                    that._pendingNotifications = {};
                    Object.keys(v).forEach(function (k) {
                        var n = v[k];
                        if (n.promise) { n.promise.cancel(); }
                    });
                }
                this._listeners = {};
            }
            return this;
        }
    };

    var dynamicObservableMixin = {
        _backingData: null,

        _initObservable: function (data) {
            this._backingData = data || {};
        },

        getProperty: function (name) {
            /// <signature helpKeyword="WinJS.Binding.dynamicObservableMixin.getProperty">
            /// <summary locid="WinJS.Binding.dynamicObservableMixin.getProperty">
            /// Gets a property value by name.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.Binding.dynamicObservableMixin.getProperty_p:name">
            /// The name of property to get.
            /// </param>
            /// <returns type="Object" locid="WinJS.Binding.dynamicObservableMixin.getProperty_returnValue">
            /// The value of the property as an observable object.
            /// </returns>
            /// </signature>
            var data = this._backingData[name];
            if (WinJS.log && data === undefined) {
                WinJS.log(WinJS.Resources._formatString(strings.propertyIsUndefined, name), "winjs binding", "warn");
            }
            return as(data);
        },

        setProperty: function (name, value) {
            /// <signature helpKeyword="WinJS.Binding.dynamicObservableMixin.setProperty">
            /// <summary locid="WinJS.Binding.dynamicObservableMixin.setProperty">
            /// Updates a property value and notifies any listeners.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.Binding.dynamicObservableMixin.setProperty_p:name">
            /// The name of the property to update.
            /// </param>
            /// <param name="value" locid="WinJS.Binding.dynamicObservableMixin.setProperty_p:value">
            /// The new value of the property.
            /// </param>
            /// <returns type="Object" locid="WinJS.Binding.dynamicObservableMixin.setProperty_returnValue">
            /// This object is returned.
            /// </returns>
            /// </signature>

            this.updateProperty(name, value);
            return this;
        },

        addProperty: function (name, value) {
            /// <signature helpKeyword="WinJS.Binding.dynamicObservableMixin.addProperty">
            /// <summary locid="WinJS.Binding.dynamicObservableMixin.addProperty">
            /// Adds a property with change notification to this object, including a ECMAScript5 property definition.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.Binding.dynamicObservableMixin.addProperty_p:name">
            /// The name of the property to add.
            /// </param>
            /// <param name="value" locid="WinJS.Binding.dynamicObservableMixin.addProperty_p:value">
            /// The value of the property.
            /// </param>
            /// <returns type="Object" locid="WinJS.Binding.dynamicObservableMixin.addProperty_returnValue">
            /// This object is returned.
            /// </returns>
            /// </signature>

            // we could walk Object.keys to more deterministically determine this,
            // however in the normal case this avoids a bunch of string compares
            //
            if (!this[name]) {
                Object.defineProperty(this,
                    name, {
                        get: function () { return this.getProperty(name); },
                        set: function (value) { this.setProperty(name, value); },
                        enumerable: true,
                        configurable: true
                    }
                );
            }
            return this.setProperty(name, value);
        },

        updateProperty: function (name, value) {
            /// <signature helpKeyword="WinJS.Binding.dynamicObservableMixin.updateProperty">
            /// <summary locid="WinJS.Binding.dynamicObservableMixin.updateProperty">
            /// Updates a property value and notifies any listeners.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.Binding.dynamicObservableMixin.updateProperty_p:name">
            /// The name of the property to update.
            /// </param>
            /// <param name="value" locid="WinJS.Binding.dynamicObservableMixin.updateProperty_p:value">
            /// The new value of the property.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Binding.dynamicObservableMixin.updateProperty_returnValue">
            /// A promise that completes when the notifications for
            /// this property change have been processed. If multiple notifications are coalesced,
            /// the promise may be canceled or the value of the promise may be updated.
            /// The fulfilled value of the promise is the new value of the property for
            /// which the notifications have been completed.
            /// </returns>
            /// </signature>

            var oldValue = this._backingData[name];
            var newValue = unwrap(value);
            if (oldValue !== newValue) {
                this._backingData[name] = newValue;

                // This will complete when the listeners are notified, even
                // if a new value is used. The only time this promise will fail
                // (cancel) will be if we start notifying and then have to
                // cancel in the middle of processing it. That's a pretty
                // subtle contract.
                //
                return this.notify(name, newValue, oldValue);
            }
            return WinJS.Promise.as();
        },

        removeProperty: function (name) {
            /// <signature helpKeyword="WinJS.Binding.dynamicObservableMixin.removeProperty">
            /// <summary locid="WinJS.Binding.dynamicObservableMixin.removeProperty">
            /// Removes a property value.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.Binding.dynamicObservableMixin.removeProperty_p:name">
            /// The name of the property to remove.
            /// </param>
            /// <returns type="Object" locid="WinJS.Binding.dynamicObservableMixin.removeProperty_returnValue">
            /// This object is returned.
            /// </returns>
            /// </signature>

            var oldValue = this._backingData[name];
            var value; // capture "undefined"
            // in strict mode these may throw
            try {
                delete this._backingData[name];
            } catch (e) { }
            try {
                delete this[name];
            } catch (e) { }
            this.notify(name, value, oldValue);
            return this;
        }
    };

    // Merge "obsevable" into "dynamicObservable"
    //
    Object.keys(observableMixin).forEach(function (k) {
        dynamicObservableMixin[k] = observableMixin[k];
    });


    var bind = function (observable, bindingDescriptor) {
        /// <signature helpKeyword="WinJS.Binding.bind">
        /// <summary locid="WinJS.Binding.bind">
        /// Binds to one or more properties on the observable object or or on child values
        /// of that object.
        /// </summary>
        /// <param name="observable" type="Object" locid="WinJS.Binding.bind_p:observable">
        /// The object to bind to.
        /// </param>
        /// <param name="bindingDescriptor" type="Object" locid="WinJS.Binding.bind_p:bindingDescriptor">
        /// An object literal containing the binding declarations. Binding declarations take the form:
        /// { propertyName: (function | bindingDeclaration), ... }
        ///
        /// For example, binding to a nested member of an object is declared like this:
        /// bind(someObject, { address: { street: function(v) { ... } } });
        /// </param>
        /// <returns type="Object" locid="WinJS.Binding.bind_returnValue">
        /// An object that contains at least a "cancel" field, which is
        /// a function that removes all bindings associated with this bind
        /// request.
        /// </returns>
        /// </signature>
        return bindImpl(observable, bindingDescriptor);
    }
    var bindRefId = 0;
    var createBindRefId = function () {
        return "bindHandler" + (bindRefId++);
    };
    var createProxy = function (func, bindStateRef) {
        if (!WinJS.Utilities.hasWinRT) {
            return func;
        }

        var id = createBindRefId();
        WinJS.Utilities._getWeakRefElement(bindStateRef)[id] = func;
        return function (n, o) {
            var bindState = WinJS.Utilities._getWeakRefElement(bindStateRef);
            if (bindState) {
                bindState[id](n, o);
            }
        };
    }
    var bindImpl = function (observable, bindingDescriptor, bindStateRef?) {
        observable = WinJS.Binding.as(observable);
        if (!observable) {
            return { cancel: function () { }, empty: true };
        }

        var bindState;
        if (!bindStateRef) {
            bindStateRef = createBindRefId();
            bindState = {};
            WinJS.Utilities._createWeakRef(bindState, bindStateRef);
        }

        var complexLast = {};
        var simpleLast = null;

        function cancelSimple() {
            if (simpleLast) {
                simpleLast.forEach(function (e) {
                    e.source.unbind(e.prop, e.listener);
                });
            }
            simpleLast = null;
        }

        function cancelComplex(k) {
            if (complexLast[k]) {
                complexLast[k].complexBind.cancel();
                delete complexLast[k];
            }
        }

        Object.keys(bindingDescriptor).forEach(function (k) {
            var listener = bindingDescriptor[k];
            if (listener instanceof Function) {
                // Create a proxy for the listener which indirects weakly through the bind
                // state, if this is the root object tack the bind state onto the listener
                //
                listener = createProxy(listener, bindStateRef);
                listener.bindState = bindState;
                simpleLast = simpleLast || [];
                simpleLast.push({ source: observable, prop: k, listener: listener });
                observable.bind(k, listener);
            }
            else {
                var propChanged:any = function (v) {
                    cancelComplex(k);
                    var complexBind:any = bindImpl(as(v), listener, bindStateRef);

                    // In the case that we hit an "undefined" in the chain, we prop the change
                    // notification to all listeners, basically saying that x.y.z where "y"
                    // is undefined resolves to undefined.
                    //
                    if (complexBind.empty) {
                        var recursiveNotify = function (root) {
                            Object.keys(root).forEach(function (key) {
                                var item = root[key];
                                if (item instanceof Function) {
                                    item(undefined, undefined);
                                }
                                else {
                                    recursiveNotify(item);
                                }
                            });
                        };
                        recursiveNotify(listener);
                    }
                    complexLast[k] = { source: v, complexBind: complexBind };
                };

                // Create a proxy for the listener which indirects weakly through the bind
                // state, if this is the root object tack the bind state onto the listener
                //
                propChanged = createProxy(propChanged, bindStateRef);
                propChanged.bindState = bindState;
                simpleLast = simpleLast || [];
                simpleLast.push({ source: observable, prop: k, listener: propChanged });
                observable.bind(k, propChanged);
            }
        });

        return {
            cancel: function () {
                cancelSimple();
                Object.keys(complexLast).forEach(function (k) { cancelComplex(k); });
            }
        }
    };

    
    var ObservableProxy = WinJS.Class.mix(function (data) {
        this._initObservable(data);
        Object.defineProperties(this, expandProperties(data));
    }, dynamicObservableMixin);

    var expandProperties = function (shape) {
        /// <signature helpKeyword="WinJS.Binding.expandProperties">
        /// <summary locid="WinJS.Binding.expandProperties">
        /// Wraps the specified object so that all its properties
        /// are instrumented for binding. This is meant to be used in
        /// conjunction with the binding mixin.
        /// </summary>
        /// <param name="shape" type="Object" locid="WinJS.Binding.expandProperties_p:shape">
        /// The specification for the bindable object.
        /// </param>
        /// <returns type="Object" locid="WinJS.Binding.expandProperties_returnValue">
        /// An object with a set of properties all of which are wired for binding.
        /// </returns>
        /// </signature>
        var props:any = {};
        function addToProps(k) {
            props[k] = {
                get: function () { return this.getProperty(k); },
                set: function (value) { this.setProperty(k, value); },
                enumerable: true,
                configurable: true // enables delete
            };
        }
        while (shape && shape !== Object.prototype) {
            Object.keys(shape).forEach(addToProps);
            shape = Object.getPrototypeOf(shape);
        }
        return props;
    };

    var define = function (data) {
        /// <signature helpKeyword="WinJS.Binding.define">
        /// <summary locid="WinJS.Binding.define">
        /// Creates a new constructor function that supports observability with
        /// the specified set of properties.
        /// </summary>
        /// <param name="data" type="Object" locid="WinJS.Binding.define_p:data">
        /// The object to use as the pattern for defining the set of properties, for example:
        /// var MyPointClass = define({x:0,y:0});
        /// </param>
        /// <returns type="Function" locid="WinJS.Binding.define_returnValue">
        /// A constructor function with 1 optional argument that is the initial state of
        /// the properties.
        /// </returns>
        /// </signature>

        // Common unsupported types, we just coerce to be an empty record
        //
        if (!data || typeof (data) !== "object" || (data instanceof Date) || (data instanceof Array)) {
            if (WinJS.validation) {
                throw new WinJS.ErrorFromName("WinJS.Binding.UnsupportedDataType", WinJS.Resources._formatString(strings.unsupportedDataTypeForBinding));
            }
            else {
                return;
            }
        }

        return WinJS.Class.mix(
            function (init) {
                /// <signature helpKeyword="WinJS.Binding.define.return">
                /// <summary locid="WinJS.Binding.define.return">
                /// Creates a new observable object.
                /// </summary>
                /// <param name="init" type="Object" locid="WinJS.Binding.define.return_p:init">
                /// The initial values for the properties.
                /// </param>
                /// </signature>

                this._initObservable(init || Object.create(data));
            },
            WinJS.Binding.dynamicObservableMixin,
            WinJS.Binding.expandProperties(data)
        );
    };

    var as = function (data) {
        /// <signature helpKeyword="WinJS.Binding.as">
        /// <summary locid="WinJS.Binding.as">
        /// Returns an observable object. This may be an observable proxy for the specified object, an existing proxy, or
        /// the specified object itself if it directly supports observability.
        /// </summary>
        /// <param name="data" type="Object" locid="WinJS.Binding.as_p:data">
        /// Object to provide observability for.
        /// </param>
        /// <returns type="Object" locid="WinJS.Binding.as_returnValue">
        /// The observable object.
        /// </returns>
        /// </signature>

        if (!data) {
            return data;
        }

        var type = typeof data;
        if (type === "object"
            && !(data instanceof Date)
            && !(data instanceof Array)) {
                if (data._getObservable) {
                    return data._getObservable();
                }

                var observable = new ObservableProxy(data);
                observable.backingData = data;
                Object.defineProperty(
                data,
                "_getObservable",
                {
                    value: function () { return observable; },
                    enumerable: false,
                    writable: false
                }
            );
                return observable;
            }
        else {
            return data;
        }
    };

    var unwrap = function (data) {
        /// <signature helpKeyword="WinJS.Binding.unwrap">
        /// <summary locid="WinJS.Binding.unwrap">
        /// Returns the original (non-observable) object is returned if the specified object is an observable proxy, .
        /// </summary>
        /// <param name="data" type="Object" locid="WinJS.Binding.unwrap_p:data">
        /// The object for which to retrieve the original value.
        /// </param>
        /// <returns type="Object" locid="WinJS.Binding.unwrap_returnValue">
        /// If the specified object is an observable proxy, the original object is returned, otherwise the same object is returned.
        /// </returns>
        /// </signature>
        if (data && data.backingData)
            return data.backingData;
        else
            return data;
    };

    WinJS.Namespace.define("WinJS.Binding", {
        // must use long form because mixin has "get" and "set" as members, so the define
        // method thinks it's a property
        mixin: { value: dynamicObservableMixin, enumerable: false, writable: true, configurable: true },
        dynamicObservableMixin: { value: dynamicObservableMixin, enumerable: true, writable: true, configurable: true },
        observableMixin: { value: observableMixin, enumerable: true, writable: true, configurable: true },
        expandProperties: expandProperties,
        define: define,
        as: as,
        unwrap: unwrap,
        bind: bind
    });
})(WinJS);
