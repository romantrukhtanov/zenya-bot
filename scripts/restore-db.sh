#!/bin/bash

# --------------------------------------------------------------------
# Script to restore a PostgreSQL database from a backup file into a
# Docker container, loading configuration from .env (including
# POSTGRES_PASSWORD), with an interactive file selector
# --------------------------------------------------------------------

# Path to the .env file
ENV_FILE="../.env"

# Load environment variables from .env if it exists
if [ -f "${ENV_FILE}" ]; then
  echo "Loading environment variables from ${ENV_FILE}..."
  set -o allexport
  source "${ENV_FILE}"
  set +o allexport
else
  echo "Warning: ${ENV_FILE} not found. Using default values."
fi

# Default values if not specified in .env
: "${BACKUP_DIR:=../db_dumps}"
: "${POSTGRES_USER:=root}"
: "${POSTGRES_DB:=pg_zenya_psy}"
: "${POSTGRES_PASSWORD:?ERROR: POSTGRES_PASSWORD is not set in ${ENV_FILE}}"
: "${CONTAINER_NAME:=postgres}"
# If a filename was given as first arg, use it — otherwise go interactive
if [ -n "$1" ]; then
  BACKUP_FILE="$BACKUP_DIR/$1"
else
  # Collect all .sql files
  files=()
  for f in "$BACKUP_DIR"/*.sql; do
    [ -e "$f" ] || continue
    files+=("$f")
  done

  if [ ${#files[@]} -eq 0 ]; then
    echo "No .sql files found in $BACKUP_DIR"
    exit 1
  fi

  echo "Available backups in $BACKUP_DIR:"
  for i in "${!files[@]}"; do
    idx=$((i+1))
    base=$(basename "${files[i]}")
    printf "  %2d) %s\n" "$idx" "$base"
  done

  # prompt until valid selection
  while true; do
    read -p "Enter the number of the backup to restore (1-${#files[@]}): " sel
    # check it’s a number in range
    if [[ "$sel" =~ ^[0-9]+$ ]] && [ "$sel" -ge 1 ] && [ "$sel" -le "${#files[@]}" ]; then
      BACKUP_FILE="${files[$((sel-1))]}"
      break
    fi
    echo "Invalid choice. Please enter a number between 1 and ${#files[@]}."
  done
fi

# Final sanity check
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo
echo "Starting PostgreSQL restore..."
echo "  Container:   $CONTAINER_NAME"
echo "  Backup file: $BACKUP_FILE"
echo "  Database:    $POSTGRES_DB"
echo "  User:        $POSTGRES_USER"
echo

# Copy the backup file into the container
docker cp "$BACKUP_FILE" "$CONTAINER_NAME:/tmp/temp_restore.sql"

# Run psql to restore
docker exec \
  -e PGPASSWORD="$POSTGRES_PASSWORD" \
  -t "$CONTAINER_NAME" \
  psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -f /tmp/temp_restore.sql

# Clean up
docker exec -t "$CONTAINER_NAME" rm /tmp/temp_restore.sql

echo
echo "Restore completed successfully."
