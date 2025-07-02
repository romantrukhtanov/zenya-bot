import type { RegisterQueueOptions } from '@nestjs/bullmq/dist/interfaces/register-queue-options.interface';

export interface QueueModuleOptions {
	isGlobal?: boolean;
}

export type QueuesType = string | RegisterQueueOptions;

export interface QueueModuleRegisterOptions {
	queues: QueuesType[];
	flows?: string[];
}
