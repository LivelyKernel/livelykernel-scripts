var async = require('async');

/*
 *
 * exports cherryPickAndCommit(exec, mergeSpec, lkDir)
 * this function reads in merge spec, cherry-picks all the specified revisions
 * (code and commit messages) of mergeSpec and creates a new (squashed) commit
 * out of it
 *
 * mergeSpec is a string that can look like:
 * "49c35be...1d5b160
 * 3685117...4e55644
 * athomschke, tab layouting fixes"
 * The first two lines specify revision (ranges) that should be included (can
 * also be one or more than two lines), the remaining lines are interpreted as
 * commit message that is added additionally to the commit messages of the specified
 * revisions (revision ranges).
 *
 * This is meant to be used to merge changes from the ww-mirror branch into lk-core
 *
 */

function isRevisionLine(line) {
    return /\.\.\.|^[a-z0-9]+$/.test(line);
}

function parseMergeSpec(mergeSpec) {
    var lines = mergeSpec.split('\n'),
        revLinesEnded = false,
        revs = [],
        commitLines = [];
    while (lines.length > 0) {
        var line = lines.shift();
        if (!revLinesEnded && isRevisionLine(line)) {
            revs.push(line);
        } else {
            revLinesEnded = true;
            commitLines.push(line);
        }
    }
    return {
        revisions: revs,
        commitMessage: commitLines.join('\n')
    }
}

function cherryPickAndCommit(exec, mergeSpec, lkDir, callback) {
    console.log('mergeSpec: ' + mergeSpec)
    var parsed = parseMergeSpec(mergeSpec),
        actions = [];

    // 1) cherry pick the revs
    actions = actions.concat(parsed.revisions.map(function(rev) {
        return function(callback) {
            exec('git cherry-pick -n ' + rev, {cwd: lkDir}, function(c, out, err) {
                console.log('cherry picking revision(s) ' + rev + ': ' + out + '\n' + err);
                callback(c);
            });
        }
    }));

    // 2) collect all real log messages from revisions
    var realLogMessages = [];
    actions = actions.concat(parsed.revisions.map(function(rev) {
        return function(callback) {
            exec('git log ' + rev + ' --format=format:"%B"', {cwd: lkDir}, function(c, out, err) {
                realLogMessages.push(out);
                callback(c);
            });
        }
    }));

    // 3) figure out the author by using the first rev
    var author = '';
    actions.push(function(callback) {
        var rev = parsed.revisions[0];
        exec('git log ' + rev + ' -1 --format=format:"%an"', {cwd: lkDir}, function(c, out, err) {
            author = out;
            callback(c);
        });
    });

    // 4) Now commit everything
    actions.push(function(callback) {
        var realLog = realLogMessages.join('\n\n'),
            cmd = "git commit"
                + " --author=\"" + author + "\""
                + " -am '" + parsed.commitMessage + (realLog != "" ? '\n\n\n' + realLog : "") + "'";
        console.log('Commiting...\n' + cmd);
        exec(cmd,
             {cwd: lkDir},
             function(c, out) { console.log(out); callback(c) });
    });

    async.series(actions, callback);
}

if (!process.env.LK_SCRIPT_TEST_RUN) {

    exports.cherryPickAndCommit = cherryPickAndCommit;

} else {

    /*
     * = = = = =
     * Test code
     * = = = = =
     */

    var testHelper = require('./../helper/test-helper');

    module.exports = {
        setUp: function (callback) {
            this.mergeSpec = "foo...bar\nbaz...zork\nboing, test commit\nsecond line";
            callback();
        },

        testRecognizeRevs: function (test) {
            var parsed = parseMergeSpec(this.mergeSpec);
            test.deepEqual(parsed.revisions, ['foo...bar', 'baz...zork']);
            test.deepEqual(parsed.commitMessage, 'boing, test commit\nsecond line');
            test.done();
        },

        testCherryPickAndCommit: function(test) {
            var exec = testHelper.execForTest(test).expect(
                {cmd: 'git cherry-pick -n foo...bar', cwd: 'foo/bar'},
                {cmd: 'git cherry-pick -n baz...zork', cwd: 'foo/bar'},
                {cmd: 'git log foo...bar --format=format:"%B"',
                 cwd: 'foo/bar', out: 'git commit log 1'},
                {cmd: 'git log baz...zork --format=format:"%B"',
                 cwd: 'foo/bar', out: 'git commit log 2'},
                {cmd: 'git log foo...bar -1 --format=format:"%an"',
                 cwd: 'foo/bar', out: 'some author'},
                {cmd: 'git commit --author="some author" -am '
                    + '\'boing, test commit\nsecond line\n\n\n'
                    + 'git commit log 1\n\ngit commit log 2\'',
                 cwd: 'foo/bar'});
            cherryPickAndCommit(exec, this.mergeSpec, 'foo/bar');
            exec.assertAllCalled(test);
            test.done();
        }
    };
}