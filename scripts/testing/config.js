/*globals */
// see http://peter.sh/experiments/chromium-command-line-switches/
var chromeArgs =   ["--no-process-singleton-dialog",
                    "--user-data-dir=/tmp/", "--no-first-run",
                    "--disable-default-apps",
                    //"--no-startup-window",
                    "--disable-history-quick-provider",
                    "--disable-history-url-provider",
                    "--disable-breakpad",
                    "--disable-background-mode",
                    "--disable-background-networking",
                    "--disable-preconnect", "--disabled"],
    firefoxArgs =  [];

var Config = {

    timeout: 300,
    // ------------- what system do you want to test on?
    defaultBrowser: "chrome",
    defaultNotifier: "growlnotify",

    testScript: "run_tests.js",
    testWorld: "run_tests.xhtml",

    server: "localhost",
    port: 4444,

    verbose: false,

    testFilter: null,
    display: null,
    
    platformConfigs: {
        "darwin": {
            "chrome": {
                path: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                args: chromeArgs
            },
            "firefox": {
                path: "/Applications/Firefox.app/Contents/MacOS/firefox",
                args: firefoxArgs
            }
        },
        "linux": {
            "chrome": {
                path: "/usr/bin/chromium-browser",
                args: chromeArgs
            },
            "firefox": {
                path: "/usr/bin/firefox",
                args: firefoxArgs
            }
        }
    }
};

module.exports = Config;
