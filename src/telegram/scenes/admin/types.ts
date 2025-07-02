import type { Scenes } from 'telegraf';

export type AdminWizardState = {
	skipSceneLeave?: boolean;
};

export interface AdminWizardContext extends Scenes.WizardContext {
	wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
		state: AdminWizardState;
	};
	match: RegExpMatchArray;
}
