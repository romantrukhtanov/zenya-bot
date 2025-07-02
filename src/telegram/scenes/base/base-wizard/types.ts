import type { Markup, Scenes } from 'telegraf';

export type BaseMediaState<TMediaType extends string = string> = {
	mediaMessageId?: number;
	mediaId?: string;
	mediaName?: TMediaType;
};

export type BaseWizardState = BaseMediaState & {
	messageId?: number;
	skipSceneLeave?: boolean;
};

export interface BaseWizardContext extends Scenes.WizardContext {
	wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
		state: BaseWizardState;
	};
}

export type Button =
	| ReturnType<typeof Markup.button.callback>
	| ReturnType<typeof Markup.button.url>;

export type Buttons = Button[];
