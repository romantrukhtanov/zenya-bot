import type { Category, Chapter, Practice } from '@prisma/__generated__';
import { Markup } from 'telegraf';

import { OnboardingCallback } from './constants';

import { unescapeMarkdownV2 } from '@/telegram/utils';

export const getChaptersButtons = (chapters: Chapter[]) => {
  return chapters.map(chapter => Markup.button.callback(chapter.name, OnboardingCallback.SelectChapter + chapter.id));
};

export const getCategoriesButtons = (categories: Category[]) => {
  return categories.map(category => Markup.button.callback(category.name, OnboardingCallback.SelectCategory + category.id));
};

export const getPracticesButtons = (practices: Practice[]) => {
  return practices.map(practice =>
    Markup.button.callback(unescapeMarkdownV2(practice.title), OnboardingCallback.SelectPractice + practice.id),
  );
};
