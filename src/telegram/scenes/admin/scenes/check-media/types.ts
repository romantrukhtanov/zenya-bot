import type { MediaType } from '@prisma/__generated__';
import type { Scenes } from 'telegraf';

export type MediaCheckResult = {
	fileId: string;
	fileName: string;
	filePath: string;
	isValid: boolean;
};

export type CheckMediaWizardState = {
	skipSceneLeave?: boolean;
	selectedType?: MediaType;
	mediaResults?: MediaCheckResult[];
};

export interface CheckMediaWizardContext extends Scenes.WizardContext {
	wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
		state: CheckMediaWizardState;
	};
	match: RegExpMatchArray;
}
