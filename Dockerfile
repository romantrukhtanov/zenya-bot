# 🔹 1. Builder Stage
FROM node:22-alpine AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY package.json pnpm-lock.yaml ./

# Устанавливаем pnpm и все зависимости (включая dev)
RUN npm install -g pnpm \
  && pnpm install \
  && pnpm store prune \
  && npm cache clean --force

# Генерируем Prisma Client
COPY prisma ./prisma/
RUN npx prisma generate

# Копируем исходный код проекта
COPY . .

# Компилируем NestJS для production
RUN pnpm run build

# 🔹 2. Production Stage
FROM node:22-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем переменную окружения для production
ENV NODE_ENV=production
ENV PORT=3000

# Устанавливаем pnpm, чтобы дальше им пользоваться
RUN npm install -g pnpm

# Копируем файлы зависимостей
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

# Устанавливаем только production-зависимости
RUN pnpm install --prod --frozen-lockfile \
  && pnpm store prune \
  && npm cache clean --force

# Копируем скомпилированный код и необходимые файлы из builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts

# Предоставления прав на исполнение скриптов
RUN chmod +x ./scripts/init.sh && chmod -R +x ./scripts
USER node

# Открываем порт приложения
EXPOSE $PORT

# Проверяем статус приложения
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:$PORT/api/health || exit 1

# Выполняем миграции при старте и запускаем сервер
ENTRYPOINT ["./scripts/init.sh"]
CMD ["node", "dist/main.js"]
