import bcrypt from 'bcryptjs';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';
import { UserRole, UserStatus } from '@prisma/client';
import { templatesData } from './seed-data/templates';

@Injectable()
export class SeedService implements OnModuleInit {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {}

    async onModuleInit() {
        const admin = await this.seedAdmin();
        await this.seedTemplates(admin!.id);
    }

    private async seedAdmin() {
        const email = this.configService.get<string>('ADMIN_EMAIL') ?? 'admin@test.com';
        const password = this.configService.get<string>('ADMIN_PASSWORD') ?? 'admin_password';

        const existingAdmin = await this.prisma.user.findFirst({
            where: {
                email,
                role: UserRole.ADMIN,
                status: UserStatus.ACTIVE,
            },
        });

        if (existingAdmin) {
            this.logger.log('Админ уже существует');
            return existingAdmin;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await this.prisma.user.create({
            data: {
                name: email.split('@')[0],
                email,
                password: hashedPassword,
                role: UserRole.ADMIN,
                status: UserStatus.ACTIVE,
            },
        });

        this.logger.log(`Создан админ ${admin.email}`);
        return admin;
    }

    private async seedTemplates(userId: string) {
        const count = await this.prisma.template.count();
        if (count > 0) {
            this.logger.log('Шаблоны есть, демо не будут созданы');
            return;
        }

        // Создаём шаблоны
        for (const tpl of templatesData) {
            // Создание тегов
            const tagIds: string[] = [];
            for (const tagName of tpl.tagNames) {
                const existingTag = await this.prisma.tag.findFirst({
                    where: { name: tagName },
                });

                if (existingTag) {
                    tagIds.push(existingTag.id);
                } else {
                    const tag = await this.prisma.tag.create({
                        data: {
                            name: tagName,
                            authorId: userId,
                            scopeUserId: null,
                        },
                    });
                    if (tag) tagIds.push(tag.id);
                }
            }

            await this.prisma.template.create({
                data: {
                    title: tpl.title,
                    content: tpl.content,
                    authorId: userId,
                    isPublic: true,
                    tags: { connect: tagIds.map((id) => ({ id })) },
                },
            });
        }
        this.logger.log('Шаблоны и теги созданы');
    }
}
