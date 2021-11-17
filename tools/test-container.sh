#!/bin/bash

set -e

exec podman run --rm tunes tools/test.sh
