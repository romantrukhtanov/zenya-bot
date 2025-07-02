import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AgentClient } from './agent.client';
import { AgentService } from './agent.service';
import { QUEUE_AGENT_CHAT, QUEUE_AGENT_INACTIVITY } from './constants';
import { agentModuleOptionsFactory } from './factory';

import { MediaService } from '@/common/services';
import { AgentChatWorker, AgentInactivityWorker } from '@/modules/agent/queue';
import { QueueModule } from '@/modules/queue';

@Global()
@Module({
	imports: [
		ConfigModule,
		QueueModule.register({ queues: [QUEUE_AGENT_CHAT, QUEUE_AGENT_INACTIVITY] }),
	],
	providers: [
		{
			provide: AgentClient,
			inject: [ConfigService],
			useFactory: agentModuleOptionsFactory,
		},
		AgentService,
		AgentChatWorker,
		AgentInactivityWorker,
		MediaService,
	],
	exports: [AgentClient, AgentService],
})
export class AgentModule {}
