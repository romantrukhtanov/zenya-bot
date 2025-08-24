export enum BotScene {
  Onboarding = 'ONBOARDING',
  Practice = 'PRACTICE',
  Admin = 'ADMIN',
  DailyCard = 'DAILY_CARD',
  Support = 'SUPPORT',
  Subscription = 'SUBSCRIPTION',
  Account = 'ACCOUNT',
  ZenyaChat = 'ZENYA_CHAT',
  Consultation = 'CONSULTATION',
}

export enum BotSceneCommand {
  Menu = 'menu',
  Practices = 'practices',
  Mac = 'mac',
  Chat = 'chat',
  Consultation = 'consultation',
  Subscription = 'subscription',
  Subscribe = 'subscribe',
  Account = 'account',
  Support = 'support',
  Admin = 'admin',
  Leave = 'leave',
}

export enum AdminScene {
  AddPractice = 'ADD_PRACTICE',
  AddMetaCard = 'ADD_META_CARD',
  AddCategory = 'ADD_CATEGORY',
  AddFacts = 'ADD_FACTS',
  CheckMedia = 'CHECK_MEDIA',
  GrantSubscription = 'GRANT_SUBSCRIPTION',
  Broadcast = 'BROADCAST',
}

export enum BotSceneCallback {
  Practice = 'practice',
  DailyCard = 'daily_card',
  Support = 'support',
  Subscription = 'subscription',
  AssistantChat = 'assistant_chat',
  Consultation = 'consultation',
  Account = 'account',
  AdminPanel = 'admin_panel',
}

export const IS_PROTECTED_CONTENT = true;
