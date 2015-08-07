// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

    module.exports = {
        // Publishes NuGet packages
        
        // Requires NuGet API key to be set. You can do this with:
        //   grunt nugetkey --key=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
        
        nugetpushWinJs: {
            publish: {
                src: config.winjsPublishRoot + '*.nupkg',
            }
        },
        
        nugetpushLocalization: {
            publish: {
                src: config.localizationPublishRoot + '*.nupkg',
            }
        }
    };
})();