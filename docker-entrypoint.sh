#!/bin/sh

# Docker entrypoint script for HeadlineHub API
# This script handles database migrations and starts the application

echo "🚀 Starting HeadlineHub API..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until nc -z ${PG_HOST:-localhost} ${PG_PORT:-5432}; do
  echo "Database is not ready yet. Waiting..."
  sleep 2
done

echo "✅ Database is ready!"

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client if not already generated
echo "🔧 Generating Prisma client..."
npx prisma generate

# Start the application
echo "🎯 Starting the application..."
exec "$@"
