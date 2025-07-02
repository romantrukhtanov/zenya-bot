import { Injectable } from '@nestjs/common';
import { Span } from '@sentry/core';
import * as Sentry from '@sentry/nestjs';
import { Context as TelegrafContext } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';

type UserCtx = {
	id: string | number;
	username?: string;
	first_name?: string;
	last_name?: string;
	[k: string]: unknown;
};

@Injectable()
export class SentryService {
	public readonly sentry = Sentry;

	/* ─ helpers ─ */
	setUser(user: UserCtx): void {
		Sentry.setUser(user);
	}

	setTags(tags: Record<string, string>): void {
		Object.entries(tags).forEach(([k, v]) => Sentry.setTag(k, v));
	}

	setExtra(extra: Record<string, unknown>): void {
		Object.entries(extra).forEach(([k, v]) => Sentry.setExtra(k, v));
	}

	setTelegrafContext(ctx: TelegrafContext): void {
		const { from, chat, updateType, message } = ctx;

		if (from) {
			this.setUser({
				id: from.id,
				username: from.username,
				first_name: from.first_name,
				last_name: from.last_name,
			});
		}

		const text = (message as Message.TextMessage)?.text;

		Sentry.setContext('telegram', {
			updateType,
			chatType: chat?.type,
			chatId: chat?.id,
			messageText: (message as { text?: string } | undefined)?.text,
			command: text?.startsWith('/') ? text.split(' ')[0] : undefined,
		});
	}

	startSpanManual(opts: { name: string; op?: string; forceTransaction?: boolean }): Span {
		return this.sentry.startSpanManual(
			{ name: opts.name, op: opts.op, forceTransaction: opts.forceTransaction },
			(span) => span,
		);
	}

	async withSpan<T>(
		opts: { name: string; op?: string },
		cb: (span: Span) => Promise<T>,
	): Promise<T> {
		return this.sentry.startSpan(opts, cb); // auto-ends span
	}
}
