#!/bin/bash
set -euo pipefail

if [[ ! -n "${1-}" ]]; then
  >&2 echo "Usage: edit-templates.sh SCRIPT_NAME"
  exit 1
fi

scriptname=$1
if [[ ! -f "$scriptname" ]]; then
  >&2 echo "Script $scriptname not found"
  exit 1
fi

find ./templates -name '*.njk' -exec sh -c "ed {} < $scriptname" \;
