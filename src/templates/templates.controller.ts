import {
    Controller,
    Post,
    Body,
    UseGuards,
    Get,
    Query,
    Param,
    ParseUUIDPipe,
    Patch,
    HttpCode,
    BadRequestException,
    Delete,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { TemplateResponseDto } from './dto/template-response.dto';
import { BadRequestResponseDto } from 'src/common/dto/bad-request-response.dto';
import {
    ConflictResponseDto,
    ForbiddenResponseDto,
    NotFoundResponseDto,
    UnauthorizedResponseDto,
} from 'src/common/dto/error-responses.dto';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { toTemplateResponseDto } from './helpers/template-mapper.helper';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { TemplateListResponseDto } from './dto/template-list-response.dto';
import { JwtOptionalAuthGuard } from 'src/auth/guards/jwt-optional-auth.guard';
import { OptionalCurrentUserId } from 'src/common/decorators/optional-current-user-id.decorator';
import { OptionalCurrentUser } from 'src/common/decorators/optional-current-user.decorator ';
import { TemplateQueryDto } from './dto/template-query.dto';
import { MyTemplateListResponseDto } from './dto/my-template-list-response.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@ApiTags('Templates')
@Controller('templates')
export class TemplatesController {
    constructor(private readonly templatesService: TemplatesService) {}

    @ApiOperation({ summary: 'Создание шаблона' })
    @ApiCreatedResponse({ description: 'Шаблон успешно создан', type: TemplateResponseDto })
    @ApiBadRequestResponse({ description: 'Переданы невалидные данные', type: BadRequestResponseDto })
    @ApiUnauthorizedResponse({ description: 'Токен не передан или истек', type: UnauthorizedResponseDto })
    @ApiForbiddenResponse({ description: 'Нет прав для создания шаблона', type: ForbiddenResponseDto })
    @ApiConflictResponse({ description: 'Такое название шаблона уже существует', type: ConflictResponseDto })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post()
    async create(@Body() dto: CreateTemplateDto, @CurrentUserId() userId: string): Promise<TemplateResponseDto> {
        const template = await this.templatesService.create(userId, dto);
        return toTemplateResponseDto(template);
    }

    @ApiOperation({ summary: 'Получение всех доступных шаблонов' })
    @ApiOkResponse({ description: 'Шаблоны успешно получены', type: TemplateListResponseDto })
    @ApiUnauthorizedResponse({ description: 'Токен истек или невалиден', type: UnauthorizedResponseDto })
    @ApiBadRequestResponse({ description: 'Некорректные данные пагинации или тегов', type: BadRequestResponseDto })
    @ApiBearerAuth()
    @UseGuards(JwtOptionalAuthGuard)
    @Get()
    async getAll(
        @Query() query: TemplateQueryDto,
        @OptionalCurrentUser() user: { sub: string; role: string } | null,
    ): Promise<TemplateListResponseDto> {
        const result = await this.templatesService.getAll(user, query);
        const templates = result.templates.map((t) => toTemplateResponseDto(t));
        return {
            data: templates,
            meta: result.meta,
            availableTags: result.availableTags,
            selectedTags: result.selectedTags,
            suggestedParents: result.suggestedParents,
        };
    }

    @ApiOperation({ summary: 'Получение своих шаблонов' })
    @ApiOkResponse({ description: 'Шаблоны успешно получены', type: MyTemplateListResponseDto })
    @ApiBadRequestResponse({ description: 'Некорректные параметры пагинации', type: BadRequestResponseDto })
    @ApiUnauthorizedResponse({ description: 'Требуется авторизация', type: UnauthorizedResponseDto })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMy(
        @Query() pagination: PaginationDto,
        @CurrentUserId() userId: string,
    ): Promise<MyTemplateListResponseDto> {
        const result = await this.templatesService.getMy(userId, pagination);
        const templates = result.templates.map((t) => toTemplateResponseDto(t));
        return { data: templates, meta: result.meta };
    }

    @ApiOperation({ summary: 'Получение шаблона по ID' })
    @ApiOkResponse({ description: 'Шаблон успешно получен', type: TemplateResponseDto })
    @ApiBadRequestResponse({ description: 'Невалидный формат ID', type: BadRequestResponseDto })
    @ApiUnauthorizedResponse({
        description: 'Передан невалидный или заблокированный токен',
        type: UnauthorizedResponseDto,
    })
    @ApiForbiddenResponse({ description: 'Нет прав для просмотра шаблона с указанным ID', type: ForbiddenResponseDto })
    @ApiNotFoundResponse({ description: 'Шаблон с таким ID не найден', type: NotFoundResponseDto })
    @ApiBearerAuth()
    @UseGuards(JwtOptionalAuthGuard)
    @Get(':id')
    async getOne(
        @Param(
            'id',
            new ParseUUIDPipe({
                exceptionFactory: () => new BadRequestException('ID шаблона должен быть валидным UUID'),
            }),
        )
        templateId: string,
        @OptionalCurrentUserId() userId: string | null,
    ): Promise<TemplateResponseDto> {
        const template = await this.templatesService.getOne(userId, templateId);
        return toTemplateResponseDto(template);
    }

    @ApiOperation({ summary: 'Редактирование шаблона' })
    @ApiOkResponse({ description: 'Шаблон успешно отредактирован', type: TemplateResponseDto })
    @ApiBadRequestResponse({
        description: 'Указаны невалидные данные или попытка удалить все теги',
        type: BadRequestResponseDto,
    })
    @ApiUnauthorizedResponse({ description: 'Access-токен не передан или невалиден', type: UnauthorizedResponseDto })
    @ApiForbiddenResponse({ description: 'Шаблон принадлежит другому пользователю', type: ForbiddenResponseDto })
    @ApiNotFoundResponse({ description: 'Шаблон не найден', type: NotFoundResponseDto })
    @ApiConflictResponse({ description: 'Указанный заголовок уже используется', type: ConflictResponseDto })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async update(
        @Param(
            'id',
            new ParseUUIDPipe({
                exceptionFactory: () => new BadRequestException('ID шаблона должен быть валидным UUID'),
            }),
        )
        templateId: string,
        @Body() dto: UpdateTemplateDto,
        @CurrentUserId() userId: string,
    ): Promise<TemplateResponseDto> {
        const template = await this.templatesService.update(userId, templateId, dto);
        return toTemplateResponseDto(template);
    }

    @HttpCode(200)
    @ApiOperation({ summary: 'Публикация шаблона' })
    @ApiOkResponse({
        description: 'Шаблон успешно опубликован. Область видимости приватных тегов шаблона изменена на публичную',
        type: TemplateResponseDto,
    })
    @ApiBadRequestResponse({ description: 'Невалидный ID шаблона', type: BadRequestResponseDto })
    @ApiUnauthorizedResponse({ description: 'Access-токен не передан или невалиден', type: UnauthorizedResponseDto })
    @ApiForbiddenResponse({ description: 'Шаблон принадлежит другому пользователю', type: ForbiddenResponseDto })
    @ApiNotFoundResponse({ description: 'Шаблон не найден', type: NotFoundResponseDto })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post(':id/publish')
    async publish(
        @Param(
            'id',
            new ParseUUIDPipe({
                exceptionFactory: () => new BadRequestException('ID шаблона должен быть валидным UUID'),
            }),
        )
        templateId: string,
        @CurrentUserId() userId: string,
    ): Promise<TemplateResponseDto> {
        const template = await this.templatesService.publish(userId, templateId);
        return toTemplateResponseDto(template);
    }

    @HttpCode(200)
    @ApiOperation({ summary: 'Снятие шаблона с публикации' })
    @ApiOkResponse({
        description:
            'Шаблон успешно снят с публикации. Область видимости тегов, не привязанных к другим шаблонам, изменена на приватную',
        type: TemplateResponseDto,
    })
    @ApiBadRequestResponse({ description: 'Невалидный ID шаблона', type: BadRequestResponseDto })
    @ApiUnauthorizedResponse({ description: 'Access-токен не передан или невалиден', type: UnauthorizedResponseDto })
    @ApiForbiddenResponse({ description: 'Шаблон принадлежит другому пользователю', type: ForbiddenResponseDto })
    @ApiNotFoundResponse({ description: 'Шаблон не найден', type: NotFoundResponseDto })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post(':id/unpublish')
    async unpublish(
        @Param(
            'id',
            new ParseUUIDPipe({
                exceptionFactory: () => new BadRequestException('ID шаблона должен быть валидным UUID'),
            }),
        )
        templateId: string,
        @CurrentUserId() userId: string,
    ): Promise<TemplateResponseDto> {
        const template = await this.templatesService.unpublish(userId, templateId);
        return toTemplateResponseDto(template);
    }

    @HttpCode(204)
    @ApiOperation({ summary: 'Удаление шаблона' })
    @ApiNoContentResponse({ description: 'Шаблон успешно удален. Неиспользуемые теги удалены' })
    @ApiBadRequestResponse({ description: 'Невалидный ID шаблона', type: BadRequestResponseDto })
    @ApiUnauthorizedResponse({ description: 'Access-токен не передан или невалиден', type: UnauthorizedResponseDto })
    @ApiForbiddenResponse({ description: 'Шаблон принадлежит другому пользователю', type: ForbiddenResponseDto })
    @ApiNotFoundResponse({ description: 'Шаблон не найден', type: NotFoundResponseDto })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async remove(
        @Param(
            'id',
            new ParseUUIDPipe({
                exceptionFactory: () => new BadRequestException('ID шаблона должен быть валидным UUID'),
            }),
        )
        templateId: string,
        @CurrentUserId() userId: string,
    ): Promise<void> {
        await this.templatesService.remove(userId, templateId);
    }
}
