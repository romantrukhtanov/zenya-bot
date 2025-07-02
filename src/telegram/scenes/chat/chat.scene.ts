import { Injectable } from '@nestjs/common';
import { Action, Ctx, Next, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup } from 'telegraf';

import { ChatCallback, ChatMedia, ChatStep } from './constants';
import { getCancelConversation, getChatButtons } from './helpers';
import { ChatWizardContext } from './types';

import { MainMenuService, MediaService } from '@/common/services';
import { AgentService } from '@/modules/agent/agent.service';
import { UserService } from '@/modules/user';
import { BotScene } from '@/telegram/constants';
import { BaseCallback } from '@/telegram/scenes/base';
import { BaseWizardScene } from '@/telegram/scenes/base/base-wizard/base-wizard.scene';
import { getTelegramUser } from '@/telegram/utils';
import { translations } from '@/translations';

@Injectable()
@Wizard(BotScene.ZenyaChat)
export class ChatWizard extends BaseWizardScene<ChatWizardContext> {
	constructor(
		private readonly agentService: AgentService,
		private readonly userService: UserService,
		protected readonly mainMenuService: MainMenuService,
		protected readonly mediaService: MediaService,
	) {
		super(mainMenuService, mediaService);
	}

	@WizardStep(ChatStep.Initial)
	async start(@Ctx() ctx: ChatWizardContext) {
		const telegramUser = getTelegramUser(ctx);

		if (!telegramUser) {
			return;
		}

		const user = await this.userService.findUserByTelegramId(telegramUser.id);

		if (!user) {
			return;
		}

		const userReplicas = user.replicas;

		if (userReplicas === 0) {
			await this.mediaService.sendVideo(ctx, ChatMedia.Intro, {
				caption: translations.scenes.chat.noReplies,
				parseMode: 'MarkdownV2',
				inlineKeyboard: Markup.inlineKeyboard([this.supportLink, this.homeButton], {
					columns: 1,
				}),
			});
			return;
		}

		const buttons = getChatButtons();
		buttons.push(this.homeButton);

		await this.mediaService.sendVideo(ctx, ChatMedia.Intro, {
			caption: translations.scenes.chat.intro,
			parseMode: 'MarkdownV2',
			inlineKeyboard: Markup.inlineKeyboard(buttons, { columns: 1 }),
		});
	}

	@Action(ChatCallback.StartDialog)
	async onStartDialog(@Ctx() ctx: ChatWizardContext) {
		await ctx.answerCbQuery();

		const telegramUser = getTelegramUser(ctx);

		if (!telegramUser) {
			return;
		}

		const telegramId = telegramUser.id;

		const userId = await this.userService.getUserIdByTelegramId(telegramId);

		if (!userId) {
			return;
		}

		const conversation = await this.agentService.findActiveConversation(userId);

		const messagesCount = conversation?.messages?.length || 0;

		ctx.wizard.state.conversationId = conversation?.id;

		if (!conversation && !messagesCount) {
			await this.mediaService.sendText(
				ctx,
				translations.scenes.chat.welcomeConversation,
				getCancelConversation(),
			);
		} else {
			const lastMessage = conversation?.messages[messagesCount - 1];

			const messageContent = lastMessage?.content ? `:\n\n${lastMessage.content}` : '';

			await this.mediaService.sendText(
				ctx,
				`${translations.scenes.chat.continueConversation}${messageContent}`,
				{ ...getCancelConversation(), parseMode: 'Markdown' },
			);
		}

		ctx.wizard.selectStep(ChatStep.Dialog);
	}

	@WizardStep(ChatStep.Dialog)
	@On('text')
	async onMessage(@Ctx() ctx: ChatWizardContext, @Next() next: () => Promise<void>) {
		if (!ctx.message || !('text' in ctx.message)) {
			return;
		}

		const userText = ctx.message.text;

		if (userText.startsWith('/')) {
			return next();
		}

		const telegramUser = getTelegramUser(ctx);

		if (!telegramUser) {
			return;
		}

		const chatId = telegramUser.id;
		const userId = await this.userService.getUserIdByTelegramId(chatId);

		if (!userId) {
			return;
		}

		if (userText === translations.scenes.chat.cancelConversation) {
			return this.onCancelConversation(ctx);
		}

		const conversationId = await this.agentService.replyChat(userId, chatId, userText);

		ctx.wizard.state.conversationId = conversationId;
	}

	async onCancelConversation(@Ctx() ctx: ChatWizardContext) {
		await this.mediaService.sendText(ctx, translations.scenes.chat.endConversation, {
			reply_markup: {
				remove_keyboard: true,
			},
		});

		const conversationId = ctx.wizard.state.conversationId;

		if (conversationId) {
			await this.agentService.closeConversation(conversationId);
			ctx.wizard.state.conversationId = undefined;
		}

		return this.reenterScene(ctx);
	}

	@Action(BaseCallback.GoBack)
	async onGoConversationBack(@Ctx() ctx: ChatWizardContext) {
		await ctx.answerCbQuery();

		await this.mediaService.sendText(ctx, translations.scenes.chat.endConversation, {
			reply_markup: {
				remove_keyboard: true,
			},
		});
		return this.reenterScene(ctx);
	}
}
