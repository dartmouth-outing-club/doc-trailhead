#!/bin/bash
set -veuo pipefail

rm -f trailhead.db
cat ./db/db-schema.sql | sqlite3 trailhead.db
node ./db/build-tables.js | sqlite3 trailhead.db
cat ./db/fix-keys.sql | sqlite3 trailhead.db
