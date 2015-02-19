// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
"use strict";

module.exports = {
    localhostAuto: {
        options: {
            port: 9666,
            keepalive: true,
            open: {
                target: 'http://localhost:9666/bin/tests/tests.html?autostart=true'
            },
            hostname: 'localhost'
        }
    },
    localhost: {
        options: {
            port: 9666,
            keepalive: true,
            open: {
                target: 'http://localhost:9666/bin/tests/tests.html'
            },
            hostname: 'localhost'
        }
    },
    saucelabs: {
        options: {
            base: "",
            port: 9999,
            hostname: 'localhost'
        }
    },
    remote: {
        options: {
            port: 9666,
            keepalive: true,
            open: {
                target: 'http://localhost:9666/bin/tests/tests.html'
            },
            hostname: '*'
        }
    }
};