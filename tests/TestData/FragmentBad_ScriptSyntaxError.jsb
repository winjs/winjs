// this file has a JSB extension so webunit /s:*.js doesn't pick it up which can cause IE script error dialogs
// THIS JS CODE HAS INTENTIONAL SYNTAX ERROR: missing '(' in parameter list
function foo elements, options) {
    elements.querySelector(".findme2").innerHTML = "hit";
}