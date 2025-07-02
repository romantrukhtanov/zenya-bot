import type { Scenes } from 'telegraf';

import type { BaseMediaState } from '@/telegram/scenes/base/base-wizard/types';

export type AddMetaCardWizardState = BaseMediaState & {
	title: string;
	filePath: string;
	fileId: string;
	fileUniqueId: string;
	skipSceneLeave?: boolean;
};

export interface AddMetaCardWizardContext extends Scenes.WizardContext {
	wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
		state: AddMetaCardWizardState;
	};
	match: RegExpMatchArray;
}
