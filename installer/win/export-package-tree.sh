#!/usr/bin/env bash

# copy only the necessary into a new dir used by the msi creator
# ./export-package-tree.sh ~/Public/win7-vm/lk-scripts_windows-source-package ~/Public/win7-vm/lk-scripts_win-package

SOURCE_DIR=$1
TARGET_DIR=$2

[ -d $TARGET_DIR ] && rm -rfd $TARGET_DIR
mkdir -p $TARGET_DIR

# archive, verbose, copy-links
# exclude:
# git repos emacs auto-saves, workspace, installer package source
    # --include="livelykernel-scripts/.git" \
rsync -av \
    --exclude=".git" \
    --exclude="*~" --exclude=".#*" \
    --exclude="livelykernel-scripts/workspace" \
    --exclude="livelykernel-scripts/bin/lk" \
    --exclude="npm-debug.log" \
    --exclude="*.aip" --exclude "livelykernel-scripts-create-msi-cache" \
    $SOURCE_DIR/ $TARGET_DIR

echo "Package source is in $TARGET_DIR"
