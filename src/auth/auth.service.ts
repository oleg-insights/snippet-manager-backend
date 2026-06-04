import bcrypt from 'bcryptjs';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RedisService } from '../redis/redis.service';
import { JwtTokens } from '../auth/interfaces/jwt-tokens.interface';
import { Session, User, UserStatus } from '@prisma/client';
import { RefreshResponse } from './interfaces/refresh-response';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly usersService: UsersService,
        private readonly configService: ConfigService,
        private readonly redis: RedisService,
    ) {}

    async registerUser(dto: RegisterUserDto): Promise<User> {
        const existingUser = await this.prisma.user.findFirst({
            where: { OR: [{ name: dto.name }, { email: dto.email }] },
        });

        if (existingUser) {
            if (existingUser.name === dto.name) {
                throw new ConflictException('Такое имя уже используется');
            }
            if (existingUser.email === dto.email) {
                throw new ConflictException('Такой email уже используется');
            }
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const createdUser = this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                password: hashedPassword,
            },
        });

        return createdUser;
    }

    async validateUser(dto: LoginUserDto): Promise<User> {
        const user = await this.prisma.user.findUnique({
            where: {
                email: dto.email,
                status: UserStatus.ACTIVE,
            },
        });

        if (!user) throw new UnauthorizedException('Неверный логин или пароль');

        const hashedPassword = user.password;
        const isMatch = await bcrypt.compare(dto.password, hashedPassword);

        if (!isMatch) throw new UnauthorizedException('Неверный логин или пароль');

        return user;
    }

    async refresh(refreshToken: string, userAgent: string | null, ip: string | null): Promise<RefreshResponse> {
        let payload: JwtPayload;

        try {
            payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Передан невалидный или истекший refresh-токен');
        }

        const session = await this.prisma.session.findFirst({
            where: { refreshToken },
        });

        if (!session) {
            await this.prisma.session.deleteMany({ where: { userId: payload.sub } });
            throw new UnauthorizedException('Сессия не найдена или истекла');
        }

        const tokens = await this.generateTokens(payload.sub, payload.role);

        await this.prisma.session.update({
            where: { id: session.id },
            data: {
                userId: payload.sub,
                refreshToken: tokens.refreshToken,
                userAgent,
                ip,
                expiresAt: tokens.expiresAt,
            },
        });

        const user = await this.usersService.findOneById(payload.sub);

        return {
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
        };
    }

    async logoutUser(accessToken: string | undefined, refreshToken: string | undefined): Promise<void> {
        if (!accessToken) throw new UnauthorizedException('Access-токен не передан');
        if (!refreshToken) throw new UnauthorizedException('Refresh-токен не передан');

        const decoded = this.jwtService.decode<{ exp: number }>(accessToken);

        if (!decoded || !decoded.exp) {
            throw new UnauthorizedException('Невалидный access-токен');
        }

        const secondsUntilExpiry = decoded.exp - Math.floor(Date.now() / 1000);

        if (secondsUntilExpiry > 0) {
            await this.redis.set(`blacklist:token:${accessToken}`, '1', 'EX', secondsUntilExpiry);
        }

        await this.prisma.session.deleteMany({ where: { refreshToken } });
    }

    async generateTokens(userId: string, role: string): Promise<JwtTokens> {
        const getToken = async (expiresIn: JwtSignOptions['expiresIn'], secret: string) => {
            return await this.jwtService.signAsync({ sub: userId, role }, { expiresIn, secret });
        };

        const accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
        const accessTtlMinutes = parseInt(this.configService.get<string>('JWT_ACCESS_TTL_MINUTES') || '15');

        const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
        const refreshTtlDays = parseInt(this.configService.get<string>('JWT_REFRESH_TTL_DAYS') || '30');

        const [accessToken, refreshToken] = await Promise.all([
            getToken(accessTtlMinutes * 60, accessSecret),
            getToken(refreshTtlDays * 24 * 60 * 60, refreshSecret),
        ]);

        const expiresInMs = refreshTtlDays * 24 * 60 * 60 * 1000;
        const expiresAt = new Date(Date.now() + expiresInMs);

        return { accessToken, refreshToken, expiresAt };
    }

    async createSession(
        userId: string,
        refreshToken: string,
        expiresAt: Date,
        userAgent: string | null,
        ip: string | null,
    ): Promise<Session> {
        return await this.prisma.session.create({
            data: {
                userId,
                refreshToken,
                expiresAt,
                userAgent,
                ip,
            },
        });
    }
}
