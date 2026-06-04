import { UserRole } from '@prisma/client';

export const RolePriority: Record<UserRole, number> = {
    [UserRole.USER]: 1,
    [UserRole.ADMIN]: 2,
    [UserRole.SUPER_ADMIN]: 3,
} as const;
