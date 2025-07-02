import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/__generated__';
import { type Context, Markup } from 'telegraf';

import { MediaService } from '@/common/services/media';
import { UserService } from '@/modules/user';
import { BotSceneCallback } from '@/telegram/constants';
import { translations } from '@/translations';

interface MainMenuButton {
	text: string;
	callback_data: string;
	roles?: Role[];
}

@Injectable()
export class MainMenuService {
	constructor(
		private readonly mediaService: MediaService,
		private readonly userService: UserService,
	) {}

	async showMainMenu<TContext extends Context>(ctx: TContext): Promise<void> {
		const telegramId = ctx.from?.id;

		if (!telegramId) {
			return;
		}

		const userRole = await this.userService.getUserRole(telegramId);
		const buttons = this.getMainMenuButtons(userRole);

		await this.mediaService.sendVideo(ctx, 'idle.mp4', {
			caption: translations.start,
			inlineKeyboard: buttons,
		});
	}

	private getMainMenuButtons(userRole: Role) {
		const allButtons: MainMenuButton[] = [
			{ text: translations.menu.practice, callback_data: BotSceneCallback.Practice },
			{ text: translations.menu.dailyCard, callback_data: BotSceneCallback.DailyCard },
			{ text: translations.menu.assistantChat, callback_data: BotSceneCallback.AssistantChat },
			{ text: translations.menu.subscribe, callback_data: BotSceneCallback.Subscription },
			{ text: translations.menu.account, callback_data: BotSceneCallback.Account },
			{ text: translations.menu.support, callback_data: BotSceneCallback.Support },
			{
				text: translations.menu.admin,
				callback_data: BotSceneCallback.AdminPanel,
				roles: [Role.ADMIN],
			},
		];

		const filteredButtons = allButtons.filter((button) => {
			if (!button.roles || button.roles.length === 0) {
				return true;
			}

			return button.roles.includes(userRole);
		});

		const markupButtons = filteredButtons.map((button) =>
			Markup.button.callback(button.text, button.callback_data),
		);

		return Markup.inlineKeyboard(markupButtons, { columns: 1 });
	}
}
