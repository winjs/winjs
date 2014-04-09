phantom.casperPath = "./CasperJs";
phantom.injectJs(phantom.casperPath + "/bin/bootstrap.js");

var casper = require("casper").create({
    viewportSize: {
        width: 800,
        height: 600
    }
});

var phantomcss = require("./PhantomCSS/phantomcss.js");
var url = "http://www.google.com";

phantomcss.init({
    screenshotRoot: "./screenshots",
    failedComparisonsRoot: "./failures"
});

casper.start(url)
.then(function() {
    phantomcss.screenshot("body", "test-page");
})
.then(function() {
    phantomcss.compareAll();
})
.run(function() {
    phantom.exit(phantomcss.getExitStatus());
});

phantom.exit();