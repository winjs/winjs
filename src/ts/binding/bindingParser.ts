// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function bindingParserInit(global) {
    "use strict";


    var strings = {
        get invalidBinding() { return WinJS.Resources._getWinJSString("base/invalidBinding").value; },
        get bindingInitializerNotFound() { return WinJS.Resources._getWinJSString("base/bindingInitializerNotFound").value; },
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
    var imports = WinJS.Namespace.defineWithParent(null, null, {
        lexer: WinJS.Namespace._lazy("WinJS.UI._optionsLexer"),
        tokenType: WinJS.Namespace._lazy("WinJS.UI._optionsLexer.tokenType"),
    });

    var requireSupportedForProcessing = WinJS.Utilities.requireSupportedForProcessing;

    var local = WinJS.Namespace.defineWithParent(null, null, {

        BindingInterpreter: WinJS.Namespace._lazy(function () {
            return WinJS.Class.derive(WinJS.UI.optionsParser._BaseInterpreter, function (tokens, originalSource, context) {
                this._initialize(tokens, originalSource, context);
            }, {
                _error: function (message) {
                    throw new WinJS.ErrorFromName("WinJS.Binding.ParseError", WinJS.Resources._formatString(strings.invalidBinding, this._originalSource, message));
                },
                _evaluateInitializerName: function () {
                    if (this._current.type === imports.tokenType.identifier) {
                        var initializer = this._evaluateIdentifierExpression();
                        if (WinJS.log && !initializer) {
                            WinJS.log(WinJS.Resources._formatString(strings.bindingInitializerNotFound, this._originalSource), "winjs binding", "error");
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

        BindingParser: WinJS.Namespace._lazy(function () {
            return WinJS.Class.derive(local.BindingInterpreter, function (tokens, originalSource) {
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
        WinJS.Utilities._writeProfilerMark("WinJS.Binding:bindingParser,StartTM");
        var tokens = imports.lexer(text);
        var interpreter = new local.BindingInterpreter(tokens, text, context || {});
        var res = interpreter.run();
        WinJS.Utilities._writeProfilerMark("WinJS.Binding:bindingParser,StopTM");
        return res;
    }

    function parser2(text) {
        WinJS.Utilities._writeProfilerMark("WinJS.Binding:bindingParser,StartTM");
        var tokens = imports.lexer(text);
        var interpreter = new local.BindingParser(tokens, text);
        var res = interpreter.run();
        WinJS.Utilities._writeProfilerMark("WinJS.Binding:bindingParser,StopTM");
        return res;
    }

    WinJS.Namespace.define("WinJS.Binding", {

        _bindingParser: parser,
        _bindingParser2: parser2,

    });

})(this);
