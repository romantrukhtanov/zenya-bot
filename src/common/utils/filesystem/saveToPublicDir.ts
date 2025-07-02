import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { get } from 'node:https';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';

import type { MediaType } from '@prisma/__generated__';
import type { Context } from 'telegraf';

type SaveToPublicDirOptions = {
	fileId: string;
	filePath: string;
	type: MediaType;
};

export const saveToPublicDir = async (
	ctx: Context,
	options: SaveToPublicDirOptions,
): Promise<void> => {
	const fileLink = await ctx.telegram.getFileLink(options.fileId);

	await mkdir(dirname(options.filePath), { recursive: true });

	const readableStream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => {
		get(fileLink, (res) => {
			if (res.statusCode !== 200) {
				return reject(new Error(`Не удалось скачать файл, статус ${res.statusCode}`));
			}
			resolve(res);
		}).on('error', reject);
	});

	await pipeline(readableStream, createWriteStream(options.filePath));
};
