#!/bin/bash

set -euo pipefail

function usage {
  >&2 echo "Usage: find-user.sh NAME"
  exit 1
}

if [[ ! -n "${1-}" ]]; then
  usage
fi

sqlite3 ./trailhead.db <<EOF
SELECT id, cas_id, name
FROM users
WHERE name like '%$1%'
EOF
