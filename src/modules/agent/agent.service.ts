import { Injectable, Logger } from '@nestjs/common';
import { ConversationStatus } from '@prisma/__generated__';
import { addMinutes } from 'date-fns';

import {
	INACTIVE_DELAY_MINUTES,
	QUEUE_AGENT_CHAT,
	QUEUE_AGENT_INACTIVITY,
	QueueJobName,
} from './constants';

import { BULL_KEY, REDIS_KEY } from '@/common/redis-key';
import { MediaService } from '@/common/services';
import { secondsInMinutes } from '@/common/utils';
import { QueueService } from '@/modules/queue';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { translations } from '@/translations';

@Injectable()
export class AgentService {
	private readonly logger = new Logger(AgentService.name);

	constructor(
		private prismaService: PrismaService,
		private readonly queueService: QueueService,
		private readonly redisService: RedisService,
		private readonly mediaService: MediaService,
	) {}

	async replyChat(userId: string, chatId: number, userText: string) {
		const hasPendingRequest = await this.hasAgentPendingRequest(userId);

		if (hasPendingRequest) {
			await this.mediaService.sendText(chatId, translations.shared.rateLimit);
			return;
		}

		const conversation = await this.ensureConversation(userId);

		await this.setPendingRequest(userId);

		await this.queueService.addJob(
			QUEUE_AGENT_CHAT,
			QueueJobName.Send,
			{
				convId: conversation.id,
				userId,
				chatId,
				text: userText,
			},
			{
				removeOnComplete: true,
			},
		);

		const inactiveRedisKey = this.getInactiveChatJobRedisKey(conversation.id);

		await this.queueService.scheduleJob(
			QUEUE_AGENT_INACTIVITY,
			QueueJobName.Inactive,
			{ convId: conversation.id, chatId },
			addMinutes(Date.now(), INACTIVE_DELAY_MINUTES),
			inactiveRedisKey,
			{ removeOnComplete: true },
		);

		return conversation.id;
	}

	async findActiveConversation(userId: string) {
		return this.prismaService.conversation.findFirst({
			where: { userId, status: ConversationStatus.ACTIVE },
			include: {
				messages: true,
			},
		});
	}

	async ensureConversation(userId: string) {
		let conv = await this.findActiveConversation(userId);

		if (!conv) {
			conv = await this.prismaService.conversation.create({
				data: { userId },
				include: {
					messages: true,
				},
			});
		}

		return conv;
	}

	async closeConversation(conversationId: string) {
		await this.clearInactiveChatJob(conversationId);

		return this.prismaService.conversation.update({
			where: { id: conversationId },
			data: { status: ConversationStatus.CLOSED, endsAt: new Date() },
		});
	}

	async clearInactiveChatJob(conversationId: string): Promise<boolean> {
		try {
			const jobId = this.getInactiveChatJobRedisKey(conversationId);
			const result = await this.queueService.removeJob(QUEUE_AGENT_INACTIVITY, jobId);

			if (result) {
				this.logger.log(`Successfully cleared timeout job for conversation: ${conversationId}`);
			} else {
				this.logger.log(`No timeout job found for conversation: ${conversationId}`);
			}

			return result;
		} catch (error) {
			this.logger.error(`Error clearing timeout job for conversation ${conversationId}:`, error);
			return false;
		}
	}

	async clearAllInactiveChatJobs(userId: string): Promise<void> {
		const conversations = await this.prismaService.conversation.findMany({
			where: { userId, status: ConversationStatus.ACTIVE },
			select: { id: true },
		});

		if (conversations.length === 0) {
			this.logger.log(`No active conversations found for user ${userId}`);
			return;
		}

		await Promise.all(conversations.map(({ id }) => this.clearInactiveChatJob(id)));

		this.logger.log(`Cleared timeout jobs for all conversations of user ${userId}`);
	}

	public async setPendingRequest(userId: string): Promise<void> {
		const key = this.getPendingRequestRedisKey(userId);
		await this.redisService.set(key, true, { ttl: secondsInMinutes(3) });
	}

	public async clearPendingRequest(userId: string): Promise<void> {
		const key = this.getPendingRequestRedisKey(userId);
		await this.redisService.delete(key);
	}

	async hasAgentPendingRequest(userId: string): Promise<boolean> {
		const key = this.getPendingRequestRedisKey(userId);
		const exists = await this.redisService.exists(key);
		return exists > 0;
	}

	public getPendingRequestRedisKey(userId: string): string {
		return `${REDIS_KEY.AGENT_PENDING_REQUEST}:${userId}`;
	}

	private getInactiveChatJobRedisKey(conversationId: string): string {
		return `${BULL_KEY.AGENT_INACTIVE_TIMEOUT}:${conversationId}`;
	}
}
