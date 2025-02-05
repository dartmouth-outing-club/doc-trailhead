#!/bin/bash
set -euo pipefail

SESSIONS_DB_NAME="trailhead.db"

function usage {
  >&2 echo "Usage: set-user.sh USER_ID"
  exit 1
}

if [[ ! -n "${1-}" ]]; then
  usage
fi

userid=$1

sqlite3 $SESSIONS_DB_NAME <<EOF
INSERT OR REPLACE INTO tokens (user, token, timestamp)
  VALUES ($1, 'devtoken', unixepoch() * 1000);
EOF
