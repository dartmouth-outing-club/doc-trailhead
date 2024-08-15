#!/bin/bash

set -euo pipefail

function usage {
  >&2 echo "Usage: set-cas-id.sh USER_ID CAS_ID"
  exit 1
}

if [[ ! -n "${2-}" ]]; then
  usage
fi

user_id="$1"
cas_id="$2"

echo 'Finding user:'
sqlite3 ./trailhead.db <<EOF
WITH trips as (
  SELECT user as id, count(trip_members.user) as num_trips
  FROM trip_members
  WHERE user = $1
)
SELECT id, cas_id, name, coalesce(num_trips, 0) as num_trips
FROM users
LEFT JOIN trips USING (id)
WHERE id = $1
EOF

read -p "Are you sure you want to set user $user_id's cas_id to $cas_id? Y/y for yes, anything else for no " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
  echo cancelled
  exit 1
fi

sqlite3 ./trailhead.db <<EOF
UPDATE USERS
SET cas_id = '$cas_id'
WHERE id = $user_id;

SELECT total_changes();
EOF

echo done
