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

    // 3) Now commit everything
    actions.push(function(callback) {
        var realLog = realLogMessages.join('\n\n');
        exec("git commit -am '"
            + parsed.commitMessage + (realLog != "" ? '\n\n\n' + realLog : "")
            + "'",
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

    function execEquals(test, actualCommand, expectedCmd, actualCwd, expectedCwd) {
        test.equal(actualCommand, expectedCmd);
        test.equal(actualCwd, expectedCwd);
    }

    function execSpy(test, spec, args) {
        var spy = function(cmd, options, callback) {
            spy.called++;
            execEquals(test, cmd, spec.cmd, options.cwd, spec.cwd);
            callback(spec.code || null, spec.out || "");
        }
        spy.called = 0;
        spy.toString = function() { return 'execSpy<' + spec.cmd + '>' };
        return spy;
    }

    function execMock(spies) {
        var mySpies = [].concat(spies);
        return function() {
            var spy = mySpies.shift();
            spy.apply(null, arguments);
        }
    }

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
            var execSpies = [
                execSpy(test, {cmd: 'git cherry-pick -n foo...bar', cwd: 'foo/bar'}),
                execSpy(test, {cmd: 'git cherry-pick -n baz...zork', cwd: 'foo/bar'}),
                execSpy(test, {cmd: 'git log foo...bar --format=format:"%B"', cwd: 'foo/bar', out: 'git commit log 1'}),
                execSpy(test, {cmd: 'git log baz...zork --format=format:"%B"', cwd: 'foo/bar', out: 'git commit log 2'}),
                execSpy(test, {cmd: 'git commit -am \'boing, test commit\nsecond line\n\n\ngit commit log 1\n\ngit commit log 2\'', cwd: 'foo/bar'})
            ];
            cherryPickAndCommit(execMock(execSpies), this.mergeSpec, 'foo/bar');
            execSpies.forEach(function(spy) {
                test.equal(spy.called, 1, 'spy called? ' + spy);
            });
            test.done();
        }
    };
}