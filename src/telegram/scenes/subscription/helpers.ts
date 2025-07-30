import type { Subscription, User } from '@prisma/__generated__';
import { Currency, PaymentProvider, SubscriptionPlan } from '@prisma/__generated__';
import { format } from 'date-fns';
import { Markup } from 'telegraf';

import { PurchaseMethod, SubscriptionCallback } from './constants';

import { PurchaseText, SubscriptionPlanTitle } from '@/common/constants';
import { exhaustiveCheck, isUserAdmin, removeEmojis } from '@/common/utils';
import { FREEDOMPAY_PROVIDER_TOKEN, PAYME_PROVIDER_TOKEN } from '@/env';
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

export const getProviderToken = (provider: PaymentProvider) => {
  switch (provider) {
    case PaymentProvider.STARS:
      return '';
    case PaymentProvider.PAYME:
      return PAYME_PROVIDER_TOKEN;
    case PaymentProvider.FREEDOMPAY:
      return FREEDOMPAY_PROVIDER_TOKEN;
    default:
      return '';
  }
};

export const getPurchaseCurrency = (purchaseMethod: PurchaseMethod): Currency => {
  switch (purchaseMethod) {
    case PurchaseMethod.PayStars:
      return Currency.XTR;
    case PurchaseMethod.PayPayme:
    case PurchaseMethod.PayFreedompay:
      return Currency.UZS;
    default:
      exhaustiveCheck(purchaseMethod);
  }
};

export const getPaymentProvider = (purchaseMethod: PurchaseMethod): PaymentProvider => {
  switch (purchaseMethod) {
    case PurchaseMethod.PayStars:
      return PaymentProvider.STARS;
    case PurchaseMethod.PayPayme:
      return PaymentProvider.PAYME;
    case PurchaseMethod.PayFreedompay:
      return PaymentProvider.FREEDOMPAY;
    default:
      exhaustiveCheck(purchaseMethod);
  }
};

export const getPaymentButtons = () => {
  const paymentButtons = [Markup.button.callback(PurchaseText.STARS, PurchaseMethod.PayStars)];

  if (!PAYME_PROVIDER_TOKEN) {
    paymentButtons.push(Markup.button.callback(`🔐 ${removeEmojis(PurchaseText.PAYME)}`, SubscriptionCallback.LockedPayment));
  } else {
    paymentButtons.push(Markup.button.callback(PurchaseText.PAYME, PurchaseMethod.PayPayme));
  }

  if (FREEDOMPAY_PROVIDER_TOKEN) {
    paymentButtons.push(Markup.button.callback(PurchaseText.FREEDOMPAY, PurchaseMethod.PayFreedompay));
  }

  return paymentButtons;
};
