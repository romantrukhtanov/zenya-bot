#!/usr/bin/env bash
set -euo pipefail

# Usage: ./prisma_diff.sh [migration_name]
# Пример: ./prisma_diff.sh init или ./prisma_diff.sh add_user_table

NAME=${1:-init}
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_ID="${TIMESTAMP}_${NAME}"
DIR="../prisma/migrations/${MIGRATION_ID}"

echo "👉 Создаём папку миграции: ${DIR}"
mkdir -p "$DIR"

echo "👉 Генерируем SQL diff..."
pnpm prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "${DIR}/migration.sql"

echo "✅ Файл migration.sql готов в $DIR"

# Спрашиваем про resolve
read -rp "Желаете пометить эту миграцию как применённую (prisma migrate resolve)? [y/N] " ANSWER
case "$ANSWER" in
  [Yy]* )
    echo "👉 Выполняем: pnpm prisma migrate resolve --applied ${MIGRATION_ID}"
    pnpm prisma migrate resolve --applied "${MIGRATION_ID}"
    echo "✅ Миграция помечена как применённая."
    ;;
  * )
    echo "ℹ️ Пропускаем resolve. Не забудьте выполнить pnpm prisma migrate resolve вручную при необходимости."
    ;;
esac
