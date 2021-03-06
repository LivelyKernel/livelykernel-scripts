/*global require, process, console*/
var args = require('./helper/args'),
    spawn = require('child_process').spawn,
    path = require('path'),
    async = require('async'),
    env = require("./env");

if (!lkDevDependencyExist(env.NODEUNIT)) process.exit(1);

// -=-=-=-=-=-=-=-=-=-=-
// script options
// -=-=-=-=-=-=-=-=-=-=-

var options = args.options([
        ['-h', '--help', 'show this help']], {},
        "lk selftest: Run the script and server tests.");

function nodeunit(target) {
    return function(callback) {
        var proc = spawn(env.NODE_BIN,
              [env.NODEUNIT, target],
              {stdio: 'inherit', cwd: env.LK_SCRIPTS_ROOT});
        proc.on('exit', callback);
    }
}

env.LK_SCRIPT_TEST_RUN = "1";

// -=-=-=-=-=-=-=-=-=-=-
// run tests with quint
// -=-=-=-=-=-=-=-=-=-=-
// filter output?
// like `lk selftest | grep "assert\|js"`
async.series([
    nodeunit('scripts/ww-diff/diffReporterTest.js'),
    nodeunit('minimal_server/serve_test.js'),
    nodeunit('scripts/publish.js'),
    nodeunit('scripts/ww-merge/cherry-picker.js'),
    nodeunit('scripts/lk.js')
]);
