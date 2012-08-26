/*global exports, require, console, process, __dirname*/

var fs = require('fs'),
    path = require('path'),
    Seq = require('seq'),
    shelljs = require('shelljs'),
    which = shelljs.which,
    env = process.env,
    isWindows = /^win/i.test(process.platform);

function lkScriptDir(dirInRoot) {
    return path.normalize(path.join(env.LK_SCRIPTS_ROOT, dirInRoot));
}

function set(varName, choices, options) {
    var isValid = options && options.notFs ? function(c) { return !!c; } : fs.existsSync;
    if (env[varName]) choices.unshift(env[varName]); // already set?
    for (var i = 0; i < choices.length; i++) {
        if (isValid(choices[i])) { return env[varName] = choices[i]; }
    }
    if (options && options.useLastIfNothingIsValid && choices.length > 0) {
        env[varName] = choices[choices.length-1];
    }
    return env[varName];
}

/*
 * general stuff
 */
set("LK_SCRIPTS_ROOT", [path.normalize(__dirname + '/..')]);
set("LK_BIN",          [path.join(env.LK_SCRIPTS_ROOT, isWindows ? 'bin/lk.cmd' : 'bin/lk')]);
set("LK_SCRIPTS_DIR",  [lkScriptDir("/scripts")]);
set("NODE_BIN",        [which('node'), which('node.exe'), process.execPath]);
set("NODEMODULES",     [lkScriptDir("/node_modules"),
                            path.join(env.LK_SCRIPTS_ROOT, '..')]);
set("NODEUNIT",        [path.join(env.NODEMODULES, "nodeunit/bin/nodeunit"),
                            which('nodeunit')]);
set("NODEMON",         [path.join(env.NODEMODULES, "nodemon/nodemon.js"),
                            which('nodemon')]);
set("FOREVER",         [path.join(env.NODEMODULES, "forever/bin/forever"),
                            which('forever')]);
set("TEMP_DIR",        [env.TMP, env.TEMP, env.TEMPDIR, '/tmp'], {useLastIfNothingIsValid: true});

/*
 * server related stuff
 * life_star will use miniserver settings
 */
set("MINISERVER_DIR",      [env.LK_SCRIPTS_ROOT + "/minimal_server"]);
set("MINISERVER_PORT",     [9001], {notFs: true});
set("MINISERVER",          [env.MINISERVER_DIR + "/serve.js"]);
set("MINISERVER_HOST",     ["localhost"], {notFs: true});
set("LIFE_STAR_DIR",       [env.LK_SCRIPTS_ROOT + "/life_star"]);
set("LIFE_STAR",           [env.LIFE_STAR_DIR + "/serve.js"]);
set("LIFE_STAR_HOST",           ["localhost"], {notFs: true});
// replace with "notesting" to disable test runner interface on server
set("LIFE_STAR_TESTING",   ["testing"], {notFs: true});
// be very chatty about what is going on
set("LIFE_STAR_LOG_LEVEL", ["debug"], {notFs: true});

/*
 * tests
 */
set("MINISERVER_TEST_FILES", [env.MINISERVER_DIR + '/*_test.js'], {notFs: true});
set("LK_TEST_SCRIPT_DIR",    [env.LK_SCRIPTS_DIR + '/testing']);
set("LK_TEST_STARTER",       [env.LK_TEST_SCRIPT_DIR + '/lively_test.js']);
set("LK_TEST_WORLD",         ["run_tests.xhtml"], {notFs: true});
set("LK_TEST_WORLD_SCRIPT",  ["run_tests.js"], {notFs: true});
set("LK_TEST_BROWSER",       ["chrome"], {notFs: true});
set("LK_TEST_TIMEOUT",       [300], {notFs: true});
set("LK_TEST_NOTIFIER",      ["growlnotify"], {notFs: true});

/*
 * web-browser related
 */
set("CHROME_BIN",            [which('chrome'), which('chromium-browser'),
                              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                              "/usr/bin/chromium-browser",
                              path.join(env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe')]);
set("FIREFOX_BIN",            [which('firefox'),
                              "/Applications/Firefox.app/Contents/MacOS/firefox",
                              "/usr/bin/firefox",
                               path.join(env['ProgramFiles(x86)'], 'Mozilla Firefox', 'firefox.exe'),
                               path.join(env.ProgramFiles, 'Mozilla Firefox', 'firefox.exe')]);

/*
 * jshint
 */
set("JSHINT",        [env.LK_SCRIPTS_ROOT + "/node_modules/jshint/bin/hint", which('jshint')]);
set("JSHINT_CONFIG", [env.LK_SCRIPTS_ROOT + "/jshint.config"]);


/*
 * workspace
 */
set("WORKSPACE_DIR", [lkScriptDir('/workspace')], {useLastIfNothingIsValid: true});
set("WORKSPACE_LK",  [env.LIVELY, lkScriptDir('/workspace/lk')], {useLastIfNothingIsValid: true});
set("WORKSPACE_WW",  [env.WEBWERKSTATT, lkScriptDir('/workspace/ww')], {useLastIfNothingIsValid: true});

set("WORKSPACE_LK_EXISTS", [fs.existsSync(env.WORKSPACE_LK)], {notFs: true});
set("WORKSPACE_WW_EXISTS", [fs.existsSync(env.WORKSPACE_WW)], {notFs: true});

set("SERVER_PID_DIR", [env.WORKSPACE_DIR], {useLastIfNothingIsValid: true});

/*
 * PartsBin
 */
set("PARTSBIN_DIR",     [path.join(env.LIVELY, 'PartsBin/'),
                         path.join(env.WORKSPACE_LK, 'PartsBin/')], {useLastIfNothingIsValid: true});
set("WW_USERS_DIR",     [path.normalize(path.join(env.PARTSBIN_DIR, '../users'))], {useLastIfNothingIsValid: true});
set("WW_SVN_URL", ["http://lively-kernel.org/repository/webwerkstatt/"], {notFs: true});
set("PARTSBIN_SVN_URL", [env.WW_SVN_URL + 'PartsBin/'], {notFs: true});
set("USERS_DIR_SVN_URL", [env.WW_SVN_URL + 'users/'], {notFs: true});


/*
 * This is used to test prerequisites and show warnings
 */
var installCmd = "cd " + env.LK_SCRIPTS_ROOT + " && npm install";
global.lkDevDependencyExist = function lkDevDependencyExist(path) {
    if (fs.existsSync(path)) return true;
    console.warn("The dev dependency " + path + " was not found, please run\n\n" + installCmd);
    return false;
}

global.svnRequired = function svnRequired() {
    if (which('svn')) return;
    console.warn("Subversion cannot be found. Please install Subversion and repeat "
                 + "this command.\n See http://subversion.apache.org/packages.html");
    process.exit(1);
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
