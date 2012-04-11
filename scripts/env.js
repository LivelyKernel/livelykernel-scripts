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
 */
env.MINISERVER_DIR  = env.MINISERVER_DIR  || env.LK_SCRIPTS_ROOT + "/minimal_server";
env.MINISERVER_PORT = env.MINISERVER_PORT || 9001;
env.MINISERVER      = env.MINISERVER_DIR + "/serve.js";

/*
 * tests
 */
env.MINISERVER_TEST_FILES = env.MINISERVER_DIR + '/*_test.js';
env.LK_TEST_SCRIPT_DIR    = env.LK_SCRIPTS_DIR + '/testing';
env.LK_TEST_STARTER       = env.LK_TEST_SCRIPT_DIR + '/run_lively_tests_cli.js';
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

env.WORKSPACE_LK_EXISTS = path.existsSync(env.WORKSPACE_LK);
env.WORKSPACE_WW_EXISTS = path.existsSync(env.WORKSPACE_WW);

/*
 * PartsBin
 */
env.PARTSBIN_DIR     = env.PARTSBIN_DIR || lkScriptDir("/PartsBin");
env.PARTSBIN_SVN_URL = "http://lively-kernel.org/repository/webwerkstatt/PartsBin/"



module.exports = env;
