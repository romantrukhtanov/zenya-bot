import type { Scenes } from 'telegraf';

import type { PaidSubscriptionPlan } from '@/common/types';
import type { SubscriptionMedia } from '@/telegram/scenes';
import type { BaseMediaState } from '@/telegram/scenes/base/base-wizard/types';

export enum SubscriptionStep {
	START,
	SELECTED_PLAN,
	WAIT_PAYMENT,
	SUCCESS_PAYMENT,
}

export type SubscriptionState = BaseMediaState<SubscriptionMedia> & {
	step?: SubscriptionStep;
	messageId?: number;
	orderId?: string;
	invoiceMessageIds?: number[];
	mediaMessageId?: number;
	mediaName?: string;
	skipSceneLeave?: boolean;
	selectedPlan?: PaidSubscriptionPlan;
};

export interface SubscriptionWizardContext extends Scenes.WizardContext {
	wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
		state: SubscriptionState;
	};
	match: RegExpMatchArray;
}
