/*global require, process*/
var args = require('./helper/args'),
    env = require('./env');

// -=-=-=-=-=-=-=-=-=-=-
// script options
// -=-=-=-=-=-=-=-=-=-=-
var options = args.options([['-h', '--help', 'Show this help.']], {}, "Prints the path to where livelykernel-scripts is located.");

console.log(env.LK_SCRIPTS_ROOT.toString());