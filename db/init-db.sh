#!/bin/bash
set -euo pipefail

TRAILHEAD_DB_NAME="trailhead.db"
SESSIONS_DB_NAME="sessions.db"

function quit {
  >&2 echo "$1"
  exit 1
}

# Surface options
seed=false
force=false
while getopts 'fs' flag; do
  case "${flag}" in
    f) force=true;;
    s) seed=true;;
    *) error "Unexpected option ${flag}" ;;
  esac
done

# Stop if you didn't intend to delete the existing databases
if [[ -f "$TRAILHEAD_DB_NAME" ]] && [[ $force = false ]]; then
  quit "Error: $TRAILHEAD_DB_NAME already exists"
fi
if [[ -f "$SESSIONS_DB_NAME" ]] && [[ $force = false ]]; then
  quit "Error: $SESSIONS_DB_NAME already exists"
fi

# Delete the existing data and set up the new schemas
rm "$TRAILHEAD_DB_NAME"
rm "$SESSIONS_DB_NAME"
cat ./db/trailhead-db-schema.sql | sqlite3 "$TRAILHEAD_DB_NAME"
cat ./db/sessions-db-schema.sql | sqlite3 "$SESSIONS_DB_NAME"

# Add the seed data if the -s options was provided
# TODO automate the number scheme
if [[ $seed = true ]]; then
  cat ./db/seed-data/1-clubs.sql | sqlite3 "$TRAILHEAD_DB_NAME"
  cat ./db/seed-data/2-users.sql | sqlite3 "$TRAILHEAD_DB_NAME"
fi
