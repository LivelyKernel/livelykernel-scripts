/*global exports, require, JSON*/

// continously run with:
// nodemon --exec qunit --code ./minimal_server/serve.js --tests ./minimal_server/serve_test.js

console.log(__dirname);

var TestHandler = require('./serve').TestHandler,
    testSuite = {};
/*
 * requesting test run
 */
var handler, request, spawn, browserInterface;
testSuite.RequestHandlerTest = {

    setUp: function(run) {
        browserInterface = {
            urls: [],
            open: function(url) { this.urls.push(url) }
        };
        handler = new TestHandler(browserInterface);
        request = {
            body: {testWorldPath: 'foo/bar.xhtml'},
            headers: {host: 'localhost:9001'}
        };
        run();
    },

    tearDown: function(run) { TestHandler.resetTestData(); run(); },

    "should construct test url for browser": function(test) {
        var url = handler.urlForBrowser(request);
        test.equal(url, 'http://localhost:9001/foo/bar.xhtml?testRunId=1', url);
        test.done();
    },

    "should construct test url for loading script": function(test) {
        request.body.loadScript = "run_tests.js";
        var url = handler.urlForBrowser(request);
        test.equal(url, 'http://localhost:9001/foo/bar.xhtml?testRunId=1&loadScript=run_tests.js');
        test.done();
    },

    "should open browser": function(test) {
        var result = handler.handleTestRequest(request),
            expectedURL = 'http://localhost:9001/foo/bar.xhtml?testRunId=1',
            expectedData = {
                result: 'browser started with ' + expectedURL,
                testRunId: 1
            };
        test.deepEqual(browserInterface.urls, [expectedURL], browserInterface.urls);
        test.deepEqual(result, expectedData, result);
        test.done();
    },

    "should not open browser on invalid request": function(test) {
        request.body = {};
        test.throws(function() { handler.handleTestRequest(request) }, 'no error raised');
        test.equal(browserInterface.urls.length, 0, 'browser open was called');
        test.done();
    }
}

/*
 * posting test run status, results
 */
var reportRequest;
testSuite.StatusHandlerTest = {

    setUp: function(run) {
        browserInterface = {
            closeIds: [],
            closeBrowser: function(testRunId) { this.closeIds.push(testRunId) }
        };
        handler = new TestHandler(browserInterface);
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

    "should close browser on result request": function(test) {
        handler.handleResultRequest(request);
        test.deepEqual(browserInterface.closeIds, [1], 'browser not closed');
        test.done();
    }
}

exports.testSuite = testSuite;