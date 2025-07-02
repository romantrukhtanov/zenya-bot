import { BullModule, SharedBullAsyncConfiguration } from '@nestjs/bullmq';
import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { DEFAULT_QUEUE_MODULE_OPTS, MODULE_PROVIDE_KEY } from './constants';
import { QueueModuleOptions, QueueModuleRegisterOptions } from './queue.interfaces';
import { QueueService } from './queue.service';

import { redisClientOptionsFactory } from '@/common/factories';

const OPTIONS_PROVIDER: Provider = {
	provide: MODULE_PROVIDE_KEY,
	useValue: {},
};

@Global()
@Module({})
export class QueueModule {
	static forRoot(options: QueueModuleOptions = DEFAULT_QUEUE_MODULE_OPTS): DynamicModule {
		return {
			module: QueueModule,
			imports: [
				BullModule.forRootAsync({
					imports: [ConfigModule],
					inject: [ConfigService],
					useFactory: (cfg: ConfigService) => {
						const clientOptions = redisClientOptionsFactory(cfg);

						if (typeof clientOptions === 'string') {
							return {
								connection: {
									url: clientOptions,
								},
							};
						}

						return {
							connection: clientOptions,
						};
					},
				}),
			],
			providers: [QueueService, OPTIONS_PROVIDER],
			exports: [QueueService],
			global: options.isGlobal,
		};
	}

	static forRootAsync(
		options: SharedBullAsyncConfiguration & QueueModuleOptions = DEFAULT_QUEUE_MODULE_OPTS,
	): DynamicModule {
		return {
			module: QueueModule,
			imports: [...(options.imports ?? []), BullModule.forRootAsync(options)],
			providers: [QueueService, OPTIONS_PROVIDER],
			exports: [QueueService],
			global: options.isGlobal,
		};
	}

	static register(opts: QueueModuleRegisterOptions): DynamicModule {
		// Проходим по каждому элементу opts.queues и формируем BullModule.registerQueue
		const queueImports = opts.queues.map((queue) => {
			if (typeof queue === 'string') {
				return BullModule.registerQueue({ name: queue });
			}

			const { name, ...otherOptions } = queue;

			return BullModule.registerQueue({
				name,
				...otherOptions,
			});
		});

		const flowImports = (opts.flows ?? []).map((name) => BullModule.registerFlowProducer({ name }));

		return {
			module: QueueModule,
			imports: [...queueImports, ...flowImports],
			providers: [
				{
					provide: MODULE_PROVIDE_KEY,
					useValue: opts,
				},
			],
		};
	}
}
