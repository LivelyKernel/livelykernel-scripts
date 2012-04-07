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
        var dataString = data.toString();
        out += dataString;
        process.stdout.write(dataString);
    });

    proc.stderr.on('data', function (data) {
        var dataString = data.toString();
        err += dataString;
        process.stdout.write(dataString);
    });

    proc.on('exit', function (code) { cb && cb(code, out, err); });

    return proc;
}

exports.callShowOutput = callShowOutput;
exports.run = callShowOutput;

// ---------------------------------------------
// stuff below is still WIP

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