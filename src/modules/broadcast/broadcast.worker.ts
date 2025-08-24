import { setTimeout as sleep } from 'node:timers/promises';

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Markup, TelegramError } from 'telegraf';

import { BroadcastButton, BroadcastButtonType, BroadcastPayload } from './broadcast.interfaces';
import { QUEUE_BROADCAST } from './constant';

import { MediaService } from '@/common/services';
import { exhaustiveCheck } from '@/common/utils';

interface BroadcastJobData {
  ids: number[];
  payload: BroadcastPayload;
}

@Processor(QUEUE_BROADCAST, {
  concurrency: 5,
  limiter: {
    max: 28,
    duration: 1_000,
  },
})
@Injectable()
export class BroadcastWorker extends WorkerHost {
  private readonly logger = new Logger(BroadcastWorker.name);

  private static readonly MAX_ATTEMPTS_PER_USER = 5;
  private static readonly EXTRA_DELAY_MS = 500;

  constructor(private readonly mediaService: MediaService) {
    super();
  }

  async process(job: Job<BroadcastJobData>) {
    this.logger.log(`Start job ${job.id} ⏱ ${new Date().toISOString()}`);

    const { ids, payload } = job.data;

    for (const id of ids) {
      await this.sendWithRetry(id, payload, job);
    }

    this.logger.log(`End job ${job.id} ⏱ ${new Date().toISOString()}`);
    return { sent: ids.length };
  }

  private async sendWithRetry(id: number, message: BroadcastPayload, job: Job) {
    for (let attempt = 1; attempt <= BroadcastWorker.MAX_ATTEMPTS_PER_USER; attempt++) {
      try {
        const inlineKeyboard = this.buildInlineKeyboard(message.buttons);

        await this.mediaService.sendText(Number(id), message.text, { entities: message.entities, inlineKeyboard });
        return;
      } catch (err: unknown) {
        if (err instanceof TelegramError) {
          const retryAfter = err.parameters?.retry_after ?? err.response?.parameters?.retry_after;

          // Если Telegram прислал 429 -> ждём указанный интервал и пробуем снова
          if (retryAfter) {
            const waitMs = Number(retryAfter) * 1000 + BroadcastWorker.EXTRA_DELAY_MS;

            await job.log(`Rate-limit for ${waitMs} ms (user ${id}), attempt ${attempt}`);
            await sleep(waitMs);
            continue;
          }

          // Другие ошибки лишь логируем
          await job.log(`Fail to send user ${id}: ${err.message ?? err}`);
          return;
        }
      }
    }

    await job.log(`Give up sending to ${id} after ${BroadcastWorker.MAX_ATTEMPTS_PER_USER} attempts`);
  }

  private buildInlineKeyboard(buttons?: BroadcastButton[]) {
    if (!buttons?.length) {
      return undefined;
    }

    return Markup.inlineKeyboard(
      buttons.map(button => {
        switch (button.type) {
          case BroadcastButtonType.URL:
            return Markup.button.url(button.label, button.url);
          case BroadcastButtonType.ACTION:
            return Markup.button.callback(button.label, button.action);
          default:
            exhaustiveCheck(button);
        }
      }),
      { columns: 1 },
    );
  }
}
