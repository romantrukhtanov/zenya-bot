import type { QueueModuleOptions } from './queue.interfaces';

export const MODULE_PROVIDE_KEY = 'QUEUE_MODULE_OPTS';

export const DEFAULT_QUEUE_MODULE_OPTS: QueueModuleOptions = {
	isGlobal: true,
};
