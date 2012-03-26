/*global require, console, process, JSON, setTimeout*/
var http     = require('http'),
    colorize = require('colorize'),
    config   = require('./config'),
    optparse = require('optparse'),
    spawn    = require('child_process').spawn;


////////////////////////////////////////////////////////
// Parse the command line options and merge them with //
// config settings                                    //
////////////////////////////////////////////////////////

// for option parser help see https://github.com/jfd/optparse-js
var platformConf = config.platformConfigs[process.platform],
    supportedBrowsers = Object.keys(platformConf),
    defaultBrowser = '"' + config.defaultBrowser + '"',
    switches = [
        ['-h', '--help', "Shows this help section."],
        ['-v', '--verbose', "Print progress and debug information."],
        ['-b', '--browser NAME', "Which browser to use. Options are \""
                               + supportedBrowsers.join('", "')
                               + "\". If not specified then "
                               + defaultBrowser + " is used."],
        ['-s', '--server NAME[:PORT]', "server on which Lively Kernel is located. This option overrides config.server."];
    parser = new optparse.OptionParser(switches);


// Internal variable to store options.
var options = {
    server: config.server,
    port: config.port,
    browserName: config.defaultBrowser,
    browserConf: platformConf[config.defaultBrowser],
    notifier: null,
    testScript: config.testScript,
    testWorld: config.testWorld,
    verbose: false,
    maxRequests: config.timeout,
    testFilter: null,
    display: null
};

parser.on("help", function() {
    console.log(parser.toString());
    process.exit(0);
});

parser.on("verbose", function() { options.verbose = true; });

parser.on("browser", function(name, value) {
    console.assert(supportedBrowsers.indexOf(value) >= 0,
                  "Unsupported browser: " + value);
    options.browserName = value;
    options.browserConf = platformConf[value];
});

parser.on("server", function(name, value) {
    var tokens = value.split(':');
    options.server = tokens[0];
    options.port = tokens[1] || config.port;
});

parser.parse(process.argv);

function log(msg) {
    if (options.verbose) console.log(msg);
}

log(options);


///////////////////////////////////////////////////////////
// Define functions for server interaction and reporting //
///////////////////////////////////////////////////////////

function post(path, data, callback) {
    var postOptions = {
        host: options.server,
        port: options.port,
        path: path,
        method: 'POST',
        headers: {'Content-Type':  'application/json'}
    };

    var req = http.request(postOptions, function(res) {
        var data;
        log('STATUS: ' + res.statusCode);
        log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            log('BODY: ' + chunk);
            data += chunk;
        });
        res.on('end', function() {
            var body = JSON.parse(data);
            if (callback) callback(body && body.result);
        });
    });

    req.on('error', function(e) {
        log('problem with request: ' + e.message);
    });

    req.write(JSON.stringify(data));
    req.end();
}

function printResult(testRunId, data) {
    console.log('\n=== test result for test run %s in %s ===',
                testRunId, options.browserName);
    console.log('\nexecution time per test case:');
    data.runtimes.forEach(function(ea) {
       console.log(ea.time + '\t' + ea.module);
    });
    console.log('\n');
    console.log('tests run: ' + data.runs);
    if (data.fails > 0) {
        console.log(colorize.ansify('#red[FAILED]'));
        data.messages.forEach(function(ea) { console.log(ea); });
        console.log(colorize.ansify('#red[' + data.messages.length + ' FAILED]'));
    } else {
        console.log(colorize.ansify('#green[PASSED]'));
    }
}

function notifyResult(testRunId, data) {
    if (!options.notifier) return;
    var msg = (data.fails ? "FAILURE" : 'SUCCCESS') + "\n"
            + data.runs + " tests run, " + data.fails + " failures"
            + "\n" + data.failedTestNames.join("\n");
    spawn(options.notifier, ["--message", msg,
                             "--identifier", "LivelyCoreTests" + options.testScript,
                             "--image", "core/media/lively_logo.png"]);
}

// poll
var maxRequests = options.maxRequests, currentRequests = 0;

function tryToGetReport(data) {
    if (currentRequests >= maxRequests) {
        console.log(colorize.ansify('#red[TIMEOUT]'));
        return;
    }
    if (data.state !== 'done') {
        process.stdout.write('.');
        currentRequests++;
        setTimeout(function() {
            post('/test-report', {testRunId: data.testRunId}, tryToGetReport);
        }, 1000);
        return;
    }
    var result = JSON.parse(data.result);
    printResult(data.testRunId, result);
    notifyResult(data.testRunId, result);
    process.exit(result.fails ? 1 : 0);
}

function startTests() {
    post('/test-request', {
        browser: options.browserConf.path,
        browserArgs: options.browserConf.args,
        display: options.display,
        testWorldPath: options.testWorld,
        loadScript: options.testScript,
        testFilter: options.testFilter
    }, tryToGetReport);
}

startTests();
