import type { Scenes } from 'telegraf';

import type { BroadcastPayload } from '@/modules/broadcast';

export type AdminBroadcastWizardState = {
  skipSceneLeave?: boolean;
  message?: BroadcastPayload;
};

export interface AdminBroadcastWizardContext extends Scenes.WizardContext {
  wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
    state: AdminBroadcastWizardState;
  };
  match: RegExpMatchArray;
}
