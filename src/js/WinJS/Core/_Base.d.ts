// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

/**
 * Provides helper functions for defining namespaces. For more information, see Organizing your code with WinJS.Namespace.
**/
export declare module Namespace {
    //#region Functions

    /**
     * Defines a new namespace with the specified name. For more information, see Organizing your code with WinJS.Namespace.
     * @param name The name of the namespace. This could be a dot-separated name for nested namespaces.
     * @param members The members of the new namespace.
     * @returns The newly-defined namespace.
    **/
    function define(name?: string, members?: any): any;

    /**
     * Defines a new namespace with the specified name under the specified parent namespace. For more information, see Organizing your code with WinJS.Namespace.
     * @param parentNamespace The parent namespace.
     * @param name The name of the new namespace.
     * @param members The members of the new namespace.
     * @returns The newly-defined namespace.
    **/
    function defineWithParent(parentNamespace?: any, name?: string, members?: any): any;

    //#endregion Functions
}

export declare module Class {
    //#region Functions

    /**
     * Defines a class using the given constructor and the specified instance members.
     * @param constructor A constructor function that is used to instantiate this type.
     * @param instanceMembers The set of instance fields, properties, and methods made available on the type.
     * @param staticMembers The set of static fields, properties, and methods made available on the type.
     * @returns The newly-defined type.
    **/
    function define(constructor?: Function, instanceMembers?: any, staticMembers?: any): any;

    /**
     * Creates a sub-class based on the specified baseClass parameter, using prototype inheritance.
     * @param baseClass The type to inherit from.
     * @param constructor A constructor function that is used to instantiate this type.
     * @param instanceMembers The set of instance fields, properties, and methods to be made available on the type.
     * @param staticMembers The set of static fields, properties, and methods to be made available on the type.
     * @returns The newly-defined type.
    **/
    function derive(baseClass: any, constructor: Function, instanceMembers?: any, staticMembers?: any): any;

    /**
     * Defines a class using the given constructor and the union of the set of instance members specified by all the mixin objects. The mixin parameter list is of variable length. For more information, see Adding functionality with WinJS mixins.
     * @param constructor A constructor function that will be used to instantiate this class.
     * @param mixin An object declaring the set of instance members. The mixin parameter list is of variable length.
     * @returns The newly defined class.
    **/
    function mix(constructor: Function, ...mixin: any[]): any;

    //#endregion Functions

}