/*global require, process*/
var args = require('./helper/args'),
    fs = require('fs'),
    spawn = require('child_process').spawn,
    env = require('./env');

global.svnRequired();

// -=-=-=-=-=-=-=-=-=-=-
// script options
// -=-=-=-=-=-=-=-=-=-=-
var options = args.options([
        ['-h', '--help', 'Show this help.'],
        ['-d', '--dir DIR', 'Use DIR to install or update the PartsBin from '
                          + env.PARTSBIN_SVN_URL
                          + '. If DIR is not specified  use ' + env.PARTSBIN_DIR + '.']],
        {},
        "Installs and updates the webwerkstatt PartsBin");

// -=-=-=-=-=-=-=-=-=-=-
// the real thing
// -=-=-=-=-=-=-=-=-=-=-
var dir = options.dir || env.PARTSBIN_DIR,
    isInstalled = fs.existsSync(dir),
    cmd = "svn",
    spawnArgs = isInstalled ? ['up'] : ['co', env.PARTSBIN_SVN_URL, dir],
    spawnOptions = isInstalled ? {cwd: dir, stdio: "inherit"} : {stdio: "inherit"},
    msg = isInstalled ? 'Updating PartsBin (' + dir + ')' :
    'Downloading PartsBin to ' + dir + '. This may take a minute...';

console.log(msg);
var proc = spawn(cmd, spawnArgs, spawnOptions);
proc.on('exit', function(code) { process.exit(code); });