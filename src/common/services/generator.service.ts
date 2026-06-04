import bcrypt from 'bcryptjs';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomString } from 'src/common/utils/random-string.util';
import { Prisma, User, UserRole } from '@prisma/client';

export interface CreateUserParams {
    name?: string;
    email?: string;
    role?: UserRole;
    password?: string;
    avatar?: string;
}

export interface CreateTagParams {
    name?: string;
    scopeUserId?: string | null;
}

export interface ContentBlock {
    type: string;
    data: unknown;
}

export interface CreateTemplateParams {
    title?: string;
    content?: ContentBlock[];
    tagIds?: string[];
    tagNames?: string[];
    isPublic?: boolean;
}

@Injectable()
export class GeneratorService {
    constructor(private readonly prisma: PrismaService) {}

    async createUser({
        name = `user_${randomString(5)}`,
        email = `${randomString(5)}@test.com`,
        role = 'USER',
        password = randomString(10),
        avatar = `https://${randomString(10)}.png`,
    }: CreateUserParams = {}): Promise<User> {
        const hashedPassword = await bcrypt.hash(password, 10);

        return await this.prisma.user.create({
            data: { name, email, role, password: hashedPassword, avatar },
        });
    }

    async createTag(authorId: string, { name = `tag_${randomString(5)}`, scopeUserId = null }: CreateTagParams = {}) {
        return await this.prisma.tag.create({
            data: {
                name,
                authorId,
                scopeUserId,
            },
        });
    }

    async createTemplate(
        authorId: string,
        {
            title = `title_${randomString(5)}`,
            content = [{ type: 'text', data: 'Some content data' }],
            tagIds = [],
            tagNames = [],
            isPublic = false,
        }: CreateTemplateParams = {},
    ) {
        const preparedContent = content.map((block) => ({
            type: block.type,
            data: block.data as Prisma.InputJsonValue,
        }));

        for (const name of tagNames) {
            const tag = await this.createTag(authorId, { name });
            tagIds.push(tag.id);
        }

        if (!tagIds.length) {
            const tag = await this.createTag(authorId);
            tagIds.push(tag.id);
        }

        const formattedTagIds = tagIds.map((id) => ({ id }));

        return await this.prisma.template.create({
            data: {
                title,
                content: preparedContent,
                authorId,
                tags: { connect: formattedTagIds },
                isPublic,
            },
        });
    }
}
