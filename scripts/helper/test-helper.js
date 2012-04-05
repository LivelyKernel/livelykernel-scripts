// genericMock when called with a spyFactory and a nodeunit test object
// can simulate something like the exec function
function genericMock(spyFactory, test) {
    var spies = [], spyIndex = 0;

    function run() {
        var spy = spies[spyIndex];
        spyIndex++;
        if (!spy) {
            throw new Error('unepectedly trying to call: ' + arguments[0]);
        }
        spy.apply(null, arguments);
    }

    run.expect = function(/*args*/) {
        for (var i = 0; i < arguments.length; i++) {
            spies.push(spyFactory(test, arguments[i]));
        }
        return run;
    }

    run.assertAllCalled = function() {
        spies.forEach(function(spy) {
            test.equal(spy.called, 1, 'spy called not called: ' + spy);
        });
    }

    run.toString = function() {
        return 'Mock< spies:' + spies.join('\n') + '>';
    }

    return run;
}

//
// exec
//

function execEquals(test, actualCommand, expectedCmd, actualCwd, expectedCwd) {
    test.equal(actualCommand, expectedCmd);
    test.equal(actualCwd, expectedCwd);
}

function createExecSpy(test, spec) {
    var spy = function(cmd, options, callback) {
        spy.called++;
        execEquals(test, cmd, spec.cmd, options.cwd, spec.cwd);
        if (!callback) {
            throw new Error('No callback for ' + spy);
        }
        callback(spec.code || null, spec.out || "");
    }
    spy.called = 0;
    spy.toString = function() { return 'execSpy<' + spec.cmd + '>' };
    return spy;
}

exports.execForTest = genericMock.bind(null, createExecSpy);

//
// fs
//

function fsWriteEquals(test, actualFile, expectedFile, actualWriteContent, expectedWriteContent) {
    test.equal(actualFile, expectedFile);
    test.equal(actualWriteContent, expectedWriteContent);
}

function createFsWriteSpy(test, spec) {
    var spy = function(fn, data, callback) {
        spy.called++;
        fsWriteEquals(test, fn, spec.file, data, spec.data);
        callback(spec.code || null);
    }
    spy.called = 0;
    spy.toString = function() { return 'fsWriteSpy<' + spec.file + '>' };
    return spy;
}

function fsReadEquals(test, actualFile, expectedFile) {
    test.equal(actualFile, expectedFile);
}

function createFsReadSpy(test, spec) {
    var spy = function(fn, callback) {
        spy.called++;
        fsWriteEquals(test, fn, spec.file);
        callback(spec.code || null, spec.data || '');
    }
    spy.called = 0;
    spy.toString = function() { return 'fsReadSpy<' + spec.file + '>' };
    return spy;
}

exports.fsForTest = function(test) {
    return {
        writeFile: genericMock(createFsWriteSpy, test),
        readFile: genericMock(createFsReadSpy, test)
    }
}