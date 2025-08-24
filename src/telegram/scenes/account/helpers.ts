import type { Subscription, User } from '@prisma/__generated__';
import { SubscriptionPlan } from '@prisma/__generated__';
import { format } from 'date-fns';

import { SubscriptionPlanTitle } from '@/common/constants';
import { isUserAdmin } from '@/common/utils';
import { translations } from '@/translations';

const NONE_SYMBOL = '–';
const INFINITE_SYMBOL = '∞';

export const getUserInfo = (user: User, activeSubscription?: Subscription | null) => {
  const isAdmin = isUserAdmin(user.role);

  const lines: string[] = [
    `${translations.scenes.account.intro}\n`,
    `${translations.scenes.account.name} <strong>${user.name ?? NONE_SYMBOL}</strong>`,
    `${translations.scenes.account.subscription} <strong>${SubscriptionPlanTitle[user.activePlan]}</strong>`,
    `${getExpirationDate(activeSubscription, isAdmin)}`,
    `${translations.scenes.account.remainingReplies} <strong>${getRemainingReplies(user, isAdmin)}</strong>`,
    `${translations.scenes.account.remainingConsultations} <strong>${getRemainingConsultations(user, isAdmin)}</strong>\n`,
    `${translations.scenes.account.id} <code>${user.telegramId}</code>`,
  ].filter(Boolean);

  return lines.join('\n');
};

const getRemainingReplies = (user: User, isAdmin?: boolean) => {
  if (isAdmin) {
    return INFINITE_SYMBOL;
  }

  return user.replicas || NONE_SYMBOL;
};

const getRemainingConsultations = (user: User, isAdmin?: boolean) => {
  if (isAdmin) {
    return INFINITE_SYMBOL;
  }
  return user.consultations || NONE_SYMBOL;
};

const getExpirationDate = (subscription?: Subscription | null, isAdmin?: boolean) => {
  if (isAdmin) {
    return `${translations.scenes.account.expiresAt} <strong>${INFINITE_SYMBOL}</strong>`;
  }

  if (!subscription || subscription.plan === SubscriptionPlan.FREE) {
    return '';
  }

  const formattedDate = format(subscription.endsAt, 'dd.MM.yyyy');

  return `${translations.scenes.account.expiresAt} <strong>${formattedDate}</strong>`;
};
