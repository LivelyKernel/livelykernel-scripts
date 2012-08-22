# How to create a msi installer package?

We will use [Windows Installer XML (WiX)](http://wix.sourceforge.net/) to build Windows msi packages.

`set Path="c:/Program Files (x86)/Windows Installer XML v3.6/bin";%Path%`

However, right now we use a free version of "Advanced Installer" (the .aip package). It's simpler to use but the free version does not include features that we need (running custom scripts before / after install).
