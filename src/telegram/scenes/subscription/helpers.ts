import type { Subscription, User } from '@prisma/__generated__';
import { Currency, SubscriptionPlan } from '@prisma/__generated__';
import { format } from 'date-fns';
import { Markup } from 'telegraf';

import { PurchaseMethod, SubscriptionCallback } from './constants';

import { PurchaseByLabel, SubscriptionPlanTitle } from '@/common/constants';
import { exhaustiveCheck, isUserAdmin, removeEmojis } from '@/common/utils';
import { PAYMENT_PROVIDER_TOKEN } from '@/env';
import { translations } from '@/translations';

const INFINITE_SYMBOL = '∞';
const NONE_SYMBOL = '-';

export const getWelcomeText = (user: User, activeSubscription: Subscription | null) => {
  const isAdmin = isUserAdmin(user.role);

  if (activeSubscription || isAdmin) {
    return getActiveSubscriptionText(user, isAdmin, activeSubscription);
  }

  const lines: string[] = [
    translations.scenes.subscription.intro.start,
    translations.scenes.subscription.plan.basic,
    translations.scenes.subscription.plan.standard,
    translations.scenes.subscription.plan.premium,
    translations.scenes.subscription.intro.end,
  ].filter(Boolean);

  return lines.join('\n\n');
};

const getActiveSubscriptionText = (user: User, isAdmin: boolean, subscription: Subscription | null) => {
  const lines: string[] = [
    translations.scenes.subscription.subscribed.intro,
    [
      `${translations.scenes.subscription.subscribed.info.currentPlan} *${SubscriptionPlanTitle[user.activePlan]}*`,
      `${getExpirationDate(user, subscription)}`,
      `${translations.scenes.account.remainingReplies} *${getRemainingReplies(user, isAdmin)}*`,
    ].join('\n'),
    translations.scenes.subscription.subscribed.end,
  ].filter(Boolean);

  return lines.join('\n\n');
};

const getRemainingReplies = (user: User, isAdmin?: boolean) => {
  if (isAdmin) {
    return INFINITE_SYMBOL;
  }
  return user.replicas || NONE_SYMBOL;
};

const getExpirationDate = (user: User, subscription?: Subscription | null) => {
  const isAdmin = isUserAdmin(user.role);

  if (isAdmin) {
    return `${translations.scenes.subscription.subscribed.info.expiresAt} *${INFINITE_SYMBOL}*`;
  }

  if (!subscription || subscription.plan === SubscriptionPlan.FREE) {
    return '';
  }

  const formattedDate = format(subscription.endsAt, 'dd\\.MM\\.yyyy');

  return `${translations.scenes.subscription.subscribed.info.expiresAt} *${formattedDate}*`;
};

export const isCurrencyUsdUzs = (currency: Currency) => {
  return currency === Currency.USD || currency === Currency.UZS;
};

export const getPurchaseCurrency = (purchaseMethod: PurchaseMethod): Currency => {
  switch (purchaseMethod) {
    case PurchaseMethod.PayStars:
      return Currency.XTR;
    case PurchaseMethod.PayUsdUzs:
      return Currency.UZS;
    default:
      exhaustiveCheck(purchaseMethod);
  }
};

export const getPaymentButtons = () => {
  const tgStarsButton = Markup.button.callback(PurchaseByLabel.XTR, PurchaseMethod.PayStars);

  if (!PAYMENT_PROVIDER_TOKEN) {
    return [tgStarsButton, Markup.button.callback(`🔐 ${removeEmojis(PurchaseByLabel.UZS)}`, SubscriptionCallback.LockedPayment)];
  }

  return [tgStarsButton, Markup.button.callback(PurchaseByLabel.UZS, PurchaseMethod.PayUsdUzs)];
};
