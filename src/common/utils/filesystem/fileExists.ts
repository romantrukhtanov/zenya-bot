import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Проверяет существование файла по относительному пути от корня проекта.
 * Пример: await fileExists('uploads/video/hello.mp4')
 */
export const fileExists = async (relativePath: string): Promise<boolean> => {
	const fullPath = join(process.cwd(), relativePath);
	try {
		await fs.access(fullPath);
		return true;
	} catch {
		return false;
	}
};
