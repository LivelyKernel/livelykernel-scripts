/*global QUnit, test, equal, same, raises, console, RepoDiffReporter*/

/*
continously run with:
nodemon --exec qunit \
        --code ./webwerkstatt_integration/diff_reporter.js \
        --tests ./webwerkstatt_integration/diff_reporter_test.js
*/

var fakeDiff = "Files /Users/robert/Dropbox/Projects/LivelyKernel/core/cop/CopBenchmark.js and /Users/robert/server/webwerkstatt/core/cop/CopBenchmark.js differ\n" +
  "Files /Users/robert/Dropbox/Projects/LivelyKernel/core/lively/Base.js and /Users/robert/server/webwerkstatt/core/lively/Base.js differ\n" +
  "Files /Users/robert/Dropbox/Projects/LivelyKernel/core/lively/ide/SystemCodeBrowser.js and /Users/robert/server/webwerkstatt/core/lively/ide/SystemCodeBrowser.js differ\n" +
  "Files /Users/robert/Dropbox/Projects/LivelyKernel/core/lively/localconfig.js and /Users/robert/server/webwerkstatt/core/lively/localconfig.js differ\n" +
  "Only in /Users/robert/Dropbox/Projects/LivelyKernel/core/cop: tests\n" +
  "Only in /Users/robert/Dropbox/Projects/LivelyKernel/core/lively/bindings: tests\n" +
  "Only in /Users/robert/server/webwerkstatt/core/: PartsBin\n" +
  "Only in /Users/robert/server/webwerkstatt/core/: apps\n" +
  "Only in /Users/robert/server/webwerkstatt/core/cop: BasicContextJS.html\n" +
  "Only in /Users/robert/server/webwerkstatt/core/cop: BasicContextJS.xhtml\n" +
  "Only in /Users/robert/server/webwerkstatt/core/lib: jslint.js\n" +
  "Only in /Users/robert/server/webwerkstatt/core/lib: jsuri.min.js\n" +
  "Only in /Users/robert/server/webwerkstatt/core/lib: markdown.css",
    filesOnlyInWW = ["core/PartsBin",
                     "core/apps",
                     "core/cop/BasicContextJS.html",
                     "core/cop/BasicContextJS.xhtml",
                     "core/lib/jslint.js",
                     "core/lib/jsuri.min.js",
                     "core/lib/markdown.css"],
    filesOnlyInLK = ["core/cop/tests",
                     "core/lively/bindings/tests"],
    diffingFiles = ["core/cop/CopBenchmark.js",
                    "core/lively/Base.js",
                    "core/lively/ide/SystemCodeBrowser.js",
                    "core/lively/localconfig.js"];


var rootLK = "/Users/robert/Dropbox/Projects/LivelyKernel/",
    rootWW = "/Users/robert/server/webwerkstatt/",
    sut;

QUnit.module('diff parsing short', {
    setup: function() {
        var settings = {
            lk: {root: rootLK, name: 'core', repoType: 'git'},
            ww: {root: rootWW, name: "webwerkstatt", repoType: 'svn'},
            repoUpdater: {}
        };
        sut = new RepoDiffReporter(settings);
        sut.parseDiffOutput(fakeDiff);
    },
    teardown: function() {}
});

test("find diffing files", function () {
    same(sut.filesDiffing(), diffingFiles, "files diffing");
});

test("find extra files", function () {
    same(sut.filesOnlyIn('lk'), filesOnlyInLK, "lk only");
    same(sut.filesOnlyIn('ww'), filesOnlyInWW, "ww only");
});

test("produce report calls repo updater", function () {
    var svnUpdateDir, gitUpdateDir,
        cbCalled, cb = function() { cbCalled = true };
    sut.repoUpdater = {
        updateSVN: function(dir, cb) { svnUpdateDir = dir; cb() },
        updateGIT: function(dir, cb) { gitUpdateDir = dir; cb() }
    }
    sut.produceResultThenDo(cb);
    equal(rootLK, gitUpdateDir, 'git update dir ' + gitUpdateDir);
    equal(rootWW, svnUpdateDir, 'svn update dir ' + svnUpdateDir);
    equal(true, cbCalled, 'result cb not called');
});
