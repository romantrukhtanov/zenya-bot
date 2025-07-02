import type { ConfigService } from '@nestjs/config';

import { AgentClient } from '../agent.client';

export const agentModuleOptionsFactory = (config: ConfigService) => {
	const apiKey = config.get<string>('OPENAI_API_KEY');

	if (!apiKey) {
		throw new Error('OPENAI_API_KEY не задан в .env');
	}

	const maxTokens = Number(config.get<number>('OPENAI_MAX_COMPLETION') ?? 500);

	const model = config.get<string>('OPENAI_MODEL');

	return new AgentClient({ apiKey, maxTokens, model });
};
