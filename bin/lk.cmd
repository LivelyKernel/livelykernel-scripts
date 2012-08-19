@setlocal enableextensions enabledelayedexpansion
@echo off

set scriptdir=%~dp0
set NODE_BIN="%scriptdir%..\..\..\node.exe"
set lkjs="%scriptdir%..\scripts\lk.js"

@%NODE_BIN% %lkjs% %*