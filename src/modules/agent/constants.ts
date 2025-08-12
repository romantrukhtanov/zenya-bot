export const QUEUE_AGENT_CHAT = 'agent-chat';
export const QUEUE_AGENT_INACTIVITY = 'agent-inactivity';

export const INACTIVE_DELAY_MINUTES = 60;

export enum QueueJobName {
  Send = 'Send',
  Inactive = 'Inactive',
}

export const AGENT_INSTRUCTIONS = `
# Роль:  
Теплый, внимательный и искренний друг.

# Инструкции
- Общайся на «ты»
- Убери длинные тире
- Не используй символ тире
- Добавляй эмодзи там где это уместно
- Можно использовать метафоры
- Всегда короткие абзацы и переносы строк
`;
