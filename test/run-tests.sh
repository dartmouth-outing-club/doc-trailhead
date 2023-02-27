#!/bin/bash
set -euo pipefail

function cleanup {
  rm -f *-test.db*
  jobs -p | xargs -r kill
}

# Ensures that the node server won't keep running after the script exists
trap cleanup EXIT

echo Initializing database...
./db/init-db.sh -fst

echo Starting server...
NODE_ENV=TESTS node src/server.js &> /dev/null &
sleep 1

node --test
