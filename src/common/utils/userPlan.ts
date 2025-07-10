import { SubscriptionPlan } from '@prisma/__generated__';

export const isFreePlan = (plan: SubscriptionPlan) => {
  return plan === SubscriptionPlan.FREE;
};

export const isBasicPlan = (plan: SubscriptionPlan) => {
  return plan === SubscriptionPlan.BASIC;
};

export const isStandardPlan = (plan: SubscriptionPlan) => {
  return plan === SubscriptionPlan.STANDARD;
};

export const isPremiumPlan = (plan: SubscriptionPlan) => {
  return plan === SubscriptionPlan.PREMIUM;
};

export const isPaidPlan = (plan: SubscriptionPlan) => {
  return !isFreePlan(plan);
};
