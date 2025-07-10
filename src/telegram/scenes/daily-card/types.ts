import type { Scenes } from 'telegraf';

export type DailyCardState = {
  messageId?: number;
};

export interface DailyCardWizardContext extends Scenes.WizardContext {
  wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
    state: DailyCardState;
  };
  match: RegExpMatchArray;
}
