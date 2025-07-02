import { SetMetadata } from '@nestjs/common';
import type { SubscriptionPlan } from '@prisma/__generated__';

export const MIN_PLAN_KEY = 'minPlan';

export const MinPlan = (plan: SubscriptionPlan) => SetMetadata(MIN_PLAN_KEY, plan);
