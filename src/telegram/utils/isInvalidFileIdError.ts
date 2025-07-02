import { TelegramError } from 'telegraf';

const FILE_ERROR_PHRASES = [
	'file not found',
	'wrong file_id',
	'wrong remote file_id',
	'wrong file identifier',
	'wrong remote file',
	'file is not accessible',
] as const;

export const FILE_ERROR_REGEX = new RegExp(
	`(?:${FILE_ERROR_PHRASES.join('|')})`,
	'i', // флаг ignore-case
);

export const isInvalidFileIdError = (error: unknown): boolean => {
	if (!(error instanceof TelegramError)) {
		return false;
	}

	// Telegram API отдаёт 400 Bad Request для «wrong file_id», «file not found» и т.п.
	if (error.code !== 400) {
		return false;
	}

	const text = (error.response?.description ?? error.message).toLowerCase();

	return FILE_ERROR_REGEX.test(text);
};
