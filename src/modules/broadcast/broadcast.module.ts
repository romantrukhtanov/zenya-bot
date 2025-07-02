import { Global, Module } from '@nestjs/common';

import { BroadcastService } from './broadcast.service';
import { BroadcastWorker } from './broadcast.worker';
import { QUEUE_BROADCAST } from './constant';

import { MediaService } from '@/common/services';
import { QueueModule } from '@/modules/queue';

@Global()
@Module({
	imports: [
		QueueModule.register({
			queues: [
				{
					name: QUEUE_BROADCAST,
					defaultJobOptions: {
						attempts: 5,
						backoff: { type: 'exponential', delay: 500 },
					},
				},
			],
		}),
	],
	providers: [BroadcastService, BroadcastWorker, MediaService],
	exports: [BroadcastService],
})
export class BroadcastModule {}
