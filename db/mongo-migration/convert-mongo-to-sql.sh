#!/bin/bash
# Migrate MongoDB tabes to SQLite tables
# Must be run from the repo root
set -veuo pipefail

function cleanup() {
 rm $TEMP_DB
}
trap cleanup EXIT

TEMP_DB="trailhead-temp.db"
FINAL_DB="trailhead.db"

# Build new database without strict typing
rm -f $TEMP_DB
cat db/db-schema.sql | sed 's/) STRICT/)/' | sqlite3 $TEMP_DB

# Loading the Mongo data and replace the ObjectID keys with simple primary keys
node ./db/mongo-migration/build-tables.js | sqlite3 $TEMP_DB
cat ./db/mongo-migration/fix-keys.sql | sqlite3 $TEMP_DB

# Create database with strict typing and dump the temporary data into it
# A few errors are expected here because the original data had some duplicates that get removed
rm -f $FINAL_DB
cat db/db-schema.sql | sqlite3 $FINAL_DB
sqlite3 $TEMP_DB .dump | grep '^INSERT INTO' | sqlite3 $FINAL_DB
