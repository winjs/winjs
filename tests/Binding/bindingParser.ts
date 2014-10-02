// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />


module CorsicaTests {

    "use strict";

    var lexer = WinJS.UI._optionsLexer;
    var parser = WinJS.Binding._bindingParser;
    var tt = lexer.tokenType;
    interface ILexerTest {
        input: string;
        result: any[];
    }
    var lexerTests: ILexerTest[] = [
        {
            input: "a:b c; d:e f",
            result: [tt.identifier, tt.colon, tt.identifier, tt.identifier, tt.semicolon, tt.identifier,
                tt.colon, tt.identifier, tt.identifier]
        },
        {
            input: "a:b c; d:e f;",
            result: [tt.identifier, tt.colon, tt.identifier, tt.identifier, tt.semicolon, tt.identifier,
                tt.colon, tt.identifier, tt.identifier, tt.semicolon]
        },
        {
            input: "a.b.c:d.e.f g.h.i",
            result: [tt.identifier, tt.dot, tt.identifier, tt.dot, tt.identifier, tt.colon, tt.identifier,
                tt.dot, tt.identifier, tt.dot, tt.identifier, tt.identifier, tt.dot, tt.identifier, tt.dot,
                tt.identifier]
        },
        {
            input: "a['foo'].b:c d.c['juice']",
            result: [tt.identifier, tt.leftBracket, tt.stringLiteral, tt.rightBracket, tt.dot, tt.identifier,
                tt.colon, tt.identifier, tt.identifier, tt.dot, tt.identifier, tt.leftBracket, tt.stringLiteral,
                tt.rightBracket]
        },
        {
            input: "a[12].b:c d.c[43]",
            result: [tt.identifier, tt.leftBracket, tt.numberLiteral, tt.rightBracket, tt.dot, tt.identifier,
                tt.colon, tt.identifier, tt.identifier, tt.dot, tt.identifier, tt.leftBracket, tt.numberLiteral,
                tt.rightBracket]
        }
    ];

    // Used by the lexer tests so that you don't have to write separator and eof tokens in the exepected output
    var removeSeparatorsAndEof = function removeSeparatorsAndEof(tokens) {
        for (var i = 0; i < tokens.length; i++) {
            if (tokens[i].type === tt.separator) {
                tokens.splice(i, 1);
                i--;
            }
        }
        if (tokens[tokens.length - 1].type === tt.eof) {
            tokens.splice(tokens.length - 1, 1);
        }
    };

    // Used by one of the parser tests
    //
    window['TestGlobal'] = 12;

    interface IParserTest {
        name: string;
        input: string;
        result?: any[];
        context?: any;
        error?: string;
    }

    var parserTests: IParserTest[] = [
        {
            name: "thisAlone",
            input: "this:this c",
            result: [{ destination: [], source: [], initializer: 1 }],
            context: { c: 1 }
        },
        {
            name: "thisDotted",
            input: "this.a:this.b c",
            result: [{ destination: ["a"], source: ["b"], initializer: 1 }],
            context: { c: 1 }
        },
        {
            name: "simple",
            input: "a:b c",
            result: [{ destination: ["a"], source: ["b"], initializer: 1 }],
            context: { c: 1 }
        },
        {
            name: "simpleWithTrailingSemicolon",
            input: "a:b c;",
            result: [{ destination: ["a"], source: ["b"], initializer: 1 }],
            context: { c: 1 }
        },
        {
            name: "lotsOfDots",
            input: "a.b.c:d.e.f g.h.i",
            result: [{ destination: ["a", "b", "c"], source: ["d", "e", "f"], initializer: 1 }],
            context: { g: { h: { i: 1 } } }
        },
        {
            name: "multipleBindings",
            input: "a:b c; d:e f;",
            result: [
                { destination: ["a"], source: ["b"], initializer: 1 },
                { destination: ["d"], source: ["e"], initializer: 2 }
            ],
            context: { c: 1, f: 2 }
        },
        {
            name: "multipleBindingsNoTrailingSemicolon",
            input: "a:b c; d:e f",
            result: [
                { destination: ["a"], source: ["b"], initializer: 1 },
                { destination: ["d"], source: ["e"], initializer: 2 }
            ],
            context: { c: 1, f: 2 }
        },
        {
            name: "multipleBindingsWithoutInitializers",
            input: "a:b; d:e;",
            result: [
                { destination: ["a"], source: ["b"] },
                { destination: ["d"], source: ["e"] }
            ],
            context: { c: 1, f: 2 }
        },
        {
            name: "multipleBindingsWithSomeInitializers",
            input: "a:b; d:e f;",
            result: [
                { destination: ["a"], source: ["b"] },
                { destination: ["d"], source: ["e"], initializer: 2 }
            ],
            context: { f: 2 }
        },
        {
            name: "multipleBindingsWithSomeInitializers2",
            input: "textContent:b; innerHtml:e f;",
            result: [
                { destination: ["textContent"], source: ["b"] },
                { destination: ["innerHtml"], source: ["e"], initializer: 2 }
            ],
            context: { f: 2 }
        },
        {
            name: "bindingWithStringLiterals",
            input: "foo['bar'].baz:a.b['c']",
            result: [
                { destination: ["foo", "bar", "baz"], source: ["a", "b", "c"] }
            ]
        },
        {
            name: "bindingWithStringLiteralsDoubleQuotes",
            input: 'foo["bar"].baz:a.b["c"]',
            result: [
                { destination: ["foo", "bar", "baz"], source: ["a", "b", "c"] }
            ]
        },
        {
            name: "bindingWithNumberLiterals",
            input: 'foo[1].baz:a.b[3]',
            result: [
                { destination: ["foo", 1, "baz"], source: ["a", "b", 3] }
            ]
        },
        {
            name: "bindingWithStringLiteralsWithSpaces",
            input: 'foo["for bar baz"].baz:a.b[3]',
            result: [
                { destination: ["foo", "for bar baz", "baz"], source: ["a", "b", 3] }
            ]
        },
        {
            name: "multipleBindingsWithStringLiterals",
            input: 'foo["for bar baz"].baz:a.b[3]; a["b"]["c"].d:e.f["g"].h["j"]',
            result: [
                { destination: ["foo", "for bar baz", "baz"], source: ["a", "b", 3] },
                { destination: ["a", "b", "c", "d"], source: ["e", "f", "g", "h", "j"] }
            ]
        },
        {
            name: "lookupInitializerInArray",
            input: 'a:b c[2]',
            result: [
                { destination: ["a"], source: ["b"], initializer: 12 }
            ],
            context: { c: [10, 11, 12] }
        },
        {
            name: "errorBinding1",
            input: "textContent:b:c",
            error: "Invalid binding:'textContent:b:c'. Expected to be '<destProp>:<sourceProp>;'. Unexpected token: colon, expected one of: identifier, semicolon, eof, at offset 13"
        },
        {
            name: "errorBinding2",
            input: "textContent:b c: innerHtml: d e",
            error: "Invalid binding:'textContent:b c: innerHtml: d e'. Expected to be '<destProp>:<sourceProp>;'. Unexpected token: colon, expected one of: identifier, semicolon, eof, at offset 14",
            context: { c: 1, e: 3 }
        },
        {
            name: "errorBindingStartingWithStringLiteral",
            input: "['foo'].bar:baz",
            error: "Invalid binding:'['foo'].bar:baz'. Expected to be '<destProp>:<sourceProp>;'. Unexpected token: leftBracket, expected one of: identifier, semicolon, eof, at offset 0"
        },
        {
            name: "errorBindingWithArrayLiteral",
            input: "foo[[1, 2, 3]]:baz",
            error: "Invalid binding:'foo[[1, 2, 3]]:baz'. Expected to be '<destProp>:<sourceProp>;'. Unexpected token: leftBracket, expected one of: stringLiteral, numberLiteral, at offset 4"
        },
        {
            name: "testingReservedWords",
            input: 'a.else:b.if.while.eval c.for.foreach',
            result: [
                { destination: ["a", "else"], source: ["b", "if", "while", "eval"], initializer: 12 }
            ],
            context: { c: { for: { foreach: 12 } } }
        }
    ];

    export class BindingParser { }



    lexerTests.forEach(function (test, i) {
        var name = "testLexer" + i;
        BindingParser.prototype[name] = function () {
            var input = test.input;
            var result = test.result;
            // We use the same lexer as the options lexer. It needs to support ';' for this usage.
            var tokens = lexer(input);
            removeSeparatorsAndEof(tokens);
            var types = [];
            tokens.forEach(function (token) { types.push(token.type); });
            LiveUnit.Assert.areEqual(result.length, types.length);
            for (var j = 0, len = result.length; j < len; j++) {
                LiveUnit.Assert.areEqual(result[j], types[j]);
            }
        };
    });

    parserTests.forEach(function (test, i) {
        var name = "testParser" + i;
        if (test.name) {
            name += "_" + test.name;
        }
        BindingParser.prototype[name] = function () {
            var input = test.input;
            var result = test.result;
            var jsonResult = JSON.stringify(result);
            try {
                var options = parser(input, test.context);
                var jsonOptions = JSON.stringify(options);
                LiveUnit.Assert.areEqual(jsonResult, jsonOptions);
            } catch (e) {
                if (test.error) {
                    LiveUnit.Assert.areEqual(test.error, e.message);
                } else {
                    throw e;
                }
            }
        };
    });

};
LiveUnit.registerTestClass("CorsicaTests.BindingParser");