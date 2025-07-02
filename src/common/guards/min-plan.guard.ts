import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Provider } from '@nestjs/common/interfaces/modules/provider.interface';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Role, SubscriptionPlan } from '@prisma/__generated__';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { Context } from 'telegraf';

import { MIN_PLAN_KEY } from '@/common/decorators';
import { isPlanSufficient } from '@/common/utils';
import { UserService } from '@/modules/user';
import { translations } from '@/translations';

@Injectable()
export class MinPlanGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly userService: UserService,
	) {}

	async canActivate(ctx: ExecutionContext): Promise<boolean> {
		const requiredPlan = this.reflector.getAllAndOverride<SubscriptionPlan>(MIN_PLAN_KEY, [
			ctx.getHandler(),
			ctx.getClass(),
		]);

		if (!requiredPlan) {
			return true;
		}

		const tgCtx = TelegrafExecutionContext.create(ctx).getContext<Context>();

		const telegramId = tgCtx.from?.id;

		if (!telegramId) {
			throw new ForbiddenException(translations.error.user);
		}

		const role = await this.userService.getUserRole(telegramId);

		if (role === Role.ADMIN) {
			return true;
		}

		const activePlan = await this.userService.getActiveUserPlan(telegramId);

		const isOkPlan = isPlanSufficient(activePlan, requiredPlan);

		if (!isOkPlan) {
			throw new ForbiddenException(`Нужен план ${requiredPlan}, у вас ${activePlan}`);
		}

		return true;
	}
}

export const MinPlanProvider: Provider = { provide: APP_GUARD, useClass: MinPlanGuard };
