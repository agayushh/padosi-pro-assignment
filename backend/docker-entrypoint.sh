#!/bin/sh
set -eu
./node_modules/.bin/prisma migrate deploy
node dist/seed.js
node dist/index.js
