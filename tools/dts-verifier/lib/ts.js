// This module monkey patches the TypeScript module with some convenient functions
// and re-exports the same module

var TypeScript = require('./typescript')

module.exports = TypeScript

TypeScript.parse = function(text) {
    var fancyText = TypeScript.SimpleText.fromString(text)

    var allowSemicolonInsertion = true
    var allowModuleKeyword = true
    var options = new TypeScript.ParseOptions(
        TypeScript.LanguageVersion.EcmaScript5,
        allowSemicolonInsertion,
        allowModuleKeyword)

    var isDecl = true
    var syntaxTree = TypeScript.Parser.parse('', fancyText, isDecl, options)

    var lineMap = TypeScript.LineMap.fromString(text)
    var compilationSettings = new TypeScript.CompilationSettings()
    var visitor = new TypeScript.SyntaxTreeToAstVisitor('', lineMap, compilationSettings)
    var ast = syntaxTree.sourceUnit().accept(visitor)

    ast.lineMap = lineMap

    return ast
}

if (require.main === module) {
    var fs = require('fs')
    var text = fs.readFileSync(process.argv[2], 'utf8')
    var ast = TypeScript.parse(text)

    var indentStr = ''
    function onEnter(node, parent) {
        var info = ''
        if (node instanceof TypeScript.Identifier)
            info = node.text()
        if (node instanceof TypeScript.FunctionDeclaration) {
            info = 'isConstructor = ' + node.isConstructor + '; isConstructMember() = ' + node.isConstructMember();
        }
        console.log(indentStr + node.constructor.name + ' ' + info)
        indentStr += '  '
    }
    function onExit(node, parent) {
        indentStr = indentStr.substring(2)
    }

    TypeScript.getAstWalkerFactory().walk(ast, onEnter, onExit)
}