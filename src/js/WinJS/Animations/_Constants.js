// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define([
    'exports',
    '../Core/_Base'
    ], function animationsConstantsInit(exports, _Base) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field locid="WinJS.UI.PageNavigationAnimation" helpKeyword="WinJS.UI.PageNavigationAnimation">
        /// Specifies what animation type should be returned by WinJS.UI.Animation.createPageNavigationAnimations.
        /// </field>
        PageNavigationAnimation: {
            /// <field locid="WinJS.UI.PageNavigationAnimation.turnstile" helpKeyword="WinJS.UI.PageNavigationAnimation.turnstile">
            /// The pages will exit and enter using a turnstile animation.
            /// </field>
            turnstile: "turnstile",
            /// <field locid="WinJS.UI.PageNavigationAnimation.slide" helpKeyword="WinJS.UI.PageNavigationAnimation.slide">
            /// The pages will exit and enter using an animation that slides up/down.
            /// </field>
            slide: "slide",
            /// <field locid="WinJS.UI.PageNavigationAnimation.enterPage" helpKeyword="WinJS.UI.PageNavigationAnimation.enterPage">
            /// The pages will enter using an enterPage animation, and exit with no animation.
            /// </field>
            enterPage: "enterPage",
            /// <field locid="WinJS.UI.PageNavigationAnimation.continuum" helpKeyword="WinJS.UI.PageNavigationAnimation.continuum">
            /// The pages will exit and enter using a continuum animation.
            /// </field>
            continuum: "continuum"
        }
    });

});