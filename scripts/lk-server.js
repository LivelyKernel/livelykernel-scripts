/*global require, process*/
var args = require('./helper/args'),
    shell = require('./helper/shell'),
    path = require('path');

var env = process.env,
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
    [      '--lk-dir DIR', 'The directory of the Lively Kernel core repository (git) ']],
    {},
    "Start the LivelyKernel mini-server used for running the tests.");

// use the mini server by default, extend this check when new
// server options are added
if (!options.miniServer) {
  options.miniServer = true;
}

if (!options.lkDir && env.WORKSPACE_LK_EXISTS) {
  options.lkDir = env.WORKSPACE_LK;
}

if (!options.defined('miniServer') || !options.defined('lkDir')) options.showHelpAndExit();


// -=-=-=-=-=-=-=-=-=-=-
// Start the mini server & how to do that
// -=-=-=-=-=-=-=-=-=-=-

// TODO add logfile param for forever
// TODO add forever stop since forever automatically starts daemonized
if (options.defined('forever')) {
  cmdAndArgs = [env.FOREVER, 'start', '--spinSleepTime', '800'/*ms*/];
}

if (options.defined('watch')) {
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
cmdAndArgs.push(env.MINISERVER);
cmdAndArgs.push(port);
cmdAndArgs.push(options.lkDir);


console.log("Starting server from " + options.lkDir + ". " + "http://localhost:" + port);

shell.call(cmdAndArgs[0], cmdAndArgs.slice(1), null, null, true);