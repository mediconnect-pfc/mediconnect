#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting server..."
node dist/main
