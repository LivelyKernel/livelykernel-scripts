/*global require, process, console, setTimeout*/
/*jshint immed: true, lastsemic: true, expr: true*/

/*
 *
 * This script runs as a post commit hook of the webwerkstatt svn repo.
 * It is invoke with:
 *
 * lk ww-mirror \
 *      --svn-repo /etc/environments/svn_repositories/webwerkstatt \
 *      --svn-wc /home/robert/webwerkstatt/git-core-mirror/ww/ \
 *      --git-repo /home/robert/webwerkstatt/git-core-mirror/svn-mirror/ \
 *      --rev 140250 \
 *      --lockfile /home/robert/webwerkstatt/git-core-mirror/mirror.lock
 */

var optparse = require('optparse'),
    exec     = require('child_process').exec,
    fs       = require('fs'),
    path     = require('path'),
    Seq      = require('seq'),
    env      = process.env;

var switches = [
    ['-h', '--help', "This tool requires a local path to a svn repository and a version number." +
                   "From that it will rsync"],
    ['--svn-repo DIR', "Path to svn repository"],
    ['--svn-wc DIR', "Path to SVN workingcopy that is svn updated and used as a source for the sync"],
    ['--git-repo DIR', "local path to the git repository with the branch that mirrors the svn reository"],
    ['--rev NUM', "svn revision that should be synced"],
    ['--lockfile FILE', "path to lock file used for synchronisation"]],
    parser = new optparse.OptionParser(switches),
    svnRepo, svnWc, rev, targetDir, gitRepoDir, lockFile;

function showHelpAndExit() { console.log(parser.toString()); process.exit(1); }
parser.banner = "This script will rsync the webwerkstatt core directory with the\n" +
    "ww-mirror branch of the Lively Kernel core repository. The commit message\n" +
    "includes the svn revision that was used for the sync.\n" +
    "The steps that are done:\n\n" +
    "1. lock using a file to not allow concurrent syncs (sync will wait a certain time)\n" +
    "2. if no core commit, unlock and do nothing\n" +
    "3. update webwerkstatt working copy\n" +
    "4. `lk sync` svn repo with git repo (takes care of deletions, renames)\n" +
    "5. git reset, clean, pull -- the git repo should be OK, just to be sure\n" +
    "6. git add, commit, push\n" +
    "7. unlock\n\n" +
    "The script is currently used as a post-commit hook for the webwerkstatt repository.";
parser.on("help",     showHelpAndExit);
parser.on("svn-repo", function(name, value) { svnRepo = value });
parser.on("svn-wc",   function(name, value) { svnWc = value });
parser.on("rev",      function(name, value) { rev = value });
parser.on("git-repo", function(name, value) { gitRepoDir = value });
parser.on("lockfile", function(name, value) { lockFile = value });

parser.parse(process.argv);

if (!rev || !svnRepo || !svnWc || !gitRepoDir || !lockFile) showHelpAndExit();

function run(cmd, cb, next, options) {
    exec(cmd, options, function() {
	      var invokeNext = cb.apply(this, arguments);
	      if (invokeNext) {
	          next();
	      } else {
	          next(1);
	          console.log('early exit');
	      }
    });
}

// -=-=-=-=-=-=-=-=-=-=-
// generic / rsync
// -=-=-=-=-=-=-=-=-=-=-
function syncWithGit() {
    var next = this;
    exec([env.LK_SCRIPTS_ROOT + "/bin/lk sync --from-ww-to-lk " +
          "--lk-dir ", gitRepoDir, " --ww-dir ", svnWc].join(''),
         function(code, out, err) { console.log("lk sync: " + out + "\n" + err); next(code) });
}

// -=-=-=-=-=-=-=-=-=-=-
// svn
// -=-=-=-=-=-=-=-=-=-=-
var svnInfo = {rev: rev, author: "", changes: "", msg: ""};

function checkIfCoreCommit(thenDo) {
    function testIfCoreCommit(err, committedFiles) {
        var lines = committedFiles.split('\n'),
            pattern = 'core/',
	    isCoreCommit = lines.some(function (line) { return line.indexOf(pattern) >= 0; });
	    console.log(rev + ' is core commit: ' + isCoreCommit);
        svnInfo.changes = committedFiles;
	    return isCoreCommit;
    }
    run(['svnlook', 'changed', svnRepo , '-r', rev].join(' '), testIfCoreCommit, this);
}

function updateWebwerkstattWorkingCopy() {
    run(['svn up', svnWc + '/core', '-r', rev].join(' '),
	function(err, out) { console.log('updated: ' + out); return true; }, this);
}

function findSVNAuthor() {
    run(['svnlook', 'author', svnRepo , '-r', rev].join(' '),
        function(err, out) { svnInfo.author = out.replace(/\n$/g, ''); return true; }, this);
}

function findSVNCommitMessage() {
    run(['svnlook', 'log', svnRepo , '-r', rev].join(' '),
       function(err, out) { svnInfo.msg = out; return true; }, this);
}

// -=-=-=-=-=-=-=-=-=-=-
// git commands
// -=-=-=-=-=-=-=-=-=-=-
function runGitCmd(cmd, name, next) {
    exec(cmd, {env: process.env, cwd: gitRepoDir},
	       function(code, out, err) {
	           console.log(['== ' + name + ' ==', code, out, err ? err : ''].join('\n'));
	           next(code, out, err); });
}

function gitClean() {
    runGitCmd('git reset --hard && git clean --force -d', 'CLEAN', this);
}

var coreVersion;
function findCoreVersion() {
    var next = this;
    function extractVersion(historyFileContent) {
        var regexp = /[0-9]+\.[0-9]+\.[0-9]+/g,
            match = historyFileContent.toString().match(regexp),
            version = match && match[0];
        return version;
    }

    var historyFile = path.join(svnWc, 'core/History.md'),
        content = fs.readFileSync(historyFile);

    coreVersion = extractVersion(content);
    next(null);
}

function mirrorBranchName() {
    var name = 'ww-mirror';
    if (coreVersion) {
        name += "-" + coreVersion;
    }
    return name;
}

function gitPull() { // should not be necessary but just to be sure...
    runGitCmd('git pull --rebase origin ' + mirrorBranchName(), 'PULL', this);
}

function gitCheckoutBranch() { // should not be necessary but just to be sure...
    var next = this,
        branch = mirrorBranchName();
    runGitCmd('git branch', 'branch read', function(code, out) {
        var cmd = "git checkout ";
        if (out.toString().indexOf(branch) == -1) {
            cmd += '-b ' + branch + ' origin/' + branch;
        } else {
            cmd += branch;
        }
        runGitCmd(cmd, 'checkout branch', next);
    });
}

function gitCommitAndPush() {
    var cmd = ['git commit --author="', svnInfo.author || 'webwerkstatt ghost',
               ' <lively-kernel@hpi.uni-potsdam.de>" ',
               '-am \'[mirror commit]\n', JSON.stringify(svnInfo, null, 2), '\'; ',
	             'git push origin ', mirrorBranchName()].join('');
    console.log(cmd);
    runGitCmd(cmd, 'PUSH', this);
}

// -=-=-=-=-=-=-=-=-=-=-
// lock / unlock
// -=-=-=-=-=-=-=-=-=-=-
var timeout = Date.now() + 5000;
function lock() {
    if (Date.now() > timeout) {
        console.error('lock file was not unlocked, abort mirror');
        process.exit(1);
    }
    var next = this;
    try {
        fs.statSync(lockFile);
        console.log('is locked, waiting');
        setTimeout(function() { lock.call(next); }, 200);
    } catch (e) {
        // if error, means that file not there, we are ready to go
        fs.writeFileSync(lockFile, 'locked by mirror script, rev ' + rev);
        console.log('lock aquired');
        next();
    }
}

function unlock() {
    var next = typeof this == 'function' && this;
    Seq().
        seq(fs.unlink, lockFile, Seq).
        seq(function() { console.log('unlocked'); next && next(); });
}

// -=-=-=-=-=-=-=-=-=-=-
// let it run
// -=-=-=-=-=-=-=-=-=-=-
try {
    Seq().
        seq(lock).
        seq(checkIfCoreCommit).
        seq(findSVNAuthor).
        seq(findSVNCommitMessage).
        seq(findCoreVersion).
        seq(gitClean).
        seq(gitPull).
        seq(gitCheckoutBranch).
        seq(updateWebwerkstattWorkingCopy).
        seq(syncWithGit).
        seq(gitCommitAndPush).
        seq(unlock).
        catch(unlock);
} catch(e) {
    console.log('Error: ' + e);
    Seq().seq(unlock);
}