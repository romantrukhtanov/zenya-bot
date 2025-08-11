export const TEXTS = {
  INTRO: 'Выдача подписки пользователю\n\nВведите *id* или *telegramId* или *telegramUser*:',

  // User search prompts
  ENTER_USER_ID: 'Введите ID пользователя (UUID):',
  ENTER_TELEGRAM_ID: 'Введите Telegram ID пользователя:',

  // User search results
  USER_NOT_FOUND: 'Пользователь не найден. Попробуйте еще раз.',
  USER_FOUND: 'Пользователь найден:\n\n👤 ID: %s\n📱 Telegram ID: %s\n📝 Telegram User: %s\n\nПродолжить?',

  // Step 2: Duration selection
  SELECT_DURATION: 'Выберите длительность подписки:',
  DURATION_3_DAYS: '📅 3 дня',
  DURATION_WEEK: '📅 Неделя',
  DURATION_2_WEEKS: '📅 2 недели',
  DURATION_MONTH: '📅 Месяц',

  SELECT_PLAN: 'Выберите тип подписки:',

  CONFIRM_GRANT: 'Подтвердите выдачу подписки:\n\n👤 Пользователь: %s\n📅 Длительность: %s (%s ч.)\n💎 План: %s\n\nВыдать подписку?',
  CONFIRM_BUTTON: '✅ Подтвердить выдачу',

  SUCCESS: 'Готово ✅\nВыдана подписка:\n👤 Пользователь: %s\n📅 Длительность: %s (%s ч.)\n💎 План: %s',
  USER_SUCCESS_TEXT:
    'Ура\\! 🎉\nДарю тебе *%d* бонусной подписки *%s*\\.\n\nПозаботься о себе, открывай новое и наполняйся энергией вместе со мной, я всегда рядом 🌿',
  ERROR: 'Произошла ошибка при выдаче подписки. Попробуйте еще раз.',

  // Navigation buttons
  GO_TO_ADMIN: '⬅️ В админку',
  RESTART: '🔄 Начать заново',
  BACK: '⬅️ Назад',
  CONTINUE: '✅️ Продолжить',

  // Loading states
  SEARCHING_USER: 'Поиск пользователя...',
  GRANTING_SUBSCRIPTION: 'Выдача подписки...',
};
