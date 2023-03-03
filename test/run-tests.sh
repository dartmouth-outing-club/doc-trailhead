#!/bin/bash
set -euo pipefail

# When the script exits, delete the test artifacts and kill any child processes
function cleanup {
  rm -f *-test.db* test-out
  jobs -p | xargs -r kill
}
trap cleanup EXIT

# If the tests didn't succeed, print the server logs and exit with an error
function failTest {
  cat >&2 <<EOF
***********************************
Test failed, outputting server logs
***********************************
EOF
  cat test-out
  exit 1
}

echo Initializing database...
./db/init-db.sh -fst

echo Starting server...
NODE_ENV=TESTS node src/server.js &> test-out &
sleep 1

node --test || failTest
