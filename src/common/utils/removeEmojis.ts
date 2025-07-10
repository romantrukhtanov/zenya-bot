import emojiRegex from 'emoji-regex';

/**
 * Удаляет эмодзи из текста
 *
 * @param text — входная строка
 * @returns строка без эмодзи
 */
export function removeEmojis(text: string): string {
  return text.replace(emojiRegex(), '');
}
