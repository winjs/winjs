// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function optionsParserInit(global) {
    "use strict";

    var strings = {
        get invalidOptionsRecord() { return WinJS.Resources._getWinJSString("base/invalidOptionsRecord").value; },
        get unexpectedTokenExpectedToken() { return WinJS.Resources._getWinJSString("base/unexpectedTokenExpectedToken").value; },
        get unexpectedTokenExpectedTokens() { return WinJS.Resources._getWinJSString("base/unexpectedTokenExpectedTokens").value; },
        get unexpectedTokenGeneric() { return WinJS.Resources._getWinJSString("base/unexpectedTokenGeneric").value; },
    };

    /*
    Notation is described in ECMA-262-5 (ECMAScript Language Specification, 5th edition) section 5.

    Lexical grammar is defined in ECMA-262-5, section 7.

    Lexical productions used in this grammar defined in ECMA-262-5:

        Production          Section
        --------------------------------
        Identifier          7.6
        NullLiteral         7.8.1
        BooleanLiteral      7.8.2
        NumberLiteral       7.8.3
        StringLiteral       7.8.4

    Syntactic grammar for the value of the data-win-options attribute.

        OptionsLiteral:
            ObjectLiteral

        ObjectLiteral:
            { }
            { ObjectProperties }
            { ObjectProperties , }

        ObjectProperties:
            ObjectProperty
            ObjectProperties, ObjectProperty

        ObjectProperty:
            PropertyName : Value

        PropertyName:                       (from ECMA-262-6, 11.1.5)
            StringLiteral
            NumberLiteral
            Identifier

        ArrayLiteral:
            [ ]
            [ Elision ]
            [ ArrayElements ]
            [ ArrayElements , ]
            [ ArrayElements , Elision ]

        ArrayElements:
            Value
            Elision Value
            ArrayElements , Value
            ArrayElements , Elision Value

        Elision:
            ,
            Elision ,

        Value:
            NullLiteral
            NumberLiteral
            BooleanLiteral
            StringLiteral
            ArrayLiteral
            ObjectLiteral
            IdentifierExpression
            ObjectQueryExpression

        AccessExpression:
            [ Value ]
            . Identifier

        AccessExpressions:
            AccessExpression
            AccessExpressions AccessExpression

        IdentifierExpression:
            Identifier
            Identifier AccessExpressions

        ObjectQueryExpression:
            Identifier ( StringLiteral )
            Identifier ( StringLiteral ) AccessExpressions


    NOTE: We have factored the above grammar to allow the infrastructure to be used
          by the BindingInterpreter as well. The BaseInterpreter does NOT provide an
          implementation of _evaluateValue(), this is expected to be provided by the
          derived class since right now the two have different grammars for Value

        AccessExpression:
            [ Value ]
            . Identifier

        AccessExpressions:
            AccessExpression
            AccessExpressions AccessExpression

        Identifier:
            Identifier                      (from ECMA-262-6, 7.6)

        IdentifierExpression:
            Identifier
            Identifier AccessExpressions

        Value:
            *** Provided by concrete interpreter ***

*/

    function illegal() {
        throw "Illegal";
    }

    var imports = WinJS.Namespace.defineWithParent(null, null, {
        lexer: WinJS.Namespace._lazy("WinJS.UI._optionsLexer"),
        tokenType: WinJS.Namespace._lazy("WinJS.UI._optionsLexer.tokenType"),
    });

    var requireSupportedForProcessing = WinJS.Utilities.requireSupportedForProcessing;

    function tokenTypeName(type) {
        var keys = Object.keys(imports.tokenType);
        for (var i = 0, len = keys.length; i < len; i++) {
            if (type === imports.tokenType[keys[i]]) {
                return keys[i];
            }
        }
        return "<unknown>";
    }

    var local = WinJS.Namespace.defineWithParent(null, null, {

        BaseInterpreter: WinJS.Namespace._lazy(function () {
            return WinJS.Class.define(null, {
                _error: function (message) {
                    throw new WinJS.ErrorFromName("WinJS.UI.ParseError", message);
                },
                _currentOffset: function () {
                    var l = this._tokens.length;
                    var p = this._pos;
                    var offset = 0;
                    for (var i = 0; i < p; i++) {
                        offset += this._tokens[i].length;
                    }
                    return offset;
                },
                _evaluateAccessExpression: function (value) {
                    switch (this._current.type) {
                        case imports.tokenType.dot:
                            this._read();
                            switch (this._current.type) {
                                case imports.tokenType.identifier:
                                case this._current.keyword && this._current.type:
                                    var id = this._current.value;
                                    this._read();
                                    return value[id];

                                default:
                                    this._unexpectedToken(imports.tokenType.identifier, imports.tokenType.reservedWord);
                                    break;
                            }
                            return;

                        case imports.tokenType.leftBracket:
                            this._read();
                            var index = this._evaluateValue();
                            this._read(imports.tokenType.rightBracket);
                            return value[index];

                            // default: is unreachable because all the callers are conditional on
                            // the next token being either a . or {
                            //
                    }
                },
                _evaluateAccessExpressions: function (value) {
                    while (true) {
                        switch (this._current.type) {
                            case imports.tokenType.dot:
                            case imports.tokenType.leftBracket:
                                value = this._evaluateAccessExpression(value);
                                break;

                            default:
                                return value;
                        }
                    }
                },
                _evaluateIdentifier: function (nested, value) {
                    var id = this._readIdentifier();
                    value = nested ? value[id] : this._context[id];
                    return value;
                },
                _evaluateIdentifierExpression: function () {
                    var value = this._evaluateIdentifier(false);

                    switch (this._current.type) {
                        case imports.tokenType.dot:
                        case imports.tokenType.leftBracket:
                            return this._evaluateAccessExpressions(value);
                        default:
                            return value;
                    }
                },
                _initialize: function (tokens, originalSource, context, functionContext) {
                    this._originalSource = originalSource;
                    this._tokens = tokens;
                    this._context = context;
                    this._functionContext = functionContext;
                    this._pos = 0;
                    this._current = this._tokens[0];
                },
                _read: function (expected) {
                    if (expected && this._current.type !== expected) {
                        this._unexpectedToken(expected);
                    }
                    if (this._current !== imports.tokenType.eof) {
                        this._current = this._tokens[++this._pos];
                    }
                },
                _peek: function (expected) {
                    if (expected && this._current.type !== expected) {
                        return;
                    }
                    if (this._current !== imports.tokenType.eof) {
                        return this._tokens[this._pos + 1];
                    }
                },
                _readAccessExpression: function (parts) {
                    switch (this._current.type) {
                        case imports.tokenType.dot:
                            this._read();
                            switch (this._current.type) {
                                case imports.tokenType.identifier:
                                case this._current.keyword && this._current.type:
                                    parts.push(this._current.value);
                                    this._read();
                                    break;

                                default:
                                    this._unexpectedToken(imports.tokenType.identifier, imports.tokenType.reservedWord);
                                    break;
                            }
                            return;

                        case imports.tokenType.leftBracket:
                            this._read();
                            parts.push(this._evaluateValue());
                            this._read(imports.tokenType.rightBracket);
                            return;

                            // default: is unreachable because all the callers are conditional on
                            // the next token being either a . or {
                            //
                    }
                },
                _readAccessExpressions: function (parts) {
                    while (true) {
                        switch (this._current.type) {
                            case imports.tokenType.dot:
                            case imports.tokenType.leftBracket:
                                this._readAccessExpression(parts);
                                break;

                            default:
                                return;
                        }
                    }
                },
                _readIdentifier: function () {
                    var id = this._current.value;
                    this._read(imports.tokenType.identifier);
                    return id;
                },
                _readIdentifierExpression: function () {
                    var parts = [];
                    if (this._peek(imports.tokenType.thisKeyword) && parts.length === 0) {
                        this._read();
                    }
                    else {
                        parts.push(this._readIdentifier());
                    }

                    switch (this._current.type) {
                        case imports.tokenType.dot:
                        case imports.tokenType.leftBracket:
                            this._readAccessExpressions(parts);
                            break;
                    }

                    return parts;
                },
                _unexpectedToken: function (expected) {
                    var unexpected = (this._current.type === imports.tokenType.error ? "'" + this._current.value + "'" : tokenTypeName(this._current.type));
                    if (expected) {
                        if (arguments.length == 1) {
                            expected = tokenTypeName(expected);
                            this._error(WinJS.Resources._formatString(strings.unexpectedTokenExpectedToken, unexpected, expected, this._currentOffset()));
                        } else {
                            var names = [];
                            for (var i = 0, len = arguments.length; i < len; i++) {
                                names.push(tokenTypeName(arguments[i]));
                            }
                            expected = names.join(", ");
                            this._error(WinJS.Resources._formatString(strings.unexpectedTokenExpectedTokens, unexpected, expected, this._currentOffset()));
                        }
                    } else {
                        this._error(WinJS.Resources._formatString(strings.unexpectedTokenGeneric, unexpected, this._currentOffset()));
                    }
                }
            }, {
                supportedForProcessing: false,
            });
        }),

        OptionsInterpreter: WinJS.Namespace._lazy(function () {
            return WinJS.Class.derive(local.BaseInterpreter, function (tokens, originalSource, context, functionContext) {
                this._initialize(tokens, originalSource, context, functionContext);
            }, {
                _error: function (message) {
                    throw new WinJS.ErrorFromName("WinJS.UI.ParseError", WinJS.Resources._formatString(strings.invalidOptionsRecord, this._originalSource, message));
                },
                _evaluateArrayLiteral: function () {
                    var a = [];
                    this._read(imports.tokenType.leftBracket);
                    this._readArrayElements(a);
                    this._read(imports.tokenType.rightBracket);
                    return a;
                },
                _evaluateObjectLiteral: function () {
                    var o = {};
                    this._read(imports.tokenType.leftBrace);
                    this._readObjectProperties(o);
                    this._tryReadComma();
                    this._read(imports.tokenType.rightBrace);
                    return o;
                },
                _evaluateOptionsLiteral: function () {
                    var value = this._evaluateValue();
                    if (this._current.type !== imports.tokenType.eof) {
                        this._unexpectedToken(imports.tokenType.eof);
                    }
                    return value;
                },
                _peekValue: function () {
                    switch (this._current.type) {
                        case imports.tokenType.falseLiteral:
                        case imports.tokenType.nullLiteral:
                        case imports.tokenType.stringLiteral:
                        case imports.tokenType.trueLiteral:
                        case imports.tokenType.numberLiteral:
                        case imports.tokenType.leftBrace:
                        case imports.tokenType.leftBracket:
                        case imports.tokenType.identifier:
                            return true;
                        default:
                            return false;
                    }
                },
                _evaluateValue: function () {
                    switch (this._current.type) {
                        case imports.tokenType.falseLiteral:
                        case imports.tokenType.nullLiteral:
                        case imports.tokenType.stringLiteral:
                        case imports.tokenType.trueLiteral:
                        case imports.tokenType.numberLiteral:
                            var value = this._current.value;
                            this._read();
                            return value;

                        case imports.tokenType.leftBrace:
                            return this._evaluateObjectLiteral();

                        case imports.tokenType.leftBracket:
                            return this._evaluateArrayLiteral();

                        case imports.tokenType.identifier:
                            if (this._peek(imports.tokenType.identifier).type == imports.tokenType.leftParentheses) {
                                return requireSupportedForProcessing(this._evaluateObjectQueryExpression());
                            }
                            return requireSupportedForProcessing(this._evaluateIdentifierExpression());

                        default:
                            this._unexpectedToken(imports.tokenType.falseLiteral, imports.tokenType.nullLiteral, imports.tokenType.stringLiteral,
                                imports.tokenType.trueLiteral, imports.tokenType.numberLiteral, imports.tokenType.leftBrace, imports.tokenType.leftBracket,
                                imports.tokenType.identifier);
                            break;
                    }
                },
                _tryReadElement: function (a) {
                    if (this._peekValue()) {
                        a.push(this._evaluateValue());
                        return true;
                    } else {
                        return false;
                    }
                },
                _tryReadComma: function () {
                    if (this._peek(imports.tokenType.comma)) {
                        this._read();
                        return true;
                    }
                    return false;
                },
                _tryReadElision: function (a) {
                    var found = false;
                    while (this._tryReadComma()) {
                        a.push(undefined);
                        found = true;
                    }
                    return found;
                },
                _readArrayElements: function (a) {
                    while (!this._peek(imports.tokenType.rightBracket)) {
                        var elision = this._tryReadElision(a);
                        var element = this._tryReadElement(a);
                        var comma = this._peek(imports.tokenType.comma);
                        if (element && comma) {
                            // if we had a element followed by a comma, eat the comma and try to read the next element
                            this._read();
                        } else if (element || elision) {
                            // if we had a element without a trailing comma or if all we had were commas we're done
                            break;
                        } else {
                            // if we didn't have a element or elision then we are done and in error
                            this._unexpectedToken(imports.tokenType.falseLiteral, imports.tokenType.nullLiteral, imports.tokenType.stringLiteral,
                                imports.tokenType.trueLiteral, imports.tokenType.numberLiteral, imports.tokenType.leftBrace, imports.tokenType.leftBracket,
                                imports.tokenType.identifier);
                            break;
                        }
                    }
                },
                _readObjectProperties: function (o) {
                    while (!this._peek(imports.tokenType.rightBrace)) {
                        var property = this._tryReadObjectProperty(o);
                        var comma = this._peek(imports.tokenType.comma);
                        if (property && comma) {
                            // if we had a property followed by a comma, eat the comma and try to read the next property
                            this._read();
                        } else if (property) {
                            // if we had a property without a trailing comma we're done
                            break;
                        } else {
                            // if we didn't have a property then we are done and in error
                            this._unexpectedToken(imports.tokenType.numberLiteral, imports.tokenType.stringLiteral, imports.tokenType.identifier);
                            break;
                        }
                    }
                },
                _tryReadObjectProperty: function (o) {
                    switch (this._current.type) {
                        case imports.tokenType.numberLiteral:
                        case imports.tokenType.stringLiteral:
                        case imports.tokenType.identifier:
                        case this._current.keyword && this._current.type:
                            var propertyName = this._current.value;
                            this._read();
                            this._read(imports.tokenType.colon);
                            o[propertyName] = this._evaluateValue();
                            return true;

                        default:
                            return false;
                    }
                },
                _failReadObjectProperty: function () {
                    this._unexpectedToken(imports.tokenType.numberLiteral, imports.tokenType.stringLiteral, imports.tokenType.identifier, imports.tokenType.reservedWord);
                },
                _evaluateObjectQueryExpression: function () {
                    var functionName = this._current.value;
                    this._read(imports.tokenType.identifier);
                    this._read(imports.tokenType.leftParentheses);
                    var queryExpression = this._current.value;
                    this._read(imports.tokenType.stringLiteral);
                    this._read(imports.tokenType.rightParentheses);

                    var value = requireSupportedForProcessing(this._functionContext[functionName])(queryExpression);
                    switch (this._current.type) {
                        case imports.tokenType.dot:
                        case imports.tokenType.leftBracket:
                            return this._evaluateAccessExpressions(value);

                        default:
                            return value;
                    }
                },
                run: function () {
                    return this._evaluateOptionsLiteral();
                }
            }, {
                supportedForProcessing: false,
            });
        }),

        OptionsParser: WinJS.Namespace._lazy(function () {
            return WinJS.Class.derive(local.OptionsInterpreter, function (tokens, originalSource) {
                this._initialize(tokens, originalSource);
            }, {
                // When parsing it is illegal to get to any of these "evaluate" RHS productions because
                //  we will always instead go to the "read" version
                //
                _evaluateAccessExpression: illegal,
                _evaluateAccessExpressions: illegal,
                _evaluateIdentifier: illegal,
                _evaluateIdentifierExpression: illegal,
                _evaluateObjectQueryExpression: illegal,

                _evaluateValue: function () {
                    switch (this._current.type) {
                        case imports.tokenType.falseLiteral:
                        case imports.tokenType.nullLiteral:
                        case imports.tokenType.stringLiteral:
                        case imports.tokenType.trueLiteral:
                        case imports.tokenType.numberLiteral:
                            var value = this._current.value;
                            this._read();
                            return value;

                        case imports.tokenType.leftBrace:
                            return this._evaluateObjectLiteral();

                        case imports.tokenType.leftBracket:
                            return this._evaluateArrayLiteral();

                        case imports.tokenType.identifier:
                            if (this._peek(imports.tokenType.identifier).type == imports.tokenType.leftParentheses) {
                                return this._readObjectQueryExpression();
                            }
                            return this._readIdentifierExpression();

                        default:
                            this._unexpectedToken(imports.tokenType.falseLiteral, imports.tokenType.nullLiteral, imports.tokenType.stringLiteral,
                                imports.tokenType.trueLiteral, imports.tokenType.numberLiteral, imports.tokenType.leftBrace, imports.tokenType.leftBracket,
                                imports.tokenType.identifier);
                            break;
                    }
                },

                _readIdentifierExpression: function () {
                    var parts = local.BaseInterpreter.prototype._readIdentifierExpression.call(this);
                    return new IdentifierExpression(parts);
                },
                _readObjectQueryExpression: function () {
                    var functionName = this._current.value;
                    this._read(imports.tokenType.identifier);
                    this._read(imports.tokenType.leftParentheses);
                    var queryExpressionLiteral = this._current.value;
                    this._read(imports.tokenType.stringLiteral);
                    this._read(imports.tokenType.rightParentheses);

                    var call = new CallExpression(functionName, queryExpressionLiteral);
                    switch (this._current.type) {
                        case imports.tokenType.dot:
                        case imports.tokenType.leftBracket:
                            var parts = [call];
                            this._readAccessExpressions(parts);
                            return new IdentifierExpression(parts);

                        default:
                            return call;
                    }
                },
            }, {
                supportedForProcessing: false,
            });
        })

    });

    var parser = function (text, context, functionContext) {
        var tokens = imports.lexer(text);
        var interpreter = new local.OptionsInterpreter(tokens, text, context || {}, functionContext || {});
        return interpreter.run();
    };
    Object.defineProperty(parser, "_BaseInterpreter", { get: function () { return local.BaseInterpreter; } });

    var parser2 = function (text) {
        var tokens = imports.lexer(text);
        var parser = new local.OptionsParser(tokens, text);
        return parser.run();
    };

    // Consumers of parser2 need to be able to see the AST for RHS expression in order to emit
    //  code representing these portions of the options record
    //
    var CallExpression:any = WinJS.Class.define(function (target, arg0Value) {
        this.target = target;
        this.arg0Value = arg0Value;
    });
    CallExpression.supportedForProcessing = false;

    var IdentifierExpression:any = WinJS.Class.define(function (parts) {
        this.parts = parts;
    });
    IdentifierExpression.supportedForProcessing = false;

    WinJS.Namespace.define("WinJS.UI", {

        // This is the mis-named interpreter version of the options record processor.
        //
        optionsParser: parser,

        // This is the actual parser version of the options record processor.
        //
        _optionsParser: parser2,
        _CallExpression: CallExpression,
        _IdentifierExpression: IdentifierExpression,

    });

})(this);

