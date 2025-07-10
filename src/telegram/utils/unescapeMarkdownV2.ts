export const unescapeMarkdownV2 = (text: string): string => {
  if (!text) {
    return '';
  }
  return text.replace(/\\([_*[\]()~`>#+\-=|{}.!?])/g, '$1');
};
