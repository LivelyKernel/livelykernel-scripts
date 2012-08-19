/*global require, process*/
var args = require('./helper/args'),
    path = require('path'),
    fs = require('fs'),
    spawn = require('child_process').spawn;

require('./env');

// -=-=-=-=-=-=-=-=-=-=-
// script options
// -=-=-=-=-=-=-=-=-=-=-
var env = process.env,
    options = args.options([
        ['-h', '--help', 'Show this help.'],
        ['-i', '--install DIR', 'Install the PartsBin from ' + env.PARTSBIN_SVN_URL
               + ' into DIR or ' + env.PARTSBIN_DIR + ' if no DIR given'],
        ['-u', '--update', 'Update the PartsBin']],
        {},
        "Installs and updates the webwerkstatt PartsBin");

global.svnRequired();

// -=-=-=-=-=-=-=-=-=-=-
// the real thing
// -=-=-=-=-=-=-=-=-=-=-
var argList = [], dir = options.install || env.PARTSBIN_DIR,
    isInstalled = fs.existsSync(dir),
    doInstall = !isInstalled  && options.defined('install'),
    doUpdate = (options.defined('install') && isInstalled) || options.defined('update');

if (!isInstalled && doUpdate) {
    console.warn('Cannot update because ' + dir + ' does not exist');
    process.exit(1);
}

if (!doUpdate && !doInstall) { options.showHelpAndExit(); }

var proc = doInstall ?
    spawn('svn', ['co', env.PARTSBIN_SVN_URL, dir], {stdio: "inherit"}) :
    spawn('svn', ['up'], {cwd: dir, stdio: "inherit"});
proc.on('exit', function(code) { process.exit(code); });