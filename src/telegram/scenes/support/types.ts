import type { Scenes } from 'telegraf';

export type SupportState = {
	messageId?: number;
};

export interface SupportWizardContext extends Scenes.WizardContext {
	wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
		state: SupportState;
	};
	match: RegExpMatchArray;
}
