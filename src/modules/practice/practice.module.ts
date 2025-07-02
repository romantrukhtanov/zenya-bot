import { Module } from '@nestjs/common';

import { PracticeService } from './practice.service';

@Module({
	providers: [PracticeService],
	exports: [PracticeService],
})
export class PracticeModule {}
