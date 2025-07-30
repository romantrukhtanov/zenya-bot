import { PaymentProvider, SubscriptionPlan } from '@prisma/__generated__';

import type { PaidSubscriptionPlan } from './types';

export const SUBSCRIPTION_PLAN_ORDER: SubscriptionPlan[] = [
  SubscriptionPlan.FREE,
  SubscriptionPlan.BASIC,
  SubscriptionPlan.STANDARD,
  SubscriptionPlan.PREMIUM,
] as const;

export const SubscriptionPlanTitle: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.FREE]: 'Free',
  [SubscriptionPlan.BASIC]: 'Basic',
  [SubscriptionPlan.STANDARD]: 'Standard',
  [SubscriptionPlan.PREMIUM]: 'Premium',
};

export const SubscriptionPlanButton: Record<PaidSubscriptionPlan, string> = {
  [SubscriptionPlan.BASIC]: '✨ Basic',
  [SubscriptionPlan.STANDARD]: '💎 Standard',
  [SubscriptionPlan.PREMIUM]: '🚀 Premium',
};

export const SubscriptionUzsPrice: Record<PaidSubscriptionPlan, number> = {
  [SubscriptionPlan.BASIC]: 74900,
  [SubscriptionPlan.STANDARD]: 169000,
  [SubscriptionPlan.PREMIUM]: 299000,
};

export const SubscriptionStarsPrice: Record<PaidSubscriptionPlan, number> = {
  [SubscriptionPlan.BASIC]: 500,
  [SubscriptionPlan.STANDARD]: 1000,
  [SubscriptionPlan.PREMIUM]: 2000,
};

export const SubscribePlanLabel: Record<PaidSubscriptionPlan, string> = {
  [SubscriptionPlan.BASIC]: '✨ Базовая подписка',
  [SubscriptionPlan.STANDARD]: '💎 Стандартная подписка',
  [SubscriptionPlan.PREMIUM]: '🚀 Премиум подписка',
};

export const PurchaseText: Record<PaymentProvider, string> = {
  [PaymentProvider.STARS]: '🌟 Оплата за STARS',
  [PaymentProvider.PAYME]: '💳 Оплата PAYME (UZS)',
  [PaymentProvider.FREEDOMPAY]: '💳 Оплата FREEDOMPAY (UZS / USD)',
} as const;

export const UserReplicasAmount: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 10,
  [SubscriptionPlan.BASIC]: 1000,
  [SubscriptionPlan.STANDARD]: 3000,
  [SubscriptionPlan.PREMIUM]: 10000,
} as const;

export const CodeToPaidPlan: Record<string, PaidSubscriptionPlan> = {
  BSC: SubscriptionPlan.BASIC,
  STD: SubscriptionPlan.STANDARD,
  PRM: SubscriptionPlan.PREMIUM,
} as const;

export const PaidPlanToCode: Record<PaidSubscriptionPlan, string> = {
  BASIC: 'BSC',
  STANDARD: 'STD',
  PREMIUM: 'PRM',
} as const;
