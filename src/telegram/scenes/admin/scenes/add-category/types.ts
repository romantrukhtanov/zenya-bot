import type { Scenes } from 'telegraf';

type ChapterType = {
  id: string;
  name: string;
};

export type AddCategoryWizardState = {
  name?: string;
  description?: string;
  chapterId?: string;
  chapters?: ChapterType[];
  skipSceneLeave?: boolean;
};

export interface AddCategoryWizardContext extends Scenes.WizardContext {
  wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
    state: AddCategoryWizardState;
  };
  match: RegExpMatchArray;
}
