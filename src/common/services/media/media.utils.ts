import { setTimeout as sleep } from 'node:timers/promises';

import type { Telegraf } from 'telegraf';
import { type Context, TelegramError } from 'telegraf';
import type { InputFile } from 'telegraf/types';
import type { ChatAction, ExtraSendChatAction } from 'telegraf/typings/telegram-types';

import type { ExtraOptions } from '@/telegram/utils';
import { buildExtraOptions } from '@/telegram/utils';

export abstract class MediaUtils {
	protected constructor(protected readonly bot: Telegraf<Context>) {}

	/* ─────────────  PUBLIC HELPERS  ───────────── */
	public sendChatAction(ctx: Context | number, action: ChatAction, extra?: ExtraSendChatAction) {
		return this.callWithRetry(() => {
			if (typeof ctx === 'number') {
				return this.bot.telegram.sendChatAction(ctx, action, extra);
			}
			return ctx.sendChatAction(action, extra);
		});
	}

	public async checkMediaFile(fileId: string) {
		try {
			const file = await this.bot.telegram.getFile(fileId);
			return !!file;
		} catch (error) {
			if (error instanceof TelegramError && error.code === 400) {
				return false;
			}
			throw error;
		}
	}

	/* ─────────────  PROTECTED HELPERS  ───────────── */
	protected replyText(ctx: Context | number, text: string, extra: ExtraOptions = {}) {
		const extraOptions = buildExtraOptions(extra);

		const messageOptions = {
			reply_markup: extraOptions.reply_markup,
			protect_content: extraOptions.protect_content,
			parse_mode: extraOptions.parse_mode,
		};

		if (typeof ctx === 'number') {
			return this.bot.telegram.sendMessage(ctx, text, messageOptions);
		}

		return ctx.reply(text, messageOptions);
	}

	protected replyWithVideo(
		ctx: Context | number,
		video: string | InputFile,
		extra: ExtraOptions = {},
	) {
		const options = buildExtraOptions(extra);

		if (typeof ctx === 'number') {
			return this.bot.telegram.sendVideo(ctx, video, options);
		}

		return ctx.replyWithVideo(video, options);
	}

	protected replyWithPhoto(
		ctx: Context | number,
		photo: string | InputFile,
		extra: ExtraOptions = {},
	) {
		const options = buildExtraOptions(extra);

		if (typeof ctx === 'number') {
			return this.bot.telegram.sendPhoto(ctx, photo, options);
		}

		return ctx.replyWithPhoto(photo, options);
	}

	protected replyWithDocument(
		ctx: Context | number,
		file: string | InputFile,
		extra: ExtraOptions = {},
	) {
		const options = buildExtraOptions(extra);

		if (typeof ctx === 'number') {
			return this.bot.telegram.sendDocument(ctx, file, options);
		}

		return ctx.replyWithDocument(file, options);
	}

	protected getChatId(ctx: Context | number) {
		if (typeof ctx === 'number') {
			return ctx;
		}
		return ctx.chat!.id;
	}

	/**
	 * Универсальный вызов Telegram-метода с автоматическим повтором при 429.
	 * @param fn   коллбэк, в котором выполняется реальный вызов Bot API
	 * @param maxRetries  максимальное число повторов (по умолчанию 3)
	 */
	private async callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
		let attempt = 0;

		while (true) {
			try {
				return await fn();
			} catch (err) {
				if (!(err instanceof TelegramError)) {
					throw err;
				}

				if (err.response?.error_code !== 429) {
					throw err;
				}

				if (attempt++ >= maxRetries) {
					throw err;
				}

				const retryAfter = err.response.parameters?.retry_after ?? 1;
				await sleep(retryAfter * 1_000);
			}
		}
	}
}
