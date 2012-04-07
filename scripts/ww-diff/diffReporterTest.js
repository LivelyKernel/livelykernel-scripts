/*global exports, require, console*/

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

var RepoDiffReporter = require('./diffReporter').RepoDiffReporter,
    rootLK = "/Users/robert/Dropbox/Projects/LivelyKernel/",
    rootWW = "/Users/robert/server/webwerkstatt/",
    sut, testSuite = {};

exports.DiffShortParserTest = {
    setUp: function(run) {
        var systemInterfaceMock = {
            updateSVN: function(dir, whenDone) { this.svnUpdateDir = dir; whenDone() },
            updateGIT: function(dir, whenDone) { this.gitUpdateDir = dir; whenDone() },
            quickDiff: function(dir1, dir2, whenDone) {
                this.diffDir1 = dir1, this.diffDir2 = dir2, whenDone(fakeDiff) },
            fileDiff: function(filePath, dir1, dir2, whenDone) {
                whenDone('diff for ' + filePath);
            },
            diff: function() {}
        }
        var settings = {
            systemInterface: systemInterfaceMock,
            lk: {root: rootLK, updateMethod: "updateGIT"},
            ww: {root: rootWW, updateMethod: "updateSVN"}
        };
        sut = new RepoDiffReporter(settings);
        run();
    },

    "find diffing files": function(test) {
        test.deepEqual(sut.filesDiffing(fakeDiff), diffingFiles, "files diffing");
        test.done();
    },

    "find extra files": function(test) {
        test.deepEqual(sut.filesOnlyIn('lk', fakeDiff), filesOnlyInLK, "lk only");
        test.deepEqual(sut.filesOnlyIn('ww', fakeDiff), filesOnlyInWW, "ww only");
        test.done();
    },

    "produce report calls updater": function(test) {
        var cbCalled, cb = function() { cbCalled = true },
            siMock = sut.systemInterface;
        sut.produceReportThenDo(cb);
        test.deepEqual(rootLK, siMock.gitUpdateDir, 'git update dir ');
        test.deepEqual(rootWW, siMock.svnUpdateDir, 'svn update dir ');
        test.deepEqual(true, cbCalled, 'result cb not called');
        test.done();
    },

    "produce report calls quick diff": function(test) {
        var called, done = function() { called = true },
            siMock = sut.systemInterface;
        sut.produceReportThenDo(done);
        test.deepEqual(called, true, 'quick diff not called');
        test.deepEqual(rootLK, siMock.diffDir2, "lk diff dir wrong");
        test.deepEqual(rootWW, siMock.diffDir1, 'ww diff dir wrong');
        test.done();
    },

    "produce report calls file diff": function(test) {
        var done = function(report) { result = report },
            siMock = sut.systemInterface,
            result;
        sut.produceReportThenDo(done);
        test.deepEqual(diffingFiles.length, Object.keys(result.fileDiffs).length,
                       'not produced (all) file diffs');
        diffingFiles.forEach(function(path) {
            test.deepEqual('diff for ' + path, result.fileDiffs[path],
                           "diff for " + path + "wrong");
        });
        test.done();
    },

    "report includes 'only' and 'diff' files": function(test) {
        var report;
        sut.produceReportThenDo(function(result) { report = result });
        test.deepEqual(report.onlyin.ww, filesOnlyInWW, 'ww only');
        test.deepEqual(report.onlyin.lk, filesOnlyInLK, 'lk only');
        test.deepEqual(report.diffingFiles, diffingFiles, 'diffing files');
        test.done();
    }

}