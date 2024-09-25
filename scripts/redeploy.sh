#!/bin/bash
set -ev

cd ./doc-trailhead
git pull
npm prune --omit=dev
npm install --omit=dev

cd ..
rsync -a ./doc-trailhead/static/ /home/public/html/static

pm2 restart trailhead