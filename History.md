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
