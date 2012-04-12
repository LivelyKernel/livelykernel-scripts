/*global require, process*/
var args = require('./helper/args'),
    shell = require('./helper/shell'),
    path = require('path');


// -=-=-=-=-=-=-=-=-=-=-
// script options
// -=-=-=-=-=-=-=-=-=-=-
var env = process.env,
    options = args.options([
        ['-h', '--help', 'Show this help'],
        ['-t', '--tag TAG', 'New version tag, in the form of x.y.z.']],
        {},
        "This function publishes the livelykernel-scripts project.\n" +
        "It runs the following steps:\n" +
        "1. update package json\n" +
        "2. check if the new version is in History.md\n" +
        "2. git add && git ci\n" +
        "3. git tag\n" +
        "4. git push\n" +
        "5. git tag push\n" +
        "6. npm publish\n" +
        "optionalVersion can either be a version in the format x.y.z (a string)\n" +
        "or null. If null, the existing minor version (z) is increased\n");


// -=-=-=-=-=-=-=-=-=-=-
// the real thing
// -=-=-=-=-=-=-=-=-=-=-
var cmdAndArgs = ['node', path.join(env.LK_SCRIPTS_DIR, 'publish.js')];
if (options.defined('tag')) {
    cmdAndArgs.push('--tag');
    cmdAndArgs.push(options.tag);
}
var cmd     = cmdAndArgs[0],
    cmdArgs = cmdAndArgs.slice(1);

shell.run(cmd, cmdArgs, function(code) { process.exit(code); });
