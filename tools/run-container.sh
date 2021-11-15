#!/bin/bash

set -e

live=false

while [[ $# > 0 ]] ; do
    if [[ $1 == --live ]] ; then
        live=true
    fi
    shift
done

live_args=()
if $live ; then
    live_args=(-v "$(pwd):/srv/tunes:z")
fi


exec podman run --rm --name tunes -p 8080:8080 "${live_args[@]}" tunes
