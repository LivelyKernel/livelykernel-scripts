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

# We all love colors :)
INVT="\033[7m"; NORM="\033[0m"; BOLD="\033[1m"; BLINK="\033[5m"
UNDR="\033[4m"; EOL="\033[0K"; EOD="\033[0J" SOD="\033[1;1f"
BLACK_F="\033[30m"; BLACK_B="\033[40m"
RED_F="\033[31m"; RED_B="\033[41m"
GREEN_F="\033[32m"; GREEN_B="\033[42m"
YELLOW_F="\033[33m"; YELLOW_B="\033[43m"
BLUE_F="\033[34m"; BLUE_B="\033[44m"
MAGENTA_F="\033[35m"; MAGENTA_B="\033[45m"
CYAN_F="\033[36m"; CYAN_B="\033[46m"
WHITE_F="\033[37m"; WHITE_B="\033[47m"

# make sure that node exists
node=`which node 2>&1`
ret=$?
if [ $ret -eq 0 ] && [ -x "$node" ]; then
  (exit 0)
else
  echo "${RED_B}${WHITE_F}Error: Lively Kernel cannot be installed without nodejs.${NORM}" >&2
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
  echo "${RED_B}${WHITE_F}Git is not installed.${NORM}" >&2
  echo "Install git first, and then try again." >&2
  echo "See ${UNDR}http://git-scm.com/${NORM} for more information." >&2
  exit $ret
fi


# is npm installed? if not then install it
npm=`which npm 2>&1`
ret=$?
if [ $ret -eq 0 ] && [ -x "$npm" ]; then
  (exit 0)
else
  echo "${RED_B}${WHITE_F}npm is required for the installation${NORM}" >&2
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
      echo "You may want to retry the installation as root, run" >&2
      echo "curl http://lively-kernel.org/install.sh > lk-install.sh; sudo sh lk-install.sh"
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
  echo "${BOLD}Installing livelykernel-scripts using npm...${NORM}" >&2
  lkscript_install=`$npm install --production -g livelykernel-scripts@latest`
  ret=$?
  if [ $ret -ne 0 ]; then
      echo ""
      echo "Failure during 'npm install --production -g livelykernel-scripts'" >&2
      echo "Try installing it as root..." >&2
      lkscript_install=`sudo $npm install --production -g livelykernel-scripts@latest`
      ret=$?
      if [ $ret -ne 0 ]; then
          echo ""
          echo "${RED_B}${WHITE_F}Failure during 'sudo npm install --production -g livelykernel-scripts'${NORM}" >&2
          echo "Aborting..." >&2
          exit $ret
      fi
  fi
  lk_cmd=`which lk 2>&1`
fi

# lk scripts-dir should be owner by user
scripts_dir=`$lk_cmd scripts-dir`
echo ""
echo "Changing the owner of $scripts_dir to $USER"
chown -R $USER:$GROUP $scripts_dir > /dev/null 2>&1
ret=$?
if [ $ret -ne 0 ]; then
    # try as root
    sudo chown -R $USER:$GROUP $scripts_dir > /dev/null 2>&1
    ret=$?
    if [ $ret -ne 0 ]; then
        echo ""
        echo "${RED_B}${WHITE_F}Failure while changing the owner of the workspace:${NORM}" >&2
        echo "chown -R $USER:$GROUP $scripts_dir failed" >&2
        echo "Sorry but checking out the workspace will probably not work..." >&2
    fi
fi

# Init the workspace if it does not exist
workspace=$WORKSPACE_LK
[ -z "$workspace" ] && workspace="`$lk_cmd scripts-dir`/workspace/lk"
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
    echo "... done." >&2
fi

echo ""
echo ""
echo "${GREEN_B}${WHITE_F}Yay! Lively Kernel installation finished successfully!${NORM}" >&2
echo "1. Start the Lively Kernel server with" >&2
echo "  ${BOLD}lk server --lk-dir $workspace${NORM}" >&2
echo "2. Visit ${UNDR}http://localhost:9001/blank.xhtml${NORM} for opening a minimal world." >&2
echo ""
echo "You can optionally download the Webwerkstatt PartsBin with"  >&2
echo "  ${BOLD}lk partsbin --dir $workspace/PartsBin${NORM}" >&2
