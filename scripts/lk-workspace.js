/*global require, process, __dirname, console*/
var args = require('./helper/args'),
    spawn = require('child_process').spawn,
    async = require('async'),
    path = require('path'),
    readline = require('readline'),
    util = require('util'),
    env = require('./env');

require('shelljs/global');

/*
 * Script for automatically managing working copies of webwerkstatt and lively core
 *
 */


// -=-=-=-=-=-=-=-=-=-=-
// script options
// -=-=-=-=-=-=-=-=-=-=-;

var options = {
    lkGitUrl: "git@github.com:LivelyKernel/LivelyKernel.git",
    lkGitUrlReadOnly: "git://github.com/LivelyKernel/LivelyKernel.git",
    lkBranch: "master",
    wwSvnUrl: "http://lively-kernel.org/repository/webwerkstatt/"
};

options = args.options([
    ['-h', '--help', 'show this help'],
    ['-u', '--update', 'update the svn and git repositories with remote changes if they exist'],
    ['-r', '--reset', 'reset the svn and git repositories if they exist but do not delete them'],
    [      '--github-write-access [URL]', 'Initialize the lk core git repo with commit access'
                                        + ' to either the given URL or when not specified to '
                                        + '' + options.lkGitUrl],
    [      '--remove', 'completely delete the workspace'],
    [      '--checkout-ww', 'create ./workspace/ww/, checked out from ' + options.wwSvnUrl],
    [      '--checkout-lk', 'create ./workspace/lk/, checked out from ' + options.lkGitUrl +
           ' on branch ' + options.lkBranch],
    [      '--init', 'Do both a --checkout-lk and download the PartsBin with "lk partsbin '
                     + '-d ' + env.WORKSPACE_LK + '"']], options,
    "Script that manages local copies of the LivelyKernel core "
    + "and webwerksatt repository in " + env.WORKSPACE_DIR + '/');

var wwCoreDir = path.join(env.WORKSPACE_WW, 'core'), actions = [];

// -=-=-=-=-=-=-
// remove
// -=-=-=-=-=-=-
if (options.defined('remove')) {
    echo('Removing ' + env.WORKSPACE_DIR);
    rm('-rf', env.WORKSPACE_DIR);
}

// -=-=-=-=-=-=-
// reset
// -=-=-=-=-=-=-
if (options.defined('reset')) {
    var rl = readline.createInterface({input: process.stdin, output: process.stdout});

    function interactiveReset(dir, cmd, next) {
        if (!test('-d', dir)) { next(); return };
        var q = "Do you really want to reset " + dir + '?\n'
              + 'Resetting the workspace means that all uncommitted changes '
              + 'will be lost.\nThe command that will be run is: ' + cmd
              + '\nProceed with "yes".\n\n'
        rl.question(q, function(answer) {
            if (answer !== 'yes') { next(); return }
            echo("Resetting " + dir);
            var oldPwd = pwd();
            cd(dir);
            exec(cmd, {async: true}, function() { cd(oldPwd); next(); });
        });
    }

    var resetCore = interactiveReset.bind(
            global, env.WORKSPACE_LK, 'git reset --hard && git clean -d -f'),
        resetWW = interactiveReset.bind(
            global, path.join(env.WORKSPACE_WW, 'core'), 'svn revert -R .');

    actions = actions.concat(resetCore, resetWW, function(next) { rl.close(); next() });
}

// -=-=-=-=-=-=-
// checkout core
// -=-=-=-=-=-=-
if (options.defined('checkoutLk') || options.defined('init')) {
    var gitURL;
    if (!options.defined('githubWriteAccess')) {
        gitURL = options.lkGitUrlReadOnly;
    } else if (typeof options.githubWriteAccess === 'string') {
        gitURL = options.githubWriteAccess;
    } else {
        gitURL = options.lkGitUrl;
    }
    if (test('-d', env.WORKSPACE_LK)) {
        echo('LivelyKernel core workspace already exists at ' + env.WORKSPACE_LK
            + " and will be updated");
        options.update = true;
    } else {
        actions.push(function(next) {
            echo('Retrieving LivelyKernel-core repository...');
            mkdir('-p', env.WORKSPACE_DIR);
            exec(['git clone -b ', options.lkBranch, ' -- ',
                  gitURL, ' "', env.WORKSPACE_LK, '"'].join(''), {async: true}, next);
        });
    }
}

// -=-=-=-=-=-=-
// checkout ww
// -=-=-=-=-=-=-
function setupCheckoutWw(options) {
    if (test('-d', wwCoreDir)) {
        echo('Webwerkstatt core directory already exists at ' + wwCoreDir
            + " and will be updated");
        options.update = true;
        return;
    }

    // checkout
    actions.push(function(next) {
        echo('Retrieving webwerkstatt core, this may take a while...');
        mkdir('-p', wwCoreDir);
        exec(util.format('svn co %s/core "%s"', options.wwSvnUrl, wwCoreDir),
             {async: true}, next);
    });

    // linking partsbin to ww workspace if necessary
    var wwPartsBinDir = path.join(wwCoreDir, '../PartsBin');
    if (test('-d', wwPartsBinDir) || !test('-d', env.PARTSBIN_DIR)) return;
    actions.push(function(next) {
        exec(util.format('ln -s %s %s', env.PARTSBIN_DIR, wwPartsBinDir), {async: true}, next)
    });
};
if (options.defined('checkoutWw')) setupCheckoutWw(options);

// -=-=-=-=-=-=-=-=-=-
// update core && ww
// -=-=-=-=-=-=-=-=-=-
if (options.defined('update')) {
    if (test('-d', env.WORKSPACE_LK)) {
        echo('Pulling changes for LivelyKernel-core ...');
        actions.push(function(next) {
            var oldPwd = pwd();
            cd(env.WORKSPACE_LK);
            exec('git pull --rebase origin', {async: true}, function() { cd(oldPwd); next(); });
        });
    }

    if (test('-d', wwCoreDir)) {
        actions.push(function(next) {
            echo('Updating webwerkstatt core ...');
            exec('svn up "' + wwCoreDir + '"', {async: true}, next);
        });
    }
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// download the PartsBin
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
if (options.defined('init')) {
    actions.push(function() {
        exec(util.format('"%s" partsbin', env.LK_BIN), {async: true}, function() {
            console.log('PartsBin downloaded');
        });
    });
}

function run() { async.series(actions); }

if (!process.env.LK_SCRIPT_TEST_RUN) {

    // = = = =
    // run it!
    // = = = =
    run();

} else {

    // = = = =
    // Test it
    // = = = =

    var testHelper = require('./helper/test-helper');

    module.exports = {
        setUp: function (callback) {
            // this.mergeSpec = "foo...bar\nbaz...zork\nboing, test commit\nsecond line";
            options = {
                defined: function(name) { return !!options[name]; },
                wwSvnUrl: "http://svn.foo.bar"
            }
            env.PARTSBIN_DIR = '/foo/PartsBin';
            actions = [];
            callback();
        },

        testWWCheckoutLinksPartsBinIfExisting: function (t) {
            var shelljs = testHelper.shelljs(t).beGlobal(),
                wwCoreDir = path.join(env.WORKSPACE_WW, 'core'),
                wwPartsBinDir = path.join(wwCoreDir, '../PartsBin');

            echo.ignoreUnexpected();
            test.expect({flags: '-d', arg: wwCoreDir, returns: false});        // ww already there?
            mkdir.expect({flags: '-p', path: wwCoreDir});                      // create path
            exec.expect({cmd: /svn co/});                                      // svn checkout
            test.expect({flags: '-d', arg: wwPartsBinDir, returns: false});    // partsbin here?
            test.expect({flags: '-d', arg: env.PARTSBIN_DIR, returns: true});  // partsbin there?
            exec.expect({cmd: util.format('ln -s %s %s',                       // link partsbin
                                          env.PARTSBIN_DIR, wwPartsBinDir)});

            setupCheckoutWw(options); run();
            shelljs.assertAllCalled(); t.done();
        }

    };
}