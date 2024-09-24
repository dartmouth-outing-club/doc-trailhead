#!/bin/bash
# Note: this is intended to be run via the package.sjon
set -euo pipefail
if [[ -f trailhead.db-wal ]]; then
  echo "Database is still in use - make sure WAL is cleaned up."
  exit 1
fi

ssh node@doc 'cd doc-trailhead && sqlite3 trailhead.db ".dump"' | sqlite3 temp.db
mv temp.db trailhead.db
