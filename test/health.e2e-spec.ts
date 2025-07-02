import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { HealthController } from '@/controllets/health.controller';

describe('HealthController', () => {
	let controller: HealthController;

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [HealthController],
			providers: [],
		}).compile();

		controller = module.get<HealthController>(HealthController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	it('GET /health should return { status: "ok" }', () => {
		expect(controller.check()).toEqual({ status: 'ok' });
	});
});
