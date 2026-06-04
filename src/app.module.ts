import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { TagsModule } from './tags/tags.module';
import { AuthModule } from './auth/auth.module';
import { TemplatesModule } from './templates/templates.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { AdminModule } from './admin/admin.module';
import { envSchema } from './common/config/env.validation';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validate: (config: Record<string, unknown>) => {
                const result = envSchema.safeParse(config);

                if (!result.success) {
                    const errors = result.error.issues
                        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                        .join('\n');

                    throw new Error(`Config validation error:\n${errors}`);
                }

                return result.data;
            },
        }),
        ThrottlerModule.forRoot([{ ttl: 2000, limit: 1 }]),
        RedisModule,
        PrismaModule,
        TagsModule,
        AuthModule,
        TemplatesModule,
        UsersModule,
        AdminModule,
    ],
})
export class AppModule {}
