/*global require, process*/
var args = require('./helper/args'),
    shell = require('./helper/shell'),
    async = require('async'),
    spawn = require('child_process').spawn,
    path = require('path'),
    fs = require('fs'),
    env = require('./env'),
    cmdAndArgs = [];

// -=-=-=-=-=-=-=-=-=-=-
// script options
// -=-=-=-=-=-=-=-=-=-=-

var options = args.options([
    ['-h', '--help', 'show this help'],
    ['-w', '--watch', 'Run with nodemon and watch for file changes'],
    ['-f', '--forever', 'Run with forever and restart server on a crash'],
    ['-p', '--port NUMBER', "On which port to run"],
    ['-m', '--mini-server', 'Start the minimal server (this is the default)'],
    ['-s', '--life-star', 'Start the Life Star server (fully operational!)'],
    [      '--lk-dir DIR', 'The directory of the Lively Kernel core repository (git) ']],
    {},
    "Start a server to be used for running the tests. Either -m or -s must be given.");

// life_star is the default server
if (options.defined('miniServer')) options.lifeStar = true;

if (!options.lkDir && env.WORKSPACE_LK_EXISTS) {
  options.lkDir = env.WORKSPACE_LK;
}

if (!options.defined('lkDir')) {
    console.log("Cannot find the Lively core repository. "
               + "Please start the server with --lk-dir PATH/TO/LK-REPO")
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Start the mini server & how to do that
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

// TODO add logfile param for forever
// TODO add forever stop since forever automatically starts daemonized
if (options.defined('forever')) {
  if (!lkDevDependencyExist(env.FOREVER)) process.exit(1);
  cmdAndArgs = [env.FOREVER, 'start', '--spinSleepTime', '800'/*ms*/];
}

if (options.defined('watch')) {
  if (!lkDevDependencyExist(env.NODEMON)) process.exit(1);
  cmdAndArgs.push(env.NODEMON);
  if (options.defined('forever')) {
    cmdAndArgs.push('--exitcrash');
  }
  cmdAndArgs.push('--watch');
  cmdAndArgs.push(env.MINISERVER_DIR);
}

if (!options.defined('forever') && !options.defined('watch')) {
  cmdAndArgs.push('node');
}

var port = options.port || env.MINISERVER_PORT;
if (options.defined('miniServer')) {
  console.log('Selected miniserver');
  cmdAndArgs.push(env.MINISERVER);
} else {
  console.log('Selected life_star');
  cmdAndArgs.push(env.LIFE_STAR);
}
cmdAndArgs.push(port);
cmdAndArgs.push(options.lkDir);
if (options.defined('lifeStar')) {
  cmdAndArgs.push(env.LIFE_STAR_TESTING);
  cmdAndArgs.push(env.LIFE_STAR_LOG_LEVEL);
}


// -=-=-=-=-=-=-=-=-=-
// Server start logic
// -=-=-=-=-=-=-=-=-=-
var pidFile = path.join(env.LK_SCRIPTS_ROOT, 'server.' + port + '.pid');

function removePidFile() {
    try { fs.unlink(pidFile) } catch(e) {}
}

function writePid(process, callback) {
    if (process.pid) { fs.writeFileSync(pidFile, String(process.pid)); }
    callback();
}

function readPid(callback) {
    fs.readFile(pidFile, function(err, data) { callback(null, data); });
}

function killServer(pid, callback) {
    if (pid) {
        console.log('Old server process still alive? Trying to kill...');
        try { process.kill(pid) } catch(e) {}
    }
    callback();
}

function startServer(callback) {
    var child = spawn(cmdAndArgs[0], cmdAndArgs.slice(1), {stdio: 'inherit'});
    child.on('exit', removePidFile);
    console.log("Server is now running at " + "http://localhost:" + port);
    console.log("Serving files from " + options.lkDir);
    callback(null, child);
}

// let it fly!
async.waterfall([
    readPid,
    killServer, // Ensure that only one server for the given port is running
    startServer,
    writePid
]);