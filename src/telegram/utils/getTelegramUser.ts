import type { Context } from 'telegraf';

export const getTelegramUser = (context: Context): Context['from'] | null => {
	return context?.from ?? null;
};
