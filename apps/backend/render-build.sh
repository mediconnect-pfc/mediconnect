#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "Installing dependencies..."
npm install

echo "Installing NestJS CLI..."
npm install @nestjs/cli

echo "Generating Prisma client..."
npx prisma generate

echo "Building NestJS app..."
npx nest build

echo "Build complete!"
