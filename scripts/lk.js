
/*global exports, require, module, console, process, __dirname*/

var fs = require('fs'),
    path = require('path'),
    lkEnv = require('./env'),
    shell = require('./helper/shell'),
    spawn = require('child_process').spawn,
    async = require('async');

// -=-=-=-=-=-=-=-=-=-=-
// Subcommand class
// -=-=-=-=-=-=-=-=-=-=-
function Subcommand(filename, dir) { this.filename = filename; this.dir = dir; }

Subcommand.prototype.name = function() {
    return this.filename.replace(/^lk\-/, '').replace(/\.js|\.sh/, '');
};

Subcommand.prototype.spawnCmdAndArgs = function(args) {
    var isJs = /.js$/.test(this.filename),
        cmdPath = path.join(this.dir, this.filename),
        cmd = isJs ? process.env.NODE_BIN : cmdPath;
    var spawnArgs = args;
    if (isJs) {
        spawnArgs = [cmdPath].concat(spawnArgs);
    }
    return {cmd: cmd, args: spawnArgs};
};

Subcommand.prototype.spawn = function(args, onExit) {
    var spawnSpec = this.spawnCmdAndArgs(args),
        proc = spawn(spawnSpec.cmd, spawnSpec.args, { stdio: 'inherit' });
    onExit && proc.on('exit', function (code) { onExit(code); });
};

Subcommand.prototype.showHelp = function(thenDo) {
    this.spawn(['--help'], thenDo);
};

function printHelpForAllSubCommandsAndExit(nextArg) {
    var asMarkDown = nextArg === "--markdown";
    async.forEachSeries(subcommands, function(subcommand, next) {
        var name = 'lk ' + subcommand.name(),
            msg = asMarkDown ? "### " + name + '\n' : '-= ' + name + ' =-';
        if (asMarkDown) {
            msg = msg.replace(/Available options:(\n[\s\n]+\-.*)+/g,
                              function(match) { return match.split('\n').collect(function(ea) { return '    ' + ea }).join('\n'); })
        }
        console.log(msg);
        subcommand.showHelp(function() {
            console.log("\n");
            next();
        });
    }, function() { process.exit(0); })
}

// -=-=-=-=-=-=-=-=-=-=-
// lk def
// -=-=-=-=-=-=-=-=-=-=-
var subcommands = [];
var lk = {

    fs: fs,

    subcommands: function() { return subcommands; },

    getSubcommand: function(name) {
        for (var i = 0; i < subcommands.length; i++) {
            if (subcommands[i].name() == name) return subcommands[i];
        }
        return null;
    },

    readSubcommandsFrom: function(dir, cb) {
        this.fs.readdir(dir, function(err, files) {
            subcommands = subcommands.concat(lk.createSubcommands(dir, files));
            if (cb) cb(); });
    },

    createSubcommands: function(dir, fileNames) {
        return fileNames
               .filter(function(ea) { return (/^lk\-/).test(ea); })
               .map(function(ea) { return new Subcommand(ea, dir); });
    },

    showUsage: function() {
        var usage = "usage: lk [--version] [help] [help <subcommand>]\n"
                  + "          <subcommand> [<args>]\n";
        console.log(usage);
        var names = subcommands.map(function(ea) { return ea.name(); });
        console.log('Available subcommands:\n  ' + names.join('\n  '));
        console.log('\nRun \'lk help <subcommand>\' to get more information about '
                    + 'the specific subcommand.\n'
                    + 'Run \'lk help --all\' to get a complete overview '
                    + 'for all subcommands.\n'
                    + 'lk --version prints the current version of the lk-scripts');
    }

};


// -=-=-=-=-=-=-=-=-=-=-
// Stuff for shell usage
// -=-=-=-=-=-=-=-=-=-=-
var calledDirectly = require.main === module,
    scriptDir = __dirname || path.dirname(module.filename);

function processArgs(args) {

    var cmdName = args[0],
        cmdArgs = args.slice(1);

    if (!cmdName) {
        lk.showUsage();
        process.exit(0);
    }

    if (cmdName == 'help') {
        var subCmdName = cmdArgs[0],
            subCmd = lk.getSubcommand(subCmdName);
        if (subCmdName == "--all") {
            printHelpForAllSubCommandsAndExit(cmdArgs[1]);
        } else if (subCmd) {
            subCmd.showHelp(function() { process.exit(0); });
        } else {
            lk.showUsage();
            process.exit();
        }
        return;
    }

    if (cmdName == '--version' || cmdName == '-v') {
        var packagePath = path.join(process.env.LK_SCRIPTS_ROOT, 'package.json');
        fs.readFile(packagePath, function(err, out) {
            var json = JSON.parse(out.toString()),
            msg = "livelykernel-scripts version " + json.version;
            console.log(msg);
            process.exit(0);
        });
        return;
    }

    var subCmd = lk.getSubcommand(cmdName);
    if (!subCmd) {
        console.log('Unknown subcommand "' + cmdName + '"!');
        lk.showUsage();
        process.exit(1);
    }
    subCmd.spawn(cmdArgs, function(code) { process.exit(code); });
}


if (calledDirectly || !process.env.LK_SCRIPT_TEST_RUN) {
    if (calledDirectly) {
        lk.readSubcommandsFrom(scriptDir, function() {
            processArgs(process.argv.slice(2));
        });
    }

    // -=-=-=-=-=-=-=-=-=-=-
    // exports
    // -=-=-=-=-=-=-=-=-=-=-
    for (var name in lk) {
        exports[name] = lk[name];
    }

} else {

    // Test code
    var fsMock, testScriptDir = path.join('/foo/', 'bar/');

    exports.SubcommandTests = {
        setUp: function(run) {
            var fileNames = ['lk-foo.js', 'lk-bar-baz.sh', 'xxx.js'];
            fsMock = {readdir: function(dir, cb) { cb(null, fileNames); }};
            lk.fs = fsMock;
            lk.readSubcommandsFrom(testScriptDir);
            run();
        },

        "should list subcommands from file names": function(test) {
            var subs = lk.subcommands()
            test.equal(2, subs.length, "not two subcommands");
            test.equal('foo', subs[0].name(), "foo");
            test.equal('bar-baz', subs[1].name(), "bar-baz");
            test.done();
        },

        "should get subcommand": function(test) {
            var cmd = lk.getSubcommand('foo');
            test.equal('lk-foo.js', cmd.filename, "foo");
            test.done();
        },

        "should get spawn args js": function(test) {
            var cmd = lk.getSubcommand('foo'),
                spawnSpec = cmd.spawnCmdAndArgs(['--foo']);
            test.deepEqual({
                cmd: process.env.NODE_BIN,
                args: [path.join(testScriptDir, 'lk-foo.js'), '--foo']
            }, spawnSpec);
            test.done();
        },

        "should get spawn args sh": function(test) {
            var cmd = lk.getSubcommand('bar-baz'),
                spawnSpec = cmd.spawnCmdAndArgs(['--foo']);
            test.deepEqual({cmd: path.join(testScriptDir, 'lk-bar-baz.sh'), args: ['--foo']}, spawnSpec);
            test.done();
        }

    }

}
