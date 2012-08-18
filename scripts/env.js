/*global exports, require, console, process, __dirname*/

var fs = require('fs'),
    path = require('path'),
    Seq = require('seq'),
    env = process.env;

function lkScriptDir(dirInRoot) {
    return path.normalize(env.LK_SCRIPTS_ROOT + dirInRoot);
}

/*
 * general stuff
 */
env.LK_SCRIPTS_ROOT = path.normalize(__dirname + '/..');
env.LK_SCRIPTS_DIR  = lkScriptDir("/scripts");
env.NODEMODULES     = env.NODEMODULES || lkScriptDir("/node_modules");
env.QUNIT           = env.QUNIT       || env.NODEMODULES + "/qunit/bin/cli.js";
env.NODEUNIT        = env.NODEUNIT    || env.NODEMODULES + "/nodeunit/bin/nodeunit";
env.NODEMON         = env.NODEMON     || env.NODEMODULES + "/nodemon/nodemon.js";
env.FOREVER         = env.FOREVER     || env.NODEMODULES + "/forever/bin/forever";

/*
 * server related stuff
 * life_star will use miniserver settings
 */
env.MINISERVER_DIR      = env.MINISERVER_DIR  || env.LK_SCRIPTS_ROOT + "/minimal_server";
env.MINISERVER_PORT     = env.MINISERVER_PORT || 9001;
env.MINISERVER          = env.MINISERVER_DIR + "/serve.js";
env.MINISERVER_HOST     = "localhost";
env.LIFE_STAR_DIR       = env.LIFE_STAR_DIR || env.LK_SCRIPTS_ROOT + "/life_star";
env.LIFE_STAR           = env.LIFE_STAR_DIR + "/serve.js";
env.LIFE_STAR_TESTING   = "testing"; // replace with "notesting" to disable test runner interface on server
env.LIFE_STAR_LOG_LEVEL = "debug";   // be very chatty about what is going on

/*
 * tests
 */
env.MINISERVER_TEST_FILES = env.MINISERVER_DIR + '/*_test.js';
env.LK_TEST_SCRIPT_DIR    = env.LK_SCRIPTS_DIR + '/testing';
env.LK_TEST_STARTER       = env.LK_TEST_SCRIPT_DIR + '/lively_test.js';
env.LK_TEST_WORLD         = "run_tests.xhtml";
env.LK_TEST_WORLD_SCRIPT  = "run_tests.js";
env.LK_TEST_BROWSER       = "chrome";
env.LK_TEST_TIMEOUT       = 300;
env.LK_TEST_NOTIFIER      = "growlnotify";

/*
 * jshint
 */
env.JSHINT        = env.JSHINT        || env.LK_SCRIPTS_ROOT + "/node_modules/jshint/bin/hint";
env.JSHINT_CONFIG = env.JSHINT_CONFIG || env.LK_SCRIPTS_ROOT + "/jshint.config";


/*
 * workspace
 */
env.WORKSPACE_DIR = env.WORKSPACE_DIR || lkScriptDir('/workspace');
env.WORKSPACE_LK  = env.WORKSPACE_LK  || lkScriptDir('/workspace/lk');
env.WORKSPACE_WW  = env.WORKSPACE_WW  || lkScriptDir('/workspace/ww');

env.WORKSPACE_LK_EXISTS = fs.existsSync(env.WORKSPACE_LK);
env.WORKSPACE_WW_EXISTS = fs.existsSync(env.WORKSPACE_WW);

/*
 * PartsBin
 */
env.PARTSBIN_DIR     = env.PARTSBIN_DIR || lkScriptDir("/PartsBin");
env.PARTSBIN_SVN_URL = "http://lively-kernel.org/repository/webwerkstatt/PartsBin/"



var installCmd = "cd " + env.LK_SCRIPTS_ROOT + "; npm install";

global.lkDevDependencyExist = function lkDevDependencyExist(path) {
    if (fs.existsSync(path)) return true;
    console.warn("The dev dependency " + path + " was not found, please run\n\n" + installCmd);
    return false;
}

global.lazyRequire = function lazyRequire(path) {
    try {
        return require(path);
    } catch(e) {
        console.warn("module " + path + " not installed, install it by running\n\n" + installCmd);
        return null;
    }
}

module.exports = env;
