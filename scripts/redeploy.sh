#!/bin/bash
# Note: this script is intended to be run from the source root, via `npm run deploy`
set -ev

git pull
npm prune --omit=dev
npm install --omit=dev

cd ..
rsync -a ./doc-trailhead/static/ /home/public/html/static

pm2 restart trailhead
