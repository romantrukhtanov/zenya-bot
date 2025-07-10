import { Injectable } from '@nestjs/common';

import { isUserAdmin } from '@/common/utils';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UserReplicas {
  constructor(private readonly prismaService: PrismaService) {}

  /** списать одну реплику; вернуть true если лимит остался */
  async consumeReplica(userId: string): Promise<boolean> {
    return this.prismaService.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id: userId } });

      if (!user) {
        return false;
      }

      const isAdmin = isUserAdmin(user.role);

      if (isAdmin) {
        return true;
      }

      if (user.replicas > 0) {
        await tx.user.update({
          where: { id: userId },
          data: {
            replicas: {
              decrement: 1,
            },
          },
        });
        return true;
      }

      return false;
    });
  }

  /** вернуть реплику (если произошла ошибка) */
  async refundReplica(userId: string) {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { replicas: { increment: 1 } },
    });
  }

  async updateReplicas(userId: string, amount: number) {
    return this.prismaService.user.update({
      where: { id: userId },
      data: { replicas: amount },
    });
  }
}
