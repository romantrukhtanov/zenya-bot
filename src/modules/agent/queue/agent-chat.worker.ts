import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { MessageRole } from '@prisma/__generated__';
import { Job } from 'bullmq';
import { Markup } from 'telegraf';

import { AgentClient } from '../agent.client';
import { AgentService } from '../agent.service';
import { countCompletionTokens, countPromptTokens } from '../agent.utils';
import { QUEUE_AGENT_CHAT } from '../constants';
import { AgentMessage } from '../types';

import { MediaService } from '@/common/services';
import { OPENAI_PROMPT_BUDGET, SUPPORT_LINK } from '@/env';
import { UserReplicas } from '@/modules/user';
import { PrismaService } from '@/prisma/prisma.service';
import { BaseCallback } from '@/telegram/scenes/base';
import { translations } from '@/translations';

type JobPayload = {
  convId: string;
  userId: string;
  chatId: number;
  text: string;
};

@Processor(QUEUE_AGENT_CHAT)
export class AgentChatWorker extends WorkerHost {
  private readonly logger = new Logger(AgentChatWorker.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mediaService: MediaService,
    private readonly userReplicas: UserReplicas,
    private readonly agentService: AgentService,
    private readonly agent: AgentClient,
  ) {
    super();
  }

  async process(job: Job<JobPayload>) {
    const { convId, userId, chatId, text } = job.data;

    try {
      const hasUserReplicas = await this.userReplicas.consumeReplica(userId);

      if (!hasUserReplicas) {
        await this.mediaService.sendText(chatId, translations.scenes.chat.noReplies, {
          parseMode: 'MarkdownV2',
          inlineKeyboard: Markup.inlineKeyboard([
            Markup.button.url(translations.shared.support, SUPPORT_LINK),
            Markup.button.callback(translations.shared.back, BaseCallback.GoBack),
          ]),
        });
        await this.agentService.clearPendingRequest(userId);
        return;
      }

      const userMessage = {
        role: MessageRole.user,
        content: text,
      };

      await this.prismaService.message.create({
        data: {
          conversationId: convId,
          ...userMessage,
          promptTokens: countPromptTokens([userMessage]),
        },
      });

      const context = await this.squashContext(convId);

      await this.sendChatTyping(chatId);

      const messageId = await this.mediaService.sendText(chatId, translations.shared.writing);

      const agentMessage = await this.agent.stream(text, context);

      await this.mediaService.editText(chatId, messageId, agentMessage, {
        parseMode: 'Markdown',
      });

      const promptTokens = countPromptTokens([...context, userMessage]);
      const completionTokens = countCompletionTokens(agentMessage);

      await this.prismaService.message.create({
        data: {
          conversationId: convId,
          role: MessageRole.system,
          content: agentMessage,
          promptTokens: promptTokens,
          completionTokens: completionTokens,
        },
      });
    } catch (error: unknown) {
      this.logger.error(`Job ${job.id} failed`, error);

      await this.userReplicas.refundReplica(userId);
      await this.mediaService.sendText(chatId, translations.scenes.chat.error, {
        parseMode: 'MarkdownV2',
      });
    } finally {
      await this.agentService.clearPendingRequest(userId);
    }
  }

  /**
   * Генерирует упрощённый контекст: если токенов мало, возвращает все сообщения;
   * иначе возвращает только резюме диалога.
   */
  private async squashContext(convId: string): Promise<AgentMessage[]> {
    const messages = await this.prismaService.message.findMany({
      where: { conversationId: convId, summarized: false },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true },
    });

    const messageItems: AgentMessage[] = messages.map(message => ({
      role: message.role,
      content: message.content,
    }));

    const { context, tokens } = this.buildContext(messageItems);

    if (tokens <= OPENAI_PROMPT_BUDGET) {
      return context;
    }

    const summary = await this.agent.stream('Сделай краткое резюме диалога', context);

    await this.prismaService.message.updateMany({
      where: { id: { in: messages.map(message => message.id) } },
      data: { summarized: true },
    });

    await this.prismaService.message.create({
      data: {
        conversationId: convId,
        role: MessageRole.system,
        content: `📝 Резюме: ${summary}`,
        promptTokens: countPromptTokens([{ role: 'system', content: summary }]),
        completionTokens: countCompletionTokens(summary),
      },
    });

    return [
      {
        role: 'system',
        content: `📝 Резюме: ${summary}`,
      },
    ];
  }

  /// Вычисляем контекст и токены для стрима
  private buildContext = (messages: AgentMessage[]) => {
    const context: AgentMessage[] = [];

    let tokens = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
      const countTokens = countPromptTokens([messages[i]]);

      if (tokens + countTokens > OPENAI_PROMPT_BUDGET) {
        break;
      }

      tokens += countTokens;
      context.unshift(messages[i]);
    }

    return { context, tokens };
  };

  /// Событие в телеграм что бот печатает
  private async sendChatTyping(chatId: number) {
    return this.mediaService.sendChatAction(chatId, 'typing');
  }
}
