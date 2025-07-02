import { Module } from '@nestjs/common';

import { MetaCardService } from './meta-card.service';

@Module({
	providers: [MetaCardService],
	exports: [MetaCardService],
})
export class MetaCardModule {}
