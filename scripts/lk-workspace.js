/*global require, process, __dirname, console*/
var args = require('./helper/args'),
    async = require('async'),
    readline = require('readline'),
    path = require('path'),
    env = require('./env');

require('shelljs/global');

/*
 * Script for automatically managing working copies of webwerkstatt and lively core
 */


// -=-=-=-=-=-=-=-=-=-=-
// script options
// -=-=-=-=-=-=-=-=-=-=-;

var options = {
    lkGitUrl: "git@github.com:rksm/LivelyKernel.git",
    lkGitUrlReadOnly: "git://github.com/rksm/LivelyKernel.git",
    lkBranch: "master",
    wwSvnUrl: "http://lively-kernel.org/repository/webwerkstatt/"
};

options = args.options([
    ['-h', '--help', 'show this help'],
    [      '--remove', 'completely delete the workspace'],
    ['-u', '--update', 'update the svn and git repositories with remote changes if they exist'],
    ['-r', '--reset', 'reset the svn and git repositories if they exist but do not delete them'],
    [      '--github-write-access', 'Initialize the lk core git repo with commit access'],
    [      '--checkout-ww', 'create ./workspace/ww/, checked out from ' + options.wwSvnUrl],
    [      '--checkout-lk', 'create ./workspace/lk/, checked out from ' + options.lkGitUrl +
           ' on branch ' + options.lkBranch],
    [      '--init', 'Do both --checkout-ww and --checkout-lk']], options,
    "Script that manages local copies of the LivelyKernel core "
    + "and webwerksatt repository in " + env.WORKSPACE_DIR + '/');

var wwCoreDir = path.join(env.WORKSPACE_WW, 'core'),
    actions = [];

if (options.defined('remove')) {
    echo('Removing ' + env.WORKSPACE_DIR);
    rm('-rf', env.WORKSPACE_DIR);
}

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
            global, env.WORKSPACE_LK, 'git reset --hard; git clean -d -f'),
        resetWW = interactiveReset.bind(
            global, path.join(env.WORKSPACE_WW, 'core'), 'svn revert -R .');

    actions = actions.concat(resetCore, resetWW, function(next) { rl.close(); next() });
}

if (options.defined('checkoutLk') || options.defined('init')) {
    var gitURL = options.defined('githubWriteAccess') ? options.lkGitUrl : options.lkGitUrlReadOnly;
    if (test('-d', env.WORKSPACE_LK)) {
        echo('LivelyKernel core workspace already exists at ' + env.WORKSPACE_LK);
    } else {
        actions.push(function(next) {
            echo('Retrieving LivelyKernel-core repository...');
            mkdir('-p', env.WORKSPACE_DIR);
            exec(['git clone -b ', options.lkBranch, ' -- ',
                  gitURL, ' "', env.WORKSPACE_LK, '"'].join(''), {async: true}, next);
        });
    }
}

if (options.defined('checkoutWw') || options.defined('init')) {
    if (test('-d', wwCoreDir)) {
        echo('Webwerkstatt core directory already exists at ' + wwCoreDir);
    } else {
        actions.push(function(next) {
            echo('Retrieving webwerkstatt core, this may take a while...');
            mkdir('-p', wwCoreDir);
            exec(['svn co ', options.wwSvnUrl + '/core ', '"', wwCoreDir, '"'].join(''),
                 {async: true}, next);
        });
    }
}

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

async.series(actions);