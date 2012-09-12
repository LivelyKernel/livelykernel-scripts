/*global require, process*/
var args = require('./helper/args'),
    shell = require('./helper/shell'),
    async = require('async'),
    spawn = require('child_process').spawn,
    shelljs = require('shelljs'),
    path = require('path'),
    fs = require('fs'),
    env = require('./env'),
    cmdAndArgs = [];

// -=-=-=-=-=-=-=-=-=-=-
// script options
// -=-=-=-=-=-=-=-=-=-=-

var options = args.options([
    ['-h', '--help', 'show this help'],
    ['-w', '--watch [DIR]', 'Run with nodemon and watch for file changes'],
    ['-f', '--forever', 'Run with forever and restart server on a crash'],
    ['-p', '--port NUMBER', "On which port to run"],
    ['-m', '--mini-server', 'Start the minimal server (this is the default)'],
    ['-s', '--life-star', 'Start the Life Star server (fully operational!)'],
    [      '--lk-dir DIR', 'The directory of the Lively Kernel core repository (git) '],
    [      '--info', 'Print whether there is a running server on '
                   + 'the specified port or ' + env.MINISERVER_PORT
                   + ' and the process pid'],
    [      '--kill', 'Stop the server process for the specified port or ' + env.MINISERVER_PORT
                   + ' if there exist one.']],
    {},
    "Start a server to be used for running the tests. Either -m or -s must be given.");

// life_star is the default server
if (!options.defined('miniServer')) options.lifeStar = true;

var port = options.port || env.MINISERVER_PORT,
    host = options.lifeStar ? env.LIFE_STAR_HOST : env.MINISERVER_HOST;

if (!options.lkDir && env.WORKSPACE_LK_EXISTS) {
  options.lkDir = env.WORKSPACE_LK;
}

if (!options.defined('lkDir')) {
    console.log("Cannot find the Lively core repository. "
               + "Please start the server with --lk-dir PATH/TO/LK-REPO")
}

// -=-=-=-=-=-=-=-=-=-=-=-
// Dealing with processes
// -=-=-=-=-=-=-=-=-=-=-=-
var pidFile = path.join(env.SERVER_PID_DIR, 'server.' + port + '.pid');

function removePidFile() {
    try { fs.unlink(pidFile) } catch(e) {}
}

function writePid(proc, callback) {
    shelljs.mkdir('-p', env.SERVER_PID_DIR);
    if (proc.pid) { fs.writeFileSync(pidFile, String(proc.pid)); }
    callback();
}

function readPid(callback) {
    fs.readFile(pidFile, function(err, data) { callback(null, data); });
}

function isPidInOutput(pid, out, callback) {
    var lines = out.split('\n'),
        regexp = new RegExp(pid),
        result = lines.some(function(line) { return regexp.test(line) });
    callback(null, result, pid);
}

function processExists(pid, callback) {
    if (!pid) {callback({err: 'No pid'}); return }
    var isWindows = /^win/i.test(process.platform),
        cmd = isWindows ? 'tasklist.exe' : 'ps -A';
    shelljs.exec(cmd, {async: true, silent: true}, function(err, data) {
        isPidInOutput(pid, data || '', callback);
    });
}

function getServerInfo(callback) {
    // FIXME! this does not yet work for servers that are started with
    // forever!!!
    async.waterfall([
        readPid,
        processExists
    ], function(err, isAlive, pid) {
        if (err) isAlive = false;
        var info = {alive: isAlive, pid: String(pid)};
        callback(null, info);
    });
}

function killOldServer(infoAboutOldServer, callback) {
    // Note: this does not work with forever...
    // since forever is daemonized the starting process will exit anyway
    if (infoAboutOldServer.alive) {
        console.log('Stopping lk server process with pid ' + infoAboutOldServer.pid);
        try { process.kill(infoAboutOldServer.pid) } catch(e) {}
    }
    callback();
}

// -=-=-=-=-=-=-=-=-=-=-=-=-
// This is where we do stuff
// -=-=-=-=-=-=-=-=-=-=-=-=-

if (options.defined('info')) {
    getServerInfo(function(err, info) {
        console.log(info ? JSON.stringify(info) : '{}');
    });
} else if (options.defined('kill')) {
    async.waterfall([getServerInfo, killOldServer]);
} else {

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
        console.log("watch " + options.watch);
        if (!lkDevDependencyExist(env.NODEMON)) process.exit(1);
        cmdAndArgs.push(env.NODEMON);
        if (options.defined('forever')) {
            cmdAndArgs.push('--exitcrash');
        }
        cmdAndArgs.push('--watch');
        cmdAndArgs.push(options.watch || (options.lifeStar ? env.LIFE_STAR_DIR : env.MINISERVER_DIR));
    }

    if (!options.defined('forever') && !options.defined('watch')) {
        cmdAndArgs.push('node');
    }

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
    function startServer(callback) {
        var child = spawn(cmdAndArgs[0], cmdAndArgs.slice(1), {stdio: 'inherit'});
        console.log("Server with pid %s is now running at http://%s:%s", child.pid, host, port);
        console.log("Serving files from " + options.lkDir);
        callback(null, child);
    }

    // let it fly!
    async.waterfall([
        getServerInfo,
        killOldServer, // Ensure that only one server for the given port is running
        startServer,
        writePid
    ]);

}