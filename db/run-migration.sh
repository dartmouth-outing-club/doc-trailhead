#!/bin/bash
#
# Name: run-migration.sh
# Description: Run a database migration if that migration has not already been applied.
set -euo pipefail

TRAILHEAD_DB_NAME="trailhead.db"

function quit {
  >&2 echo "$1"
  exit 1
}

if [[ ! -n "${1-}" ]]; then
  quit "Usage: run-migration.sh MIGRATION_FP"
fi

migration_fp=$1
if [[ ! -f "$migration_fp" ]]; then
  >&2 echo "Migration $migration_fp not found"
  exit 1
fi

# Exit if existing databases are open (cannot be forced)
if [[ -f "$TRAILHEAD_DB_NAME-wal" ]]; then
  quit "It is usually an error to migrate the database while it is still in use"
fi

# Exit if this particular migration has already been applied
migration_name=$(basename "$migration_fp")
query="SELECT EXISTS (SELECT name FROM _migrations WHERE _migrations.name = '$migration_name')"
if [[ $(sqlite3 $TRAILHEAD_DB_NAME "$query" 2>/dev/null | grep 1) ]]; then
  quit "Migration $migration_name has already been applied"
fi

# Apply migration and save migration
echo '.bail on' | cat - $migration_fp |
sqlite3 $TRAILHEAD_DB_NAME <<EOF
.bail on
BEGIN;
$(cat $migration_fp)
COMMIT;
EOF

sqlite3 $TRAILHEAD_DB_NAME "INSERT INTO _migrations (name) VALUES ('$migration_name');"

>&2 echo "Succesfully applied migration $migration_name"
