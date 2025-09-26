export const ENVIRONMENT = process.env.NODE_ENV ?? 'development';
export const IS_DEVELOPMENT = ENVIRONMENT === 'development';
export const IS_PRODUCTION = ENVIRONMENT === 'production';

export const SUPPORT_LINK = process.env.SUPPORT_LINK ?? 'https://t.me/zenya_support';
export const CHANNEL_LINK = process.env.CHANNEL_LINK ?? 'https://t.me/zenya_channel';

export const FREEDOMPAY_PROVIDER_TOKEN = process.env.FREEDOMPAY_PROVIDER_TOKEN ?? '';
export const PAYME_PROVIDER_TOKEN = process.env.PAYME_PROVIDER_TOKEN ?? '';

export const PAYMENT_INSTRUCTION_LINK = process.env.PAYMENT_INSTRUCTION_LINK ?? '';

export const TELEGRAM_ICON = process.env.TELEGRAM_ICON ?? '';

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-5-mini';
export const OPENAI_PROMPT_BUDGET = Number(process.env.OPENAI_PROMPT_BUDGET ?? 3500);
export const OPENAI_MAX_COMPLETION = Number(process.env.OPENAI_MAX_COMPLETION ?? 1000);
