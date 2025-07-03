import { Action, Command, Ctx, SceneLeave } from 'nestjs-telegraf';
import { Markup, TelegramError } from 'telegraf';
import { ParseMode } from 'telegraf/typings/core/types/typegram';

import { BaseCallback } from './constants';
import { BaseWizardContext, Buttons } from './types';

import { MainMenuService, MediaService } from '@/common/services';
import { SUPPORT_LINK } from '@/env';
import { AdminScene, BotScene, BotSceneCommand } from '@/telegram/constants';
import { translations } from '@/translations';

export abstract class BaseWizardScene<TCtx extends BaseWizardContext> {
	protected constructor(
		protected readonly mainMenuService: MainMenuService,
		protected readonly mediaService: MediaService,
	) {}

	abstract start(ctx: TCtx): Promise<void>;

	protected async sendOrEdit(
		ctx: TCtx,
		text: string,
		buttons: Buttons = [],
		parseMode?: ParseMode,
		shouldReply?: boolean,
	): Promise<number | undefined> {
		const keyboard = buttons.length ? Markup.inlineKeyboard(buttons, { columns: 1 }) : undefined;

		const extra = {
			protectContent: true,
			inlineKeyboard: keyboard,
			parseMode: parseMode,
		} as const;

		try {
			if (ctx.wizard.state.messageId && !shouldReply) {
				await this.mediaService.editText(ctx, ctx.wizard.state.messageId, text, extra);
			} else {
				ctx.wizard.state.messageId = await this.mediaService.sendText(ctx, text, extra);
			}
		} catch (err) {
			if (err instanceof TelegramError) {
				if (err?.response?.error_code === 400) {
					ctx.wizard.state.messageId = await this.mediaService.sendText(ctx, text, extra);
				} else {
					throw err;
				}
			}
		}

		return ctx.wizard.state.messageId;
	}

	/**
	 * Гарантирует, что на экране отображается актуальный видеоролик‑«обложка»
	 * для текущего шага. Если видео ещё не отправлялось — отправляем; если уже
	 * есть, но другое — редактируем, экономя трафик и сохраняя messageId.
	 */
	protected async ensureSceneMedia<TMedia extends string = string>(
		ctx: TCtx,
		media: TMedia,
		shouldReply?: boolean,
	): Promise<void> {
		if (!ctx.wizard.state.mediaMessageId || shouldReply) {
			ctx.wizard.state.mediaName = media;
			ctx.wizard.state.mediaMessageId = await this.mediaService.sendVideo(ctx, media);
			return;
		}

		if (ctx.wizard.state.mediaName === media) {
			return;
		}

		ctx.wizard.state.mediaName = media;

		await this.mediaService.editVideo(ctx, ctx.wizard.state.mediaMessageId, media);
	}

	protected toggleSkipSceneLeave(@Ctx() ctx: TCtx, nextValue?: boolean) {
		ctx.wizard.state.skipSceneLeave = !!nextValue;
	}

	protected async navigateTo(ctx: TCtx, scene: BotScene | AdminScene) {
		this.toggleSkipSceneLeave(ctx, true);

		await ctx.answerCbQuery();
		await this.onLeave(ctx);
		return ctx.scene.enter(scene);
	}

	async reenterScene(@Ctx() ctx: TCtx) {
		ctx.wizard.selectStep(0);
		return this.start(ctx);
	}

	get homeButton() {
		return Markup.button.callback(translations.shared.backToMain, BaseCallback.GoToMain);
	}

	get supportLink() {
		return Markup.button.url(translations.shared.support, SUPPORT_LINK);
	}

	get subscriptionButton() {
		return Markup.button.callback(translations.shared.subscribeButton, BaseCallback.Subscribe);
	}

	get supportButton() {
		return Markup.button.callback(translations.shared.support, BaseCallback.Support);
	}

	@SceneLeave()
	async onSceneLeave(@Ctx() ctx: TCtx) {
		if (ctx.wizard.state.skipSceneLeave) {
			return;
		}
		await this.mainMenuService.showMainMenu(ctx);
	}

	@Action(BaseCallback.Restart)
	protected async onRestart(@Ctx() ctx: TCtx) {
		await ctx.answerCbQuery();
		return this.reenterScene(ctx);
	}

	@Action(BaseCallback.GoToMain)
	protected async onGoToMain(@Ctx() ctx: TCtx) {
		await ctx.answerCbQuery();
		return ctx.scene.leave();
	}

	@Command(BotSceneCommand.Leave)
	protected async onLeave(@Ctx() ctx: TCtx) {
		return ctx.scene.leave();
	}

	@Command(BotSceneCommand.Menu)
	protected async onMenu(@Ctx() ctx: TCtx) {
		return ctx.scene.leave();
	}
}
