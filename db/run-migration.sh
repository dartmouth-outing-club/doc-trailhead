#!/bin/bash
set -euo pipefail

TRAILHEAD_DB_NAME="trailhead.db"
SESSIONS_DB_NAME="sessions.db"

function quit {
  >&2 echo "$1"
  exit 1
}

# Command line options
seed=false
force=false
is_test=false
while getopts 'fst' flag; do
  case "${flag}" in
    f) force=true;;
    s) seed=true;;
    t) is_test=true;;
    *) error "Unexpected option ${flag}" ;;
  esac
done

if [[ $is_test = true ]]; then
  TRAILHEAD_DB_NAME="trailhead-test.db"
  SESSIONS_DB_NAME="sessions-test.db"
fi

# Stop if existing databases are open (cannot be forced)
if [[ -f "$TRAILHEAD_DB_NAME-wal" ]] || [[ -f "$SESSIONS_DB_NAME-wal" ]]; then
  quit "Cannot delete exisiting databases while they are still being actively used"
fi

# Stop if you didn't intend to delete the existing databases
if [[ -f "$TRAILHEAD_DB_NAME" ]] && [[ $force = false ]]; then
  quit "Error: $TRAILHEAD_DB_NAME already exists"
fi
if [[ -f "$SESSIONS_DB_NAME" ]] && [[ $force = false ]]; then
  quit "Error: $SESSIONS_DB_NAME already exists"
fi

# Delete the existing data and set up the new schemas
rm -f "$TRAILHEAD_DB_NAME"
rm -f "$SESSIONS_DB_NAME"
cat ./db/trailhead-db-schema.sql | sqlite3 "$TRAILHEAD_DB_NAME"
cat ./db/sessions-db-schema.sql | sqlite3 "$SESSIONS_DB_NAME"

# Add the seed data if the -s options was provided
# Bash will match the glob in alphabetic order, ergo, it will respect the number scheme
for file in ./db/seed-data/*.sql; do
  cat "$file" | sqlite3 "$TRAILHEAD_DB_NAME"
done
