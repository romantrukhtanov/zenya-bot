import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
	Currency,
	Prisma,
	Subscription,
	SubscriptionPlan,
	SubscriptionStatus,
} from '@prisma/__generated__';
import { addHours, addMonths, isAfter, subDays } from 'date-fns';

import { QUEUE_SUBSCRIPTIONS, QueueSubscriptionJob } from './constants';
import { assertCurrency } from './utils';

import { UserReplicasAmount } from '@/common/constants';
import { BULL_KEY, REDIS_KEY } from '@/common/redis-key';
import { MediaService } from '@/common/services';
import { formatSecondsToHumanTime, getSecondsLeft } from '@/common/utils';
import { QueueService } from '@/modules/queue';
import { UserReplicas, UserService } from '@/modules/user';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { translations } from '@/translations';

@Injectable()
export class SubscriptionService {
	constructor(
		private readonly prismaService: PrismaService,
		private readonly queueService: QueueService,
		private readonly userService: UserService,
		private readonly userReplicas: UserReplicas,
		private readonly mediaService: MediaService,
		private readonly redisService: RedisService,
	) {}

	/* --------------------- публичные методы ---------------------------------- */

	/**
	 * Купить подписку на N месяцев.
	 */
	async purchase(
		userId: string,
		plan: SubscriptionPlan,
		months: number,
		amount: Prisma.Decimal | string | number,
		currency: Currency,
	) {
		if (plan === SubscriptionPlan.FREE) {
			throw new BadRequestException(translations.scenes.subscription.freePlanError);
		}

		assertCurrency(currency);

		return this.runWithPurchaseLock(userId, plan, async () => {
			const endsAt = addMonths(new Date(), months);

			const subscriptionId = await this.prismaService.$transaction(async (tx) => {
				await this.cancelAllActive(userId);

				const createdSubscription = await tx.subscription.create({
					data: {
						userId,
						plan,
						status: SubscriptionStatus.ACTIVE,
						startsAt: new Date(),
						endsAt,
						amountPaid: new Prisma.Decimal(amount),
						currency,
					},
				});

				await this.userReplicas.updateReplicas(userId, UserReplicasAmount[plan]);
				await this.userService.updatePlan(userId, plan);

				return createdSubscription.id;
			});

			await this.scheduleExpireJob(userId, endsAt);
			await this.scheduleNotifyBeforeExpireJob(userId, endsAt);

			return subscriptionId;
		});
	}

	/**
	 * Купить подписку на N месяцев — идентификация по telegramId.
	 */
	async purchaseByTelegramId(
		telegramId: bigint | number,
		plan: SubscriptionPlan,
		months: number,
		amount: Prisma.Decimal | string | number,
		currency: Currency,
	) {
		const userId = await this.userService.getUserIdByTelegramId(telegramId);
		return await this.purchase(userId, plan, months, amount, currency);
	}

	async getActiveSubscription(userId: string): Promise<Subscription | null> {
		return this.prismaService.subscription.findFirst({
			where: {
				userId,
				status: SubscriptionStatus.ACTIVE,
				endsAt: { gte: new Date() },
			},
			orderBy: { endsAt: 'desc' },
		});
	}

	/**
	 * Продлить текущий активный платный план на N месяцев.
	 */
	async prolongActive(userId: string, months: number) {
		const active = await this.getActiveSubscription(userId);

		if (!active) {
			throw new NotFoundException('Активная подписка не найдена');
		}

		const newEnds = addMonths(active.endsAt, months);

		await this.prismaService.subscription.update({
			where: { id: active.id },
			data: { endsAt: newEnds },
		});

		await this.scheduleExpireJob(userId, newEnds);
		await this.scheduleNotifyBeforeExpireJob(userId, newEnds);
		// кэш не меняется (план тот же)
	}

	/**
	 * Продлить активный план по telegramId.
	 */
	async prolongActiveByTelegramId(telegramId: bigint | number, months: number) {
		const userId = await this.userService.getUserIdByTelegramId(telegramId);
		return this.prolongActive(userId, months);
	}

	/**
	 * Дать “полный доступ” на N часов (по умолчанию 24). Помечается как trial = true.
	 */
	async grantUnlimitedTrial(
		userId: string,
		hours = 24,
		plan = SubscriptionPlan.STANDARD,
		currency: Currency = Currency.UZS,
	) {
		const endsAt = addHours(new Date(), hours);

		await this.prismaService.subscription.create({
			data: {
				userId,
				plan,
				status: SubscriptionStatus.ACTIVE,
				startsAt: new Date(),
				endsAt,
				amountPaid: new Prisma.Decimal(0),
				currency,
				isTrial: true,
			},
		});

		await this.userService.updatePlan(userId, plan);
		await this.scheduleExpireJob(userId, endsAt);
		await this.scheduleNotifyBeforeExpireJob(userId, endsAt);
	}

	/**
	 * Дать “полный доступ” по telegramId.
	 */
	async grantUnlimitedTrialByTelegramId(
		telegramId: bigint | number,
		hours = 24,
		plan = SubscriptionPlan.STANDARD,
	) {
		const userId = await this.userService.getUserIdByTelegramId(telegramId);
		return this.grantUnlimitedTrial(userId, hours, plan);
	}

	async expireActive(userId: string) {
		await this.prismaService.$transaction(async (tx) => {
			await tx.subscription.updateMany({
				where: {
					userId,
					status: SubscriptionStatus.ACTIVE,
					endsAt: { lte: new Date() },
				},
				data: { status: SubscriptionStatus.EXPIRED },
			});

			await this.userReplicas.updateReplicas(userId, 0);
			await this.userService.updatePlan(userId, SubscriptionPlan.FREE);
		});
	}

	async notifyBeforeExpire(userId: string, expireAt: Date) {
		const user = await this.userService.findUserByUserId(userId);

		if (!user) {
			return;
		}

		const secondsLeft = getSecondsLeft(expireAt);
		const humanTime = formatSecondsToHumanTime(secondsLeft);

		const telegramId = Number(user.telegramId);

		await this.mediaService.sendText(telegramId, 'Ваша подписка закончится через: ' + humanTime);
	}

	/**
	 * Отменить все активные подписки (refund/ban).
	 */
	async cancelAllActive(userId: string) {
		await this.clearScheduleExpireJobs(userId);
		await this.clearScheduleNotifyExpireJobs(userId);

		return this.prismaService.subscription.updateMany({
			where: {
				userId,
				status: SubscriptionStatus.ACTIVE,
			},
			data: { status: SubscriptionStatus.CANCELED },
		});
	}

	/**
	 * Отменить все подписки по telegramId.
	 */
	async cancelAllActiveByTelegramId(telegramId: bigint | number) {
		const userId = await this.userService.getUserIdByTelegramId(telegramId);
		return this.cancelAllActive(userId);
	}

	async clearScheduleExpireJobs(userId: string): Promise<void> {
		const subs = await this.prismaService.subscription.findMany({
			where: { userId },
			select: { endsAt: true },
		});

		for (const { endsAt } of subs) {
			const jobId = this.getPlanExpireRedisKey(userId, endsAt.getTime());
			await this.queueService.removeJob(QUEUE_SUBSCRIPTIONS, jobId);
		}

		await this.deleteExpireJob(userId);
	}

	async clearScheduleNotifyExpireJobs(userId: string): Promise<void> {
		const subs = await this.prismaService.subscription.findMany({
			where: { userId },
			select: { endsAt: true },
		});

		for (const { endsAt } of subs) {
			const notifyAt: Date = subDays(endsAt, 1);

			const jobId = this.getPlanNotifyBeforeExpireRedisKey(userId, notifyAt.getTime());
			await this.queueService.removeJob(QUEUE_SUBSCRIPTIONS, jobId);
		}

		await this.deleteNotifyBeforeExpireJob(userId);
	}

	/* --------------------- приватные утилиты --------------------------------- */
	private async runWithPurchaseLock<T>(
		userId: string,
		plan: SubscriptionPlan,
		fn: () => Promise<T>,
	): Promise<T | undefined> {
		const lockKey = this.getPurchaseLockRedisKey(userId, plan);
		const lockState = await this.redisService.get<string>(lockKey);

		if (lockState) {
			return;
		}

		try {
			await this.redisService.set(lockKey, 'true', { ttl: 30 });
			return await fn();
		} finally {
			await this.redisService.delete(lockKey);
		}
	}

	private getPurchaseLockRedisKey(userId: string, plan: SubscriptionPlan) {
		return `${REDIS_KEY.USER_PURCHASE_LOCK}:${userId}:${plan}`;
	}

	private getPlanExpireRedisKey(userId: string, timestamp: number) {
		return `${BULL_KEY.USER_SUBSCRIPTION_EXPIRE}:${userId}:${timestamp}`;
	}

	private getPlanNotifyBeforeExpireRedisKey(userId: string, timestamp: number) {
		return `${BULL_KEY.USER_SUBSCRIPTION_NOTIFY_EXPIRE}:${userId}:${timestamp}`;
	}

	private async scheduleExpireJob(userId: string, endsAt: Date) {
		const endsAtTimestamp = endsAt.getTime();
		const jobId = this.getPlanExpireRedisKey(userId, endsAtTimestamp);

		await this.queueService.scheduleJob(
			QUEUE_SUBSCRIPTIONS,
			QueueSubscriptionJob.Expire,
			{ userId },
			endsAt,
			jobId,
		);
	}

	private async scheduleNotifyBeforeExpireJob(userId: string, endsAt: Date) {
		const notifyAt: Date = subDays(endsAt, 1);
		const notifyAtTimestamp = notifyAt.getTime();

		if (!isAfter(notifyAt, new Date())) {
			return;
		}

		const jobId = this.getPlanNotifyBeforeExpireRedisKey(userId, notifyAtTimestamp);

		await this.queueService.scheduleJob(
			QUEUE_SUBSCRIPTIONS,
			QueueSubscriptionJob.NotifyBeforeExpire,
			{ userId, expireAt: endsAt },
			notifyAt,
			jobId,
			{ removeOnComplete: true },
		);
	}

	private async deleteExpireJob(userId: string) {
		await this.redisService.deleteByPattern(`${BULL_KEY.USER_SUBSCRIPTION_EXPIRE}:${userId}:*`);
	}

	private async deleteNotifyBeforeExpireJob(userId: string) {
		await this.redisService.deleteByPattern(
			`${BULL_KEY.USER_SUBSCRIPTION_NOTIFY_EXPIRE}:${userId}:*`,
		);
	}
}
