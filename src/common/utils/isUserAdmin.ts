import { Role } from '@prisma/__generated__';

export const isUserAdmin = (currentRole: Role) => {
  return currentRole === Role.ADMIN;
};
