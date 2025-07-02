#!/bin/bash

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Path to the .env file
ENV_FILE="$SCRIPT_DIR/../.env"

# If .env exists, export all variables from it
if [ -f "${ENV_FILE}" ]; then
  echo "Loading environment variables from ${ENV_FILE}..."
  set -o allexport
  source "${ENV_FILE}"
  set +o allexport
else
  echo "Warning: ${ENV_FILE} not found. Using default values."
fi

# Default values if not set in .env
: "${POSTGRES_USER:=root}"
: "${POSTGRES_DB:=pg-zenya-psy}"
: "${POSTGRES_PASSWORD:?ERROR: POSTGRES_PASSWORD is not set in ${ENV_FILE}}"
: "${CONTAINER_NAME:=postgres}"

# Backup settings
BACKUP_DIR="../db_dumps"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="${POSTGRES_DB}_${TIMESTAMP}.sql"

# Create the backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "Starting PostgreSQL backup..."
echo "  Container: ${CONTAINER_NAME}"
echo "  Database:  ${POSTGRES_DB}"
echo "  User:      ${POSTGRES_USER}"
echo "  Output:    ${BACKUP_DIR}/${BACKUP_FILENAME}"

# Run pg_dump inside the container, passing the password via PGPASSWORD
docker exec \
  -e PGPASSWORD="${POSTGRES_PASSWORD}" \
  -t "${CONTAINER_NAME}" \
  pg_dump \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -c \
    -f /tmp/temp_backup.sql

# Copy the dump file from the container to the host
docker cp "${CONTAINER_NAME}:/tmp/temp_backup.sql" \
           "${BACKUP_DIR}/${BACKUP_FILENAME}"

# Remove the temporary dump file inside the container
docker exec -t "${CONTAINER_NAME}" rm /tmp/temp_backup.sql

# Verify that the backup was created successfully
# Проверяем, что бэкап действительно создался
if [ -f "${BACKUP_DIR}/${BACKUP_FILENAME}" ]; then
  echo "Backup completed successfully: ${BACKUP_DIR}/${BACKUP_FILENAME}"
  echo "Size: $(du -h "${BACKUP_DIR}/${BACKUP_FILENAME}" | cut -f1)"
else
  echo "Backup failed!" >&2
  exit 1
fi
