#!/bin/bash
set -euo pipefail

node ./db/build-tables.js | sqlite3 trailhead.db
cat ./db/fix-keys.sql | sqlite3 trailhead.db
