export const REDIS_KEY = {
  USER_ID: 'user:id',
  USER_ROLE: 'user:role',
  USER_ONBOARDING: 'user:onboarding',
  USER_DAILY_CARD: 'user:daily:card',
  USER_SUBSCRIPTION_PLAN: 'user:sub:plan',
  USER_PURCHASE_LOCK: 'user:purchase:lock',
  AGENT_PENDING_REQUEST: 'agent:pending:request',
  MEDIA_FILE_ID: 'media:fileId',
  TELEGRAM_SESSION: 'tg:sess',
  TELEGRAM_RATE_LIMIT: 'tg:rate',
} as const;

export const BULL_KEY = {
  USER_SUBSCRIPTION_EXPIRE: 'user:expire',
  USER_SUBSCRIPTION_NOTIFY_EXPIRE: 'user:notify:expire',
  AGENT_INACTIVE_TIMEOUT: 'timeout',
} as const;
