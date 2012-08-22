/*global require, process*/
var args = require('./helper/args'),
    fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn;

require('./env');

global.svnRequired();

// -=-=-=-=-=-=-=-=-=-=-
// script options
// -=-=-=-=-=-=-=-=-=-=-
var env = process.env,
    options = args.options([
        ['-h', '--help', 'Show this help.'],
        ['-d', '--dir DIR', 'Use DIR to install or update the user directory from '
                          + env.USERS_DIR_SVN_URL
                          + '. If DIR is not specified  use ' + env.WW_USERS_DIR + '.'],
        ['-u', '--user NAME', 'Mandatory. Definies which user directory to sync.']],
        {},
        "Installs and updates the user directories from webwerkstatt.");

// -=-=-=-=-=-=-=-=-=-=-
// the real thing
// -=-=-=-=-=-=-=-=-=-=-
var userName = options.user;
if (!userName) { options.showHelpAndExit() }
var dir = path.join(options.dir || env.WW_USERS_DIR, userName),
    url = env.USERS_DIR_SVN_URL + userName + '/',
    isInstalled = fs.existsSync(dir);

var proc = isInstalled ?
    spawn('svn', ['up'], {cwd: dir, stdio: "inherit"}) :
    spawn('svn', ['co', url, dir], {stdio: "inherit"});
proc.on('exit', function(code) { process.exit(code); });