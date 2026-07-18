import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PaginationMetaResponseDto } from 'src/common/dto/list-response.dto';
import { Prisma, Tag, UserRole } from '@prisma/client';
import { MergeTagsDto } from './dto/merge-tags.dto';
import { buildOrderBy } from 'src/common/utils/sorting.util';

@Injectable()
export class TagsService {
    constructor(private prisma: PrismaService) {}

    async findAll(
        pagination: PaginationDto,
        user: { sub: string; role: string } | null,
    ): Promise<{
        tags: Tag[];
        meta: PaginationMetaResponseDto;
    }> {
        const { page, limit, sortBy, order } = pagination;

        const allowedSortFields = ['id', 'name', 'createdAt'];

        type AllowedSortField = (typeof allowedSortFields)[number];

        const isAllowedSortField = (value: string): value is AllowedSortField => {
            return allowedSortFields.includes(value);
        };

        if (!isAllowedSortField(sortBy)) {
            throw new BadRequestException(
                `Недопустимое поле для сортировки - ${sortBy}. Допустимые поля - ${allowedSortFields.join(', ')}`,
            );
        }

        const isAdmin = user?.role === UserRole.ADMIN;

        const orderBy = buildOrderBy(sortBy, order);

        let tagsWhere: Prisma.TagWhereInput = {};

        if (!isAdmin && user) {
            tagsWhere = {
                OR: [
                    { scopeUserId: user.sub },
                    {
                        AND: [
                            { scopeUserId: null },
                            { templates: { some: { OR: [{ isPublic: true }, { authorId: user.sub }] } } },
                        ],
                    },
                ],
            };
        } else if (!user) {
            tagsWhere = {
                AND: [{ scopeUserId: null }, { templates: { some: { isPublic: true } } }],
            };
        }

        const [tags, totalItems] = await Promise.all([
            this.prisma.tag.findMany({
                ...(limit > 0 ? { take: limit } : {}),
                skip: (page - 1) * limit,
                orderBy,
                where: tagsWhere,
            }),
            this.prisma.tag.count({
                where: tagsWhere,
            }),
        ]);

        return {
            tags,
            meta: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                limit,
            },
        };
    }

    async mergeTags(userId: string, dto: MergeTagsDto): Promise<Tag> {
        const [sourceTag, targetTag] = await Promise.all([
            this.prisma.tag.findUnique({ where: { id: dto.sourceTagId } }),
            this.prisma.tag.findUnique({ where: { id: dto.targetTagId } }),
        ]);

        if (!sourceTag || !targetTag) throw new BadRequestException('Сливаемый или целевой тег не найдены');

        if (!sourceTag.scopeUserId) {
            throw new BadRequestException('Публичный тег не может быть источником');
        }

        if (sourceTag.scopeUserId && sourceTag.scopeUserId !== userId) {
            throw new ForbiddenException('Чужой приватный тег не может быть источником');
        }

        if (targetTag.scopeUserId && targetTag.scopeUserId !== userId) {
            throw new ForbiddenException('Чужой приватный тег не может быть целевым');
        }

        const templates = await this.prisma.template.findMany({
            where: { tags: { some: { id: sourceTag.id } } },
            include: { tags: { select: { id: true } } },
        });

        await this.prisma.$transaction(async (tx) => {
            for (const template of templates) {
                const hasTargetTag = template.tags.some((t) => t.id === targetTag.id);

                await tx.template.update({
                    where: { id: template.id },
                    data: {
                        tags: {
                            disconnect: [{ id: sourceTag.id }],
                            ...(hasTargetTag ? {} : { connect: [{ id: targetTag.id }] }),
                        },
                        updatedBy: userId,
                    },
                });
            }

            await tx.tag.delete({ where: { id: sourceTag.id } });
        });

        return await this.prisma.tag.findUniqueOrThrow({ where: { id: targetTag.id } });
    }
}
