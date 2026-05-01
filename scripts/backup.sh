#!/usr/bin/env bash
# Daily PostgreSQL backup → gpg encrypt → R2 upload
# Run via systemd timer: every day 02:00 KST
set -euo pipefail

BACKUP_DIR="/data/saas-aed/backup"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DUMP_FILE="${BACKUP_DIR}/aed-${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${DUMP_FILE}.gpg"
RETENTION_DAYS=30

: "${POSTGRES_USER:=aed}"
: "${POSTGRES_DB:=aed}"
: "${BACKUP_GPG_RECIPIENT:?BACKUP_GPG_RECIPIENT required}"
: "${BACKUP_R2_BUCKET:?BACKUP_R2_BUCKET required}"

mkdir -p "$BACKUP_DIR"

echo "[backup] dumping database..."
docker exec aed-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl \
  | gzip > "$DUMP_FILE"

echo "[backup] encrypting with gpg..."
gpg --batch --yes --trust-model always --recipient "$BACKUP_GPG_RECIPIENT" \
  --output "$ENCRYPTED_FILE" --encrypt "$DUMP_FILE"

rm "$DUMP_FILE"

echo "[backup] uploading to R2..."
aws s3 cp "$ENCRYPTED_FILE" "s3://${BACKUP_R2_BUCKET}/$(basename "$ENCRYPTED_FILE")" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

echo "[backup] pruning local backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "aed-*.sql.gz.gpg" -mtime "+${RETENTION_DAYS}" -delete

echo "[backup] done: $(basename "$ENCRYPTED_FILE")"
