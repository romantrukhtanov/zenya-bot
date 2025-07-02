import { join } from 'node:path';

import type { ConfigService } from '@nestjs/config';
import type { ServeStaticModuleOptions } from '@nestjs/serve-static';

export const serveStaticOptionsFactory = (config: ConfigService): ServeStaticModuleOptions[] => {
	const publicDir = config.get<string>('PUBLIC_DIR', 'public');

	return [
		{
			rootPath: join(__dirname, '../..', publicDir),
			serveRoot: `/${publicDir}`,
		},
	];
};
