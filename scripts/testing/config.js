/*globals */
// see http://peter.sh/experiments/chromium-command-line-switches/
var chromeTmpDir = '/tmp/chrom-for-lively/',
    chromeArgs =   ["--no-process-singleton-dialog",
                    "--user-data-dir=" + chromeTmpDir,
                    "--no-first-run",
                    "--disable-default-apps",
                    // "--no-startup-window",
                    "--disable-history-quick-provider",
                    "--disable-history-url-provider",
                    "--disable-breakpad",
                    "--disable-restore-session-state",
                    "--disable-restore-background-contents",
                    "--disable-tab-closeable-state-watcher",
                    "--disable-background-mode",
                    "--disable-background-networking",
                    "--disable-preconnect", "--disabled"],
    firefoxArgs =  [];

var Config = {

    platformConfigs: {
        "darwin": {
            "chrome": {
                path: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                args: chromeArgs,
                tmpDir: chromeTmpDir
            },
            "firefox": {
                path: "/Applications/Firefox.app/Contents/MacOS/firefox",
                args: firefoxArgs
            }
        },
        "linux": {
            "chrome": {
                path: "/usr/bin/chromium-browser",
                args: chromeArgs,
                tmpDir: chromeTmpDir
            },
            "firefox": {
                path: "/usr/bin/firefox",
                args: firefoxArgs
            }
        }
    }
};

module.exports = Config;
