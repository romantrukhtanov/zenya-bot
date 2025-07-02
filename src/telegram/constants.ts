export enum BotScene {
	Onboarding = 'ONBOARDING',
	Practice = 'PRACTICE',
	AddPractice = 'ADD_PRACTICE',
	AddMetaCard = 'ADD_META_CARD',
	AddCategory = 'ADD_CATEGORY',
	AddFacts = 'ADD_FACTS',
	Admin = 'ADMIN',
	DailyCard = 'DAILY_CARD',
	Support = 'SUPPORT',
	Subscription = 'SUBSCRIPTION',
	Account = 'ACCOUNT',
	ZenyaChat = 'ZENYA_CHAT',
}

export enum BotSceneCallback {
	Practice = 'practice',
	DailyCard = 'daily_card',
	Support = 'support',
	Subscription = 'subscription',
	AssistantChat = 'assistant_chat',
	Account = 'account',
	AdminPanel = 'admin_panel',
}

export const IS_PROTECTED_CONTENT = true;
