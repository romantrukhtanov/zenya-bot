import { Injectable } from '@nestjs/common';
import { Context as TelegrafContext, Markup } from 'telegraf';

import { SUPPORT_LINK } from '@/env';
import { SentryService } from '@/modules/sentry';
import { translations } from '@/translations';

@Injectable()
export class SentryMiddleware {
  constructor(private readonly sentryService: SentryService) {}

  telegrafMiddleware = async (ctx: TelegrafContext, next: () => Promise<void>): Promise<void> =>
    this.sentryService.withSpan(
      {
        name: `telegram.${ctx.updateType}`,
        op: 'telegram.bot',
      },

      async () => {
        this.sentryService.setTelegrafContext(ctx);

        try {
          await next();
        } catch (err: unknown) {
          await ctx.reply(translations.shared.error, Markup.inlineKeyboard([Markup.button.url(translations.shared.support, SUPPORT_LINK)]));

          this.sentryService.sentry.captureMessage(err as string);
          throw err;
        }
      },
    );
}
