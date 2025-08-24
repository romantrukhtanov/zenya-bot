import type { User } from '@prisma/__generated__';

import { isUserAdmin } from '@/common/utils';
import { translations } from '@/translations';

const INFINITE_SYMBOL = '∞';
const NONE_SYMBOL = '–';

export const getWelcomeText = (user: User, isSubscribed?: boolean) => {
  const isAdmin = isUserAdmin(user.role);
  const subscribedText = isSubscribed ? '' : translations.scenes.consultation.subscription;

  const lines: string[] = [
    translations.scenes.consultation.intro,
    subscribedText,
    `${translations.scenes.account.remainingConsultations} *${getRemainingConsultations(user, isAdmin)}*`,
  ].filter(Boolean);

  return lines.join('\n\n');
};

const getRemainingConsultations = (user: User, isAdmin?: boolean) => {
  if (isAdmin) {
    return INFINITE_SYMBOL;
  }
  return user.consultations || NONE_SYMBOL;
};
