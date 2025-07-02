import { SubscriptionPlan } from '@prisma/__generated__';

import type { PaidSubscriptionPlan } from '@/common/types';
import { translations } from '@/translations';

export enum SubscriptionCallback {
	SelectBasic = 'select:basic',
	SelectStandard = 'select:standard',
	SelectPremium = 'select:premium',
	PublicOffer = 'public:offer',
	BackToSelect = 'back:to:select:plans',
	CancelPayment = 'cancel:payment',
	Back = 'back:to:plans',
	LockedPayment = 'locked:payment',
}

export enum PurchaseMethod {
	PayUsdUzs = 'pay:usd:uzs',
	PayStars = 'pay:stars',
}

export enum SubscriptionMedia {
	Subscription = 'subscription.mp4',
	PaymentSuccess = 'payment-success.mp4',
	PublicOffer = 'public-offer-zenia-bot.pdf',
}

export const SelectedPlanText: Record<PaidSubscriptionPlan, string> = {
	[SubscriptionPlan.BASIC]: translations.scenes.subscription.selectedPlan.basic,
	[SubscriptionPlan.STANDARD]: translations.scenes.subscription.selectedPlan.standard,
	[SubscriptionPlan.PREMIUM]: translations.scenes.subscription.selectedPlan.premium,
};
