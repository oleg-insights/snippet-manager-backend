import { Controller, Param, Delete, UseGuards, Body, Patch, ParseUUIDPipe, HttpCode } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiForbiddenResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserAdminResponseDto } from '../users/dto/user-admin-response.dto';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { toUserAdminDto } from 'src/users/helpers/user-mapper.helper';
import { BadRequestResponseDto } from 'src/common/dto/bad-request-response.dto';
import { ForbiddenResponseDto, NotFoundResponseDto, UnauthorizedResponseDto } from 'src/common/dto/error-responses.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiTags('Admin')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('admin/users')
export class AdminUsersController {
    constructor(private readonly adminUsersService: AdminUsersService) {}

    @ApiOperation({ summary: 'Изменение роли пользователя' })
    @ApiOkResponse({ description: 'Роль успешно изменена', type: () => UserAdminResponseDto })
    @ApiBadRequestResponse({ description: 'Невалидный ID или роль', type: BadRequestResponseDto })
    @ApiUnauthorizedResponse({ description: 'Требуется авторизация', type: UnauthorizedResponseDto })
    @ApiForbiddenResponse({
        description: 'Недостаточно прав или попытка изменить свою роль',
        type: ForbiddenResponseDto,
    })
    @ApiNotFoundResponse({ description: 'Пользователь не найден', type: NotFoundResponseDto })
    @Patch(':id/role')
    async updateUserRole(
        @CurrentUser() currentUser: JwtPayload,
        @Param('id', ParseUUIDPipe) targetUserId: string,
        @Body() dto: UpdateUserRoleDto,
    ): Promise<UserAdminResponseDto> {
        const updatedUser = await this.adminUsersService.updateUserRole(targetUserId, currentUser, dto);

        return toUserAdminDto(updatedUser);
    }

    @HttpCode(204)
    @ApiOperation({
        summary: 'Мягкое удаление пользователя',
        description:
            'Пользователь помечается как удаленный (status, deletedAt, name, email), но не удаляется из БД. UserId инвалидируется на время жизни access-токена, сессии удаляются',
    })
    @ApiNoContentResponse({ description: 'Пользователь успешно удален (soft)' })
    @ApiBadRequestResponse({ description: 'Некорректный формат ID пользователя', type: BadRequestResponseDto })
    @ApiUnauthorizedResponse({ description: 'Требуется авторизация', type: UnauthorizedResponseDto })
    @ApiForbiddenResponse({ description: 'Недостаточно прав', type: ForbiddenResponseDto })
    @ApiNotFoundResponse({ description: 'Пользователь не найден', type: NotFoundResponseDto })
    @Delete(':id')
    async softDelete(
        @Param('id', ParseUUIDPipe) targetUserId: string,
        @CurrentUser() currentUser: JwtPayload,
    ): Promise<void> {
        await this.adminUsersService.softDelete(targetUserId, currentUser);
    }
}
