import bcrypt from 'bcryptjs';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';
import { UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class SeedService implements OnModuleInit {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {}

    async onModuleInit() {
        await this.seedAdmin();
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
            return;
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
    }
}
