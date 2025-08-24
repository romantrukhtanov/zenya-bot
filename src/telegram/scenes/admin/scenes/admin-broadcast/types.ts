import type { Scenes } from 'telegraf';

import type { BroadcastButtonType, BroadcastPayload } from '@/modules/broadcast';

export type AdminBroadcastWizardState = {
  skipSceneLeave?: boolean;
  message?: BroadcastPayload;
  currentButtonType?: BroadcastButtonType;
  currentButtonText?: string;
  mediaMessageId?: number;
  mediaName?: string;
  messageId?: number;
};

export interface AdminBroadcastWizardContext extends Scenes.WizardContext {
  wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
    state: AdminBroadcastWizardState;
  };
  match: RegExpMatchArray;
}
