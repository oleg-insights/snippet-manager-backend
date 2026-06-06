import {
    Controller,
    Post,
    Body,
    UseInterceptors,
    ClassSerializerInterceptor,
    Ip,
    Headers,
    Res,
    HttpCode,
    UnauthorizedException,
    UseGuards,
    Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiTooManyRequestsResponse,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserPrivateResponseDto } from '../users/dto/user-private-response.dto';
import { toUserPrivateDto } from '../users/helpers/user-mapper.helper';
import { BadRequestResponseDto } from '../common/dto/bad-request-response.dto';
import {
    ConflictResponseDto,
    TooManyRequestsResponseDto,
    UnauthorizedResponseDto,
} from '../common/dto/error-responses.dto';
import { LoginUserResponseDto } from './dto/login-user-response.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { cookieConfig } from '../common/config/cookie.config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { CustomThrottlerGuard } from 'src/common/guards/custom-trottler.guard';
import { RefreshResponse } from './interfaces/refresh-response';

@ApiTags('Auth')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @ApiOperation({ summary: 'Регистрация пользователя' })
    @ApiCreatedResponse({ description: 'Пользователь успешно зарегистрирован', type: UserPrivateResponseDto })
    @ApiBadRequestResponse({ description: 'Переданы невалидные данные', type: BadRequestResponseDto })
    @ApiConflictResponse({ description: 'Имя или email уже используются', type: ConflictResponseDto })
    @Post('register')
    async registerUser(@Body() registerUserDto: RegisterUserDto): Promise<UserPrivateResponseDto> {
        const registeredUser = await this.authService.registerUser(registerUserDto);
        return toUserPrivateDto(registeredUser);
    }

    @HttpCode(200)
    @ApiOperation({ summary: 'Вход в аккаунт' })
    @ApiOkResponse({
        description: 'Вход выполнен успешно. Refresh-токен записан в куки',
        type: LoginUserResponseDto,
        headers: {
            'Set-Cookie': {
                description: 'Записывает refreshToken. Флаги HttpOnly, Secure (prod), SameSite=Strict, expires',
                schema: {
                    type: 'string',
                    example: 'refreshToken=xyz123; HttpOnly; SameSite=Strict; expires=1000000000',
                },
            },
        },
    })
    @ApiUnauthorizedResponse({ description: 'Неверный логин или пароль', type: UnauthorizedResponseDto })
    @ApiBadRequestResponse({ description: 'Переданы невалидные данные', type: BadRequestResponseDto })
    @ApiTooManyRequestsResponse({ description: 'Превышено количество запросов', type: TooManyRequestsResponseDto })
    @UseGuards(CustomThrottlerGuard)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('login')
    async loginUser(
        @Body() loginUserDto: LoginUserDto,
        @Ip() ip: string | null,
        @Headers('user-agent') userAgent: string | null,
        @Res({ passthrough: true }) res: Response,
    ): Promise<LoginUserResponseDto> {
        const user = await this.authService.validateUser(loginUserDto);

        const { accessToken, refreshToken, expiresAt } = await this.authService.generateTokens(user.id, user.role);

        await this.authService.createSession(user.id, refreshToken, expiresAt, userAgent, ip);

        res.cookie('refreshToken', refreshToken, {
            ...cookieConfig,
            expires: expiresAt,
        });

        return { user: toUserPrivateDto(user), accessToken };
    }

    @HttpCode(200)
    @ApiOperation({ summary: 'Обновление refresh- и access- токенов', description: 'Требует куку refreshToken' })
    @ApiOkResponse({
        description: 'Токены успешно обновлены. Refresh-токен записан в куки',
        type: RefreshResponseDto,
        headers: {
            'Set-Cookie': {
                description: 'Записывает refresh-токен в куки. Флаги HttpOnly, Secure (prod), SameSite=Strict',
                schema: {
                    type: 'string',
                    example: 'refreshToken=xyz123; HttpOnly; SameSite=Strict; expires=1000000000',
                },
            },
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Передан невалидный или истекший refreshToken, либо токен не передан',
        type: UnauthorizedResponseDto,
    })
    @Post('refresh')
    async refresh(
        @Ip() ip: string | null,
        @Headers('user-agent') userAgent: string | null,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<RefreshResponseDto> {
        const refreshToken: string = req.cookies?.refreshToken;

        if (!refreshToken) {
            throw new UnauthorizedException('Токен не передан');
        }

        const {
            user,
            accessToken,
            refreshToken: newRefreshToken,
            expiresAt,
        }: RefreshResponse = await this.authService.refresh(refreshToken, userAgent, ip);

        res.cookie('refreshToken', newRefreshToken, {
            ...cookieConfig,
            expires: expiresAt,
        });

        return { user: toUserPrivateDto(user), accessToken };
    }

    @HttpCode(204)
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Выход из аккаунта' })
    @ApiNoContentResponse({
        description:
            'Выход из аккаунта выполнен, сессия удалена, access-токен добавлен в blacklist, кука refreshToken очищена',
        headers: {
            'Set-Cookie': { description: 'Чистит куку refreshToken' },
        },
    })
    @ApiUnauthorizedResponse({ description: 'Один из токенов невалиден или не передан', type: UnauthorizedResponseDto })
    @Post('logout')
    async logoutUser(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
        const authHeader = req.headers.authorization;
        const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

        const refreshToken: string = req.cookies?.refreshToken;

        await this.authService.logoutUser(accessToken, refreshToken);

        res.clearCookie('refreshToken', cookieConfig);
    }
}
