# Database Backup and Restore Scripts

This directory contains scripts for backing up and restoring the PostgreSQL database used by the application.

## Prerequisites

- Docker must be running
- The PostgreSQL container must be running (named 'postgres' by default)
- Environment variables should be properly set (or default values will be used)

## Backup Script

The `backup-db.sh` script creates a full backup of the PostgreSQL database.

### Usage

```bash
./scripts/backup-db.sh
```

### Features

- Creates a timestamped backup file in the `./db_dumps` directory
- Uses pg_dump to create a complete database dump
- Displays the backup file size upon completion
- Uses environment variables for database credentials (with defaults if not set)

## Restore Script

The `restore-db.sh` script restores a PostgreSQL database from a backup file.

### Usage

```bash
./scripts/restore-db.sh <backup_filename>
```

Example:
```bash
./scripts/restore-db.sh postgres_backup_20230101_120000.sql
```

If no backup file is specified, the script will list all available backups.

### Features

- Restores the database from a specified backup file
- Lists available backups if no file is specified
- Validates that the backup file exists before attempting to restore
- Uses environment variables for database credentials (with defaults if not set)

## Environment Variables

Both scripts use the following environment variables:

- `POSTGRES_USER`: Database username (default: "user")
- `POSTGRES_DB`: Database name (default: "pg-name")

These can be set in your `.env` file or exported in your shell before running the scripts.
