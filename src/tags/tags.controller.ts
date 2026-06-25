import { Controller, Get, Body, Query, UseGuards, HttpCode, Post } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiForbiddenResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { TagListResponseDto } from './dto/tag-list-response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { BadRequestResponseDto } from 'src/common/dto/bad-request-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TagResponseDto } from './dto/tag-response.dto';
import { ForbiddenResponseDto, UnauthorizedResponseDto } from 'src/common/dto/error-responses.dto';
import { toTagResponseDto } from './helpers/tag-mapper.helper';
import { MergeTagsDto } from './dto/merge-tags.dto';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { JwtOptionalAuthGuard } from 'src/auth/guards/jwt-optional-auth.guard';
import { OptionalCurrentUserId } from 'src/common/decorators/optional-current-user-id.decorator';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
    constructor(private readonly tagsService: TagsService) {}

    @ApiOperation({ summary: 'Получение доступных тегов' })
    @ApiOkResponse({ description: 'Теги успешно получены', type: TagListResponseDto })
    @ApiBadRequestResponse({ description: 'Указаны невалидные параметры пагинации', type: BadRequestResponseDto })
    @ApiBearerAuth()
    @UseGuards(JwtOptionalAuthGuard)
    @Get()
    async findAll(
        @Query() pagination: PaginationDto,
        @OptionalCurrentUserId() userId: string | null,
    ): Promise<TagListResponseDto> {
        const result = await this.tagsService.findAll(pagination, userId);
        return { data: result.tags, meta: result.meta };
    }

    @HttpCode(200)
    @ApiOperation({
        summary: 'Слияние тегов',
        description: 'Целевой тег привязывается к шаблонам тега-источника. Тег-источник отвязывается и удаляется.',
    })
    @ApiOkResponse({ description: 'Успешное слияние', type: TagResponseDto })
    @ApiBadRequestResponse({
        description: 'Указаны невалидные ID тегов или состояние тегов не позволяет выполнить операцию',
        type: BadRequestResponseDto,
    })
    @ApiUnauthorizedResponse({ description: 'Требуется авторизация', type: UnauthorizedResponseDto })
    @ApiForbiddenResponse({ description: 'Недостаточно прав на один из тегов', type: ForbiddenResponseDto })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post('merge')
    async mergeTags(@Body() dto: MergeTagsDto, @CurrentUserId() userId: string): Promise<TagResponseDto> {
        const targetTag = await this.tagsService.mergeTags(userId, dto);
        return toTagResponseDto(targetTag);
    }
}
