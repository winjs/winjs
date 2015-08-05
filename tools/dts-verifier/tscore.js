#!/usr/bin/env node
var TypeScript = require('./lib/ts')
var fs = require('fs')
var Map = require('./lib/map')
require('sugar')
var util = require('util')

function getLine(node) { // TODO: more robust way of getting line numbers
    var ast = inputs.find(function(x) {return x.file === current_file}).ast;
    return ast.lineMap.getLineNumberFromPosition(node.minChar) // FIXME: doesn't seem to work
}
var current_node = null;
function TypeError(msg) {
	return new Error(msg + " (line " + (current_node && getLine(current_node)) + ")")
}

// NOTE: some aliasing of TObject occurs when type parameter bounds are copied into constructor type parameters

// --------------------
// Scope Chains
// --------------------

// TModuleScope contains all symbols exported from the merged module with the given qualified name
function TModuleScope(obj, parent) {
    this.obj = obj;
    this.parent = parent;
}

// TTypeParameterScope contains type parameters. These must be resolved early (see merging phase)
function TTypeParameterScope(parent) {
    this.env = new Map
    this.parent = parent;
}

// TLocalScope contains non-exported declarations from a module block
function TLocalScope(parent) {
	this.env = new Map
	this.parent = parent;
}

var current_scope = null;

// --------------------
//  Types
// --------------------

function compatibleTypes(x,y) {
	if (x === y)
		return true;
	if (x instanceof TQualifiedReference && y instanceof TQualifiedReference)
		return x.qname === y.qname;
	return false;
}

function TBuiltin(name) {
    this.name = name; // 'number', 'string', 'boolean', ...
}
TBuiltin.prototype.toString = function() {
    return this.name
}

// Reference to type with the given qualified name
function TQualifiedReference(qname) {
    this.qname = qname; // string
}
TQualifiedReference.prototype.toString = function() {
	return this.qname;
}

// Unresolved reference. Requires name resolution.
function TReference(name, scope) {
    this.name = name; // string
    this.scope = scope; // TScope
}
TReference.prototype.toString = function() {
	return this.name
}

// Type name on form A.B, where A is a type expression and B is an identifier.
function TMember(base, name) {
	this.base = base; // type expression
	this.name = name; // string
}
TMember.prototype.toString = function() {
	return this.base + '.' + this.name
}

// Type on form "typeof E" where E is a TypeScript expression on form A.B.C...
function TTypeQuery(names, scope) {
    this.names = names; // string array
    this.scope = scope;
}
TTypeQuery.prototype.toString = function() {
    return "typeof " + this.names.join('.')
}

// Reference to a type parameter.
function TTypeParam(name) {
    this.name = name;
}
TTypeParam.prototype.toString = function() {
	return this.name
}

// Instantiation of a generic type.
function TGeneric(base, args) {
    this.base = base; // type
    this.args = args; // array of types
}
TGeneric.prototype.toString = function() {
	return this.base + '<' + this.args.join(', ') + '>'
}

// Definition of an enum type (there should only exist one TEnum per enum declaration)
function TEnum(qname) {
	this.qname = qname;
}
TEnum.prototype.toString = function() {
	return this.qname
}

// String constant type.
function TString(value) {
	this.value = value;
}

// Object type.
function TObject(qname, meta) {
	this.qname = qname;
    this.properties = new Map;
    this.modules = new Map;
    this.calls = []
    this.types = new Map;
    this.supers = []
    this.typeParameters = []
    this.brand = null;
    this.meta = {
        kind: meta.kind,
        origin: meta.origin
    }
}
TObject.prototype.getModule = function(name) {
	var t = this.modules.get(name)
	if (!t) {
	    t = new TObject(null, {kind:'module', origin:current_file})
	    this.modules.put(name,t)
	}
    t.origin = current_file
    return t
}
TObject.prototype.getMember = function(name, optional) {
	var t = this.properties.get(name)
	if (!t) {
	    t = {
            optional: !!optional,
            type:new TObject(null, {kind:'interface', origin:current_file}),
            meta: {
                origin: current_file
            }
        }
	    this.properties.put(name,t)
	}
	if (!(t.type instanceof TObject))
		throw new TypeError("Cannot extend previous definition of " + name)
    return t.type
}
TObject.prototype.setMember = function(name,typ,optional) {
	var existing = this.properties.get(name)
	if (existing && !compatibleTypes(typ,existing))
		throw new TypeError("Duplicate identifier " + name);
    if (existing) {
        optional &= existing.optional;
    }
	this.properties.put(name, {
        optional: !!optional,
        type: typ,
        meta: {
            origin: current_file
        }
    })
}
TObject.prototype.toString = function() {
	var prtys = []
	this.properties.forEach(function(name,value) {
		prtys.push(name + (value.optional? '?' : '') + ': ' + value.type)
	})
	this.calls.forEach(function(call)  {
		prtys.push('(' + call.parameters.map(function(p){return p.name + ':' + p.type}).join(',') + ') => ' + call.returnType)
	})
	return '{' + prtys.join(', ') + '}'
}

// The any type (only one instance of this)
var TAny = new TBuiltin('any');

// -----------------------------------
//  Extract type environment from AST
// -----------------------------------

var extern_types;

function isBuiltin(x) {
    switch (x) {
        case 'any':
        case 'number':
        case 'boolean':
        case 'string':
        case 'void':
            return true;
        default:
            return false;
    }
}

function qualify(host, name) {
    if (host === '')
        return name;
	else if (!host)
		return null;
	else
		return host + '.' + name;
}

// Because some types can be extended, we must be careful to distinguish structural types
// from nominal types. For example, parseModule may return a structural type corresponding
// to the body of a module declaration A.B.C, but the final structure of A.B.C may be different.
// Identifiers are resolved relative to the *merged* modules, hence TModuleScope has a qualified name,
// and not a structural type.

// Some names are resolved before merging, others after.
// Type parameters must be resolved before merging, because merging generic interfaces requires
// alpha-renaming of type parameters.
// Names defined in modules must be resolved after merging, because the whole module type is not
// available until then.

function addModuleMember(member, moduleObject, qname) {
	current_node = member;
	var topLevel = qname === '';
    if (member instanceof TypeScript.FunctionDeclaration) {
    	var obj = moduleObject.getMember(member.name.text())
    	if (obj instanceof TObject) {
    		obj.calls.push(parseFunctionType(member))
    	} else {
    		throw new TypeError(member.name.text() + " is not a function")
    	}
    }
    else if (member instanceof TypeScript.VariableStatement) {
        member.declaration.declarators.members.forEach(function(decl) {
            moduleObject.setMember(decl.id.text(), parseType(decl.typeExpr))
        })
    }
    else if (member instanceof TypeScript.ModuleDeclaration) {
    	var name = member.name.text()
    	if (member.isEnum()) { // enums are ModuleDeclarations in the AST, but they are semantically quite different
    		var enumObj = moduleObject.getModule(name)
    		var enumResult = parseEnum(member, enumObj, qname)
    		moduleObject.types.push(name, enumResult.enum)
    	} else {
            if (name[0] === '"' || name[0] === "'") { // external module?
                parseExternModule(member)
            } else {
                var submodule = moduleObject.getModule(name)
                parseModule(member, submodule, qualify(qname, name))
            }
    	}
    }
    else if (member instanceof TypeScript.ClassDeclaration) {
    	var name = member.name.text()
    	var clazzObj = moduleObject.getModule(name)
        var clazz = parseClass(member, clazzObj, qname)
        // moduleObject.setMember(member.name.text(), clazz.constructorType)
        moduleObject.types.push(member.name.text(), clazz.instanceType)
    }
    else if (member instanceof TypeScript.InterfaceDeclaration) {
    	var name = member.name.text()
        var t = parseInterface(member, qname)
        moduleObject.types.push(name, t)
    }
    else if (member instanceof TypeScript.ImportDeclaration) {
        var ref = parseType(member.alias)
        if (topLevel || TypeScript.hasFlag(member.getVarFlags(), TypeScript.VariableFlags.Exported)) {
            moduleObject.types.push(member.id.text(), ref)
        } else {
        	// private alias to (potentially) publicly visible type
        	current_scope.env.push(member.id.text(), ref)
        }
    }
    else if (member instanceof TypeScript.ExportAssignment) {
    	// XXX: I think we can actually just ignore these in the tscheck project,
    	// but for completeness, maybe we should export this information somehow
    	// For reference, this is what I *think* happens:
    	// 		declare module "foo" { export = X }
    	// This means import("foo") will return the value in global variable X.
    	// Maybe we need these for modular analysis?
    }
    else {
    	throw new TypeError("Unexpected member in module " + qname + ": " + member.constructor.name)
    }
}

function parseModule(node, moduleObject, qname) {
    moduleObject.qname = 'module:' + qname;
    moduleObject.origin = current_file;
	current_node = node;
    current_scope = new TModuleScope(moduleObject, current_scope)
    current_scope = new TLocalScope(current_scope)
    node.members.members.forEach(function (member) {
        addModuleMember(member, moduleObject, qname)
    })
    current_scope = current_scope.parent // pop TLocalScope
    current_scope = current_scope.parent // pop TModuleScope
    return moduleObject;
}

function parseExternModule(node) {
    current_node = node;
    var rawName = node.name.text()
    var name = rawName.substring(1, rawName.length-1) // remove quotes
    var exportAssignment = node.members.members.find(function(member) {
        return member instanceof TypeScript.ExportAssignment
    })
    if (exportAssignment) {
        if (extern_types.has(name))
            throw new TypeError("Redeclared external module: " + name)
        extern_types.put(name, new TTypeQuery([exportAssignment.id.text()], current_scope))
        if (node.members.members.length !== 1)
            throw new TypeError("Members next to export assignment are not supported");
    } else {
        throw new TypeError("External modules without export assignment is not supported");
    }
}

var enum_types = new Map;
function parseEnum(node, objectType, host) {
	current_node = node;
	var qname = qualify(host, node.name.text())
	var enumType = new TEnum(qname)
    var enumMembers = [];
	node.members.members.forEach(function (member) {
		if (member instanceof TypeScript.VariableStatement) {
			member.declaration.declarators.members.forEach(function (decl) {
				objectType.setMember(decl.id.text(), enumType)
                enumMembers.push(qualify(qname, decl.id.text()));
			})
		} else {
			throw new TypeError("Unexpected enum member: " + member.constructor.name)
		}
	})
    enum_types.put(qname, enumMembers);
	return {
		enum: enumType,
		object: objectType
	}
}

function parseTopLevel(node) {
	current_node = node;
	current_scope = new TModuleScope(global_type, null)
    node.moduleElements.members.forEach(function (member) {
        addModuleMember(member, global_type, '')
    })
    current_scope = null
}

function parseClass(node, constructorType, host) {
	current_node = node;
	var name = node.name.text()
    var qname = qualify(host, name)
    var instanceType = new TObject(qname, {kind:'class', origin:current_file})
    instanceType.brand = qname;
    var instanceRef = new TQualifiedReference(qname)

    // put type parameters into scope
    var original_scope = current_scope // scope to restore before returning
    var static_scope = current_scope // the scope used by static members (cannot see type parameters)
    var instance_scope = new TTypeParameterScope(current_scope)
    current_scope = instance_scope
    var typeParams = []
    node.typeParameters && node.typeParameters.members.forEach(function (tp) {
    	var name = tp.name.text()
    	instance_scope.env.put(name, new TTypeParam(name))
    	typeParams.push(parseTypeParameter(tp))
    })
    instanceType.typeParameters = typeParams

    // build reference to self type
    var selfTypeArgs = typeParams.map(function(tp) { return new TTypeParam(tp.name) })
    var selfType = selfTypeArgs.length == 0 ? instanceRef : new TGeneric(instanceRef, selfTypeArgs)

    node.extendsList && node.extendsList.members.forEach(function(ext) {
        instanceType.supers.push(parseType(ext))
    })
    node.implementsList && node.implementsList.members.forEach(function(ext) {
        instanceType.supers.push(parseType(ext))
    })
    var hasConstructor = false;
    node.members.members.forEach(function(member) {
    	current_scope = member.isStatic() ? static_scope : instance_scope;
        if (member instanceof TypeScript.FunctionDeclaration) {
            if (member.isConstructor) { // syntax: constructor()..
                hasConstructor = true;
                constructorType.calls.push(parseConstructorFunction(member, selfType, typeParams))
            } else {
            	var container = member.isStatic() ? constructorType : instanceType;
            	var typ = member.name ? container.getMember(member.name.text()) : container;
                typ.calls.push(parseFunctionType(member))
            }
        }
        else if (member instanceof TypeScript.VariableDeclarator) {
            // note: class members cannot be optional (AST is not even valid if one tries to do so)
        	var typ = member.isStatic() ? constructorType : instanceType;
            typ.setMember(member.id.text(), member.typeExpr ? parseType(member.typeExpr) : TAny)
        }
    })
    // Generate automatic constructor, if no constructors are present
    if (!hasConstructor) {
        constructorType.calls.push({
            new: true,
            variadic: false,
            indexer: false,
            typeParameters: typeParams,
            parameters: [],
            returnType: selfType,
            meta: {
                implicit: true
            }
        });
    }
    current_scope = original_scope // restore previous scope
    return {
        constructorType: constructorType,
        instanceType: instanceType
    }
}
function parseInterface(node, host) {
	current_node = node;
	var qname = qualify(host, node.name.text());
    var typ = new TObject(qname, {kind:'interface', origin:current_file})
    current_scope = new TTypeParameterScope(current_scope)
    node.typeParameters && node.typeParameters.members.forEach(function(tp,index) {
    	var name = tp.name.text()
    	current_scope.env.put(name, new TTypeParam(name))
        typ.typeParameters.push(parseTypeParameter(tp))
    })
    node.extendsList && node.extendsList.members.forEach(function(ext) {
        typ.supers.push(parseType(ext))
    })
    node.members.members.forEach(function(member) {
        if (member instanceof TypeScript.FunctionDeclaration) {
            var t;
            if (member.name && !member.isIndexerMember()) {
                var optional = TypeScript.hasFlag(member.name.getFlags(), TypeScript.ASTFlags.OptionalName)
                t = typ.getMember(member.name.text(), optional)
            } else {
                t = typ;
            }
            t.calls.push(parseFunctionType(member))
        }
        else if (member instanceof TypeScript.VariableDeclarator) {
            var optional = TypeScript.hasFlag(member.id.getFlags(), TypeScript.ASTFlags.OptionalName)
            var t = member.typeExpr ? parseType(member.typeExpr) : TAny;
            typ.setMember(member.id.text(), t, optional)
        }
        else {
            throw new TypeError("Unexpected member " + member.constructor.name + " in interface")
        }
    })
    current_scope = current_scope.parent
    return typ
}

function lookupTypeParameterDirect(scope, name) {
	if (scope instanceof TTypeParameterScope)
		return scope.env.get(name)
	else
		return null;
}
function lookupTypeParameter(scope, name) {
	while (scope !== null) {
		var t = lookupTypeParameterDirect(scope,name)
		if (t)
			return t;
		scope = scope.parent
	}
	return null;
}

function parseNameList(node) {
    if (node instanceof TypeScript.TypeReference)
        node = node.term;
    if (node instanceof TypeScript.Identifier) {
        return [node.text()]
    }
    else if (node.nodeType() == TypeScript.NodeType.MemberAccessExpression) {
        var names = parseNameList(node.operand1)
        names.push(node.operand2.text())
        return names;
    }
    else {
        throw new TypeError("Not a name list: " + node.constructor.name + ': ' + util.inspect(node))
    }
}

function parseType(node) {
	current_node = node;
    if (node instanceof TypeScript.GenericType) {
        var t = parseType(node.name)
        var targs = node.typeArguments.members.map(parseType)
        return new TGeneric(t, targs)
    }
    else if (node instanceof TypeScript.TypeReference) {
        var t = parseType(node.term)
        for (var i=0; i<node.arrayCount; i++) {
            t = new TGeneric(new TQualifiedReference('Array'), [t])
        }
        return t;
    }
    else if (node instanceof TypeScript.Identifier) {
    	// try to resolve early (type parameters must be resolved before merging)
    	var t = lookupTypeParameter(current_scope, node.text())
    	if (t) {
    		return t;
    	}
    	// defer resolution for later
        return new TReference(node.text(), current_scope)
    }
    else if (node instanceof TypeScript.InterfaceDeclaration) {
        return parseInterface(node)
    }
    else if (node instanceof TypeScript.FunctionDeclaration) {
    	var t = new TObject(null, {kind:'interface', origin:current_file});
        t.calls.push(parseFunctionType(node))
        return t;
    }
    else if (node instanceof TypeScript.BinaryExpression) {
    	return new TMember(parseType(node.operand1), node.operand2.text())
    }
    else if (node instanceof TypeScript.StringLiteral) {
    	return new TString(node.text())
    }
    else if (node instanceof TypeScript.TypeQuery) {
        return new TTypeQuery(parseNameList(node.name), current_scope)
    }
    else {
        throw new TypeError("Unexpected type: " + (node && node.constructor.name))
    }
}

function parseParameter(node) {
	current_node = node;
    return {
        optional: node.isOptional,
        name: node.id.text(),
        type: node.typeExpr ? parseType(node.typeExpr) : TAny
    }
}

function parseTypeParameter(node) {
	current_node = node;
    return {
        name: node.name.text(),
        constraint: node.constraint ? parseType(node.constraint) : null
    }
}

function parseConstructorFunction(node, selfTypeRef, instanceTypeParams) {
	current_node = node;
    // convert constructor to generic function
    // for example: class Foo<T> { constructor<U>(x:T, y:U) }
    // the constructor type is: <T,U>(x:T, y:U) => Foo<T>
	// reminder: a type parameter and its precedents must be in scope when we parse its constraint
	current_scope = new TTypeParameterScope(current_scope)
	var typeParams = []
	instanceTypeParams.forEach(function(tp,index) {
		current_scope.env.put(tp.name, new TTypeParam(tp.name))
		typeParams.push(tp)
	})
	node.typeArguments && node.typeArguments.members.forEach(function (tp,index) {
		var name = tp.name.text()
		current_scope.env.put(name, new TTypeParam(name))
		typeParams.push(parseTypeParameter(tp))
	})
	var t = {
		new: true,
		variadic: node.variableArgList,
		indexer: false,
		typeParameters: typeParams,
		parameters: node.arguments.members.map(parseParameter),
        returnType: selfTypeRef,
        meta: {
            implicit: false
        }
	}
	current_scope = current_scope.parent // restore scope
	return t
}

function parseFunctionType(node) {
	current_node = node;
	current_scope = new TTypeParameterScope(current_scope)
	var typeParams = []
	node.typeArguments && node.typeArguments.members.forEach(function(tp) {
		var name = tp.name.text()
		current_scope.env.put(name, new TTypeParam(name))
		typeParams.push(parseTypeParameter(tp))
	})
    var result = {
        new: node.isConstructMember(),
        variadic: node.variableArgList,
        indexer: node.isIndexerMember(),
        typeParameters: typeParams,
        parameters: node.arguments.members.map(parseParameter),
        returnType: node.returnTypeAnnotation ? parseType(node.returnTypeAnnotation) : TAny,
        meta: {
            implicit: false
        }
    }
    current_scope = current_scope.parent
    return result
}

var global_type;
var current_file = '?';
function parsingPhase() {
    global_type = new TObject('', {kind:'module', origin:''});
    extern_types = new Map;
    inputs.forEach(function (input) {
        current_file = input.file;
        parseTopLevel(input.ast)
    });
}


// --------------------
//  Merging types
// --------------------

function isOnlyFunction(typ) {
	return typ instanceof TObject &&
		   typ.qname === null &&
		   typ.properties.size() === 0 &&
		   typ.calls.length > 0 &&
		   typ.typeParameters.length === 0 &&
		   typ.supers.length === 0;
}

function mergePropertyInto(hostPrty, otherPrty) {
    var typ = hostPrty.type;
    var other = otherPrty.type;
    hostPrty.optional &= otherPrty.optional;
	if (typ instanceof TQualifiedReference && other instanceof TQualifiedReference) {
		if (typ.qname === other.qname) {
			return; // ok
		}
	}
	else if (isOnlyFunction(typ) && isOnlyFunction(other)) {
		other.calls.forEach(function(call) {
			typ.calls.push(call)
		})
		return; // ok
	}
	throw new TypeError("Incompatible types: " + typ + " and " + other)
}

function renameTypeParametersInParam(param, mapping) {
	return {
		optional: param.optional,
		name: param.name,
		type: renameTypeParametersInType(param.type, mapping)
	}
}

function renameTypeParametersInCall(call, mapping) {
	var typeParams;
	if (call.typeParameters.length > 0) {
		mapping = mapping.clone()
		var invMapping = new Map
		mapping.forEach(function(name,value) {
			invMapping.put(value,name)
		})
		typeParams = call.typeParameters.map(function (tp) {
			// if another thing gets renamed to clash with this, invent a new name for this
			var newName = tp.name
			if (invMapping.has(tp.name)) {
				mapping.put(tp.name, tp.name + '#')
				newName = tp.name + '#'
			}
			return {
				name: newName,
				constraint: tp.constraint && renameTypeParametersInType(tp.constraint, mapping)
			}
		})
	} else {
		typeParams = []
	}
	return {
		new: call.new,
		variadic: call.variadic,
		indexer: call.indexer,
		typeParameters: typeParams,
		parameters: call.parameters.map(function(param) {
			return renameTypeParametersInParam(param, mapping)
		}),
		returnType: renameTypeParametersInType(call.returnType, mapping),
        meta: {
            implicit: call.implicit
        }
	}
}

function renameTypeParametersInPrty(prty, mapping) {
    return {
        optional: prty.optional,
        type: renameTypeParametersInType(prty.type, mapping),
        meta: prty.meta
    }
}

function renameTypeParametersInType(typ, mapping) {
	if (typ instanceof TTypeParam) {
		var newName = mapping.get(typ.name)
		if (newName)
			return new TTypeParam(newName)
		else
			return typ
	}
	else if (typ instanceof TObject) {
		typ.properties = typ.properties.map(function(name,prty) {
			return renameTypeParametersInPrty(prty, mapping)
		})
		typ.calls = typ.calls.map(function(call) {
			return renameTypeParametersInCall(call, mapping)
		})
		return typ
	}
	else if (typ instanceof TGeneric) {
		typ.base = renameTypeParametersInType(typ.base, mapping)
		typ.args = typ.args.map(function(arg) {
			return renameTypeParametersInType(arg, mapping)
		})
		return typ;
	}
	else {
		return typ;
	}
}

function mergeInto(typ, other) {
    if (!(typ instanceof TObject) || !(other instanceof TObject)) {
        throw new TypeError("Incompatible types for " + typ.qname + ": " + typ.constructor.name + " and " + other.constructor.name)
    }
    if (typ === other)
        return;
    if (typ.typeParameters.length !== other.typeParameters.length)
    	throw new TypeError("Unequal number of type parameters for partial definitions of " + typ.qname)
    if (typ.brand && other.brand)
        throw new TypeError("Incompatible types: " + typ.qname + " and " + other.qname)
    if (other.brand) {
        typ.brand = other.brand
    }
    var mapping = new Map
    for (var i=0; i<typ.typeParameters.length; i++) {
    	mapping.put(other.typeParameters[i].name, typ.typeParameters[i].name)
    }
    // rename type parameters to the two types agree on their names
    other = renameTypeParametersInType(other, mapping)
    other.properties.forEach(function(name,otherPrty) {
    	var existing = typ.properties.get(name)
    	if (!existing) {
            typ.properties.put(name, otherPrty)
    		// typ.setMember(name, otherPrty.type, otherPrty.optional)
    	} else {
    		mergePropertyInto(existing, otherPrty)
    	}
    })
    other.types.forEach(function(name,otherT) {
        var typT = typ.types.get(name)
        if (typT) {
            mergeInto(typT, otherT)
        } else if (typT !== otherT) {
            typ.types.put(name, otherT)
        }
    })
    other.calls.forEach(function(call) {
    	typ.calls.push(call)
    })
}
function mergeObjectTypes(x) {
    if (x instanceof TObject) {
    	x.modules.forEach(function(name,module) {
    		mergeObjectTypes(module)
    	})
        x.types.forEach(function(name,types) {
            types.forEach(mergeObjectTypes)
            for (var i=1; i<types.length; i++) {
                mergeInto(types[0], types[i])
            }
            x.types.put(name, types[0])
        })
    }
}
function mergeScopeTypes(x) {
	x.env.forEach(function(name,types) {
		types.forEach(mergeObjectTypes)
		for (var i=1; i<types.length; i++) {
			mergeInto(types[0], types[i])
		}
		x.env.put(name, types[0])
	})
}

function mergingPhase() {
    mergeObjectTypes(global_type)
}


// ----------------------------------
//  Type environment
// ----------------------------------


var type_env;
var next_synthetic;

function buildEnv(type) {
	if (type instanceof TObject) {
		type.types.mapUpdate(function(name,typ) {
			return buildEnv(typ)
		})
		type.modules.mapUpdate(function(name,typ) {
			return buildEnv(typ)
		})
		if (type.qname) {
			type_env.put(type.qname, type)
			return new TQualifiedReference(type.qname)
		} else {
			return type;
		}
	}
	// else if (type instanceof TEnum) {
	// 	type_env.put(type.qname, type)
	// 	return new TQualifiedReference(type.qname)
	// }
	else {
		return type;
	}
}

function typeEnvironmentPhase() {
    type_env = new Map
    global_type.qname = '<global>'
    next_synthetic = 1
    buildEnv(global_type)
}

function synthesizeName(obj)  {
    if (obj.qname === null) {
        obj.qname = '#' + (next_synthetic++);
        type_env.put(obj.qname, obj)
    }
    return new TQualifiedReference(obj.qname)
}


// ----------------------------------------------------------
//  Name resolution (and resolution of TTypeQuery)
// ----------------------------------------------------------

function lookupQualifiedType(qname) {
	var t = type_env.get(qname)
	if (!t)
		throw new TypeError("Unresolved type: " + qname)
	return t;
}

function lookupInScopeDirect(scope, name, isModule) {
	if (scope instanceof TModuleScope) {
		if (isModule && scope.obj.modules.has(name))
			return scope.obj.modules.get(name)
		return scope.obj.types.get(name)
	}
	else if (scope instanceof TLocalScope) {
		return scope.env.get(name)
 	}
 	else if (scope instanceof TTypeParameterScope) {
 		return null;
 	}
 	else {
 		throw new Error("Unexpected scope type: " + scope)
 	}
}
function lookupInScope(scope, name, isModule) {
	while (scope !== null) {
		var t = lookupInScopeDirect(scope,name,isModule)
		if (t)
			return t;
		scope = scope.parent
	}
	return null;
}

function resolveToObject(type) {
	type = resolveReference(type, true)
	if (type instanceof TQualifiedReference)
		type = lookupQualifiedType(type.qname)
	if (type instanceof TObject)
		return type;
	throw new TypeError("Could not resolve " + type + " to an object")
}

function lookupInType(type, name, isModule) {
	var obj = resolveToObject(type)
	if (isModule) {
		var t = obj.modules.get(name)
		if (t)
			return t;
	}
	var t = obj.types.get(name)
	if (!t)
		throw new TypeError("Could not find type " + name)
	return t;
}

function lookupPrtyInScopeDirect(scope, name) {
    if (scope instanceof TModuleScope) {
        var obj = scope.obj
        var t = obj.modules.get(name)
        if (t)
            return t;
        var prty = obj.properties.get(name)
        if (prty)
            return prty.type;
        return null;
    }
    else {
        return null;
    }
}
function lookupPrtyInScope(scope, name) {
    while (scope !== null) {
        var t = lookupPrtyInScopeDirect(scope,name)
        if (t)
            return t;
        scope = scope.parent
    }
    return null
}

// Resolves a TReference or TMember to a TQualifiedReference
function resolveReference(x, isModule) {
	if (x instanceof TReference) {
        if (isBuiltin(x.name))
            return new TBuiltin(x.name)
		if (x.resolution)
			return x.resolution
		if (x.resolving)
			throw new TypeError("Cyclic reference involving " + x)
		x.resolving = true
		var t = lookupInScope(x.scope, x.name, isModule)
		if (!t) {
            t = new TQualifiedReference(x.name) // XXX: for now assume global reference
			// throw new TypeError("Unresolved type: " + x.name)
		}
		t = resolveReference(t, isModule)
		x.resolution = t;
		return t;
	} else if (x instanceof TMember) {
		if (x.resolution)
			return x.resolution
		if (x.resolving)
			throw new TypeError("Cyclic reference involving " + x)
		x.resolving = true
		var base = resolveReference(x.base, true)
		var t = resolveReference(lookupInType(base, x.name, isModule), isModule)
		x.resolution = t
		return t;
    } else if (x instanceof TTypeQuery) {
        if (x.resolution)
            return x.resolution;
        if (x.resolving)
            throw new TypeError("Cyclic reference involving " + x)
        x.resolving = true
        var t = lookupPrtyInScope(x.scope, x.names[0])
        if (!t)
            throw new TypeError("Name not found: " + x.names[0])
        t = resolveReference(t)
        for (var i=1; i<x.names.length; i++) {
            var prty = t.properties.get(x.names[i])
            var module = t.modules.get(x.names[i])
            var t = prty ? prty.type : module;
            if (!t)
                throw new TypeError("Name not found: " + x.names.slice(0,i).join('.'))
            t = resolveReference(t)
        }
        if (t instanceof TObject && !t.qname) {
            t = synthesizeName(t) // don't create aliasing
        }
        x.resolution = t;
        return t;
	} else {
		return x;
	}
}

// Recursively builds a type where all references have been resolved
function resolveType(x) {
	if (x instanceof TReference) {
		return resolveReference(x)
	} else if (x instanceof TMember) {
		return resolveReference(x)
	} else if (x instanceof TObject) {
        if (x.qname)
            return new TQualifiedReference(x.qname) // can happen if a qname was synthesized by resolveReference
		return resolveObject(x);
	} else if (x instanceof TQualifiedReference) {
		return x;
	} else if (x instanceof TTypeParam) {
		return new TTypeParam(x.name, x.constraint && resolveType(x.constraint))
	} else if (x instanceof TGeneric) {
		return new TGeneric(resolveType(x.base), x.args.map(resolveType))
	} else if (x instanceof TString) {
		return x;
	} else if (x instanceof TBuiltin) {
		return x;
	} else if (x instanceof TTypeQuery) {
        return resolveReference(x);
    } else if (x instanceof TEnum) {
        return x;
    }
	var msg;
	if (x.constructor.name === 'Object')
		msg = util.inspect(x)
	else
		msg = '' + x;
	throw new TypeError("Cannot canonicalize reference to " + (x && x.constructor.name + ': ' + msg))
}

function resolveCall(call) {
	return {
		new: call.new,
		variadic: call.variadic,
		indexer: call.indexer,
		typeParameters: call.typeParameters.map(resolveTypeParameter),
		parameters: call.parameters.map(resolveParameter),
		returnType: resolveType(call.returnType),
        meta: call.meta,
	}

}
function resolveTypeParameter(tp) {
	return {
		name: tp.name,
		constraint: tp.constraint && resolveType(tp.constraint)
	}
}

function resolveParameter(param) {
	return {
		optional: param.optional,
		name: param.name,
		type: resolveType(param.type)
	}
}

function resolveObject(type) {
	type.properties.mapUpdate(function(name,prty) {
		if (prty.type.constructor.name == 'Object')
			throw new TypeError(type.qname + "." + name + " is not a type: " + util.inspect(prty.type))
		return {
            optional: prty.optional,
            type: resolveType(prty.type),
            meta: prty.meta
        }
	})
	type.types.mapUpdate(function(name,typ) {
		return resolveType(typ);
	})
	type.modules.forEach(function (name,typ) {
		resolve(typ)
	})
	type.supers = type.supers.map(resolveType)
	type.calls = type.calls.map(resolveCall)
    type.typeParameters = type.typeParameters.map(resolveTypeParameter)
	return type;
}

function resolve(x) {
	if (x instanceof TObject) {
		resolveObject(x)
	}
	return x;
}

function nameResolutionPhase() {
    type_env.forEach(function(name,type) {
    	resolve(type)
    })
    extern_types.mapUpdate(function(name,type) {
        return resolveReference(type)
    })
}


// ---------------------------------------------------
//     Demodule phase: Convert modules to properties
// ---------------------------------------------------

function demodule(t) {
    t.modules.forEach(function(name,ref) {
        var module = resolveToObject(ref)
        if (t.properties.has(name)) {
            var typ = t.properties.get(name).type
            if (isOnlyFunction(typ)) {
                typ.calls.forEach(function(call) {
                    module.calls.push(call)
                })
            } else {
               throw new TypeError(t.qname + "." + name + " of type " + t.properties.get(name).type + " clashes with name of ref");
            }
        }
        if (!module.origin)
            throw new Error("No origin on module: " + module.qname)
        t.properties.put(name, {
            optional: false,
            type: ref,
            meta: {
                origin: module.origin
            }
        })
        demodule(module)
    })
}

function demodulePhase() {
    demodule(global_type);
}



// ---------------------------------------------------
//     Inheritance
// ---------------------------------------------------

function substProperty(prty, tenv) {
    return {
        optional: prty.optional,
        type: substType(prty.type, tenv),
        meta: prty.meta
    }
}
function substParameter(param, tenv) {
    return {
        name: param.name,
        optional: param.optional,
        type: substType(param.type, tenv)
    }
}
function substCall(call, tenv) {
    var typeParams = []
    if (call.typeParameters.length > 0) {
        tenv = tenv.clone()
        call.typeParameters.forEach(function(tp) {
            tenv.remove(tp.name) // shadowed
            typeParams.push({
                name: tp.name,
                constraint: tp.constraint && substType(tp.constraint, tenv)
            })
        })
    }
    return {
        new: call.new,
        variadic: call.variadic,
        indexer: call.indexer,
        typeParameters: typeParams,
        parameters: call.parameters.map(substParameter.fill(undefined,tenv)),
        returnType: substType(call.returnType, tenv),
        meta: call.meta
    }
}

function substType(type, tenv) {
    if (type instanceof TObject) {
        var t = new TObject(null, type.meta)
        t.properties = type.properties.mapv(substProperty.fill(undefined,tenv))
        t.calls = type.calls.map(substCall.fill(undefined,tenv))
        t.brand = type.brand
        return t;
    }
    else if (type instanceof TGeneric) {
        return new TGeneric(substType(type.base, tenv), type.args.map(substType.fill(undefined,tenv)))
    }
    else if (type instanceof TTypeParam) {
        var t = tenv.get(type.name)
        if (t)
            return t;
        return type;
    }
    else {
        return type;
    }
}
function substWithTypeArgs(type, targs) {
    if (type.typeParameters.length !== targs.length)
        throw new Error(type.qname + " expects " + type.typeParameters.length + " type parameters but got " + targs.length)
    if (targs.length === 0)
        return;
    var tenv = new Map
    for (var i=0; i<targs.length; i++) {
        tenv.put(type.typeParameters[i].name, targs[i])
    }
    return substType(type, tenv)
}

function cloneProperty(prty) {
    return substProperty(prty, new Map)
}
function cloneCall(call) {
    return substCall(call, new Map)
}
function inheritObject(obj) {
    if (!(obj instanceof TObject))
        throw new Error("Unexpected type in inheritObject: " + util.inspect(obj))
    if (obj.supers.length === 0)
        return;
    if (obj.inheriting)
        throw new Error("Cyclic inheritance involving " + obj.qname)
    obj.inheriting = true
    obj.supers.forEach(function(sup) {
        var superObj;
        if (sup instanceof TGeneric) {
            var base = resolveToObject(sup.base);
            inheritObject(base);
            superObj = substWithTypeArgs(base, sup.args)
        } else {
            superObj = resolveToObject(sup)
            if (!superObj)
                return; // only returns to forEach loop
            inheritObject(superObj)
        }
        superObj.properties.forEach(function(name,prty) {
            if (!obj.properties.has(name)) {
                obj.properties.put(name, cloneProperty(prty))
            }
        })
        superObj.calls.forEach(function(call) {
            obj.calls.push(cloneCall(call))
        })
    })
    obj.supers = []
}

function inheritancePhase() {
    type_env.forEach(function(name,value) {
        if (value instanceof TObject) // do not visit enum types
            inheritObject(value)
    })
}


// --------------------------------------------
//  	Dump (for debugging)
// --------------------------------------------

TReference.prototype.inspect = function() {
	resolveType(this)
	if (this.resolution.qname)
		return this.resolution.qname;
	return  this.name;
}
TMember.prototype.inspect = function() {
	resolveType(this)
	if (this.resolution.qname)
		return this.resolution.qname;
	return this.base + '.' + this.name
}
// console.log(util.inspect(global_type, {depth:null}))

// console.log(util.inspect(type_env, {depth:null}))


// --------------------------------------------
//      Output
// --------------------------------------------

function outputParameter(call) {
    return function(param,i) {
        if (call.variadic && i === call.parameters.length-1) {
            if (!(param.type instanceof TGeneric) || param.type.base.qname !== 'Array') {
                throw new Error("The last parameter of a variadic function must be declared as an array type")
            }
            return {
                name: param.name,
                optional: param.optional,
                type: outputType(param.type.args[0])
            }
        } else {
            return {
                name: param.name,
                optional: param.optional,
                type: outputType(param.type)
            }
        }

    }
}

function outputCall(call) {
    if (call.indexer)
        return null;
    return {
        new: call.new,
        variadic: call.variadic,
        typeParameters: call.typeParameters.map(outputTypeParameter),
        parameters: call.parameters.map(outputParameter(call)),
        returnType: outputType(call.returnType),
        meta: call.meta
    }
}

function outputProperty(prty) {
    return {
        optional: prty.optional,
        type: outputType(prty.type),
        meta: prty.meta
    }
}

function outputTypeParameter(tp) {
    return {
        name: tp.name,
        constraint: tp.constraint && outputType(tp.constraint)
    }
}

function findIndexer(calls, typeName) {
    for (var i=0; i<calls.length; i++) {
        var call = calls[i];
        if (call.indexer && call.parameters[0].type instanceof TBuiltin && call.parameters[0].type.name === typeName) {
            return outputType(call.returnType);
        }
    }
    return null;
}

function outputType(type) {
    if (type instanceof TObject) {
        return {
            type: 'object',
            // typeParameters: type.typeParameters.map(outputTypeParameter),
            properties: type.properties.mapv(outputProperty).json(),
            calls: type.calls.map(outputCall).compact(),
            stringIndexer: findIndexer(type.calls, 'string'),
            numberIndexer: findIndexer(type.calls, 'number'),
            brand: type.brand,
            meta: type.meta
        }
    }
    else if (type instanceof TQualifiedReference) {
        return {type: 'reference', name:type.qname, typeArguments:[]}
    }
    else if (type instanceof TTypeParam) {
        return {type: 'type-param', name:type.name}
    }
    else if (type instanceof TGeneric)  {
        if (!(type.base instanceof TQualifiedReference))
            throw new Error("Malformed TGeneric base in: " + util.inspect(type))
        return {
            type: 'reference',
            name: type.base.qname,
            typeArguments: type.args.map(outputType)
        }
    }
    else if (type instanceof TBuiltin) {
        return { type: type.name }
    }
    else if (type instanceof TEnum) {
        return { type: 'enum', name: type.qname }
    }
    else if (type instanceof TString) {
        return { type: 'string-const', value: type.value }
    }
    else {
        throw new Error("Cannot output " + (type && type.constructor.name) + ': ' + util.inspect(type))
    }
}
function outputExtern(t) {
    if (!(t instanceof TQualifiedReference))
        throw new Error("Unresolved extern: " + t)
    return t.qname;
}
function outputTypeDef(td) {
    if (!(td instanceof TObject))
        throw new Error("Only objects can be top-level types")
    return {
        typeParameters: td.typeParameters.map(function(tp) {return tp.name}),
        object: outputType(td)
    }
}
function outputPhase() {
    return {
        global: "<global>",
        env: type_env.mapv(outputTypeDef).json(),
        externs: extern_types.mapv(outputExtern).json(),
        enums: enum_types.json(),
    }
}

// --------------------------------------------
//      Public API
// --------------------------------------------

module.exports = convert;
var inputs;
function convert(arg) {
    if (typeof arg === 'string') {
        inputs = [{file:'', text:arg}]
    } else if (arg instanceof Array) {
        inputs = arg.clone();
    } else {
        throw new Error("Illegal argument: " + util.inspect(arg))
    }
    inputs = inputs.map(function(input) {
        return {
            file: input.file,
            text: input.text,
            ast: TypeScript.parse(input.text)
        }
    })
    parsingPhase()
    mergingPhase()
    typeEnvironmentPhase()
    nameResolutionPhase()
    demodulePhase()
    inheritancePhase()
    var json = outputPhase();

    // clean-up
    inputs = null;
    global_type = null;
    type_env = null;
    extern_types = null;
    current_scope = null;
    current_node = null;
    enum_types = null;

    return json;
}


// --------------------------------------------
//      Entry Point
// --------------------------------------------

function main() {
    var program = require('commander')
    program.usage('FILE.d.ts... [options]')
    program.commandHelp = function() { return "  Convert *.d.ts files to TypeScript Declaration Core\n" }
    program.option('--pretty', 'Print pretty JSON, for human inspection')
        .option('--silent', 'Print nothing')
        .option('--lib', "Include TypeScript\'s lib.d.ts file")
    program.parse(process.argv)

    if (program.args.length < 1) {
        program.help()
    }

    var inputs = program.args.map(function(file) {
        return {
            file: file,
            text: fs.readFileSync(file, 'utf8')
        }
    })
    if (program.lib) {
        inputs.unshift({
            file: ">lib.d.ts",
            text: fs.readFileSync(__dirname + '/lib/lib.d.ts', 'utf8')
        })
    }
    var json = convert(inputs)
    if (program.silent)
        {}
    else if (program.pretty)
        console.log(util.inspect(json, {depth:null}))
    else
        console.log(JSON.stringify(json))
}

if (require.main === module) {
    main();
}