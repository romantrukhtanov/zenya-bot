import { Module } from '@nestjs/common';

import { FactService } from './fact.service';

@Module({
	providers: [FactService],
	exports: [FactService],
})
export class FactModule {}
