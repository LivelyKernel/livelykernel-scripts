/*global escape, require, process, console, setTimeout, JSON, __dirname*/

var express = require('express'),
    spawn = require('child_process').spawn,
    shell = require('./../scripts/helper/shell'),
    defaultBrowser = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    defaultArgs =  ["--no-process-singleton-dialog",
                    "--user-data-dir=/tmp/", "--no-first-run",
                    "--disable-default-apps",
                    //"--no-startup-window",
                    "--disable-history-quick-provider",
                    "--disable-history-url-provider",
                    "--disable-breakpad",
                    "--disable-background-mode",
                    "--disable-background-networking",
                    "--disable-preconnect", "--disabled"];

// start with "nodemon minimal_server/serve.js" for development

var args = process.argv.slice(2),
    port = args[0] && parseInt(args[0], 10),
    lkDir = args[1] || __dirname + '/../';

/*
 * http interface
 */
function setupServer(testHandler) {
    var app = express.createServer();
    app.use(express.logger());
    app.use("/", express["static"](lkDir));
    app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
    app.use(express.bodyParser());

    function postHandler(path, handlerName) {
        app.post(path, function(req, res) {
            var result;
            try {
                result = testHandler[handlerName](req);
            } catch(e) {
                result = {result: String(e), error: true, requestedData: req.body};
            }
            res.send({result: result});
        });
    }

    postHandler('/test-result', 'handleResultRequest');
    postHandler('/test-report', 'handleReportRequest');

    postHandler('/debug-results', 'handleListResultRequest');

    return app;
}


function TestHandler() {}

var currentTestId, testResults;
TestHandler.resetTestData = function() {
    currentTestId = 0;
    testResults = {};
};
TestHandler.resetTestData();

TestHandler.prototype.newId = function() { return ++currentTestId; };

TestHandler.prototype.urlForBrowser = function(req) {
    var host = req.headers.host,
        worldPath = req.body.testWorldPath,
        scriptPath = req.body.loadScript,
        testFilter = req.body.testFilter;
    if (!host || !worldPath) return null;
    var url = "http://" + host + '/' + worldPath + '?testRunId=' + this.newId();
    url += scriptPath ? "&loadScript=" + escape(scriptPath) : '';
    url += testFilter ? "&testFilter=" + escape(testFilter) : '';
    return url;
};

// results

TestHandler.prototype.handleResultRequest = function(req) {
    var id = req.body.testRunId,
        result = req.body.testResults;
    console.log('Getting result for test run ' + id);
    testResults[id] = {testRunId: id, state: 'done', result: result};
    return {result: 'ok', testRunId: id};
};

TestHandler.prototype.handleReportRequest = function(req) {
    var id = req.body.testRunId;
    return testResults[id] || {testRunId: id, state: 'no result'};
};

TestHandler.prototype.handleOpenBrowserRequest = function(req) {
    this.browserInterface.open('htttp://google.com');
    return {result: 'ok'};
};

TestHandler.prototype.handleListResultRequest = function(req) {
    return {result: JSON.stringify(testResults)};
};

/*
 * startup or export
 */
if (port && !isNaN(port)) {
    setupServer(new TestHandler()).listen(port);
} else {
    exports.TestHandler = TestHandler;
}
