import {
	type CanActivate,
	type ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import type { Provider } from '@nestjs/common/interfaces/modules/provider.interface';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Role } from '@prisma/__generated__';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import type { Context } from 'telegraf';

import { ROLES_KEY } from '@/common/decorators/roles.decorator';
import { UserService } from '@/modules/user';
import { translations } from '@/translations';

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly userService: UserService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!requiredRoles || requiredRoles.length === 0) {
			return true;
		}

		const tgCtx = TelegrafExecutionContext.create(context).getContext<Context>();

		const telegramId = tgCtx.from?.id;

		if (!telegramId) {
			throw new ForbiddenException(translations.error.user);
		}

		const userRole = await this.userService.getUserRole(telegramId);

		const hasRole = requiredRoles.includes(userRole);

		if (!hasRole) {
			throw new ForbiddenException('🔐 Недостаточно доступа');
		}

		return true;
	}
}

export const RolesProvider: Provider = { provide: APP_GUARD, useClass: RolesGuard };
