import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { User, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { RolePriority } from 'src/users/enums/user-role.enum';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminUsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
        private readonly configService: ConfigService,
    ) {}

    async updateUserRole(targetUserId: string, currentUser: JwtPayload, dto: UpdateUserRoleDto): Promise<User> {
        const targetUser = await this.prisma.user.findUnique({
            where: { id: targetUserId, status: UserStatus.ACTIVE },
        });

        if (!targetUser) throw new NotFoundException('Пользователь не найден');

        const targetUserPriority: number = RolePriority[targetUser.role];
        const currentUserPriority: number = RolePriority[currentUser.role];

        if (targetUserPriority === undefined || currentUserPriority === undefined) {
            throw new Error('Не определён приоритет для роли');
        }

        if (currentUserPriority <= targetUserPriority) {
            throw new ForbiddenException('Недостаточно прав для действий с этим пользователем');
        }

        if (targetUser.role === dto.role) return targetUser;

        const updatedUser = await this.prisma.user.update({
            where: { id: targetUserId },
            data: { role: dto.role },
        });

        return updatedUser;
    }

    async softDelete(targetUserId: string, currentUser: JwtPayload) {
        const targetUser = await this.prisma.user.findUnique({
            where: { id: targetUserId, status: UserStatus.ACTIVE },
        });

        if (!targetUser) throw new NotFoundException('Пользователь не найден');

        const targetUserPriority: number = RolePriority[targetUser.role];
        const currentUserPriority: number = RolePriority[currentUser.role];

        if (targetUserPriority === undefined || currentUserPriority === undefined) {
            throw new Error('Не определён приоритет для роли');
        }

        if (currentUserPriority <= targetUserPriority) {
            throw new ForbiddenException('Недостаточно прав для действий с этим пользователем');
        }

        const now = Date.now();

        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: targetUserId },
                data: {
                    status: UserStatus.DELETED,
                    deletedAt: new Date(),
                    name: `deleted_${now}_${targetUser.name}`,
                    email: `deleted_${now}_${targetUser.email}`,
                },
            });

            await tx.session.deleteMany({ where: { userId: targetUserId } });
        });

        const accessTokenTtlMinutes = parseInt(this.configService.get<string>('JWT_ACCESS_TTL_MINUTES') || '15');

        const secondsUntilExpiry = accessTokenTtlMinutes * 60;

        await this.redis.set(`blacklist:user:${targetUserId}`, '1', 'EX', secondsUntilExpiry);
    }
}
