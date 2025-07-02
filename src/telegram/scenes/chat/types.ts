import type { Scenes } from 'telegraf';

import type { ChatStep } from './constants';

export interface ChatWizardState {
	messageId?: number;
	conversationId?: string;
	mediaMessageId?: number;
	mediaName?: string;
	skipSceneLeave?: boolean;
	step: ChatStep;
}

export interface ChatWizardContext extends Scenes.WizardContext {
	wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
		state: ChatWizardState;
	};
}
