import type { Scenes } from 'telegraf';

import type { BaseWizardState } from '@/telegram/scenes/base/base-wizard/types';

export type AccountWizardState = BaseWizardState & {
	isChangingName?: boolean;
};

export interface AccountWizardContext extends Scenes.WizardContext {
	wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
		state: AccountWizardState;
	};
	match: RegExpMatchArray;
}
