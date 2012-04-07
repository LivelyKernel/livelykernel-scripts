/*global require, process, console, __dirname*/
var args = require('./helper/args'),
    shell = require('./helper/shell'),
    path = require('path'),
    fs = require('fs');

/*
 * Call the diff reporter for specifically diffing webwerkstatt and core
 */

// -=-=-=-=-=-=-=-=-=-=-
// script options
// -=-=-=-=-=-=-=-=-=-=-
var env = process.env,
    defaultDiffFile = env.WORKSPACE_DIR + '/ww-lk-diff.json',
    options = args.options([
        ['-h', '--help', 'show this help'],
        ['--lk DIR', "Root directory of the Lively Kernel git repository."
                   + "If not set then look for " + env.WORKSPACE_LK],
        ['--ww DIR', "Root directory of the Webwerksatt svn repository."
                   + "If not set then look for " + env.WORKSPACE_WW],
        ['--output FILE', "JSON file to write the diff report into. If not specified"
                          + " then " + defaultDiffFile + " is used"]],
       {},
       "This tool will produce a JSON diff between the current webwerkstatt version "
       + "and the HEAD of the master branch of the LK core git repository.");

if (!options.lk) {
    if (env.WORKSPACE_LK_EXISTS) {
        options.lk = env.WORKSPACE_LK;
    } else {
        console.log("No lk directory specified and none in " + env.WORKSPACE_DIR +
                    " found!");
        options.showHelpAndExit();
    }
}
options.lk = path.resolve(env.PWD, options.lk);

if (!options.ww) {
    if (env.WORKSPACE_WW_EXISTS) {
        options.ww = env.WORKSPACE_WW;
    } else {
        console.log("No webwerksatt directory specified and none in " +
                    env.WORKSPACE_DIR + " found!");
        options.showHelpAndExit();
    }
}
options.ww = path.resolve(env.PWD, options.ww);

if (!options.output) {
    options.output = defaultDiffFile;
}

// -=-=-=-=-=-=-=-=-=-=-
// the real thing
// -=-=-=-=-=-=-=-=-=-=-
var argList = ['--lk', options.lk,
               '--ww', options.ww,
              '--output', options.output];

shell.callShowOutput(env.LK_SCRIPTS_DIR + '/ww-diff/runDiff.sh', argList,
                      function(code) { process.exit(code); });