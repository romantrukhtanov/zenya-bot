import { Catch, ExceptionFilter, ForbiddenException } from '@nestjs/common';
import type { Provider } from '@nestjs/common/interfaces/modules/provider.interface';
import { APP_FILTER } from '@nestjs/core';
import type { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import type { Context as TelegrafContext } from 'telegraf';

import { SentryService } from '@/modules/sentry';

const FORBIDDEN_ACCESS_MESSAGE = '🔐 Недостаточно доступа';

@Catch(ForbiddenException)
export class TelegramExceptionFilter implements ExceptionFilter {
	constructor(private readonly sentryService: SentryService) {}

	async catch(exception: ForbiddenException, host: ExecutionContextHost) {
		const telegrafCtx = TelegrafExecutionContext.create(host).getContext<TelegrafContext>();

		console.log({ message: exception.message, host });

		this.sentryService.setTelegrafContext(telegrafCtx);
		this.sentryService.sentry.captureMessage(exception.message, 'warning');

		await this.replyForbiddenAccess(telegrafCtx, exception.message || FORBIDDEN_ACCESS_MESSAGE);
	}

	private async replyForbiddenAccess(ctx: TelegrafContext, message: string) {
		await ctx.reply(message);
	}
}

export const TelegramExceptionFilterProvider: Provider = {
	provide: APP_FILTER,
	useClass: TelegramExceptionFilter,
};
