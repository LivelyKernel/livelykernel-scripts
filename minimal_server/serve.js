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

/*
 * start with
 * nodemon minimal_server/serve.js 9001 $LIVELY --verbose
 * for development
 */

var args = process.argv.slice(2),
    port = args[0] && parseInt(args[0], 10),
    lkDir = args[1],
    verbose = args.indexOf('--verbose') >= 0 || args.indexOf('-v') >= 0;

/*
 * http interface
 */
function setupServer(testHandler) {
    var app = express.createServer();
    if (verbose) app.use(express.logger());
    app.use("/", express["static"](lkDir));
    app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
    app.use(express.bodyParser());

    testHandler.registerWith(app);

    return app;
}

// function getJSONRoute(app, handler, path, method) {
//     app.get(path, function (req, res) {
//         handler[method](function(json) { res.send(json); });
//     });
// }

/*
 * Controller that process result responses from LK client
 */
function TestHandler() {}

var testResults;
(TestHandler.resetTestData = function() {
    testResults = {};
})();

TestHandler.prototype.registerWith = function(app) {
    var handler = this;
    app.post('/test-result/:id', function(req, res) {
        var id = req.params.id,
            result = req.body.testResults;
        try {
            result = handler.postResult(id, result);
        } catch(e) {
            result = {result: String(e), error: true, requestedData: req.body};
        }
        res.send({result: result});
    });

    app.get('/test-result/:id', function(req, res) {
        res.send(handler.getResult(req.params.id));
    });

    app.get('/test-result', function (req, res) {
        res.send(handler.listResults());
    });
}

// results
TestHandler.prototype.postResult = function(id, result) {
    console.log('Getting result for test run ' + id);
    testResults[id] = {testRunId: id, state: 'done', result: result};
    return {result: 'ok', testRunId: id};
};

TestHandler.prototype.getResult = function(id) {
    return testResults[id] || {testRunId: id, state: 'no result'};
};

TestHandler.prototype.listResults = function(req) {
    return {result: JSON.stringify(testResults)};
};

/*
 * startup or export
 */
if (require.main === module) {
    if (!lkDir) {
        throw new Error('Cannot start server without LK core directory '
                       + 'for serving files from!');
    }
    if (port && isNaN(port)) {
        throw new Error('port must be a number');
    }
    setupServer(new TestHandler()).listen(port);
} else {
    exports.TestHandler = TestHandler;
}
