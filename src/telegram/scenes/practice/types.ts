import type { Fact } from '@prisma/__generated__';
import type { Scenes } from 'telegraf';

import type { PracticeMedia } from './constants';

import type { BaseMediaState } from '@/telegram/scenes/base/base-wizard/types';

export enum PracticeStep {
  START = 'START',
  CHAPTER = 'CHAPTER',
  CATEGORY = 'CATEGORY',
  PRACTICE = 'PRACTICE',
  FACTS = 'FACTS',
}

export type PracticeState = BaseMediaState<PracticeMedia> & {
  messageId?: number;
  chapterId?: string;
  categoryId?: string;
  practiceId?: string;
  facts?: Fact[];
  step: PracticeStep;
};

export interface PracticeWizardContext extends Scenes.WizardContext {
  wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
    state: PracticeState;
  };
  match: RegExpMatchArray;
}
