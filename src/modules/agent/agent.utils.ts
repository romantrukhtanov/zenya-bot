import type { TiktokenModel } from 'js-tiktoken';
import { encodingForModel } from 'js-tiktoken';

import type { AgentMessage } from './types';

import { OPENAI_MODEL } from '@/env';

const encoding = encodingForModel(OPENAI_MODEL as TiktokenModel);

// 1) Подсчёт токенов в prompt (входные сообщения)
export const countPromptTokens = (messages: AgentMessage[]) => {
  const promptText = messages
    .map(message => {
      if (typeof message.content !== 'string') {
        return '';
      }
      return message.content;
    })
    .join('\n');

  return encoding.encode(promptText).length;
};

// 2) Подсчёт токенов в completion (ответ агента)
export const countCompletionTokens = (text: string) => {
  return encoding.encode(text).length;
};
