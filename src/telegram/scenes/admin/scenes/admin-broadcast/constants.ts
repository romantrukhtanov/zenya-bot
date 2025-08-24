import { Markup } from 'telegraf';

import { BotSceneCallback } from '@/telegram/constants';
import { translations } from '@/translations';

export enum AdminBroadcastSceneAction {
  CONFIRM_SEND = 'broadcast:confirm:send',
  CANCEL = 'broadcast:cancel',
  BACK_TO_ADMIN = 'broadcast:back:admin',
  ADD_BUTTON = 'broadcast:add:button',
  SKIP_BUTTONS = 'broadcast:skip:buttons',
  BUTTON_TYPE_URL = 'broadcast:button:type:url',
  BUTTON_TYPE_SCENE = 'broadcast:button:type:scene',
  FINISH_BUTTONS = 'broadcast:finish:buttons',
}

export enum AdminSceneCallback {
  Practice = 'admin:practice',
  DailyCard = 'admin:daily:card',
  Support = 'admin:support',
  Subscription = 'admin:subscription',
  AssistantChat = 'admin:assistant:chat',
  Consultation = 'admin:consultation',
  Account = 'admin:account',
}

export const SCENE_BUTTONS = [
  Markup.button.callback(translations.menu.practice, AdminSceneCallback.Practice),
  Markup.button.callback(translations.menu.dailyCard, AdminSceneCallback.DailyCard),
  Markup.button.callback(translations.menu.assistantChat, AdminSceneCallback.AssistantChat),
  Markup.button.callback(translations.menu.consultation, AdminSceneCallback.Consultation),
  Markup.button.callback(translations.menu.subscribe, AdminSceneCallback.Subscription),
  Markup.button.callback(translations.menu.account, AdminSceneCallback.Account),
  Markup.button.callback(translations.menu.support, AdminSceneCallback.Support),
] as const;

export const SCENE_CALLBACK_MAP = {
  [AdminSceneCallback.Practice]: BotSceneCallback.Practice,
  [AdminSceneCallback.DailyCard]: BotSceneCallback.DailyCard,
  [AdminSceneCallback.AssistantChat]: BotSceneCallback.AssistantChat,
  [AdminSceneCallback.Consultation]: BotSceneCallback.Consultation,
  [AdminSceneCallback.Subscription]: BotSceneCallback.Subscription,
  [AdminSceneCallback.Account]: BotSceneCallback.Account,
  [AdminSceneCallback.Support]: BotSceneCallback.Support,
} as const;
