import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, SubscriptionPlan, User } from '@prisma/__generated__';

import { CreateUserDto } from './dto';

import { UserConsultationsAmount, UserReplicasAmount } from '@/common/constants';
import { Roles } from '@/common/decorators';
import { REDIS_KEY } from '@/common/redis-key';
import { secondsInDays, secondsInMinutes } from '@/common/utils';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { translations } from '@/translations';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Админские методы,
   */

  @Roles(Role.ADMIN)
  async getUsersCount(): Promise<number> {
    return this.prismaService.user.count();
  }

  @Roles(Role.ADMIN)
  async countUsersByReplicas(threshold = UserReplicasAmount.FREE): Promise<number> {
    return this.prismaService.user.count({
      where: {
        replicas: {
          not: threshold,
        },
      },
    });
  }

  @Roles(Role.ADMIN)
  async countOnboardedUsers(): Promise<number> {
    return this.prismaService.user.count({
      where: { hasOnboarded: true },
    });
  }

  /**
   * Регистрирует пользователя (или обновляет, если он уже существует),
   * используя уникальное поле telegramId.
   */
  async registerUser(createUserDto: CreateUserDto): Promise<User> {
    const user = await this.prismaService.user.upsert({
      where: { telegramId: createUserDto.telegramId },
      update: {
        name: createUserDto.name,
        telegramUser: createUserDto.telegramUser,
        role: createUserDto.role,
      },
      create: {
        telegramId: createUserDto.telegramId,
        telegramUser: createUserDto.telegramUser,
        telegramProfile: createUserDto.telegramProfile,
        name: createUserDto.name,
        role: createUserDto.role,
        activePlan: SubscriptionPlan.FREE,
        replicas: UserReplicasAmount.FREE,
        consultations: UserConsultationsAmount.FREE,
      },
    });

    await this.saveUserRoleToRedis(createUserDto.telegramId, createUserDto.role);

    return user;
  }

  async findAll(): Promise<User[]> {
    return this.prismaService.user.findMany();
  }
  /**
   * Находит пользователя по ключу.
   */
  async findUserByKey(key: string | number | bigint): Promise<User | null> {
    const numericValue = Number(key);
    const isNumeric = !isNaN(numericValue) && numericValue > 0;

    const whereConditions: Array<Partial<User>> = [];

    if (typeof key === 'string') {
      whereConditions.push({ id: key }, { telegramProfile: key });
    }

    if (isNumeric) {
      whereConditions.push({ telegramId: BigInt(numericValue) });
    }

    return this.prismaService.user.findFirst({
      where: { OR: whereConditions },
      include: { favorites: true },
    });
  }

  /**
   * Находит пользователя по User ID.
   */
  async findUserByUserId(userId: string): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        favorites: true,
      },
    });
  }

  /**
   * Находит пользователя по Telegram ID.
   */
  async findUserByTelegramId(telegramId: bigint | number): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { telegramId },
      include: {
        favorites: true,
      },
    });
  }

  async updateUserActivePlan(userId: string, plan: SubscriptionPlan) {
    return this.prismaService.user.update({
      where: { id: userId },
      data: { activePlan: plan },
    });
  }

  /**
   * Обновляет данные пользователя по Telegram ID.
   */
  async updateUser(telegramId: bigint | number, updateData: Partial<CreateUserDto>): Promise<User> {
    const updatedUser = await this.prismaService.user.update({
      where: { telegramId },
      data: updateData,
      include: {
        favorites: true,
      },
    });

    await this.saveUserRoleToRedis(telegramId, updateData.role);

    return updatedUser;
  }

  /**
   * Удаляет пользователя по Telegram ID.
   */
  async deleteUser(telegramId: bigint | number): Promise<User> {
    const deletedUser = await this.prismaService.user.delete({
      where: { telegramId },
    });

    await this.deleteUserFromRedis(telegramId, deletedUser.id);

    return deletedUser;
  }

  async updatePlan(userId: string, plan: SubscriptionPlan): Promise<void> {
    await Promise.all([this.saveUserPlanToRedis(userId, plan), this.updateUserActivePlan(userId, plan)]);
  }

  async addConsultations(userId: string, amount: number) {
    return this.prismaService.user.update({
      where: { id: userId },
      data: { consultations: { increment: amount } },
    });
  }

  async getUserRole(telegramId: bigint | number): Promise<Role> {
    const key = this.getUserRoleRedisKey(telegramId);

    const cachedRole = await this.redisService.get<Role>(key);

    if (cachedRole) {
      return cachedRole;
    }

    const user = await this.prismaService.user.findUnique({
      where: { telegramId },
      select: { role: true },
    });

    if (!user) {
      throw new ForbiddenException(translations.error.user);
    }

    await this.saveUserRoleToRedis(telegramId, user.role);

    return user.role;
  }

  async getActiveUserPlan(telegramId: bigint | number): Promise<SubscriptionPlan> {
    const userId = await this.getUserIdByTelegramId(telegramId);
    const cachedPlan = await this.getActiveUserPlanFromRedis(userId);

    if (cachedPlan) {
      return cachedPlan;
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { activePlan: true },
    });

    if (!user) {
      throw new ForbiddenException(translations.error.user);
    }

    await this.saveUserPlanToRedis(userId, user.activePlan);

    return user.activePlan;
  }

  async getActiveUserPlanFromRedis(userId: string): Promise<SubscriptionPlan | null | undefined> {
    const planRedisKey = this.getUserPlanRedisKey(userId);
    return this.redisService.get<SubscriptionPlan>(planRedisKey);
  }

  async getUserIdFromRedis(telegramId: bigint | number): Promise<string | null | undefined> {
    const userIdRedisKey = this.getUserIdRedisKey(telegramId);
    return this.redisService.get<string>(userIdRedisKey);
  }

  async getUserIdByTelegramId(telegramId: bigint | number): Promise<string> {
    const cachedUserId = await this.getUserIdFromRedis(telegramId);

    if (cachedUserId) {
      return cachedUserId;
    }

    const user = await this.findUserByTelegramId(telegramId);

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    await this.saveUserIdToRedis(telegramId, user.id);

    return user.id;
  }

  private async saveUserIdToRedis(telegramId: bigint | number, userId: string): Promise<void> {
    const userRoleKey = this.getUserIdRedisKey(telegramId);
    await this.redisService.set(userRoleKey, userId, { ttl: secondsInDays(1) });
  }

  private async saveUserPlanToRedis(userId: string, plan: SubscriptionPlan = SubscriptionPlan.FREE): Promise<void> {
    const userRoleKey = this.getUserPlanRedisKey(userId);
    await this.redisService.set(userRoleKey, plan, { ttl: secondsInMinutes(30) });
  }

  private async saveUserRoleToRedis(telegramId: bigint | number, role: Role = Role.USER): Promise<void> {
    const userRoleKey = this.getUserRoleRedisKey(telegramId);
    await this.redisService.set(userRoleKey, role, { ttl: secondsInDays(1) });
  }

  private async deleteUserFromRedis(telegramId: bigint | number, userId: string): Promise<void> {
    const planRedisKey = this.getUserPlanRedisKey(userId);

    await this.redisService.deleteByPattern(`*${telegramId}*`);
    await this.redisService.delete(planRedisKey);
  }

  private getUserRoleRedisKey(telegramId: bigint | number): string {
    return `${REDIS_KEY.USER_ROLE}:${telegramId}`;
  }

  private getUserPlanRedisKey(userId: string) {
    return `${REDIS_KEY.USER_SUBSCRIPTION_PLAN}:${userId}`;
  }

  private getUserIdRedisKey(telegramId: bigint | number) {
    return `${REDIS_KEY.USER_ID}:${telegramId}`;
  }
}
