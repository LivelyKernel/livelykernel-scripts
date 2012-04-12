/*global exports, require, JSON*/

// continously run with:
// nodemon --exec qunit --code ./minimal_server/serve.js --tests ./minimal_server/serve_test.js

console.log(__dirname);

var TestHandler = require('./serve').TestHandler,
    testSuite = {};
/*
 * requesting test run
 */
var handler, request, spawn;

/*
 * posting test run status, results
 */
var reportRequest;
testSuite.StatusHandlerTest = {

    setUp: function(run) {
        handler = new TestHandler();
        request = {
            body: {testRunId: 1, testResults: "all ok"}
        };
        reportRequest = {
            body: {testRunId: 1}
        };
        run();
    },

    tearDown: function(run) { TestHandler.resetTestData(); run(); },

    "handle result and report request": function(test) {
        var result = handler.handleResultRequest(request);
        test.deepEqual(result, {result: 'ok', testRunId: 1}, 'result');
        var report = handler.handleReportRequest(reportRequest);
        test.deepEqual(report, {testRunId: 1, state: 'done', result: "all ok"}, JSON.stringify(report));
        test.done();
    },
}

exports.testSuite = testSuite;
