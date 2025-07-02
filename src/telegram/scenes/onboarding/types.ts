import type { Scenes } from 'telegraf';

import type { OnboardingStep } from './constants';

import type { BaseMediaState } from '@/telegram/scenes/base/base-wizard/types';

export type OnboardingWizardState = BaseMediaState & {
	chatId?: number;
	messageId?: number;
	chapterId?: string;
	categoryId?: string;
	practiceId?: string;
	step?: OnboardingStep;
};

export interface OnboardingWizardContext extends Scenes.WizardContext {
	wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
		state: OnboardingWizardState;
	};
	match: RegExpMatchArray;
}
