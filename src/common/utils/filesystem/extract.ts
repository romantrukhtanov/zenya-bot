import { basename, dirname } from 'node:path';

/**
 * Извлекает только имя файла из полного пути.
 * @param filePath — полный путь к файлу или URI
 * @param suffix - суффикс файла
 * @returns имя файла с расширением
 */
export const extractFileName = (filePath: string, suffix?: string): string => {
  return basename(filePath, suffix);
};

/**
 * Извлекает путь к директории из полного пути.
 * @param filePath — полный путь к файлу или URI
 * @returns путь к директории (без завершающего слэша, кроме корня)
 */
export const extractDirName = (filePath: string): string => {
  return dirname(filePath);
};
