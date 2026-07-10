import { Prisma } from '@prisma/client';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { PaginationMetaResponseDto } from 'src/common/dto/list-response.dto';
import { TemplateQueryDto } from './dto/template-query.dto';
import { TagPreviewDto } from 'src/tags/dto/tag-preview.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { SuggestedParentDto } from './dto/suggested-parent.dto';
import { buildOrderBy } from 'src/common/utils/sorting.util';
import { sanitizeContent } from 'src/common/utils/content-sanitizer.util';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

export type TemplateWithAuthorAndTags = Prisma.TemplateGetPayload<{
    include: {
        tags: { select: { id: true; name: true } };
        author: { select: { id: true; name: true } };
    };
    omit: { authorId: true };
}>;

@Injectable()
export class TemplatesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsGateway,
    ) {}

    async create(userId: string, dto: CreateTemplateDto): Promise<TemplateWithAuthorAndTags> {
        const { title, content, tagIds: dtoTagIds = [], newTagNames = [] } = dto;

        const existingTemplate = await this.prisma.template.findFirst({
            where: { title, authorId: userId },
        });

        if (existingTemplate) throw new ConflictException('У вас уже есть шаблон с таким заголовком');

        const preparedContent: Prisma.InputJsonValue = content
            .map((block) => sanitizeContent(block))
            .map((block) => ({
                type: block.type,
                data: block.data as Prisma.InputJsonValue,
            }));

        const tagIds = [...dtoTagIds];

        for (const tagName of newTagNames) {
            const foundTag = await this.prisma.tag.findFirst({
                where: {
                    name: tagName,
                    OR: [{ scopeUserId: null }, { authorId: userId }],
                },
            });

            if (foundTag) {
                tagIds.push(foundTag.id);
            } else {
                const createdTag = await this.prisma.tag.create({
                    data: {
                        name: tagName,
                        authorId: userId,
                        scopeUserId: userId,
                    },
                });
                tagIds.push(createdTag.id);
            }
        }

        const formattedTagIds = tagIds.map((id) => ({ id }));

        const template = await this.prisma.template.create({
            data: {
                title,
                content: preparedContent,
                tags: { connect: formattedTagIds },
                authorId: userId,
                isPublic: false,
            },
            include: {
                tags: {
                    select: { id: true, name: true },
                },
                author: {
                    select: { id: true, name: true },
                },
            },
            omit: {
                authorId: true,
            },
        });

        return template;
    }

    async getAll(
        userId: string | null,
        query: TemplateQueryDto,
    ): Promise<{
        templates: TemplateWithAuthorAndTags[];
        meta: PaginationMetaResponseDto;
        availableTags: TagPreviewDto[];
        selectedTags: TagPreviewDto[];
        suggestedParents: SuggestedParentDto[];
    }> {
        const { page, limit, sortBy, order, tagIds } = query;

        const allowedSortFields = ['id', 'title', 'createdAt'] as const;

        type AllowedSortField = (typeof allowedSortFields)[number];

        const isAllowedSortField = (value: string): value is AllowedSortField => {
            return allowedSortFields.includes(value as AllowedSortField);
        };

        if (!isAllowedSortField(sortBy)) {
            throw new BadRequestException(
                `Недопустимое поле для сортировки - ${sortBy}. Поддерживаются поля: ${allowedSortFields.join(', ')}`,
            );
        }

        const orderBy = buildOrderBy(sortBy, order);

        // Выбранные разрешенные теги
        let selectedTags: TagPreviewDto[] = [];

        // ID выбранных разрешенных тегов
        let allowedTagIds: string[] = [];

        if (tagIds && tagIds.length > 0) {
            selectedTags = await this.prisma.tag.findMany({
                where: {
                    id: { in: tagIds },
                    OR: [{ scopeUserId: null }, ...(userId ? [{ scopeUserId: userId }] : [])],
                },
                select: { id: true, name: true },
            });

            allowedTagIds = selectedTags.map((tag) => tag.id);

            if (allowedTagIds.length === 0) {
                throw new BadRequestException('Запрос содержит только недопустимые теги');
            }
        }

        const templatesFilter: Prisma.TemplateWhereInput = {
            AND: [
                // Шаблон создан пользователем или публичный
                userId ? { OR: [{ isPublic: true }, { authorId: userId }] } : { isPublic: true },
                // Шаблон содержит все переданные разрешенные теги
                ...(allowedTagIds && allowedTagIds.length > 0
                    ? allowedTagIds.map((tagId) => ({ tags: { some: { id: tagId } } }))
                    : []),
            ],
        };

        const [templates, totalItems] = await Promise.all([
            this.prisma.template.findMany({
                where: templatesFilter,
                take: limit,
                skip: (page - 1) * limit,
                orderBy,
                include: {
                    tags: { select: { id: true, name: true } },
                    author: { select: { id: true, name: true } },
                },
            }),
            this.prisma.template.count({ where: templatesFilter }),
        ]);

        const selectionTemplateIds = (
            await this.prisma.template.findMany({
                where: templatesFilter,
                select: { id: true },
            })
        ).map((t) => t.id);

        const selectionTemplatesCount = selectionTemplateIds.length;

        let suggestedParents: SuggestedParentDto[] = [];
        let availableTagsFromSelection: TagPreviewDto[] | null = null;

        if (selectedTags.length > 0 && selectionTemplatesCount > 0) {
            // не выбранные, но привязанные к шаблонам в выборке
            const tagsInSelection = await this.prisma.tag.findMany({
                where: {
                    // не находится в выбранных тегах
                    id: { not: { in: allowedTagIds } },
                    // встречается в шаблонах из выборки
                    templates: { some: { id: { in: selectionTemplateIds } } },
                },
                include: {
                    // всего шаблонов у тега
                    _count: { select: { templates: true } },
                },
            });

            // теги в шаблонах выборки с количеством привязанных шаблонов из выборки
            const tagsToCheck = await Promise.all(
                tagsInSelection.map(async (tag) => {
                    // количество шаблонов с этим тегом в выборке
                    const tagTemplatesCount = await this.prisma.template.count({
                        where: {
                            id: { in: selectionTemplateIds },
                            tags: { some: { id: tag.id } },
                        },
                    });
                    return { tag, tagTemplatesCount };
                }),
            );

            const recommendedTags = tagsToCheck
                .filter(({ tag, tagTemplatesCount }) => {
                    // тег есть в каждом шаблоне в выборке
                    const tagInAllSelection = tagTemplatesCount === selectionTemplatesCount;
                    // к тегу привязаны шаблоны вне выборки
                    const tagOverSelection = tag._count.templates > selectionTemplatesCount;

                    return tagInAllSelection && tagOverSelection;
                })
                .map(({ tag }) => tag);

            // комбинация тегов, которую расширяет рекомендованный
            const childIds = allowedTagIds;
            suggestedParents = recommendedTags.map((t) => ({ id: t.id, name: t.name, childIds }));

            availableTagsFromSelection = tagsToCheck
                .filter(({ tagTemplatesCount }) => {
                    // теги, привязанные к шаблонам выборки, но сужающие поиск
                    return tagTemplatesCount < selectionTemplatesCount;
                })
                .map(({ tag }) => ({ id: tag.id, name: tag.name }));
        }

        const suggestedTagIds = suggestedParents.map((p) => p.id);

        let availableTags: TagPreviewDto[] = [];

        if (availableTagsFromSelection !== null) {
            availableTags = availableTagsFromSelection;
        } else {
            availableTags = await this.prisma.tag.findMany({
                where: {
                    // Только в шаблонах из выборки
                    templates: { some: templatesFilter },
                    // Исключить выбранные пользователем теги
                    // Исключить рекомендованных родителей
                    NOT: { id: { in: [...allowedTagIds, ...suggestedTagIds] } },
                },
                select: { id: true, name: true },
            });
        }

        return {
            templates,
            meta: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                limit,
            },
            availableTags,
            selectedTags,
            suggestedParents,
        };
    }

    async getMy(
        userId: string,
        dto: PaginationDto,
    ): Promise<{
        templates: TemplateWithAuthorAndTags[];
        meta: PaginationMetaResponseDto;
    }> {
        const { page, limit, sortBy, order } = dto;

        const allowedSortFields = ['id', 'title', 'createdAt'] as const;

        type AllowedSortField = (typeof allowedSortFields)[number];

        const isAllowedSortField = (value: string): value is AllowedSortField => {
            return allowedSortFields.includes(value as AllowedSortField);
        };

        if (!isAllowedSortField(sortBy)) {
            throw new BadRequestException(
                `Недопустимое поле для сортировки - ${sortBy}. Поддерживаются поля: ${allowedSortFields.join(', ')}`,
            );
        }

        const orderBy = buildOrderBy(sortBy, order);

        const templatesFilter: Prisma.TemplateWhereInput = { authorId: userId };

        const [templates, totalItems] = await Promise.all([
            this.prisma.template.findMany({
                where: templatesFilter,
                take: limit,
                skip: (page - 1) * limit,
                orderBy,
                include: {
                    tags: {
                        select: { id: true, name: true },
                    },
                    author: {
                        select: { id: true, name: true },
                    },
                },
                omit: {
                    authorId: true,
                },
            }),
            this.prisma.template.count({ where: templatesFilter }),
        ]);

        return {
            templates,
            meta: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                limit,
            },
        };
    }

    async getOne(userId: string | null, templateId: string): Promise<TemplateWithAuthorAndTags> {
        const template = await this.prisma.template.findUnique({
            where: { id: templateId },
            select: { authorId: true, isPublic: true },
        });

        if (!template) throw new NotFoundException('Шаблон не найден');

        const isAuthor = template.authorId === userId;
        const isPublic = template.isPublic;

        if (!isAuthor && !isPublic) {
            throw new ForbiddenException('Недостаточно прав для просмотра этого шаблона');
        }

        return await this.prisma.template.update({
            where: { id: templateId },
            data: { useCount: { increment: 1 } },
            include: {
                tags: {
                    select: { id: true, name: true },
                },
                author: {
                    select: { id: true, name: true },
                },
            },
            omit: {
                authorId: true,
            },
        });
    }

    async update(userId: string, templateId: string, dto: UpdateTemplateDto): Promise<TemplateWithAuthorAndTags> {
        const template = await this.prisma.template.findUnique({
            where: { id: templateId },
            select: { authorId: true },
        });

        if (!template) throw new NotFoundException('Шаблон с таким ID не найден');

        if (template.authorId !== userId) {
            throw new ForbiddenException('Недостаточно прав для редактирования этого шаблона');
        }

        const { title, content, tagIds, newTagNames } = dto;

        const data: Prisma.TemplateUpdateInput = {};

        if (title !== undefined) {
            const existingTemplate = await this.prisma.template.findFirst({
                where: { title, NOT: { id: templateId } },
            });

            if (existingTemplate) {
                throw new ConflictException('Указанный заголовок уже используется');
            }

            data.title = title;
        }

        if (content !== undefined) {
            const preparedContent: Prisma.InputJsonValue = content
                .map((block) => sanitizeContent(block))
                .map((block) => ({
                    type: block.type,
                    data: block.data as Prisma.InputJsonValue,
                }));

            data.content = preparedContent;
        }

        if (tagIds !== undefined || newTagNames?.length) {
            let finalTagIds: string[];

            if (tagIds !== undefined) {
                finalTagIds = [...tagIds];
            } else {
                const template = await this.prisma.template.findUnique({
                    where: { id: templateId },
                    select: { tags: { select: { id: true } } },
                });

                finalTagIds = template!.tags.map((tag) => tag.id);
            }

            if (newTagNames?.length) {
                const newIds = await Promise.all(
                    newTagNames.map(async (name) => {
                        let tag = await this.prisma.tag.findFirst({
                            where: {
                                name,
                                OR: [{ scopeUserId: null }, { scopeUserId: userId }],
                            },
                            select: { id: true },
                        });
                        if (!tag) {
                            tag = await this.prisma.tag.create({
                                data: { name, authorId: userId, scopeUserId: userId },
                                select: { id: true },
                            });
                        }
                        return tag.id;
                    }),
                );

                newIds.forEach((newId) => {
                    if (finalTagIds.includes(newId)) return;
                    finalTagIds.push(newId);
                });
            }

            if (!finalTagIds.length) {
                throw new BadRequestException('Шаблон должен содержать хотя бы один тег');
            }

            data.tags = { set: finalTagIds.map((id) => ({ id })) };
        }

        const updatedTemplate = await this.prisma.template.update({
            where: { id: templateId },
            data,
            include: {
                tags: {
                    select: { id: true, name: true },
                },
                author: {
                    select: { id: true, name: true },
                },
            },
            omit: {
                authorId: true,
            },
        });

        return updatedTemplate;
    }

    async publish(userId: string, templateId: string): Promise<TemplateWithAuthorAndTags> {
        const template = await this.prisma.template.findUnique({
            where: { id: templateId },
            select: { title: true, authorId: true, isPublic: true },
        });

        if (!template) {
            throw new NotFoundException('Шаблон не найден');
        }

        if (template.authorId !== userId) {
            throw new ForbiddenException('Недостаточно прав для действий с этим шаблоном');
        }

        if (template.isPublic) {
            return await this.prisma.template.findUniqueOrThrow({
                where: { id: templateId },
                include: {
                    tags: {
                        select: { id: true, name: true },
                    },
                    author: {
                        select: { id: true, name: true },
                    },
                },
                omit: {
                    authorId: true,
                },
            });
        }

        const publishedTemplate = await this.prisma.$transaction(async (tx) => {
            const tags = await tx.tag.findMany({
                where: {
                    templates: { some: { id: templateId } },
                },
                select: { id: true },
            });

            const tagIds = tags.map((t) => t.id);

            await tx.tag.updateMany({
                where: {
                    id: { in: tagIds },
                    NOT: { scopeUserId: null },
                },
                data: { scopeUserId: null },
            });
            return await tx.template.update({
                where: { id: templateId },
                data: { isPublic: true },
                include: {
                    tags: { select: { id: true, name: true } },
                    author: { select: { id: true, name: true } },
                },
                omit: { authorId: true },
            });
        });

        this.notifications.newTemplateNotification({ title: template.title, authorId: template.authorId });

        return publishedTemplate;
    }

    async unpublish(userId: string, templateId: string): Promise<TemplateWithAuthorAndTags> {
        const template = await this.prisma.template.findUnique({
            where: { id: templateId },
            select: { authorId: true, isPublic: true },
        });

        if (!template) {
            throw new NotFoundException('Шаблон не найден');
        }

        if (template.authorId !== userId) {
            throw new ForbiddenException('Недостаточно прав для действий с этим шаблоном');
        }

        if (!template.isPublic) {
            return await this.prisma.template.findUniqueOrThrow({
                where: { id: templateId },
                include: {
                    tags: {
                        select: { id: true, name: true },
                    },
                    author: {
                        select: { id: true, name: true },
                    },
                },
                omit: { authorId: true },
            });
        }

        const unpublishedTemplate = await this.prisma.$transaction(async (tx) => {
            const tags = await this.prisma.tag.findMany({
                where: {
                    templates: { some: { id: templateId } },
                },
                select: { id: true },
            });

            const tagIds = tags.map((t) => t.id);

            await tx.tag.updateMany({
                where: {
                    id: { in: tagIds },
                    scopeUserId: null,
                    templates: {
                        some: { id: templateId },
                        none: { id: { not: templateId } },
                    },
                },
                data: { scopeUserId: userId },
            });
            return await tx.template.update({
                where: { id: templateId },
                data: { isPublic: false },
                include: {
                    tags: { select: { id: true, name: true } },
                    author: { select: { id: true, name: true } },
                },
                omit: { authorId: true },
            });
        });

        return unpublishedTemplate;
    }

    async remove(userId: string, templateId: string): Promise<void> {
        const template = await this.prisma.template.findUnique({
            where: { id: templateId },
            select: { authorId: true },
        });

        if (!template) {
            throw new NotFoundException('Шаблон не найден');
        }

        if (template.authorId !== userId) {
            throw new ForbiddenException('Недостаточно прав для действий с этим шаблоном');
        }

        await this.prisma.$transaction(async (tx) => {
            const tags = await tx.tag.findMany({
                where: {
                    templates: { some: { id: templateId } },
                },
                select: { id: true },
            });

            for (const tag of tags) {
                const otherTemplates = await tx.template.findMany({
                    where: {
                        tags: { some: { id: tag.id } },
                        id: { not: templateId },
                    },
                    select: { authorId: true, isPublic: true },
                });

                if (otherTemplates.length === 0) {
                    await tx.tag.delete({ where: { id: tag.id } });
                    continue;
                }

                const authorIds = otherTemplates.map((t) => t.authorId);
                const uniqueAuthorIds = [...new Set(authorIds)];
                const allSameAuthor = uniqueAuthorIds.length === 1;
                const allPrivate = otherTemplates.every((t) => !t.isPublic);

                if (allSameAuthor && allPrivate) {
                    await tx.tag.update({
                        where: { id: tag.id },
                        data: { scopeUserId: authorIds[0] },
                    });
                }
                // иначе тег остается scopeUserId: null
            }

            await tx.template.delete({ where: { id: templateId } });
        });
    }
}
