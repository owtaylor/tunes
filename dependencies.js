// This file acts as glue between the dependency modules that we get from
// npm and the browser, which can only resolve local modules. We use rollup
// to bundle the dependencies into a single.
//
// If developing with tools/run-container.sh --live, changes here will not
// be picked up, automatically; you need to either restart the container,
// or run nodule_modules/.bin/rollup -c

import $ from "jquery";
import {renderAbc} from "abcjs";

export {$, renderAbc};
