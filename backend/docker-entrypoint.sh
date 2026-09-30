#!/bin/sh
set -eu
pnpm exec prisma migrate deploy
node dist/seed.js
node dist/index.js
