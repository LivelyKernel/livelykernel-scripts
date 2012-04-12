/*global process, require, export*/

var path = require('path'),
    async = require('async'),
    env = process.env;

/*
 * This function publishes the livelykernel-scripts project.
 * It runs the following steps:
 * 1. update package json
 * 2. check if the new version is in History.md
 * 2. git add && git ci
 * 3. git tag
 * 4. git push
 * 5. git tag push
 * 6. npm publish
 *
 * optionalVersion can either be a version in the format x.y.z (a string)
 * or null. If null, the existing minor version (z) is increased
 *
 */
function publish(env, optionalVersion, repoDir) {
    var fs = env.fs,
        exec = env.exec,
        packageFile = path.join(repoDir, 'package.json'),
        packageContent, newPackageContent,
        newVersion;

    async.series([
        function readPackageJSON(next) {
            fs.readFile(packageFile, function(code, data) {
                packageContent = data.toString();
                console.log('Reading ' + packageFile + ':\n' + packageContent);
                next(code);
            });
        },
        function createNewPackageContent(next) {
            newPackageContent = newPackageSrc(packageContent);
            newVersion = extractVersionFrom(newPackageContent);
            next();
        },
        function checkHistoryFile(next) {
            checkHistoryMd(env.fs, repoDir, newVersion, next);
        },
        function output(next) {
            console.log("Publishing new version " + newVersion);
            next();
        },
        function writePackageJSON(next) {
            fs.writeFile(packageFile, newPackageContent, next);
        },
        function commitPackageJSON(next) {
            exec('git add package.json && git ci -m "version ' + newVersion + '"',
                 {cwd: repoDir}, function(code, out, err) {
                     console.log(out);
                     if (err) console.log(err);
                     next(code);
                 });
        },
        function gitTag(next) {
            exec('git tag ' + newVersion, {cwd: repoDir}, function(code, out, err) {
                console.log(out);
                if (err) console.log(err);
                next(code);
            });
        },
        function gitPush(next) {
            exec('git push && git push --tags', {cwd: repoDir}, function(code, out, err) {
                console.log(out);
                if (err) console.log(err);
                next(code);
            });
        },
        function npmPublish(next) {
            exec('npm publish', {cwd: repoDir}, function(code, out, err) {
                console.log(out);
                if (err) console.log(err);
                console.log('done publishing ' + newVersion);
                next(code);
            });
        },
    ]);
}

function newPackageSrc(oldPackageContent, optVersion) {
    var oldVersion = extractVersionFrom(oldPackageContent),
        newVersion = optVersion || incVersion(oldVersion);
    return oldPackageContent.replace(oldVersion, newVersion);
}

function extractVersionFrom(src) {
    var match = src.match(/"version":\s*"([^,]+)"/);
    if (!match) {
        console.error('Cannot extract version from ' + src);
        process.exit(1);
    }
    return match[1];
}

function parseVersion(version, nullify) {
    var regexp = /^([0-9]*)\.?([0-9]*)\.?([0-9]*)$/,
        match = version.match(regexp),
        result = match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [];
    if (nullify) {
        result[0] = result[0] || 0; result[1] = result[1] || 0; result[2] = result[2] || 0;
    }
    return result;
}

function incVersion(version) {
    var parsed = parseVersion(version, true);
    parsed[0] = parsed[0] || 0; parsed[1] = parsed[1] || 0; parsed[2] = parsed[2] || 0;
    parsed[2]++;
    return parsed.join('.');
}

function isValidVersion(version) {
    var parsed = parseVersion(version);
    return parsed && typeof parsed[0] == 'number';
}

function checkHistoryMd(fs, repoDir, version, next) {
    var historyMd = path.join(repoDir, 'History.md');
    fs.readFile(historyMd, function(code, data) {
        if (data.toString().indexOf(version) === -1) {
            throw new Error('No entry for ' + version + ' in ' + historyMd);
        }
        next(code);
    });
}

if (!env.LK_SCRIPT_TEST_RUN) {

    var args           = require('./helper/args'),
        fs             = require('fs'),
        exec           = require('child_process').exec;

    // -=-=-=-=-=-=-=-=-=-=-
    // script options
    // -=-=-=-=-=-=-=-=-=-=-
    var options = args.options([
        ['-h', '--help', 'Show this help'],
        ['-t', '--tag TAG', 'New version tag, in the form of x.y.z.']],
        {},
        "publish a new version of livelykernel-sripts");

    if (options.defined('tag') && !isValidVersion(options.tag)) {
        console.error('tag ' + options.tag + ' has not the form x.y.z');
        process.exit(1);
    }

    publish({fs: fs, exec: exec}, options.tag, env.LK_SCRIPTS_ROOT);

} else {

    /*
     * = = = = =
     * Test code
     * = = = = =
     */

    var testHelper = require('./helper/test-helper');

    module.exports = {
        setUp: function (callback) {
            this.packageJSONSrc = "{\n" +
                "  \"author\": \"The Lively Kernel Team <lively-kernel@hpi.uni-potsdam.de>\",\n" +
                "  \"name\": \"livelykernel-scripts\",\n" +
                "  \"description\": \"Foo\",\n" +
                "  \"version\": \"0.0.6\",\n" +
                "  \"homepage\": \"http://lively-kernel.org\",\n" +
                "  \"repository\": {\n" +
                "    \"type\": \"git\",\n" +
                "    \"url\": \"git@github.com:rksm/livelykernel-scripts.git\"\n" +
                "  },\n" +
                "  \"engines\": {\"node\": \"~0.6.7\"},\n" +
                "  \"bin\" : {\n" +
                "    \"lk\" : \"./bin/lk\"\n" +
                "  },\n" +
                "  \"dependencies\": {}\n" +
                "}";
            this.packageJSONSrcWithMinorInc = this.packageJSONSrc.replace('0.0.6', '0.0.7');
            this.scriptDir = 'foo/bar';
            this.packageFile = this.scriptDir + '/package.json';
            this.historyFile = this.scriptDir + '/History.md';
            callback();
        },

        testExtractVersion: function(test) {
            test.equals(extractVersionFrom(this.packageJSONSrc), '0.0.6');
            test.done();
        },

        testIncVersion: function(test) {
            test.equals(incVersion('0.0.6'), '0.0.7');
            test.equals(incVersion('0.1'), '0.1.1');
            test.equals(incVersion('1.1'), '1.1.1');
            test.equals(incVersion('1'), '1.0.1');
            test.done();
        },

        testUpdatedPackageContent: function(test) {
            test.equals(newPackageSrc(this.packageJSONSrc), this.packageJSONSrcWithMinorInc);
            test.equals(newPackageSrc(this.packageJSONSrc, '3.2.1'),
                        this.packageJSONSrc.replace('0.0.6', '3.2.1'));
            test.done();
        },

        testValidateNewVersion: function(test) {
            test.ok(isValidVersion('0.1.2'), '0.1.2');
            test.ok(isValidVersion('0.1'), '0.1');
            test.ok(isValidVersion('033'), '033');
            test.ok(!isValidVersion('csfsd'), 'csfsd');
            test.ok(!isValidVersion('23x2'), '23x2');
            test.done();
        },

        testPublish: function (test) {
            var fs = testHelper.fsForTest(test);
            fs.readFile.expect(
                {file: this.packageFile, data: this.packageJSONSrc});
            fs.readFile.expect(
                {file: this.historyFile, data: "0.0.7 / 2012-04-06\n"
                                             +"==================\n"
                                             + "  * ...\n"});
            fs.writeFile.expect(
                {file: this.packageFile, data: this.packageJSONSrcWithMinorInc});
            var exec = testHelper.execForTest(test).expect(
                {cmd: 'git add package.json && git ci -m "version 0.0.7"', cwd: 'foo/bar'},
                {cmd: 'git tag 0.0.7', cwd: 'foo/bar'},
                {cmd: 'git push && git push --tags', cwd: 'foo/bar'},
                {cmd: 'npm publish', cwd: 'foo/bar'});

            publish({fs: fs, exec: exec}, null, this.scriptDir);
            fs.readFile.assertAllCalled();
            fs.writeFile.assertAllCalled();
            exec.assertAllCalled();
            test.done();
        }
    }
}