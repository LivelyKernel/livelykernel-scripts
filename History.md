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
