import { translations } from '@/translations';

type AdminStats = {
  usersCount?: number;
  countByReplicas?: number;
  countOnboarded?: number;
};

export const getAdminStartText = ({ usersCount = 0, countByReplicas = 0, countOnboarded = 0 }: AdminStats = {}) => {
  return [
    translations.scenes.admin.intro,
    [
      `👥 Всего пользователей: *${usersCount}*`,
      `🤖 Пообщались с Зеней: *${countByReplicas}*`,
      `👀 Прошли весь онбординг: *${countOnboarded}*`,
    ].join('\n'),
  ].join('\n\n');
};
