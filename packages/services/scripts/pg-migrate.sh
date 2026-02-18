#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/migrations"

DATABASE_URL="${DATABASE_URL:-postgres://driver_onboarding:driver_onboarding@localhost:5432/driver_onboarding}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required. Install PostgreSQL client tools first."
  exit 1
fi

echo "Applying migrations to: $DATABASE_URL"
for file in "$MIGRATIONS_DIR"/*.sql; do
  if [ -f "$file" ]; then
    echo "-> $(basename "$file")"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
  fi
done

echo "Done."
