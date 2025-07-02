import { Role, SubscriptionPlan } from '@prisma/__generated__';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class CreateUserDto {
	@IsNumber()
	telegramId: number;

	@IsString()
	@Length(2, 50, {
		message: 'Имя должно содержать от 2 до 50 символов :)',
	})
	name: string;

	@IsEnum(SubscriptionPlan)
	activePlan: SubscriptionPlan = SubscriptionPlan.FREE;

	@IsOptional()
	@IsString()
	telegramUser?: string;

	@IsOptional()
	@IsString()
	telegramProfile?: string;

	@IsOptional()
	@IsBoolean()
	hasOnboarded?: boolean = false;

	@IsOptional()
	@IsEnum(Role)
	role?: Role = Role.USER;
}
