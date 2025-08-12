import type { Markup } from 'telegraf';
import type { InlineKeyboardMarkup } from 'telegraf/src/core/types/typegram';
import type { MessageEntity, ParseMode } from 'telegraf/typings/core/types/typegram';

import { IS_PROTECTED_CONTENT } from '@/telegram/constants';

export type ExtraOptions = {
  caption?: string;
  protectContent?: boolean;
  entities?: MessageEntity[];
  inlineKeyboard?: Markup.Markup<InlineKeyboardMarkup>;
  parseMode?: ParseMode;
};

export const buildExtraOptions = ({ caption, inlineKeyboard, parseMode, protectContent, entities, ...rest }: ExtraOptions) => {
  return {
    caption,
    entities,
    parse_mode: parseMode,
    protect_content: protectContent ?? IS_PROTECTED_CONTENT,
    ...(inlineKeyboard?.reply_markup && { reply_markup: inlineKeyboard.reply_markup }),
    ...rest,
  };
};
