#!/bin/sh
# Backs up the PRODUCTION portal database to BitCarve-HQ/Backups/.
#   sh scripts/backup-prod.sh
# Free-tier Supabase keeps no backups of its own — run this weekly, and always
# before any migration. Needs Docker running (the CLI runs pg_dump in a container).
# NOTE: this is the database only (bookings, forms, signed agreements). Uploaded
# photos live in Supabase Storage and are not included.
set -e
cd "$(dirname "$0")/.."
set -a; . ./.env.production.local; set +a
DIR="$HOME/Desktop/BitCarve-HQ/Backups"
mkdir -p "$DIR"
OUT="$DIR/arsh-portal-$(date +%Y-%m-%d).sql"
npx supabase db dump --linked --password "$SUPABASE_DB_PASSWORD" --data-only -f "$OUT" >/dev/null
echo "backup written: $OUT ($(du -h "$OUT" | cut -f1))"
