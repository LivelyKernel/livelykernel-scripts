function execEquals(test, actualCommand, expectedCmd, actualCwd, expectedCwd) {
    test.equal(actualCommand, expectedCmd);
    test.equal(actualCwd, expectedCwd);
}

function createExecSpy(test, spec) {
    var spy = function(cmd, options, callback) {
        spy.called++;
        execEquals(test, cmd, spec.cmd, options.cwd, spec.cwd);
        callback(spec.code || null, spec.out || "");
    }
    spy.called = 0;
    spy.toString = function() { return 'execSpy<' + spec.cmd + '>' };
    return spy;
}

function execForTest(test) {
    var spies = [], spyIndex = 0;

    function exec() {
        var spy = spies[spyIndex];
        spyIndex++;
        if (!spy) {
            throw new Error('unepectedly trying to call exec: ' + arguments[0]);
        }
        spy.apply(null, arguments);
    }

    exec.expect = function(/*args*/) {
        for (var i = 0; i < arguments.length; i++) {
            spies.push(createExecSpy(test, arguments[i]));
        }
        return exec;
    }

    exec.assertAllCalled = function() {
        spies.forEach(function(spy) {
            test.equal(spy.called, 1, 'spy called not called: ' + spy);
        });
    }

    return exec;
}

exports.execForTest = execForTest;