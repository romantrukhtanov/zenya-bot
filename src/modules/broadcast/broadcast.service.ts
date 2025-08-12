import { Injectable } from '@nestjs/common';

import { BroadcastPayload } from './broadcast.interfaces';
import { QUEUE_BROADCAST, QUEUE_BROADCAST_JOB } from './constant';

import { QueueService } from '@/modules/queue';

@Injectable()
export class BroadcastService {
  constructor(private readonly queueService: QueueService) {}

  async enqueue(telegramIds: number[], payload: BroadcastPayload) {
    const BATCH = 100;

    for (let i = 0; i < telegramIds.length; i += BATCH) {
      const idsChunk = telegramIds.slice(i, i + BATCH);

      await this.queueService.addJob(QUEUE_BROADCAST, QUEUE_BROADCAST_JOB, {
        ids: idsChunk,
        payload,
      });
    }
  }
}
