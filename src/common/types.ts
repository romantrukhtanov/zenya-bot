import type { SubscriptionPlan } from '@prisma/__generated__';

export type PaidSubscriptionPlan = Exclude<SubscriptionPlan, 'FREE'>;
