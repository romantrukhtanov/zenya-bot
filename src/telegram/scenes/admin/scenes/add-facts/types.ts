import type { Scenes } from 'telegraf';

export type AddFactsWizardState = {
	title?: string;
	categoryId?: string;
	chapterId?: string;
	skipSceneLeave?: boolean;
};

export interface AddFactsWizardContext extends Scenes.WizardContext {
	wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
		state: AddFactsWizardState;
	};
	match: RegExpMatchArray;
}
