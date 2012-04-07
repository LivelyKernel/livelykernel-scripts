/*global require, exports, process, console*/

// interactive shell commands
// see http://groups.google.com/group/nodejs/browse_thread/thread/6fd25d16b250aa7d
var spawn = require('child_process').spawn,
    exec  = require('child_process').exec,
    tty   = require('tty'),
    fs    = require('fs'),
    path  = require('path'),
    Seq   = require('seq');


function call(cmd, args, cb, options, verbose) {
    var ffi         = require("node-ffi"),
        systemCall  = new ffi.Library(null, {"system": ["int32", ["string"]]}).system,
        completeCmd = cmd + ' ' + args.join(' ');
    systemCall(completeCmd);
    cb && cb();
}

exports.call = call;

function callShowOutput(cmd, args, cb, options, verbose) {
    var proc = spawn(cmd, args, options),
        out, err;

    proc.stdout.on('data', function (data) {
        out += data.toString();
        console.log(data.toString());
    });

    proc.stderr.on('data', function (data) {
        err += data.toString();
        console.log(data.toString());
    });

    proc.on('exit', function (code) {
        cb && cb(code, out, err);
    });
}

exports.callShowOutput = callShowOutput;

// ---------------------------------------------
// stuff below is still WIP

function run(cmd, cb, options, verbose) {
    exec(cmd, options, function(code, out, err) {
        if (verbose) {
            var msg = cmd;
            if (code) { msg += '\ncode: ' + code };
            if (out) { msg += '\nout: ' + out };
            if (err) { msg += '\nerr: ' + err };
            console.log(msg);
        }
        cb && cb(out, code, err); });
}

function runVerbose(cmd, cb, options) {
    run(cmd, cb, options, true);
}

function pipe(cmds) {
    var value;
    var seq = Seq();
    // cmds.forEach(function(cmd) {
    //     if (typeof cmd == 'function') {
    //         var returned = cmd(value);
    //         if (returned) { value = returned; return }
    //     }
    // });
    return cmds;
}

exports.run = run;
exports.runV = runVerbose;
exports.runAll = runVerbose;
exports.pipe = pipe;


/*
 * file helpers
 */
function files(dir, matcher) {
    var files = fs.readdirSync(dir).map(function(ea) { return path.join(dir, ea) });
    if (matcher) {
        files = files.filter(function(ea) { return  matcher.test(ea) });
    }
    return files;
}
exports.files = files;