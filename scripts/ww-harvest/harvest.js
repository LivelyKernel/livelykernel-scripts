/*global process, require, export*/

var path = require('path'),
    async = require('async'),
    fs, exec;

var wwDir, wwCoreDir, mirrorDir, scriptsDir;

/*
 * This script ...
 */

function findWWVersion(callback) {
    var historyFile = path.join(wwCoreDir, 'History.md')

    async.waterfall([
        function updateWebwerkstattWorkingCopy(next) {
            exec('svn up', {cwd: wwCoreDir}, function(code, out) {
                console.log('svn up: ' + out);
                next(code, historyFile);
            });
        },
        fs.readFile,
        function extractVersion(historyFileContent, next) {
            var regexp = /[0-9]+\.[0-9]+\.[0-9]+/g,
                match = historyFileContent.toString().match(regexp),
                version = match && match[0];
            next(null, version);
        }
    ], callback);
}

function mirrorBranchName(version) {
    return "ww-mirror-" + version;
}

function checkoutMirrorBranchForVersion(version, callback) {
    var branchName = mirrorBranchName(version);

    function checkout(fromOrigin, callback) {
        var cmd = 'git checkout -b ' + branchName;
        if (fromOrigin) {
            cmd += ' -t origin/' + branchName;
        }
        exec(cmd, {cwd: mirrorDir}, function(code, out, err) { callback() });
    }
    exec('git ls-remote --heads', {cwd: mirrorDir}, function(code, out, err) {
        if (out.indexOf(branchName) > -1) {
            checkout(true, callback);
        } else {
            async.series([
                checkout.bind(null, false),
                syncMirrorWithWW,
                exec.bind(null, 'git commit -am "Initial sync for ' + branchName + '"',
                          {cwd: mirrorDir}),
                callback
            ]);
        }
    });
}

function removeLocalMirrorBranchForVersion(version, callback) {
    var branchName = mirrorBranchName(version);
    exec('git checkout master && git branch ' + branchName + ' -D',
         {cwd: mirrorDir}, function(code, out, err) { callback() });
}

function syncMirrorWithWW(next) {
    exec(["bin/lk sync --from-ww-to-lk " +
          "--lk-dir ", mirrorDir, " --ww-dir ", wwDir].join(''), {cwd: scriptsDir},
         function(code, out, err) { console.log("lk sync: " + out + "\n" + err); next(code) });
}



if (!process.env.LK_SCRIPT_TEST_RUN) {

    console.log('TODO: Do the real thing');

    // var args           = require('./helper/args'),
    //     fs             = require('fs'),
    //     exec           = require('child_process').exec;

    // // -=-=-=-=-=-=-=-=-=-=-
    // // script options
    // // -=-=-=-=-=-=-=-=-=-=-
    // var options = args.options([
    //     ['-h', '--help', 'Show this help'],
    //     ['-t', '--tag TAG', 'New version tag, in the form of x.y.z.']],
    //     {},
    //     "publish a new version of livelykernel-sripts");

    // if (options.defined('tag') && !isValidVersion(options.tag)) {
    //     console.error('tag ' + options.tag + ' has not the form x.y.z');
    //     process.exit(1);
    // }

    // publish({fs: fs, exec: exec}, options.tag, env.LK_SCRIPTS_ROOT);

} else {

    /*
     * = = = = =
     * Test code
     * = = = = =
     * export LK_SCRIPT_TEST_RUN=1; nodemon --exec "node_modules/nodeunit/bin/nodeunit scripts/ww-harvest/harvest.js"
     */

    wwDir = "foo/bar/ww";
    wwCoreDir = wwDir + '/core';
    mirrorDir = "foo/bar/ww-mirror";
    scriptsDir = 'foo/bar/lkscripts';
    var testHelper = require('./../helper/test-helper'),
        wwHistoryFile = "foo/bar/ww/core/History.md",
        wwHistoryFileContent = "2.3.999 / 2012-02-26\n"
                             + "==================\n"
                             + "  * This is just an experimental core link with our core link"
                             + " script, no changes from lk are merged into webwerksatt\n"
                             + "2.1.1 / 2012-02-23\n"
                             + "==================\n"
                             + "  * Fixed name conflicts\n"
                             + "  * several cleanups\n"
                             + "  * impoted fixes from webwerkstatt\n"
                             + "2.1.0 / 2012-02-22\n"
                             + "==================\n"
                             + "  * Initial core link\n"
                             + "  * renamed and moved several modules to match our naming"
                             + " convention\n"
                             + "  * merged changes from webwerkstatt 2012-02-10...2012-02-22\n",
        gitLsRemote = "From git@github.com:rksm/LivelyKernel.git\n"
                    + "a0516950f073cdb8213d06852103814d70a4267e	refs/heads/JensLincke\n"
                    + "fdea4ae07f41bf74c0be887ee8854a465f900340	refs/heads/master\n"
                    + "b6d3758ca3c976a45cfd8cbd6fa0edc783911c13	refs/heads/merge-with-ww\n"
                    + "5f9c7da286654b0c3b6a12e2c247523c37f84a31	refs/heads/ww-mirror\n"
                    + "5f9c7da286654b0c3b6a12e2c247523c37f84a31	refs/heads/ww-mirror-2.3.888\n"
                    + "f78f062251a3e5b121a2159a1d78f8b845b9abfa	refs/heads/ww-mirror-script";

    module.exports = {
        setUp: function (callback) {
            callback();
        },

        testFindWWVersion: function (test) {
            fs = testHelper.fsForTest(test);
            fs.readFile.expect(
                {file: wwHistoryFile, data: wwHistoryFileContent});

            exec = testHelper.execForTest(test).expect(
                {cmd: 'svn up', cwd: 'foo/bar/ww/core'});

            findWWVersion(function(code, version) {
                test.equals(version, "2.3.999");
                fs.readFile.assertAllCalled();
                exec.assertAllCalled();
                test.done();
            });
        },

        testCheckoutExistingMirrorBranch: function (test) {
            exec = testHelper.execForTest(test).expect({
                cmd: 'git ls-remote --heads',
                cwd: 'foo/bar/ww-mirror',
                out: gitLsRemote
            }, {
                cmd: 'git checkout -b ww-mirror-2.3.888 -t origin/ww-mirror-2.3.888',
                cwd: 'foo/bar/ww-mirror'
            });

            checkoutMirrorBranchForVersion('2.3.888', function(code) {
                exec.assertAllCalled();
                test.done();
            });
        },

        testCreateAndSyncNonExistingMirrorBranch: function (test) {
            exec = testHelper.execForTest(test).expect({
                cmd: 'git ls-remote --heads',
                cwd: 'foo/bar/ww-mirror',
                out: gitLsRemote
            }, {
                cmd: 'git checkout -b ww-mirror-2.3.999',
                cwd: 'foo/bar/ww-mirror'
            }, {
                cmd: 'bin/lk sync --from-ww-to-lk --lk-dir foo/bar/ww-mirror --ww-dir foo/bar/ww',
                cwd: scriptsDir
            }, {
                cmd: 'git commit -am "Initial sync for ww-mirror-2.3.999"',
                cwd: mirrorDir
            });

            checkoutMirrorBranchForVersion('2.3.999', function(code) {
                exec.assertAllCalled();
                test.done();
            });
        },

        testRemoveLocalMirrorBranch: function(test) {
            exec = testHelper.execForTest(test).expect(
                {cmd: 'git checkout master && git branch ww-mirror-2.3.888 -D',
                 cwd: 'foo/bar/ww-mirror'});

            removeLocalMirrorBranchForVersion('2.3.888', function(code) {
                exec.assertAllCalled();
                test.done();
            });
        }
    }
}