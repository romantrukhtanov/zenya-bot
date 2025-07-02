import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { AgentService } from '../agent.service';
import { QUEUE_AGENT_INACTIVITY } from '../constants';

import { MediaService } from '@/common/services';
import { translations } from '@/translations';

@Processor(QUEUE_AGENT_INACTIVITY)
export class AgentInactivityWorker extends WorkerHost {
	constructor(
		private readonly mediaService: MediaService,
		private readonly agentService: AgentService,
	) {
		super();
	}

	async process(job: Job<{ convId: string; chatId: number }>) {
		await this.agentService.closeConversation(job.data.convId);

		await this.mediaService.sendText(
			job.data.chatId,
			translations.scenes.chat.inactiveNotification,
			{ parseMode: 'MarkdownV2' },
		);
	}
}
