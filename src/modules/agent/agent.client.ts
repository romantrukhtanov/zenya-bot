import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Agent, AgentInputItem, run, setDefaultOpenAIKey } from '@openai/agents';

import { AGENT_INSTRUCTIONS } from '@/modules/agent/constants';

type AgentClientConfig = {
  apiKey: string;
  maxTokens: number;
  name?: string;
  model?: string;
  temperature?: number;
};

@Injectable()
export class AgentClient {
  private readonly logger = new Logger(AgentClient.name);
  private readonly agent: Agent;

  constructor(readonly config: AgentClientConfig) {
    setDefaultOpenAIKey(config.apiKey);

    this.agent = new Agent({
      name: config.name ?? 'Zenya',
      instructions: AGENT_INSTRUCTIONS,
      model: config.model ?? 'gpt-4o-mini',
      modelSettings: {
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens,
      },
    });
  }

  /**
   * Выполняет запрос к агенту с внешним контекстом.
   * @param input — новый пользовательский ввод
   * @param context — массив предыдущих сообщений (AgentInputItem[])
   * @param onEvent — колбэк, вызываемый на каждом «чанке» текста
   * @returns объединённый текст всего ответа
   */
  async stream(input: string, context: AgentInputItem[] = [], onEvent?: (chunk: string) => Promise<void>): Promise<string> {
    const messages: AgentInputItem[] = [...context, { role: 'user', content: input }];

    try {
      const stream = await run(this.agent, messages, { stream: true });

      let aggregated = '';

      for await (const chunk of stream.toTextStream()) {
        aggregated += chunk;
        void onEvent?.(chunk);
      }

      await stream.completed;

      return aggregated;
    } catch (error) {
      this.logger.error('Ошибка при стриминге ответа агента', error);
      throw new InternalServerErrorException('Не удалось получить ответ от Зени');
    }
  }
}
