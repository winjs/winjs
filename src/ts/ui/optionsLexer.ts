// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function optionsLexerInit(global) {
    "use strict";

    /*

Lexical grammar is defined in ECMA-262-5, section 7.

Lexical productions used in this grammar defined in ECMA-262-5:

Production          Section
--------------------------------
Identifier          7.6
NullLiteral         7.8.1
BooleanLiteral      7.8.2
NumberLiteral       7.8.3
StringLiteral       7.8.4

*/

    WinJS.Namespace.define("WinJS.UI", {
        _optionsLexer: WinJS.Namespace._lazy(function () {

            var tokenType = {
                leftBrace: 1,           // {
                rightBrace: 2,          // }
                leftBracket: 3,         // [
                rightBracket: 4,        // ]
                separator: 5,           // ECMA-262-5, 7.2
                colon: 6,               // :
                semicolon: 7,           // ;
                comma: 8,               // ,
                dot: 9,                 // .
                nullLiteral: 10,        // ECMA-262-5, 7.8.1 (null)
                trueLiteral: 11,        // ECMA-262-5, 7.8.2 (true)
                falseLiteral: 12,       // ECMA-262-5, 7.8.2 (false)
                numberLiteral: 13,      // ECMA-262-5, 7.8.3
                stringLiteral: 14,      // ECMA-262-5, 7.8.4
                identifier: 15,         // ECMA-262-5, 7.6
                reservedWord: 16,
                thisKeyword: 17,
                leftParentheses: 18,    // (
                rightParentheses: 19,   // )
                eof: 20,
                error: 21
            };
            // debugging - this costs something like 20%
            //
            //Object.keys(tokenType).forEach(function (key) {
            //    tokenType[key] = key.toString();
            //});
            var tokens = {
                leftBrace: { type: tokenType.leftBrace, length: 1 },
                rightBrace: { type: tokenType.rightBrace, length: 1 },
                leftBracket: { type: tokenType.leftBracket, length: 1 },
                rightBracket: { type: tokenType.rightBracket, length: 1 },
                colon: { type: tokenType.colon, length: 1 },
                semicolon: { type: tokenType.semicolon, length: 1 },
                comma: { type: tokenType.comma, length: 1 },
                dot: { type: tokenType.dot, length: 1 },
                nullLiteral: { type: tokenType.nullLiteral, length: 4, value: null, keyword: true },
                trueLiteral: { type: tokenType.trueLiteral, length: 4, value: true, keyword: true },
                falseLiteral: { type: tokenType.falseLiteral, length: 5, value: false, keyword: true },
                thisKeyword: { type: tokenType.thisKeyword, length: 4, value: "this", keyword: true },
                leftParentheses: { type: tokenType.leftParentheses, length: 1 },
                rightParentheses: { type: tokenType.rightParentheses, length: 1 },
                eof: { type: tokenType.eof, length: 0 }
            };

            function reservedWord(word) {
                return { type: tokenType.reservedWord, value: word, length: word.length, keyword: true };
            }
            function reservedWordLookup(identifier) {
                // Moving from a simple object literal lookup for reserved words to this
                // switch was worth a non-trivial performance increase (5-7%) as this path
                // gets taken for any identifier.
                //
                switch (identifier.charCodeAt(0)) {
                    case /*b*/98:
                        switch (identifier) {
                            case 'break':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*c*/99:
                        switch (identifier) {
                            case 'case':
                            case 'catch':
                            case 'class':
                            case 'const':
                            case 'continue':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*d*/100:
                        switch (identifier) {
                            case 'debugger':
                            case 'default':
                            case 'delete':
                            case 'do':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*e*/101:
                        switch (identifier) {
                            case 'else':
                            case 'enum':
                            case 'export':
                            case 'extends':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*f*/102:
                        switch (identifier) {
                            case 'false':
                                return tokens.falseLiteral;

                            case 'finally':
                            case 'for':
                            case 'function':
                                return reservedWord(identifier);
                        }

                        break;
                    case /*i*/105:
                        switch (identifier) {
                            case 'if':
                            case 'import':
                            case 'in':
                            case 'instanceof':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*n*/110:
                        switch (identifier) {
                            case 'null':
                                return tokens.nullLiteral;

                            case 'new':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*r*/114:
                        switch (identifier) {
                            case 'return':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*s*/115:
                        switch (identifier) {
                            case 'super':
                            case 'switch':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*t*/116:
                        switch (identifier) {
                            case 'true':
                                return tokens.trueLiteral;

                            case 'this':
                                return tokens.thisKeyword;

                            case 'throw':
                            case 'try':
                            case 'typeof':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*v*/118:
                        switch (identifier) {
                            case 'var':
                            case 'void':
                                return reservedWord(identifier);
                        }
                        break;

                    case /*w*/119:
                        switch (identifier) {
                            case 'while':
                            case 'with':
                                return reservedWord(identifier);
                        }
                        break;
                }
                return;
            }

            var lexer:any = (function () {
                function isIdentifierStartCharacter(code, text, offset, limit) {
                    // The ES5 spec decalares that identifiers consist of a bunch of unicode classes, without
                    // WinRT support for determining unicode class membership we are looking at 2500+ lines of
                    // javascript code to encode the relevant class tables. Instead we look for everything
                    // which is legal and < 0x7f, we exclude whitespace and line terminators, and then accept
                    // everything > 0x7f.
                    //
                    // Here's the ES5 production:
                    //
                    //  Lu | Ll | Lt | Lm | Lo | Nl
                    //  $
                    //  _
                    //  \ UnicodeEscapeSequence
                    //
                    switch (code) {
                        case (code >= /*a*/97 && code <= /*z*/122) && code:
                        case (code >= /*A*/65 && code <= /*Z*/90) && code:
                        case /*$*/36:
                        case /*_*/95:
                            return true;

                        case isWhitespace(code) && code:
                        case isLineTerminator(code) && code:
                            return false;

                        case (code > 0x7f) && code:
                            return true;

                        case /*\*/92:
                            if (offset + 4 < limit) {
                                if (text.charCodeAt(offset) === /*u*/117 &&
                                    isHexDigit(text.charCodeAt(offset + 1)) &&
                                    isHexDigit(text.charCodeAt(offset + 2)) &&
                                    isHexDigit(text.charCodeAt(offset + 3)) &&
                                    isHexDigit(text.charCodeAt(offset + 4))) {
                                    return true;
                                }
                            }
                            return false;

                        default:
                            return false;
                    }
                }
                /*
        // Hand-inlined into readIdentifierPart
        function isIdentifierPartCharacter(code) {
        // See comment in isIdentifierStartCharacter.
        //
        // Mn | Mc | Nd | Pc
        // <ZWNJ> | <ZWJ>
        //
        switch (code) {
        case isIdentifierStartCharacter(code) && code:
        case isDecimalDigit(code) && code:
        return true;
        
        default:
        return false;
        }
        }
        */
                function readIdentifierPart(text, offset, limit) {
                    var hasEscape = false;
                    while (offset < limit) {
                        var code = text.charCodeAt(offset);
                        switch (code) {
                            //case isIdentifierStartCharacter(code) && code:
                            case (code >= /*a*/97 && code <= /*z*/122) && code:
                            case (code >= /*A*/65 && code <= /*Z*/90) && code:
                            case /*$*/36:
                            case /*_*/95:
                                break;

                            case isWhitespace(code) && code:
                            case isLineTerminator(code) && code:
                                return hasEscape ? -offset : offset;

                            case (code > 0x7f) && code:
                                break;

                                //case isDecimalDigit(code) && code:
                            case (code >= /*0*/48 && code <= /*9*/57) && code:
                                break;

                            case /*\*/92:
                                if (offset + 5 < limit) {
                                    if (text.charCodeAt(offset + 1) === /*u*/117 &&
                                        isHexDigit(text.charCodeAt(offset + 2)) &&
                                        isHexDigit(text.charCodeAt(offset + 3)) &&
                                        isHexDigit(text.charCodeAt(offset + 4)) &&
                                        isHexDigit(text.charCodeAt(offset + 5))) {
                                        offset += 5;
                                        hasEscape = true;
                                        break;
                                    }
                                }
                                return hasEscape ? -offset : offset;

                            default:
                                return hasEscape ? -offset : offset;
                        }
                        offset++;
                    }
                    return hasEscape ? -offset : offset;
                }
                function readIdentifierToken(text, offset, limit):any {
                    var startOffset = offset;
                    offset = readIdentifierPart(text, offset, limit);
                    var hasEscape = false;
                    if (offset < 0) {
                        offset = -offset;
                        hasEscape = true;
                    }
                    var identifier = text.substr(startOffset, offset - startOffset);
                    if (hasEscape) {
                        identifier = "" + JSON.parse('"' + identifier + '"');
                    }
                    var wordToken = reservedWordLookup(identifier);
                    if (wordToken) {
                        return wordToken;
                    }
                    return {
                        type: tokenType.identifier,
                        length: offset - startOffset,
                        value: identifier
                    };
                }
                function isHexDigit(code) {
                    switch (code) {
                        case (code >= /*0*/48 && code <= /*9*/57) && code:
                        case (code >= /*a*/97 && code <= /*f*/102) && code:
                        case (code >= /*A*/65 && code <= /*F*/70) && code:
                            return true;

                        default:
                            return false;
                    }
                }
                function readHexIntegerLiteral(text, offset, limit) {
                    while (offset < limit && isHexDigit(text.charCodeAt(offset))) {
                        offset++;
                    }
                    return offset;
                }
                function isDecimalDigit(code) {
                    switch (code) {
                        case (code >= /*0*/48 && code <= /*9*/57) && code:
                            return true;

                        default:
                            return false;
                    }
                }
                function readDecimalDigits(text, offset, limit) {
                    while (offset < limit && isDecimalDigit(text.charCodeAt(offset))) {
                        offset++;
                    }
                    return offset;
                }
                function readDecimalLiteral(text, offset, limit) {
                    offset = readDecimalDigits(text, offset, limit);
                    if (offset < limit && text.charCodeAt(offset) === /*.*/46 && offset + 1 < limit && isDecimalDigit(text.charCodeAt(offset + 1))) {
                        offset = readDecimalDigits(text, offset + 2, limit);
                    }
                    if (offset < limit) {
                        var code = text.charCodeAt(offset);
                        if (code === /*e*/101 || code === /*E*/69) {
                            var tempOffset = offset + 1;
                            if (tempOffset < limit) {
                                code = text.charCodeAt(tempOffset);
                                if (code === /*+*/43 || code === /*-*/45) {
                                    tempOffset++;
                                }
                                offset = readDecimalDigits(text, tempOffset, limit);
                            }
                        }
                    }
                    return offset;
                }
                function readDecimalLiteralToken(text, start, offset, limit) {
                    var offset = readDecimalLiteral(text, offset, limit);
                    var length = offset - start;
                    return {
                        type: tokenType.numberLiteral,
                        length: length,
                        value: +text.substr(start, length)
                    };
                }
                function isLineTerminator(code) {
                    switch (code) {
                        case 0x000A:    // line feed
                        case 0x000D:    // carriage return
                        case 0x2028:    // line separator
                        case 0x2029:    // paragraph separator
                            return true;

                        default:
                            return false;
                    }
                }
                function readStringLiteralToken(text, offset, limit) {
                    var startOffset = offset;
                    var quoteCharCode = text.charCodeAt(offset);
                    var hasEscape = false;
                    offset++;
                    while (offset < limit && !isLineTerminator(text.charCodeAt(offset))) {
                        if (offset + 1 < limit && text.charCodeAt(offset) === /*\*/92) {
                            hasEscape = true;

                            switch (text.charCodeAt(offset + 1)) {
                                case quoteCharCode:
                                case 0x005C:    // \
                                case 0x000A:    // line feed
                                case 0x2028:    // line separator
                                case 0x2029:    // paragraph separator
                                    offset += 2;
                                    continue;
                                    break;

                                case 0x000D:    // carriage return
                                    if (offset + 2 < limit && text.charCodeAt(offset + 2) === 0x000A) {
                                        // Skip \r\n
                                        offset += 3;
                                    } else {
                                        offset += 2;
                                    }
                                    continue;
                                    break;
                            }
                        }
                        offset++;
                        if (text.charCodeAt(offset - 1) === quoteCharCode) {
                            break;
                        }
                    }
                    var length = offset - startOffset;
                    // If we don't have a terminating quote go through the escape path.
                    hasEscape = hasEscape || length === 1 || text.charCodeAt(offset - 1) !== quoteCharCode;
                    var stringValue;
                    if (hasEscape) {
                        stringValue = eval(text.substr(startOffset, length));
                    } else {
                        stringValue = text.substr(startOffset + 1, length - 2);
                    }
                    return {
                        type: tokenType.stringLiteral,
                        length: length,
                        value: stringValue
                    };
                }
                function isWhitespace(code) {
                    switch (code) {
                        case 0x0009:    // tab
                        case 0x000B:    // vertical tab
                        case 0x000C:    // form feed
                        case 0x0020:    // space
                        case 0x00A0:    // no-breaking space
                        case 0xFEFF:    // BOM
                            return true;

                            // There are no category Zs between 0x00A0 and 0x1680.
                            //
                        case (code < 0x1680) && code:
                            return false;

                            // Unicode category Zs
                            //
                        case 0x1680:
                        case 0x180e:
                        case (code >= 0x2000 && code <= 0x200a) && code:
                        case 0x202f:
                        case 0x205f:
                        case 0x3000:
                            return true;

                        default:
                            return false;
                    }
                }
                // Hand-inlined isWhitespace.
                function readWhitespace(text, offset, limit) {
                    while (offset < limit) {
                        var code = text.charCodeAt(offset);
                        switch (code) {
                            case 0x0009:    // tab
                            case 0x000B:    // vertical tab
                            case 0x000C:    // form feed
                            case 0x0020:    // space
                            case 0x00A0:    // no-breaking space
                            case 0xFEFF:    // BOM
                                break;

                                // There are no category Zs between 0x00A0 and 0x1680.
                                //
                            case (code < 0x1680) && code:
                                return offset;

                                // Unicode category Zs
                                //
                            case 0x1680:
                            case 0x180e:
                            case (code >= 0x2000 && code <= 0x200a) && code:
                            case 0x202f:
                            case 0x205f:
                            case 0x3000:
                                break;

                            default:
                                return offset;
                        }
                        offset++;
                    }
                    return offset;
                }
                function lex(result, text, offset, limit) {
                    while (offset < limit) {
                        var startOffset = offset;
                        var code = text.charCodeAt(offset++);
                        var type = undefined;
                        var token = undefined;
                        switch (code) {
                            case isWhitespace(code) && code:
                            case isLineTerminator(code) && code:
                                offset = readWhitespace(text, offset, limit);
                                token = { type: tokenType.separator, length: offset - startOffset };
                                // don't include whitespace in the token stream.
                                continue;
                                break;

                            case /*"*/34:
                            case /*'*/39:
                                token = readStringLiteralToken(text, offset - 1, limit);
                                break;

                            case /*(*/40:
                                token = tokens.leftParentheses;
                                break;

                            case /*)*/41:
                                token = tokens.rightParentheses;
                                break;

                            case /*+*/43:
                            case /*-*/45:
                                if (offset < limit) {
                                    var afterSign = text.charCodeAt(offset);
                                    if (afterSign === /*.*/46) {
                                        var signOffset = offset + 1;
                                        if (signOffset < limit && isDecimalDigit(text.charCodeAt(signOffset))) {
                                            token = readDecimalLiteralToken(text, startOffset, signOffset, limit);
                                            break;
                                        }
                                    } else if (isDecimalDigit(afterSign)) {
                                        token = readDecimalLiteralToken(text, startOffset, offset, limit);
                                        break;
                                    }
                                }
                                token = { type: tokenType.error, length: offset - startOffset, value: text.substring(startOffset, offset) };
                                break;

                            case /*,*/44:
                                token = tokens.comma;
                                break;

                            case /*.*/46:
                                token = tokens.dot;
                                if (offset < limit && isDecimalDigit(text.charCodeAt(offset))) {
                                    token = readDecimalLiteralToken(text, startOffset, offset, limit);
                                }
                                break;

                            case /*0*/48:
                                var ch2 = (offset < limit ? text.charCodeAt(offset) : 0);
                                if (ch2 === /*x*/120 || ch2 === /*X*/88) {
                                    var hexOffset = readHexIntegerLiteral(text, offset + 1, limit);
                                    token = {
                                        type: tokenType.numberLiteral,
                                        length: hexOffset - startOffset,
                                        value: +text.substr(startOffset, hexOffset - startOffset)
                                    };
                                } else {
                                    token = readDecimalLiteralToken(text, startOffset, offset, limit);
                                }
                                break;

                            case (code >= /*1*/49 && code <= /*9*/57) && code:
                                token = readDecimalLiteralToken(text, startOffset, offset, limit);
                                break;

                            case /*:*/58:
                                token = tokens.colon;
                                break;

                            case /*;*/59:
                                token = tokens.semicolon;
                                break;

                            case /*[*/91:
                                token = tokens.leftBracket;
                                break;

                            case /*]*/93:
                                token = tokens.rightBracket;
                                break;

                            case /*{*/123:
                                token = tokens.leftBrace;
                                break;

                            case /*}*/125:
                                token = tokens.rightBrace;
                                break;

                            default:
                                if (isIdentifierStartCharacter(code, text, offset, limit)) {
                                    token = readIdentifierToken(text, offset - 1, limit);
                                    break;
                                }
                                token = { type: tokenType.error, length: offset - startOffset, value: text.substring(startOffset, offset) };
                                break;
                        }

                        offset += (token.length - 1);
                        result.push(token);
                    }
                }
                return function (text) {
                    var result = [];
                    lex(result, text, 0, text.length);
                    result.push(tokens.eof);
                    return result;
                };
            })();
            lexer.tokenType = tokenType;
            return lexer;
        })
    });
})(this);