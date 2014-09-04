// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />


module CorsicaTests {
    "use strict";

    var lexer = WinJS.UI._optionsLexer;
    var parser = WinJS.UI.optionsParser;
    var tt = lexer.tokenType;
    var parser2 = WinJS.UI._optionsParser;
    var Call = WinJS.UI._CallExpression;
    var ID = WinJS.UI._IdentifierExpression;

    // catch exception message for pseudoloc
    var notExistingString = "Unable to get property 'notExisting' of undefined or null reference";
    try {
        var value;
        var index = "notExisting";
        // value will default to undefined which simulates the lack of context specified on a test
        value[index];
    } catch (e) {
        notExistingString = e.message;
    }

    var lexerTests = [
        {
            input: "{ \r\na: select('abc')}",
            result: [tt.leftBrace, tt.identifier, tt.colon, tt.identifier, tt.leftParentheses, tt.stringLiteral, tt.rightParentheses, tt.rightBrace]
        },
        {
            input: "{ \r\na: 1}",
            result: [tt.leftBrace, tt.identifier, tt.colon, tt.numberLiteral, tt.rightBrace]
        },
        {
            input: "{ \na: 1}",
            result: [tt.leftBrace, tt.identifier, tt.colon, tt.numberLiteral, tt.rightBrace]
        },
        {
            input: "{ \ra: 1}",
            result: [tt.leftBrace, tt.identifier, tt.colon, tt.numberLiteral, tt.rightBrace]
        },
        {
            input: "{ \ta: 1}",
            result: [tt.leftBrace, tt.identifier, tt.colon, tt.numberLiteral, tt.rightBrace]
        },
        {
            input: "{ \t\r\n\ta: 1}",
            result: [tt.leftBrace, tt.identifier, tt.colon, tt.numberLiteral, tt.rightBrace]
        },
        {
            input: "{ a: true, b: null, c: false }",
            result: [tt.leftBrace, tt.identifier, tt.colon, tt.trueLiteral, tt.comma, tt.identifier,
                tt.colon, tt.nullLiteral, tt.comma, tt.identifier, tt.colon, tt.falseLiteral, tt.rightBrace]
        },
        {
            input: "{ a: [1, 2, 3], b: [true, false, null] }",
            result: [tt.leftBrace, tt.identifier, tt.colon, tt.leftBracket, tt.numberLiteral, tt.comma,
                tt.numberLiteral, tt.comma, tt.numberLiteral, tt.rightBracket, tt.comma, tt.identifier,
                tt.colon, tt.leftBracket, tt.trueLiteral, tt.comma, tt.falseLiteral, tt.comma,
                tt.nullLiteral, tt.rightBracket, tt.rightBrace]
        },
        {
            input: "{ a: a[0][1] }",
            result: [tt.leftBrace, tt.identifier, tt.colon, tt.identifier, tt.leftBracket, tt.numberLiteral,
                tt.rightBracket, tt.leftBracket, tt.numberLiteral, tt.rightBracket, tt.rightBrace]
        },
        {
            input: "{ a: 1* }",
            result: [tt.leftBrace, tt.identifier, tt.colon, tt.numberLiteral, tt.error, tt.rightBrace]
        },
        {
            input: "{ \\u0061:1 }",
            result: [tt.leftBrace, tt.identifier, tt.colon, tt.numberLiteral, tt.rightBrace]
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
    declare var TestGlobal: number;

    interface IParserTest {
        input: string;
        result?: any;
        name?: string;
        context?: any;
        error?: string;
        errorSubstrings?: string[];
        errornumber?: number;
        functionContext?: any;
    }


    var parserTests: IParserTest[] = [
        {
            input: "{ a: select('abc')}",
            result: { a: { a: 'a', b: 'b', c: 'abc', record: { field1: 'a field' } } }
        },
        {
            input: "{ a: select('abc').record.field1 }",
            result: { a: 'a field' }
        },
        {
            input: "{ a: 1 }",
            result: { a: 1 }
        },
        {
            name: "unicodeEscapeIdentifier",
            input: "{ \\u0061: 1}",
            result: { a: 1 }
        },
        {
            name: "unicodeEscapeIdentifier2",
            input: "{ \\u0061a: 1}",
            result: { aa: 1 }
        },
        {
            name: "unicodeEscapeIdentifier3",
            input: "{ \\u0061a\\u0062: 1}",
            result: { aab: 1 }
        },
        {
            name: "simpleOptionsRecord",
            input: "{ a: true, b: null, c: false }",
            result: { a: true, b: null, c: false }
        },
        {
            name: "keywordsAsPropertyNames",
            input: "{ this: true, true: null, function: false }",
            result: { this: true, true: null, function: false }
        },
        {
            name: "simpleOptionsRecord2",
            input: "{ a: [1, 2, 3], b: [true, false, null] }",
            result: { a: [1, 2, 3], b: [true, false, null] }
        },
        {
            name: "simpleOptionsRecord3",
            input: "{ a: [1, { b: { c: 'hello' } }, true] }",
            result: { a: [1, { b: { c: 'hello' } }, true] }
        },
        {
            name: "simpleOptionsRecord4",
            input: "{ a: [1, { b: { c: 'hello' } }, true] }",
            result: { a: [1, { b: { c: "hello" } }, true] }
        },
        {
            name: "stringWithEscapedSingleQuote",
            input: "{ a: [1, { b: { c: 'hel\\'lo' } }, true] }",
            result: { a: [1, { b: { c: "hel'lo" } }, true] }
        },
        {
            name: "stringWithEscapedDoubleQuote",
            input: "{ a: [1, { b: { c: 'hel\\\"lo' } }, true] }",
            result: { a: [1, { b: { c: "hel\"lo" } }, true] }
        },
        {
            name: "bindingToContextValue",
            input: "{ a: a }",
            result: { a: 1 },
            context: { a: 1 }
        },
        {
            name: "bindingToGlobal",
            input: "{ a: TestGlobal }",
            result: { a: TestGlobal },
            context: window
        },
        {
            name: "bindingToGlobalInAbsenceOfGlobalContext",
            input: "{ a: TestGlobal }",
            result: { a: undefined },
        },
        {
            name: "bindingToGlobalInAbsenceOfGlobalContext",
            input: "{ a: TestGlobal['notExisting'] }",
            error: notExistingString
        },
        {
            name: "dottedBindingInContext",
            input: "{ a: a.b.c }",
            result: { a: 56 },
            context: { a: { b: { c: 56 } } }
        },
        {
            name: "dottedBindingInContextWithReservedNames",
            input: "{ a: a.this.true }",
            result: { a: 56 },
            context: { a: { this: { true: 56 } } }
        },
        {
            name: "dottedBindingInContextWithMultip;eReservedNames",
            input: "{ a: a.this.true.while.for }",
            result: { a: 56 },
            context: { a: { this: { true: { while: { for: 56 } } } } }
        },
        {
            name: "elementAccessInContext",
            input: "{ a: a[0][1] }",
            result: { a: 84 },
            context: { a: [[12, 84]] }
        },
        {
            name: "elementAccessToObjectInContext",
            input: "{ a: a['b']['c'] }",
            result: { a: 56 },
            context: { a: { b: { c: 56 } } }
        },
        {
            name: "elementAccessAndDottedAccessToObjectInContext",
            input: "{ a: a['b'].c }",
            result: { a: 56 },
            context: { a: { b: { c: 56 } } }
        },
        {
            name: "elementAccessAndDottedAccessEverwhereToObjectInContext",
            input: "{ a: a.b['c'].d[0] }",
            result: { a: 56 },
            context: { a: { b: { c: { d: [56] } } } }
        },
        {
            name: "elementAccessAndDottedAccessEverwhereToObjectInContext",
            input: "{ a: a.b[['c'][0]].d }",
            context: { a: { b: { c: { d: 56 } } } },
            error: "Invalid options record: '{ a: a.b[['c'][0]].d }', expected to be in the format of an object literal. Unexpected token: leftBracket, expected token: rightBracket, at offset 12"
        },
        {
            name: "reservedWords",
            input: "{ a: function }",
            error: "Invalid options record: '{ a: function }', expected to be in the format of an object literal. Unexpected token: reservedWord, expected one of: falseLiteral, nullLiteral, stringLiteral, trueLiteral, numberLiteral, leftBrace, leftBracket, identifier, at offset 3"
        },
        {
            name: "unknownToken",
            input: "{ a: a-b }",
            error: "Invalid options record: '{ a: a-b }', expected to be in the format of an object literal. Unexpected token: '-', expected token: rightBrace, at offset 4"
        },
        {
            input: "{ a: 'a\\\\'b' }",
            errornumber: -2146827273,
            errorSubstrings: ['unterminated string literal', 'Unexpected token ILLEGAL', 'Unexpected EOF' /*Safari*/]
        },
        {
            name: "hexDigits",
            input: "{ a: 0x1234, b: 0x12A, c: thing[0xa] }",
            result: { a: 0x1234, b: 0x12A, c: 200 },
            context: { thing: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200] }
        },
        {
            name: "decimalDigits",
            input: "{ a: 0, b: 123, c: 12.345, d: -34.54, e:.54, f:-.43, g:+341, h:+.2 }",
            result: { a: 0, b: 123, c: 12.345, d: -34.54, e: .54, f: -.43, g: +341, h: +.2 }
        },
        {
            name: "decimalDigitsWithExponents",
            input: "{ a: 0e0, b: 123e12, c: 12.345e-4, d: -34.54e+5, e:.54e-2, f:-.43 }",
            result: { a: 0e0, b: 123e12, c: 12.345e-4, d: -34.54e+5, e: .54e-2, f: -.43 }
        },
        {
            name: "multiLine",
            input: "{ a: 1, b: \
        2, c: 3 }",
            result: { a: 1, b: 2, c: 3 }
        },
        {
            name: "lineContinuationCarriageReturnLineFeed",
            input: "{ a: 1, b: '\\\r\n2', c: 3 }",
            result: { a: 1, b: '2', c: 3 }
        },
        {
            name: "lineContinuationCarriageReturn",
            input: "{ a: 1, b: '\\\r2', c: 3 }",
            result: { a: 1, b: '2', c: 3 }
        },
        {
            name: "lineContinuationLineSeparator",
            input: "{ a: 1, b: '\\\u20282', c: 3 }",
            result: { a: 1, b: '2', c: 3 }
        },
        {
            name: "lineContinuationParagraphSeparator",
            input: "{ a: 1, b: '\\\u20292', c: 3 }",
            result: { a: 1, b: '2', c: 3 }
        },
        {
            name: "nonEscapedCharacter",
            input: "{ a: 1, b: '\\s2', c: 3 }",
            result: { a: 1, b: 's2', c: 3 }
        },
        {
            name: "escapedCharacter",
            input: "{ a: 1, b: '\\x652', c: 3 }",
            result: { a: 1, b: 'e2', c: 3 }
        },
        {
            name: "escapedIdentifier",
            input: "{ 'a': 1 }",
            result: { 'a': 1 }
        },
        {
            name: "escapedIdentifier2",
            input: '{ "a": 1 }',
            result: { "a": 1 }
        },
        {
            name: "escapedIdentifierWithSpace",
            input: "{ 'a b c': 1 }",
            result: { 'a b c': 1 }
        },
        {
            name: "unicodeEscapedCharacter",
            input: "{ a: 1, b: '\\u00652', c: 3 }",
            result: { a: 1, b: 'e2', c: 3 }
        },
        {
            name: "alternativePropertyNames",
            input: "{ 1: 'something', 2: 'else', 'another': 'thing' }",
            result: { 1: 'something', 2: 'else', 'another': 'thing' }
        },
        {
            name: "stringAtRoot",
            input: "'string'",
            result: "string",
        },
        {
            name: "stringAtRoot2",
            input: '"string"',
            result: "string",
        },
        {
            name: "hexNumberAtRoot",
            input: "0x1234",
            result: 0x1234,
        },
        {
            name: "decimalNumberAtRoot",
            input: "1.232e4",
            result: 1.232e4,
        },
        {
            name: "nullAtRoot",
            input: "null",
            result: null,
        },
        {
            name: "trueAtRoot",
            input: "true",
            result: true,
        },
        {
            name: "falseAtRoot",
            input: "false",
            result: false,
        },
        {
            name: "extraDataError",
            input: "false false",
            error: "Invalid options record: 'false false', expected to be in the format of an object literal. Unexpected token: falseLiteral, expected token: eof, at offset 5"
        },
        {
            name: "trailingCommaInObjectLiteral",
            input: "{ a: 1, b: 2, }",
            result: { a: 1, b: 2, }
        },
        {
            name: "trailingCommaInArrayExpression",
            input: "[1, 2, 3, ]",
            result: [1, 2, 3, ]
        },
        {
            name: "leadingCommasInArrayExpression",
            input: "[,,, 1, 2, 3]",
            result: [, , , 1, 2, 3]
        },
        {
            name: "middlingCommasInArrayExpression",
            input: "[1, ,, 2, 3]",
            result: [1, , , 2, 3]
        },
        {
            name: "allSortsOfCommasInArrayExpression",
            input: "[,,1, ,, 2, 3,,]",
            result: [, , 1, , , 2, 3, , , ] // TS eats the last trailing comma https://github.com/Microsoft/TypeScript/issues/614
        },
    ];

    var reservedWords = [
        "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do",
        "else", "enum", "export", "extends", "finally", "for", "function", "if", "import", "in", "instanceof",
        "new", "return", "super", "switch", "throw", "try", "typeof", "var", "void", "while", "with"
    ];



    export class OptionsParser {

        testTokenTypesAreUnique() {
            var types = [];
            Object.keys(tt).forEach(function (type) {
                var index = lexer.tokenType[type];
                LiveUnit.Assert.areEqual(undefined, types[index]);
                types[index] = type;
            });
        }

        // NOTE: this is set to iters = 1 for checkin, we should get a perf harness up and
        //  running and then we can put this there. For now you can set the iters to > 1 
        //  (presumably some large number) and it will start reporting how long it took.
        //
        testPerformance() {
            var context = {
                billingAddress: {
                    street: "One Microsoft Way",
                    city: "Redmond",
                    state: "WA",
                    zip: 98052
                },
                people: [
                    { name: "Josh", age: 33 },
                    { name: "Chris", age: 36 },
                    { name: "Jeff", age: 25 }
                ]
            };

            var options =
                "{ billingAddress: { street: billingAddress.street, city: billingAddress.city, \
state: billingAddress.state, zip: billingAddress.zip }, \
people: [ { name: people[0].name, age: people[0].age }, people[1], \
{ name: people[2].name, age: people[2].age } ] }";

            var result = parser(options, context);
            LiveUnit.Assert.areEqual(JSON.stringify(context), JSON.stringify(result));

            var iters = 1;
            var start = Date.now();
            for (var i = 0; i < iters; i++) {
                parser(options, context);
            }
            var end = Date.now();
            if (iters > 1) {
                alert("Time: " + (end - start));
            }
        }

        // NOTE: this is set to iters = 1 for checkin, we should get a perf harness up and
        //  running and then we can put this there. For now you can set the iters to > 1 
        //  (presumably some large number) and it will start reporting how long it took.
        //
        testPerformance2() {
            var options = "{ a: 1, b: 2, c: 3, d: 4, e: 5 }";

            var result = parser(options);
            LiveUnit.Assert.areEqual(JSON.stringify({ a: 1, b: 2, c: 3, d: 4, e: 5 }), JSON.stringify(result));

            var iters = 1;
            var start = Date.now();
            for (var i = 0; i < iters; i++) {
                parser(options);
            }
            var end = Date.now();
            if (iters > 1) {
                console.log("Time: " + (end - start));
            }
        }



        testReservedWordsAsPropertyValues() {
            reservedWords.forEach(function (word) {
                var hitCatch = false;
                var optionsLiteral = "{ p: " + word + " }";
                try {
                    var result = parser(optionsLiteral);
                } catch (e) {
                    LiveUnit.Assert.areEqual("Invalid options record: '" + optionsLiteral + "', expected to be in the format of an object literal. Unexpected token: reservedWord, expected one of: falseLiteral, nullLiteral, stringLiteral, trueLiteral, numberLiteral, leftBrace, leftBracket, identifier, at offset 3", e.message);
                    hitCatch = true;
                }
                LiveUnit.Assert.isTrue(hitCatch);
            });
        }

        testReservedWordsAsArrayElementValues() {
            reservedWords.forEach(function (word) {
                var hitCatch = false;
                var optionsLiteral = "[" + word + "]";
                try {
                    var result = parser(optionsLiteral);
                } catch (e) {
                    LiveUnit.Assert.areEqual("Invalid options record: '" + optionsLiteral + "', expected to be in the format of an object literal. Unexpected token: reservedWord, expected one of: falseLiteral, nullLiteral, stringLiteral, trueLiteral, numberLiteral, leftBrace, leftBracket, identifier, at offset 1", e.message);
                    hitCatch = true;
                }
                LiveUnit.Assert.isTrue(hitCatch);
            });
        }

        testThisAsPropertyValues() {
            var hitCatch = false;
            var optionsLiteral = "{ p: this }";
            try {
                var result = parser(optionsLiteral);
            } catch (e) {
                LiveUnit.Assert.areEqual("Invalid options record: '" + optionsLiteral + "', expected to be in the format of an object literal. Unexpected token: thisKeyword, expected one of: falseLiteral, nullLiteral, stringLiteral, trueLiteral, numberLiteral, leftBrace, leftBracket, identifier, at offset 3", e.message);
                hitCatch = true;
            }
            LiveUnit.Assert.isTrue(hitCatch);
        }

        testThisAsArrayElementValues() {
            var hitCatch = false;
            var optionsLiteral = "[this]";
            try {
                var result = parser(optionsLiteral);
            } catch (e) {
                LiveUnit.Assert.areEqual("Invalid options record: '" + optionsLiteral + "', expected to be in the format of an object literal. Unexpected token: thisKeyword, expected one of: falseLiteral, nullLiteral, stringLiteral, trueLiteral, numberLiteral, leftBrace, leftBracket, identifier, at offset 1", e.message);
                hitCatch = true;
            }
            LiveUnit.Assert.isTrue(hitCatch);
        }

        testParserContext() {
            window['someVar'] = new String("global");
            var myClass = WinJS.Class.define(
                function () {
                    this._x = 0;
                },
                {
                    x: {
                        get: function () { delete window['someVar']; return this._x; },
                        set: function (v) { this._x = v; }
                    }
                }
                );

            var obj = new myClass();
            LiveUnit.Assert.isTrue(!!window['someVar']);
            var context = { obj: obj };

            var result = parser('{s: obj.x}', context);
            LiveUnit.Assert.isTrue(!window['someVar']);
        }
        testParserGlobalContext() {
            var hit = 0;
            window['someVar'] = new String("global");
            var myClass = WinJS.Class.define(
                function () {
                    this._x = 0;
                },
                {
                    x: {
                        get: function () { delete window['someVar']; return this._x; },
                        set: function (v) { this._x = v; }
                    }
                }
                );

            window['obj'] = new myClass();
            LiveUnit.Assert.isTrue(!!window['someVar']);
            try {
                var result = parser('{s: obj.x}');
            } catch (ex) {
                hit = 1;
            }
            LiveUnit.Assert.isTrue(!!window['someVar']);
            LiveUnit.Assert.areEqual(1, hit, "making sure that an exception is thrown");
        }

    }

    lexerTests.forEach(function (test, i) {
        var name = "testLexer" + i;
        OptionsParser.prototype[name] = function () {
            var input = test.input;
            var result = test.result;
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
        OptionsParser.prototype[name] = function () {
            var input = test.input;
            var result = test.result;
            test.functionContext = {
                select: WinJS.Utilities.markSupportedForProcessing(function (query) {
                    return {
                        a: 'a',
                        b: 'b',
                        c: query,
                        record: {
                            field1: "a field"
                        }
                    };
                })
            };


            var jsonResult = JSON.stringify(result);
            try {
                var options = parser(input, test.context, test.functionContext);
                var jsonOptions = JSON.stringify(options);
                LiveUnit.Assert.areEqual(jsonResult, jsonOptions);
            } catch (e) {
                if (test.error) {
                    LiveUnit.Assert.areEqual(test.error, e.message);
                } else if (test.errornumber && e.number) {
                    LiveUnit.Assert.areEqual(test.errornumber, e.number);
                } else if (test.errorSubstrings) {
                    LiveUnit.Assert.isTrue(test.errorSubstrings.indexOf(e.message) >= 0);
                } else {
                    throw e;
                }
            }
        };
    });



    export class OptionsParser2 {


        testIdentifier() {
            var result = parser2("{ a: something }");
            LiveUnit.Assert.areEqual("object", typeof result);
            LiveUnit.Assert.isTrue(result.a instanceof ID);
            LiveUnit.Assert.areEqual(1, result.a.parts.length);
            LiveUnit.Assert.areEqual("something", result.a.parts[0]);
        }

        testIdentifierExpression() {
            var result = parser2("{ a: a.b.c }");
            LiveUnit.Assert.areEqual("object", typeof result);
            LiveUnit.Assert.isTrue(result.a instanceof ID);
            LiveUnit.Assert.areEqual(3, result.a.parts.length);
            LiveUnit.Assert.areEqual("a", result.a.parts[0]);
            LiveUnit.Assert.areEqual("b", result.a.parts[1]);
            LiveUnit.Assert.areEqual("c", result.a.parts[2]);
        }

        testAccessExpression() {
            var result = parser2("{ a: a.b.c['d and e'] }");
            LiveUnit.Assert.areEqual("object", typeof result);
            LiveUnit.Assert.isTrue(result.a instanceof ID);
            LiveUnit.Assert.areEqual(4, result.a.parts.length);
            LiveUnit.Assert.areEqual("a", result.a.parts[0]);
            LiveUnit.Assert.areEqual("b", result.a.parts[1]);
            LiveUnit.Assert.areEqual("c", result.a.parts[2]);
            LiveUnit.Assert.areEqual("d and e", result.a.parts[3]);
        }

        testSelectExpression() {
            var result = parser2("{ a: select('.some-class') }");
            LiveUnit.Assert.areEqual("object", typeof result);
            LiveUnit.Assert.isTrue(result.a instanceof Call);
            LiveUnit.Assert.areEqual("select", result.a.target);
            LiveUnit.Assert.areEqual(".some-class", result.a.arg0Value);
        }

        testSelectExpressionWithAccessExpression() {
            var result = parser2("{ a: select('.some-class').a['another'] }");
            LiveUnit.Assert.areEqual("object", typeof result);
            LiveUnit.Assert.isTrue(result.a instanceof ID);
            LiveUnit.Assert.isTrue(result.a.parts[0] instanceof Call);
            LiveUnit.Assert.areEqual("select", result.a.parts[0].target);
            LiveUnit.Assert.areEqual(".some-class", result.a.parts[0].arg0Value);
            LiveUnit.Assert.areEqual("a", result.a.parts[1]);
            LiveUnit.Assert.areEqual("another", result.a.parts[2]);
        }

    };
}

LiveUnit.registerTestClass("CorsicaTests.OptionsParser");
LiveUnit.registerTestClass("CorsicaTests.OptionsParser2");