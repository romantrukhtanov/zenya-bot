import type { Scenes } from 'telegraf';

export type ConsultationState = {
  messageId?: number;
};

export interface ConsultationWizardContext extends Scenes.WizardContext {
  wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
    state: ConsultationState;
  };
  match: RegExpMatchArray;
}
