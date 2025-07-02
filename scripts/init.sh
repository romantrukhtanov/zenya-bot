#!/bin/sh
# Выполняет миграции и запускает то, что передано в CMD/ENTRYPOINT

if [ -f "./node_modules/.bin/prisma" ]; then
  echo "✨ Применяем миграции Prisma"
  npx prisma migrate deploy
fi

exec "$@"
