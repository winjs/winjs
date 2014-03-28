/*
Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved.

Licensed under the Apache License, Version 2.0.

See License.txt in the project root for license information.
*/

function fragmentWithExternalScriptAndStylesLoad(elements, options) {
    "use strict";
    elements.querySelector(".findme2").innerHTML = "hit";
}

function fragmentWithExternalScriptAndStylesLoadFunc() {
    return 1;
}