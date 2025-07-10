import { Markup } from 'telegraf';

import { ChatCallback } from './constants';

import { translations } from '@/translations';

export const getChatButtons = () => {
  return [Markup.button.callback(translations.scenes.chat.startConversationButton, ChatCallback.StartDialog)];
};

export const getCancelConversation = () => {
  return Markup.keyboard([[translations.scenes.chat.cancelConversation]])
    .resize()
    .oneTime();
};
