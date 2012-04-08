#!/bin/sh

# quick install for LivelyKernel core. Should be used with
# curl http://lively-kernel.org/install.sh | sh
# this script is heavily inspired by http://npmjs.org/install.sh

if [ "x$0" = "xsh" ]; then
  # run as curl | sh
  curl -s http://lively-kernel.org/install.sh > lk-install-$$.sh
  sh lk-install-$$.sh
  ret=$?
  rm lk-install-$$.sh
  exit $ret
fi

# make sure that node exists
node=`which node 2>&1`
ret=$?
if [ $ret -eq 0 ] && [ -x "$node" ]; then
  (exit 0)
else
  echo "Lively Kernel cannot be installed without nodejs." >&2
  echo "Install node first, and then try again." >&2
  echo "" >&2
  echo "Maybe node is installed, but not in the PATH?" >&2
  echo "Note that running as sudo can change envs." >&2
  echo ""
  echo "PATH=$PATH" >&2
  exit $ret
fi

# make sure that git exists
git=`which git 2>&1`
ret=$?
if [ $ret -eq 0 ] && [ -x "$git" ]; then
  (exit 0)
else
  echo "Git is not installed." >&2
  echo "Install git first, and then try again." >&2
  exit $ret
fi


# is npm installed? if not then install it
npm=`which npm 2>&1`
ret=$?
if [ $ret -eq 0 ] && [ -x "$npm" ]; then
  (exit 0)
else
  echo "npm is required for the installation" >&2
  echo "but seems not to be installed." >&2
  echo "Note that running as sudo can change envs." >&2
  echo "" >&2
  echo "PATH=$PATH" >&2
  echo "" >&2
  echo "Trying to install npm now..." >&2
  npm_install=`curl http://npmjs.org/install.sh | sh`
  ret=$?
  if [ $ret -ne 0 ]; then
      echo ""
      echo "Failure installing npm, aborting..." >&2
      exit $ret
  fi
  npm=`which npm 2>&1`
fi


# livelykernel-scripts
lk_cmd=`which lk 2>&1`
ret=$?
if [ $ret -eq 0 ] && [ -x "$lk_cmd" ]; then
  (exit 0)
else
  echo "Installing livelykernel-scripts using npm..." >&2
  lkscript_install=`$npm install -g livelykernel-scripts@latest`
  ret=$?
  if [ $ret -ne 0 ]; then
      echo ""
      echo "Failure during 'npm install -g livelykernel-scripts'" >&2
      echo "Try installing it as root..." >&2
      lkscript_install=`sudo $npm install -g livelykernel-scripts@latest`
      ret=$?
      if [ $ret -ne 0 ]; then
          echo ""
          echo "Failure during 'sudo npm install -g livelykernel-scripts'" >&2
          echo "Aborting..." >&2
          exit $ret
      fi
  fi
  lk_cmd=`which lk 2>&1`
fi

# Init the workspace if it does not exist
workspace="`$lk_cmd scripts-dir`/workspace/lk"
if [ -d $workspace ] || [ -L $workspace ]; then
    (exit 0)
else
    echo ""  >&2
    echo "Cloning LivelyKernel core repo into $workspace" >&2
    workspace_install=`$lk_cmd workspace --checkout-lk 2>&1`
    ret=$?
    if [ $ret -ne 0 ]; then
        echo ""  >&2
        echo "Failure while initializing the LivelyKernel core repo" >&2
        exit $ret
    fi
fi

echo ""
echo "Lively Kernel installation finished successfully" >&2
echo "You can now start the lively kernel server with" >&2
echo "$lk_cmd server" >&2
echo "Visit http://localhost:9001/blank.xhtml for opening a minimal world." >&2
