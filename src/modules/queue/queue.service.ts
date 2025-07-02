import { getQueueToken } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { JobsOptions, Queue } from 'bullmq';

import { QueueModuleRegisterOptions, QueuesType } from './queue.interfaces';

import { MODULE_PROVIDE_KEY } from '@/modules/queue/constants';

@Injectable()
export class QueueService {
	private readonly logger = new Logger(QueueService.name);

	constructor(private readonly moduleRef: ModuleRef) {}

	async addJob<TData>(queueName: string, jobName: string, data: TData, opts?: JobsOptions) {
		const queue = this.ensureQueue(queueName);
		this.logger.log(`Adding job "${jobName}" to queue "${queueName}"`);
		return queue.add(jobName, data, opts);
	}

	async scheduleJob<TData, TJobName extends string = string>(
		queueName: string,
		jobName: TJobName,
		data: TData,
		runAt: Date,
		jobId: string,
		opts?: JobsOptions,
	) {
		const queue = this.ensureQueue(queueName);

		const existedJob = await queue.getJob(jobId);

		if (existedJob) {
			await existedJob.remove();
		}

		const delay = Math.max(0, runAt.getTime() - Date.now());
		this.logger.log(`Scheduling job "${jobName}" on "${queueName}" to run in ${delay}ms`);
		return this.addJob(queueName, jobName, data, { ...opts, jobId, delay });
	}

	async getJobCounts(queueName: string) {
		const queue = this.ensureQueue(queueName);
		this.logger.log(`Retrieving job counts for queue "${queueName}"`);
		return queue.getJobCounts();
	}

	listQueues(): QueuesType[] {
		const moduleOptions = this.moduleRef.get<QueueModuleRegisterOptions>(MODULE_PROVIDE_KEY, {
			strict: false,
		});
		return moduleOptions?.queues ?? [];
	}

	async removeJob<TData, TResult>(queueName: string, jobId: string): Promise<boolean> {
		const queue = this.ensureQueue<TData, TResult>(queueName);

		if (!queue) {
			return false;
		}

		const queueJob = await queue.getJob(jobId);

		if (!queueJob) {
			return false;
		}

		await queueJob.remove();

		return true;
	}

	private ensureQueue<TData, TResult>(name: string) {
		const queue = this.moduleRef.get<Queue<TData, TResult>>(getQueueToken(name), { strict: false });

		if (!queue) {
			this.logger.error(`Queue "${name}" not registered`);
			throw new NotFoundException(`Queue "${name}" not found`);
		}

		return queue;
	}
}
