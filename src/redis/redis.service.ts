import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as IORedis from 'ioredis';

import { redisClientOptionsFactory } from '@/common/factories';

export interface RedisSetOptions {
	/**
	 * Время жизни ключа (в секундах).
	 */
	ttl?: number;
	/**
	 * Дополнительные флаги Redis SET (например, 'NX', 'XX', 'KEEPTTL', 'GET', 'PX', 'EXAT', 'PXAT' и т.д.).
	 */
	flags?: (string | number)[];
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
	private client: IORedis.Redis;
	private readonly logger = new Logger(RedisService.name);

	constructor(private readonly configService: ConfigService) {}

	onModuleInit() {
		const redisOptions = redisClientOptionsFactory(this.configService);

		if (typeof redisOptions === 'string') {
			this.client = new IORedis.Redis(redisOptions);
		} else {
			this.client = new IORedis.Redis(redisOptions);
		}

		this.checkRedisUser();
	}

	async onModuleDestroy() {
		if (this.client) {
			await this.client.quit();
		}
	}

	get redisClient() {
		return this.client;
	}

	checkRedisUser() {
		this.client
			.acl('WHOAMI')
			.then((user) => this.logger.log(`Connected as user: ${user}`))
			.catch((err) => this.logger.error('Error checking user ACL:', err));
	}

	public async get<TData>(key: string): Promise<TData | null | undefined> {
		const rawData = await this.client.get(key);
		return rawData ? (JSON.parse(rawData) as TData) : null;
	}

	/**
	 * Сохранить данные по ключу.
	 *
	 * Если указан ttl, автоматически добавляется пара ['EX', ttl].
	 * Дополнительные флаги передаются через options.flags.
	 *
	 * Метод использует sendCommand для отправки команды 'SET',
	 * что позволяет обойти перегрузки метода set в типах ioredis.
	 */
	public async set<TValue>(key: string, value: TValue, options?: RedisSetOptions): Promise<void> {
		const data = JSON.stringify(value);
		const args: (string | number)[] = [key, data];

		if (options?.ttl && options.ttl > 0) {
			args.push('EX', options.ttl);
		}

		if (options?.flags && options.flags.length > 0) {
			args.push(...options.flags);
		}

		const command = new IORedis.Command('set', args);
		await this.client.sendCommand(command);
	}

	/**
	 * Проверить, есть ли данные по ключу.
	 */
	public async exists(key: string): Promise<number> {
		return this.client.exists(key);
	}

	/**
	 * Удалить данные по ключу.
	 */
	public async delete(key: string): Promise<void> {
		await this.client.del(key);
	}

	/**
	 * Удалить ключи по паттерну.
	 */
	public async deleteByPattern(pattern: string): Promise<void> {
		try {
			const keys = await this.client.keys(pattern);

			if (keys.length > 0) {
				await Promise.all(keys.map((key) => this.client.del(key)));
			}
		} catch (error) {
			this.logger.error(`Error deleting keys by pattern "${pattern}":`, error);
		}
	}
}
