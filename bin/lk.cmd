@setlocal enableextensions enabledelayedexpansion
@echo off

set scriptdir=%~dp0
set node="%scriptdir%..\..\..\node.exe"
set lkjs="%scriptdir%..\scripts\lk.js"

@%node% %lkjs% %*