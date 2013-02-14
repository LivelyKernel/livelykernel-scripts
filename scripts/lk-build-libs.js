/*global require, process, console*/

/*
 * lk build-libs --lk-dir .
 *
 */

var args   = require('./helper/args'),
    fs     = require('fs'),
    exec   = require('child_process').exec,
    async  = require('async'),
    path   = require('path'),
    http   = require('http'),
    https  = require('https'),
    url    = require('url'),
    dryice = require('dryice'),
    env    = process.env;


// -=-=-=-=-=-=-=-=-=-=-
// script options
// -=-=-=-=-=-=-=-=-=-=-

var options = args.options([
    ['-h', '--help', 'Show this help'],
    ['--lk-dir DIR', 'Path to Lively Kernel core directory']],
    {},
    "Used for assembling / compiling / minimizing the necessary lib files for Lively.");

if (!options.lkDir && env.WORKSPACE_LK_EXISTS) {
    options.lkDir = env.WORKSPACE_LK;
}

if (!options.lkDir) {
    options.showHelpAndExit();
}


// -=-=-=-=-=-=-=-=-=-=-
// the real thing
// -=-=-=-=-=-=-=-=-=-=-
function store(filePath, data, thenDo) {
    fs.writeFile(filePath, data, function() {
        console.log("storing all libs in %s (%skb)",
                    filePath, Math.round((data.length / 1024) * 100) / 100);
        thenDo && thenDo();
    });
}

function download(urlString, thenDo) {
    var data = '',
        fileName = urlString.substring(urlString.lastIndexOf('/') + 1),
        urlParsed = url.parse(urlString),
        secure = urlParsed.protocol === 'https:',
        get = secure ? https.get : http.get,
        proxyFromEnv = env[secure ? 'https_proxy' : 'http_proxy'],
        proxy = proxyFromEnv && url.parse(proxyFromEnv),
        getOptions = proxy ? {host: proxy.hostname, port: proxy.port, path: urlParsed.hostname}
                           : {host: urlParsed.host, path: urlParsed.path};
    console.log('Downloading %s ...', fileName);
    comment += ' * ' + fileName + '\n';
    get(getOptions, function(res) {
        res.on('data', function (chunk) { data += chunk; })
        res.on('end', function() { thenDo(null, '//! ' + urlString + '\n' + data) })
    }).on('error', function(e) {
        console.error("Error when trying to download %s: %s", urlString, e.message); })
}

function downloadAndModify(urlString, modifyFunc, thenDo) {
    download(urlString, function(err, data) { thenDo(null, modifyFunc(data)); });
}

function copyLocal(relativePath, thenDo) {
    var fullPath = path.join(env.LK_SCRIPTS_ROOT, relativePath),
        name = path.basename(fullPath);
    console.log('Reading %s...', name);
    comment += ' * ' + name + '\n';
    fs.readFile(fullPath, function(err, data) { thenDo(err, '// ' + relativePath + '\n' + data) });
}

function write(next, filename, err, allData) {
    store(path.join(options.lkDir, filename), [comment + " */"].concat(allData).join('\n\n'));
    next && next();
}

function resetComment(next) {
    comment = "/*\n * This file was compiled with \"lk build-libs\" on "
            + new Date().toUTCString() + " with the libs:\n";
    next();
}

function gitClone(options, next) {
    var dir = path.join(env.LK_SCRIPTS_ROOT, options.to);
    async.waterfall([
        function(next) { fs.exists(dir, function(exists) { next(null, exists); }); },
        function(exists, next) {
            if (!exists) { next(); return; }
            console.log("%s exists, removing it... ", dir);
            exec('rm -rfd ' + dir, function(code, out, err) {
                if (code) { console.error('rm: %s', err); }
                console.log('done');
                next(code);
            })
        }
    ], function(err) {
        console.log("git clone %s -> %s... ", options.url, dir);
        exec("git clone " + options.url + " " + dir, function(code, out, err) {
            if (code) { console.error("git clone: " + err); }
            else { console.log('done.'); }
            next(code);
        })
    })
}

function dryicePackage(spec, next) {
    spec.dest = path.join(options.lkDir, spec.dest);
    console.log("dryice %s -> %s", spec.source.root, spec.dest);
    dryice.copy(spec);
    next(null);
}

function createCoreLibs(next) {
    console.log("Packaging core libs...");
    var urls = {
        jquery: {
            src: "http://code.jquery.com/jquery-1.8.2.js",
            minified: "http://code.jquery.com/jquery-1.8.2.min.js"
        },
        jqueryBounds: {
            src: "https://raw.github.com/rksm/jquery-bounds/master/jquery-bounds.js",
            minify: function(code) { return require('uglify-js')(code); }
        },
        es5Shim: {
            src: "https://raw.github.com/kriskowal/es5-shim/v2.0.5/es5-shim.js",
            minified: "https://raw.github.com/kriskowal/es5-shim/v2.0.5/es5-shim.min.js"
        }
    },
        downloadsMinified = [
            download.bind(global, urls.jquery.minified),
            downloadAndModify.bind(global, urls.jqueryBounds.src, urls.jqueryBounds.minify),
            download.bind(global, urls.es5Shim.minified)
        ],
        downloadsDebug = [
            download.bind(global, urls.jquery.src),
            download.bind(global, urls.jqueryBounds.src),
            download.bind(global, urls.es5Shim.src)
        ],
        localLibs = [copyLocal.bind(global, "resources/pre-lib/requestAnimationFrame.js"),
                     copyLocal.bind(global, "resources/pre-lib/IE-fixes.js")],

        comment = '';

    async.series([
        function(next) {
            async.series(
                [resetComment].concat(downloadsMinified).concat(localLibs),
                write.bind(global, next, 'core/lib/lively-libs.js'))
        },
        function(next) {
            async.series(
                [resetComment].concat(downloadsDebug).concat(localLibs),
                write.bind(global, next, 'core/lib/lively-libs-debug.js'))
        }
    ], function(err) { next && next() });
}

function createExternalLibs(next) {
    // package up ace
    console.log("Packaging external libs...");
    async.series([
        gitClone.bind(global, {
            url: "https://github.com/ajaxorg/ace-builds.git",
            to: "resources/pre-lib/ace-builds"}),
        dryicePackage.bind(global, {
            source: {root: "resources/pre-lib/ace-builds/src-min-noconflict"},
            dest: "core/lib/lively-ace.min.js"}),
        dryicePackage.bind(global, {
            source: {root: "resources/pre-lib/ace-builds/src-noconflict"},
            dest: "core/lib/lively-ace.js"})
    ], function(err) { next && next() });
}

async.series([createCoreLibs, createExternalLibs]);