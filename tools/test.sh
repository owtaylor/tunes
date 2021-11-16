#!/bin/bash

set +e -x

flake8 tools/ ./*.cgi
[ $? == 0 ] || failed="$failed flake8"
node_modules/.bin/eslint tunes.js
[ $? == 0 ] || failed="$failed eslint"

set -e +x

if [ "$failed" != "" ] ; then
    if [[ -t 1 ]] ; then
        echo -e "\e[31m\e[1mFAILED:\e[0m$failed"
    else
        echo -e "FAILED:$failed"
    fi
    exit 1
else
    if [[ -t 1 ]] ; then
        echo -e "\e[32m\e[1mSUCCESS\e[0m"
    else
        echo -e "SUCCESS"
    fi
fi
