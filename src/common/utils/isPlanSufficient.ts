import type { SubscriptionPlan } from '@prisma/__generated__';
import { Role } from '@prisma/__generated__';

import { SUBSCRIPTION_PLAN_ORDER } from '@/common/constants';

export const isPlanSufficient = (currentPlan: SubscriptionPlan, requiredPlan: SubscriptionPlan, role?: Role) => {
  const currentPlanIndex = SUBSCRIPTION_PLAN_ORDER.indexOf(currentPlan);
  const requiredPlanIndex = SUBSCRIPTION_PLAN_ORDER.indexOf(requiredPlan);

  const isSufficient = currentPlanIndex >= requiredPlanIndex;

  if (role === Role.ADMIN) {
    return true;
  }

  return isSufficient;
};
