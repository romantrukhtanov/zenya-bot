import type { Scenes } from 'telegraf';

import type { DurationType } from './constants';

import type { PaidSubscriptionPlan } from '@/common/types';

export type FoundUser = {
  id: string;
  telegramId: number;
  telegramProfile: string | null;
};

export type GrantSubscriptionWizardState = {
  skipSceneLeave?: boolean;
  foundUser?: FoundUser;
  selectedDuration?: DurationType;
  selectedPlan?: PaidSubscriptionPlan;
};

export interface GrantSubscriptionWizardContext extends Scenes.WizardContext {
  wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
    state: GrantSubscriptionWizardState;
  };
  match: RegExpMatchArray;
}
