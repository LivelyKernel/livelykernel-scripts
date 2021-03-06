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
    [      '--forever-log-dir DIR', 'Where the forever stdout and stderr log is placed'],
    ['-p', '--port NUMBER', "On which port to run"],
    ['-m', '--mini-server', 'Start the minimal server (this is the default)'],
    ['-s', '--life-star', 'Start the Life Star server (fully operational!)'],
    [      '--log-level STRING', 'Log level, accepted values: error, warning, info, debug'],
    [      '--lk-dir DIR', 'The directory of the Lively Kernel core repository (git) '],
    [      '--db-config JSON', 'Stringified JSON object that configures the object DB and lively-davfs\n'
    + "                                 like {\n"
    + '                                   includedFiles: [STRING],\n'
    + '                                   excludedDirectories: [STRING],\n'
    + '                                   excludedFiles: [STRING],\n'
    + '                                   dbFile: [STRING], -- path to db file\n'
    + '                                   resetDatabase: [BOOL]\n'
    + '                                 }'],
    [      '--behind-proxy', 'Add this option if requests going to the server are '
                           + 'proxied by another server, e.g. Apache'],
    [      '--enable-ssl', 'Enable https server'],
    [      '--enable-ssl-client-auth', 'Whether to use authentication via SSL client certificate'],
    [      '--ssl-server-key FILE', 'Where the server key is located'],
    [      '--ssl-server-cert FILE', 'Where the server certificate is located'],
    [      '--ssl-ca-cert FILE', 'Where the CA certificate is located'],
    [      '--info', 'Print whether there is a running server on '
                   + 'the specified port or ' + env.MINISERVER_PORT
                   + ' and the process pid'],
    [      '--kill', 'Stop the server process for the specified port or ' + env.MINISERVER_PORT
                   + ' if there exist one.'],
    [      '--no-subservers', 'By default servers in ' + env.WORKSPACE_LK
                            + ' are started with the core server. Setting this option'
                            + ' disables this behavior'],
    [      '--subserver STRING', 'Add a subserver, expects filesystem path to js file like '
                               + '"foo/bar.js" to start subserver bar. Aliasing supported via '
                               + '"baz:foo/bar.js" to start subserver bar.js as baz.'],
    [      '--use-manifest', 'Enables the creation of manifest file for application cache.']],
    {},
    "Start a server to be used for running the tests. Either -m or -s must be given.");

// life_star is the default server
if (!options.defined('miniServer')) options.lifeStar = true;

var port = options.port || env.MINISERVER_PORT,
    host = options.lifeStar ? env.LIFE_STAR_HOST : env.MINISERVER_HOST,
    subservers = {};

if (!options.lkDir && env.WORKSPACE_LK_EXISTS) {
    options.lkDir = env.WORKSPACE_LK;
} else {
    env.WORKSPACE_LK = options.lkDir;
}

if (!options.defined('lkDir')) {
    console.log("Cannot find the Lively core repository. "
               + "Please start the server with --lk-dir PATH/TO/LK-REPO")
}

var dbConfig;
if (options.defined('dbConfig')) {
    dbConfig = options.dbConfig;
}

if (!options.defined('noSubservers')) {
    var lkSubserverDir = path.join(options.lkDir, "core/servers");
    try {
        var fileList = fs.readdirSync(lkSubserverDir);
        fileList.forEach(function(name) {
            if (!name.match(/.js$/)) return;
            subservers[name.slice(0, -3)] = path.join(lkSubserverDir, name);
        });
    } catch(e) {
        console.warn('Problems finding subservers in %s: %s', lkSubserverDir, e);
    }
}

if (!options.defined('noSubservers') && options.defined('subserver')) {
    // read multiple --subserver STRING args
    // STRING can be name:path or just path
    for (var i = 0; i < process.argv.length; i++) {
        if (process.argv[i] !== '--subserver') continue;
        var spec = process.argv[i+1];
        if (!spec) continue;
        var nameAndPath = spec.split(':'), name, file;
        if (nameAndPath.length === 2) {
            name = nameAndPath[0];
            file = nameAndPath[1];
        } else {
            file = nameAndPath[0];
            name = file.substring(file.lastIndexOf('/') + 1, file.lastIndexOf('.'));
        }
        subservers[name] = file;
    }
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
    if (!pid || !pid.length) { callback({err: 'No pid'}); return; }
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

    // -=-=-=-=-=-=-=-=-
    // Start the server
    // -=-=-=-=-=-=-=-=-

    // TODO add forever stop since forever automatically starts daemonized
    if (options.defined('forever')) {
        if (!lkDevDependencyExist(env.FOREVER)) process.exit(1);
        cmdAndArgs = [env.FOREVER, 'start', '--spinSleepTime', '800'/*ms*/];
        if (options.foreverLogDir) {
            var baseName = '-lk-server-' + port + '.log',
                outLog = path.join(options.foreverLogDir, 'out' + baseName),
                errLog = path.join(options.foreverLogDir, 'err' + baseName);
            cmdAndArgs = cmdAndArgs.concat(['-o', outLog, '-e', errLog, '--append']);
        }
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
        cmdAndArgs.push(dbConfig);
        cmdAndArgs.push(env.LIFE_STAR_TESTING);
        cmdAndArgs.push(options.logLevel || env.LIFE_STAR_LOG_LEVEL);
        cmdAndArgs.push(options.defined('behindProxy'));
        cmdAndArgs.push(JSON.stringify(subservers));
        cmdAndArgs.push(options.defined('useManifest') ? true : false);
        if (options.defined('enableSsl')) {
            cmdAndArgs.push(true);
            cmdAndArgs.push(options.defined('enableSslClientAuth'));
            cmdAndArgs.push(options.sslServerKey);
            cmdAndArgs.push(options.sslServerCert);
            cmdAndArgs.push(options.sslCaCert);
        }
    }


    // -=-=-=-=-=-=-=-=-=-
    // Server start logic
    // -=-=-=-=-=-=-=-=-=-
    function startServer(callback) {
        var child = spawn(cmdAndArgs[0], cmdAndArgs.slice(1), {stdio: 'inherit'});
        console.log("Server with pid %s is now running at %s://%s:%s",
                    child.pid, options.defined('enableSsl') ? 'https' : 'http', host, port);
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
