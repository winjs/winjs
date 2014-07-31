// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Log',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../ControlProcessor/_OptionsLexer',
    '../ControlProcessor/_OptionsParser'
    ], function bindingParserInit(exports, _Base, _BaseUtils, _ErrorFromName, _Log, _Resources, _WriteProfilerMark, _OptionsLexer, _OptionsParser) {
    "use strict";


    var strings = {
        get invalidBinding() { return "Invalid binding:'{0}'. Expected to be '<destProp>:<sourceProp>;'. {1}"; },
        get bindingInitializerNotFound() { return "Initializer not found:'{0}'"; },
    };

/*
    See comment for data-win-options attribute grammar for context.

    Syntactic grammar for the value of the data-win-bind attribute.

        BindDeclarations:
            BindDeclaration
            BindDeclarations ; BindDeclaration

        BindDeclaration:
            DestinationPropertyName : SourcePropertyName
            DestinationPropertyName : SourcePropertyName InitializerName

        DestinationPropertyName:
            IdentifierExpression

        SourcePropertyName:
            IdentifierExpression

        InitializerName:
            IdentifierExpression

        Value:
            NumberLiteral
            StringLiteral

        AccessExpression:
            [ Value ]
            . Identifier

        AccessExpressions:
            AccessExpression
            AccessExpressions AccessExpression

        IdentifierExpression:
            Identifier
            Identifier AccessExpressions

*/
    var imports = _Base.Namespace.defineWithParent(null, null, {
        lexer: _Base.Namespace._lazy(function() {
            return _OptionsLexer._optionsLexer;
        }),
        tokenType: _Base.Namespace._lazy(function() {
            return _OptionsLexer._optionsLexer.tokenType;
        }),
    });

    var requireSupportedForProcessing = _BaseUtils.requireSupportedForProcessing;

    var local = _Base.Namespace.defineWithParent(null, null, {

        BindingInterpreter: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(_OptionsParser.optionsParser._BaseInterpreter, function (tokens, originalSource, context) {
                this._initialize(tokens, originalSource, context);
            }, {
                _error: function (message) {
                    throw new _ErrorFromName("WinJS.Binding.ParseError", _Resources._formatString(strings.invalidBinding, this._originalSource, message));
                },
                _evaluateInitializerName: function () {
                    if (this._current.type === imports.tokenType.identifier) {
                        var initializer = this._evaluateIdentifierExpression();
                        if (_Log.log && !initializer) {
                            _Log.log(_Resources._formatString(strings.bindingInitializerNotFound, this._originalSource), "winjs binding", "error");
                        }
                        return requireSupportedForProcessing(initializer);
                    }
                    return;
                },
                _evaluateValue: function () {
                    switch (this._current.type) {
                        case imports.tokenType.stringLiteral:
                        case imports.tokenType.numberLiteral:
                            var value = this._current.value;
                            this._read();
                            return value;

                        default:
                            this._unexpectedToken(imports.tokenType.stringLiteral, imports.tokenType.numberLiteral);
                            return;
                    }
                },
                _readBindDeclarations: function () {
                    var bindings = [];
                    while (true) {
                        switch (this._current.type) {
                            case imports.tokenType.identifier:
                            case imports.tokenType.thisKeyword:
                                bindings.push(this._readBindDeclaration());
                                break;

                            case imports.tokenType.semicolon:
                                this._read();
                                break;

                            case imports.tokenType.eof:
                                return bindings;

                            default:
                                this._unexpectedToken(imports.tokenType.identifier, imports.tokenType.semicolon, imports.tokenType.eof);
                                return;
                        }
                    }
                },
                _readBindDeclaration: function () {
                    var dest = this._readDestinationPropertyName();
                    this._read(imports.tokenType.colon);
                    var src = this._readSourcePropertyName();
                    var initializer = this._evaluateInitializerName();
                    return {
                        destination: dest,
                        source: src,
                        initializer: initializer,
                    };
                },
                _readDestinationPropertyName: function () {
                    return this._readIdentifierExpression();
                },
                _readSourcePropertyName: function () {
                    return this._readIdentifierExpression();
                },
                run: function () {
                    return this._readBindDeclarations();
                }
            }, {
                supportedForProcessing: false,
            });
        }),

        BindingParser: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(local.BindingInterpreter, function (tokens, originalSource) {
                this._initialize(tokens, originalSource, {});
            }, {
                _readInitializerName: function () {
                    if (this._current.type === imports.tokenType.identifier) {
                        return this._readIdentifierExpression();
                    }
                    return;
                },
                _readBindDeclaration: function () {
                    var dest = this._readDestinationPropertyName();
                    this._read(imports.tokenType.colon);
                    var src = this._readSourcePropertyName();
                    var initializer = this._readInitializerName();
                    return {
                        destination: dest,
                        source: src,
                        initializer: initializer,
                    };
                },
            }, {
                supportedForProcessing: false,
            });
        })

    });

    function parser(text, context) {
        _WriteProfilerMark("WinJS.Binding:bindingParser,StartTM");
        var tokens = imports.lexer(text);
        var interpreter = new local.BindingInterpreter(tokens, text, context || {});
        var res = interpreter.run();
        _WriteProfilerMark("WinJS.Binding:bindingParser,StopTM");
        return res;
    }

    function parser2(text) {
        _WriteProfilerMark("WinJS.Binding:bindingParser,StartTM");
        var tokens = imports.lexer(text);
        var interpreter = new local.BindingParser(tokens, text);
        var res = interpreter.run();
        _WriteProfilerMark("WinJS.Binding:bindingParser,StopTM");
        return res;
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.Binding", {
        _bindingParser: parser,
        _bindingParser2: parser2,
    });

});
