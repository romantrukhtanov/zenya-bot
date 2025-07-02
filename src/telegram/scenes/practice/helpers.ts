import type { Category, Chapter, Practice, Role, SubscriptionPlan } from '@prisma/__generated__';
import { Markup } from 'telegraf';

import { PracticeCallback } from './constants';

import { isPlanSufficient, removeEmojis } from '@/common/utils';
import { translations } from '@/translations';

export const getChaptersButtons = (chapters: Chapter[]) => {
	return chapters.map((chapter) =>
		Markup.button.callback(chapter.name, PracticeCallback.SelectChapter + chapter.id),
	);
};

export const getCategoriesButtons = (
	categories: Category[],
	plan: SubscriptionPlan,
	role: Role,
) => {
	return categories.map((category) => {
		const isMinPlan = isPlanSufficient(plan, category.minPlan, role);

		return Markup.button.callback(
			isMinPlan ? category.name : `🔐 ${removeEmojis(category.name)}`,
			isMinPlan ? PracticeCallback.SelectCategory + category.id : PracticeCallback.Ignore,
		);
	});
};

export const getPracticesButtons = (
	practices: Practice[],
	plan: SubscriptionPlan,
	role: Role,
	hasFacts: boolean,
) => {
	const buttons = practices.map((practice) => {
		const isMinPlan = isPlanSufficient(plan, practice.minPlan, role);

		return Markup.button.callback(
			isMinPlan ? practice.title : `🔐 ${removeEmojis(practice.title)}`,
			isMinPlan ? PracticeCallback.SelectPractice + practice.id : PracticeCallback.Ignore,
		);
	});

	if (hasFacts) {
		buttons.push(
			Markup.button.callback(
				`📚 ${translations.shared.interestingFacts}`,
				PracticeCallback.InterestingFacts,
			),
		);
	}

	return buttons;
};
