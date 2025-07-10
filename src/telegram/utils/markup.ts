import { Markup } from 'telegraf';

import { SUPPORT_LINK } from '@/env';
import { translations } from '@/translations';

export const getSupportLinkMarkup = () => {
  return Markup.inlineKeyboard([Markup.button.url(translations.shared.support, SUPPORT_LINK)]);
};
