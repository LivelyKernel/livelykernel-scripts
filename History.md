0.1.22 / 2013-10-11
===================
* --db-config option, replaces --object-db-file

0.1.21 / 2013-10-11
===================
* enable to pass server option --object-db-file for object storage provided by
  lively-davfs
* lk server --no-subserver fixed
* lk test fixed on windows

0.1.20 / 2013-08-01
===================
* enable JS harmony features in Chrome

0.1.19 / 2013-07-01
===================
* chrome logs console to stderr

0.1.18 / 2013-07-01
===================
* bump life_star: no manifest
* install.sh fix

0.1.17 / 2013-06-20
===================
* don't enable manifest by default

0.1.16 / 2013-05-28
===================
* manifest uri escapes its entries
* life_star dep fix

0.1.15 / 2013-05-12
===================
* life_star now exposes server for inspection & modifiaction

0.1.14 / 2013-04-01
===================

* subservers: by default putting new subservers into
   `WORKSPACE_LK/core/servers/`
* adding websocket support so that subservers can register websocket handlers
* enabling travis tests

0.1.13 / 2013-03-22
===================

* `lk-test` support for running the tests in plain nodejs without starting a
  browser

0.1.12 / 2013-03-11
===================

* node 0.10 compatibility

0.1.11 / 2013-01-21
===================

* life_star now supports browser application caching via manifest mechnism

0.1.10 / 2013-01-15
==================

* adding subservers via commandline arg

0.1.9 / 2013-01-11
==================

* reverting automatic html/xhtml world lookup due to travis issues

0.1.8 / 2013-01-09
==================

* adding logging to debug test runs

0.1.7 / 2013-01-08
==================

* life_star / jsDAV fix

0.1.6 / 2013-01-03
==================

* lk test support for html test worlds
* jQuery 1.8 lib
* adding convenience output to test results to re-run test manually
* improved server logging (forever log output option, pass in log level)

0.1.5 / 2012-10-16
==================

* life_star can now be started with https
* life_star allows to authenticate users via SSL certificate
* behind-proxy option for life_star server

0.1.4 / 2012-10-15
==================

* changing the URLs of dependencies since LivelyKernel repo structure changed

0.1.3 / 2012-10-09
==================

* fixed life_star ref

0.1.2 / 2012-10-04
==================

* fixed life_star proxying
* lk server now has "--info" and "--kill" options
* install.sh will download partsbin snapshot
* fixing server --watch

0.1.1 / 2012-08-24
==================

* Improved installer script for unix

0.1.0 / 2012-08-22
==================

This is the first release of lk-scripts. Version 0.1 features:

* Install a Lively Kernel server and workspace on your machine, tested on Mac
  OS, Linux, Windows

* Test runner

* tools for diffing and syncing webwerkstatt and core

* compiling libs for Lively


Changes since 0.0.18:

* scripts are running on windows

* source for creating a windows installer

* shelljs is used for cleaner scripting

* some general cleanup

0.0.18 / 2012-08-18
===================

* fix for lk script on linux

0.0.17 / 2012-08-18
===================

* running on node 0.8
* script for compiling Lively's core libs
* making colorize, jshint, nodeunit, forever, express, nodemon dependencies optional

0.0.16 / 2012-06-26
===================

* life_star integration

0.0.15 / 2012-04-13
===================

* lively_test.js

0.0.14 / 2012-04-13
===================

* fix: nodemon support

0.0.13 / 2012-04-13
===================

* fix: 'lk test' kills browser after test execution

0.0.12 / 2012-04-12
===================

* refactored the 'lk test' implementation and the test server interaction

0.0.10 / 2012-04-09
===================

* mirror script now uses branch of current version
* fixed test exit code on timeout

0.0.9 / 2012-04-08
==================

* first version of install.sh
* getting rid of qunit

0.0.8 / 2012-04-07
==================

* getting rid of ffi package that is broken on Linux x64, it is still required for `lk core-link`, though. In case you need to do a core link install it on your machine (if you have a Mac that is)
* core-link fixes

0.0.7 / 2012-04-06
==================

* more logging for `lk sync`
* `lk sync` now support cherry-picking fom ww-mirror. Run with `lk sync -cp FILE_TO_CHERRYPICK_SPEC` which can look like

    x1234...y5678
    abd52...123op
    this is a commit message,
    the first two lines specify the revision (ranges)
    to cherry pick

* publish script for publishing livelykernel-scripts itself to npm and automatically updating / tagging. Run with `lk selfpublish -t x.y.z`.
* diff creation now sets lang environment since parsed diff output changes with system language
* introduced nodeunit for testing. This makes testing simpler as with qUnit
* test-helper.js for mocking exec / fs
