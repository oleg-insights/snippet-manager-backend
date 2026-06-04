import {
    Body,
    Controller,
    Get,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Patch,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { toUserPrivateDto, toUserPublicDto } from './helpers/user-mapper.helper';
import { UserPublicResponseDto } from './dto/user-public-response.dto';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiProperty,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserPublicListResponseDto } from './dto/user-public-list-response.dto';
import { ConflictResponseDto, NotFoundResponseDto, UnauthorizedResponseDto } from 'src/common/dto/error-responses.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { BadRequestResponseDto } from 'src/common/dto/bad-request-response.dto';
import { UserPrivateResponseDto } from './dto/user-private-response.dto';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { UpdatePasswordDto } from './dto/update-password.dto';
import type { Response } from 'express';
import { cookieConfig } from 'src/common/config/cookie.config';
import { AccessToken } from 'src/auth/decorators/access-token.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @ApiOperation({ summary: 'Получение списка пользователей' })
    @ApiOkResponse({ description: 'Пользователи успешно получены', type: UserPublicListResponseDto })
    @ApiBadRequestResponse({ description: 'Указаны некорректные параметры пагинации', type: BadRequestResponseDto })
    @ApiUnauthorizedResponse({ description: 'Требуется авторизация', type: UnauthorizedResponseDto })
    @Get()
    async findAll(@Query() pagination: PaginationDto): Promise<UserPublicListResponseDto> {
        const result = await this.usersService.findAll(pagination);
        const users = result.users.map((user) => toUserPublicDto(user));

        return { data: users, meta: result.meta };
    }

    @ApiOperation({ summary: 'Получение своего профиля' })
    @ApiOkResponse({ description: 'Профиль успешно получен', type: UserPrivateResponseDto })
    @ApiUnauthorizedResponse({ description: 'Требуется авторизация', type: UnauthorizedResponseDto })
    @ApiNotFoundResponse({ description: 'Пользователь удален или заблокирован', type: NotFoundResponseDto })
    @Get('me')
    async getMe(@CurrentUserId() id: string): Promise<UserPrivateResponseDto> {
        const user = await this.usersService.getMe(id);
        return toUserPrivateDto(user);
    }

    @ApiOperation({ summary: 'Получение пользователя по ID' })
    @ApiOkResponse({ description: 'Пользователь успешно получен', type: UserPublicResponseDto })
    @ApiBadRequestResponse({ description: 'ID должен быть в формате UUID', type: BadRequestResponseDto })
    @ApiUnauthorizedResponse({ description: 'Требуется авторизация', type: UnauthorizedResponseDto })
    @ApiNotFoundResponse({ description: 'Пользователь не найден', type: NotFoundResponseDto })
    @Get(':id')
    async findOneById(@Param('id', ParseUUIDPipe) id: string): Promise<UserPublicResponseDto> {
        const user = await this.usersService.findOneById(id);
        return toUserPublicDto(user);
    }

    @HttpCode(204)
    @ApiOperation({ summary: 'Изменение пароля' })
    @ApiNoContentResponse({ description: 'Пароль успешно изменен. Тело ответа пустое' })
    @ApiBadRequestResponse({
        description: 'Неверно указан старый пароль или некорректная длина нового',
        type: BadRequestResponseDto,
    })
    @ApiUnauthorizedResponse({ description: 'Требуется авторизация', type: UnauthorizedResponseDto })
    @ApiNotFoundResponse({ description: 'Пользователь не найден', type: NotFoundResponseDto })
    @Patch('me/password')
    async updatePassword(
        @Body() dto: UpdatePasswordDto,
        @CurrentUserId() userId: string,
        @AccessToken() accessToken: string | undefined,
        @Res({ passthrough: true }) res: Response,
    ): Promise<void> {
        await this.usersService.updatePassword(userId, accessToken, dto);
        res.clearCookie('refreshToken', cookieConfig);
    }

    @HttpCode(200)
    @ApiOperation({ summary: 'Изменение данных пользователя' })
    @ApiOkResponse({ description: 'Данные успешно изменены', type: UserPrivateResponseDto })
    @ApiBadRequestResponse({ description: 'Переданы невалидные данные', type: BadRequestResponseDto })
    @ApiUnauthorizedResponse({ description: 'Требуется авторизация', type: UnauthorizedResponseDto })
    @ApiNotFoundResponse({ description: 'Пользователь не найден', type: NotFoundResponseDto })
    @ApiConflictResponse({ description: 'Имя или email уже используются', type: ConflictResponseDto })
    @Patch('me')
    async updateUser(@Body() dto: UpdateUserDto, @CurrentUserId() userId: string): Promise<UserPrivateResponseDto> {
        const updatedUser = await this.usersService.updateUser(userId, dto);
        return toUserPrivateDto(updatedUser);
    }
}
