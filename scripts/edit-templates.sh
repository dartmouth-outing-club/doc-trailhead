#!/bin/bash
set -euo pipefail

if [[ ! -n "${1-}" ]]; then
  >&2 echo "Usage: edit-templates.sh SCRIPT NAME"
  exit 1
fi

scriptname=$1
if [[ ! -f "$scriptname" ]]; then
  >&2 echo "Script $scriptname not found"
  exit 1
fi

find ./templates/views -name '*.njk' -exec sh -c "ed {} < $scriptname" \;
