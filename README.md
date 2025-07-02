# Zenya PSY Bot

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm start

# watch mode
$ pnpm start:dev

# production mode
$ pnpm start:prod
```

## Run tests

```bash
# unit tests
$ pnpm test

# e2e tests
$ pnpm test:e2e

# test coverage
$ pnpm test:cov
```

## Database Operations

### Backup and Restore

The project includes scripts for backing up and restoring the PostgreSQL database:

```bash
# Create a full database backup
$ ./scripts/backup-db.sh

# Restore database from a backup
$ ./scripts/restore-db.sh <backup_filename>
```

For more details, see the [Database Scripts Documentation](./scripts/README.md).
