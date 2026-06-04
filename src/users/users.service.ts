import bcrypt from 'bcryptjs';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, UserStatus } from '@prisma/client';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PaginationMetaResponseDto } from 'src/common/dto/list-response.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { RedisService } from 'src/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { UpdateUserDto } from './dto/update-user.dto';
import { buildOrderBy } from 'src/common/utils/sorting.util';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
        private readonly jwtService: JwtService,
    ) {}

    async findAll(pagination: PaginationDto): Promise<{
        users: User[];
        meta: PaginationMetaResponseDto;
    }> {
        const { page, limit, sortBy, order } = pagination;

        const allowedSortFields = ['id', 'name', 'createdAt'] as const;

        type AllowedSortField = (typeof allowedSortFields)[number];

        const isAllowedSortFields = (value: string): value is AllowedSortField => {
            return allowedSortFields.includes(value as AllowedSortField);
        };

        if (!isAllowedSortFields(sortBy)) {
            throw new BadRequestException(
                `Недопустимое поле для сортировки - ${sortBy}. Поддерживаются поля: ${allowedSortFields.join(', ')}`,
            );
        }

        const orderBy = buildOrderBy(sortBy, order);

        const [users, totalItems] = await Promise.all([
            this.prisma.user.findMany({
                where: { status: UserStatus.ACTIVE },
                take: limit,
                skip: limit * (page - 1),
                orderBy,
            }),
            this.prisma.user.count(),
        ]);

        return {
            users,
            meta: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                limit,
            },
        };
    }

    async getMe(id: string): Promise<User> {
        const user = await this.prisma.user.findUnique({
            where: { id, status: UserStatus.ACTIVE },
        });

        if (!user) throw new NotFoundException('Пользователь удален или заблокирован');

        return user;
    }

    async findOneById(id: string): Promise<User> {
        const user = await this.prisma.user.findUnique({
            where: { id, status: UserStatus.ACTIVE },
        });

        if (!user) {
            throw new NotFoundException('Пользователь не найден');
        }

        return user;
    }

    async updatePassword(userId: string, accessToken: string | undefined, dto: UpdatePasswordDto): Promise<void> {
        if (!accessToken) throw new UnauthorizedException('Токен не передан');

        const user = await this.prisma.user.findUnique({
            where: { id: userId, status: UserStatus.ACTIVE },
        });

        if (!user) throw new NotFoundException('Пользователь не найден');

        const isMatch = await bcrypt.compare(dto.oldPassword, user.password);

        if (!isMatch) throw new BadRequestException('Неверно указан старый пароль');

        const hash = await bcrypt.hash(dto.newPassword, 10);

        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { password: hash },
            });

            await tx.session.deleteMany({ where: { userId } });
        });

        const decoded = this.jwtService.decode<{ exp: number }>(accessToken);
        const secondsUntilExpiry = (decoded?.exp || 0) - Math.floor(Date.now() / 1000);

        if (secondsUntilExpiry < 0) return;

        await this.redis.set(`blacklist:token:${accessToken}`, '1', 'EX', secondsUntilExpiry);
    }

    async updateUser(userId: string, dto: UpdateUserDto): Promise<User> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId, status: UserStatus.ACTIVE },
        });

        if (!user) throw new NotFoundException('Пользователь не найден');

        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [{ name: dto.name }, { email: dto.email }],
                status: UserStatus.ACTIVE,
                NOT: { id: userId },
            },
        });

        if (existingUser) {
            if (existingUser.name === dto.name) throw new ConflictException('Указанное имя уже используется');
            if (existingUser.email === dto.email) throw new ConflictException('Указанный email уже используется');
        }

        const formattedDto = Object.fromEntries(Object.entries(dto).filter(([_, value]) => value !== undefined));

        return await this.prisma.user.update({
            where: { id: user.id },
            data: formattedDto,
        });
    }
}
