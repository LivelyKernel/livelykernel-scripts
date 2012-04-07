/*global require, process*/
var args = require('./helper/args'),
    exec = require('child_process').exec,
    shell = require('./helper/shell'),
    path = require('path'),
    async = require('async'),
    env = process.env;

// -=-=-=-=-=-=-=-=-=-=-
// script options
// -=-=-=-=-=-=-=-=-=-=-

var options = args.options([
        ['-h', '--help', 'show this help']], {},
        "lk selftest: Run the script and server tests.");

function qunitRun(spec, callback) {
    var args = ['--code', (spec.scope ? spec.scope : "") + spec.code, '--tests', spec.test];
    shell.callShowOutput(env.QUNIT, args, callback);
}

function nodeunitRun(spec) {
    return function(callback) {
        exec(env.NODEUNIT + ' ' + spec.target, {cwd: env.LK_SCRIPTS_ROOT},
             function(code, out, err) {
                 console.log(out);
                 callback(code);
             });
    }
}

env.LK_SCRIPT_TEST_RUN = "1";

// -=-=-=-=-=-=-=-=-=-=-
// run tests with quint
// -=-=-=-=-=-=-=-=-=-=-
// FIXME best to use something else then qunit
// tests are complicated to run and output is ugly
async.series([
    qunitRun.bind(null, {
        code: path.join(env.LK_SCRIPTS_ROOT, '/scripts/lk.js'),
        test: path.join(env.LK_SCRIPTS_ROOT, '/scripts/lkTest.js'),
        scope: 'lk:'}),
    qunitRun.bind(null, {
        code: path.join(env.LK_SCRIPTS_ROOT, "/scripts/ww-diff/diffReporter.js"),
        test: path.join(env.LK_SCRIPTS_ROOT, "/scripts/ww-diff/diffReporterTest.js")}),
    nodeunitRun({target: 'minimal_server/serve_test.js'}),
    nodeunitRun({target: 'scripts/publish.js'}),
    nodeunitRun({target: 'scripts/ww-merge/cherry-picker.js'})
]);