import type { Scenes } from 'telegraf';

export type AddPracticeWizardState = {
	chapterId?: string;
	categoryId?: string;
	title?: string;
	content?: string;
	skipSceneLeave?: boolean;
};

export interface AddPracticeWizardContext extends Scenes.WizardContext {
	wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
		state: AddPracticeWizardState;
	};
	match: RegExpMatchArray;
}
