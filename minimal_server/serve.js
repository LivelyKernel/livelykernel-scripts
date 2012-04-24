/*global escape, require, process, console, setTimeout, JSON, __dirname*/

var express = require('express'),
    spawn = require('child_process').spawn,
    exec = require('child_process').exec,
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
function setupServer(testHandler, workspaceHandler) {
    var app = express.createServer();
    if (verbose) app.use(express.logger());
    app.use("/", express["static"](lkDir));
    app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
    app.use(express.bodyParser());

    testHandler.registerWith(app);
    workspaceHandler.registerWith(app);

    return app;
}

function getJSONRoute(app, handler, path, method) {
    app.get(path, function (req, res) {
        handler[method](function(json) { res.send(json); });
    });
}

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
 * Handler that provides an interface for inspecting / modifying
 * a local LK workspace
 */
function WorkspaceHandler(modules, lkDir) {
    this.modules = modules;
    this.lkDir = lkDir;
}

WorkspaceHandler.prototype.registerWith = function(app) {
    getJSONRoute(app, this, '/workspace/workspace-dir', 'getLKDir');
    getJSONRoute(app, this, '/workspace/branches', 'getBranches');
    var handler = this;
    app.get('/workspace/log/:ref/:howMany', function(req, res) {
        handler.getLog(req.params.ref, req.params.howMany, function(json) { res.send(json); });
    });
}

WorkspaceHandler.prototype.git = function(cmd, whenDone) {
    this.modules.exec("git " + cmd, {cwd: this.lkDir}, whenDone)
}

// curl localhost:9001/workspace/workspace-dir | prettify_json.rb
WorkspaceHandler.prototype.getLKDir = function(whenDone) {
    whenDone({path: this.lkDir});
}

// curl localhost:9001/workspace/branches | prettify_json.rb
WorkspaceHandler.prototype.getBranches = function(whenDone) {
    this.git("branch -a --color=never", function(code, out, err) {
        if (code) { whenDone({error: code, out: out, err: err}); return }
        var lines = out.split('\n'),
            names = [], current;
        lines.forEach(function(line, i) {
            var match = line.match(/(\*?)\s*(.*)/);
            if (!match) return;
            if (match[1] && match[1].length > 0) current = names.length;
            names.push(match[2]);
        });
        whenDone({names: names, current: current});
    })
}

// curl localhost:9001/workspace/log/HEAD/10 | prettify_json.rb
WorkspaceHandler.prototype.getLog = function(fromRef, howMany, whenDone) {
    var cmd = "log --graph "
            + "--pretty=format:'%h -%d %s (%cr) <%an>' "
            + "--abbrev-commit "
            + "--date=relative "
            + (fromRef || "")
            + (howMany ? " -" + howMany : "");
    this.git(cmd, function(code, out, err) {
        if (code) { whenDone({error: code, out: out, err: err}); return }
        var lines = out.split('\n');
        whenDone({lines: lines});
    })
}




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
    setupServer(new TestHandler(), new WorkspaceHandler({exec: exec}, lkDir)).listen(port);
} else {
    exports.TestHandler = TestHandler;
    exports.WorkspaceHandler = WorkspaceHandler;
}
