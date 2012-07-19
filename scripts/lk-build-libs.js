/*global require, process, console*/

/*
 * lk build-libs --lk-dir .
 *
 */

var args  = require('./helper/args'),
    fs    = require('fs'),
    async = require('async'),
    path  = require('path'),
    http  = require('http'),
    https = require('https'),
    url   = require('url'),
    env   = process.env;


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
        get = urlParsed.protocol === 'https:' ? https.get : http.get;

    console.log('Downloading %s...', fileName);
    comment += ' * ' + fileName + '\n';
    get({host: urlParsed.host, path: urlParsed.path}, function(res) {
        res.on('data', function (chunk) { data += chunk; })
        res.on('end', function() { thenDo(null, '// ' + urlString + '\n' + data) })
    }).on('error', function(e) {
        console.error("Error when trying to download %s: %s", urlString, e.message); })
}

function copyLocal(relativePath, thenDo) {
    var fullPath = path.join(env.LK_SCRIPTS_ROOT, relativePath),
        name = path.basename(fullPath);
    console.log('Reading %s...', name);
    comment += ' * ' + name + '\n';
    fs.readFile(fullPath, function(err, data) { thenDo(err, '// ' + relativePath + '\n' + data) });
}

function downloadAndModify(urlString, modifyFunc, thenDo) {
    download(urlString, function(err, data) { thenDo(null, modifyFunc(data)); });
}

var comment = "/*\n"
            + " * This file was compiled on " + new Date().toUTCString() + " with the libs:\n",
    downloads = [
        download.bind(global, "http://code.jquery.com/jquery-1.7.2.min.js"),
        download.bind(global, "https://raw.github.com/kriskowal/es5-shim/v1.2.10/es5-shim.min.js")],
    localLibs = [copyLocal.bind(global, "resources/pre-lib/requestAnimationFrame.js")];

async.series(
    downloads.concat(localLibs),
    function(err, allData) {
        comment += " */";
        store(
            path.join(options.lkDir, 'core/lib/lively-libs.js'),
            [comment].concat(allData).join('\n\n'));
    });