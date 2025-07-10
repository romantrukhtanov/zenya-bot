import type { Context } from 'telegraf';

export const getTelegramUserBio = (user: Context['from'] | null) => {
  if (!user) {
    return;
  }

  const firstName = user.first_name ?? '';
  const lastName = user.last_name ?? '';

  return `${firstName} ${lastName}`.trim();
};
