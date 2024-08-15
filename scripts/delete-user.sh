#!/bin/bash

set -euo pipefail

function usage {
  >&2 echo "Usage: delete-user.sh USER_ID"
  exit 1
}

if [[ ! -n "${1-}" ]]; then
  usage
fi

user_id="$1"

echo 'Finding user:'
sqlite3 ./trailhead.db <<EOF
WITH trips as (
  SELECT user as id, count(trip_members.user) as num_trips
  FROM trip_members
  WHERE user = $user_id
)
SELECT id, cas_id, name, coalesce(num_trips, 0) as num_trips
FROM users
LEFT JOIN trips USING (id)
WHERE id = $user_id
EOF

read -p "Are you sure you want to delete that user? Y/y for yes, anything else for no " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
  echo cancelled
  exit 1
fi

sqlite3 ./trailhead.db <<EOF
DELETE FROM users
WHERE id = $user_id;

SELECT total_changes();
EOF

echo done
