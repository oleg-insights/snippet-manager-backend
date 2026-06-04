import { z } from 'zod';

export const envSchema = z
    .object({
        // База данных
        DATABASE_URL: z.string().url('DATABASE_URL должен быть валидным URL'),
        DB_USER: z.string().min(1),
        DB_PASSWORD: z.string().min(1),
        DB_NAME: z.string().min(1),

        // Секреты JWT
        JWT_ACCESS_SECRET: z.string(),
        JWT_REFRESH_SECRET: z.string(),

        // TTL токенов
        JWT_ACCESS_TTL_MINUTES: z.string().default('15'),
        JWT_REFRESH_TTL_DAYS: z.string().default('30'),

        // Redis
        REDIS_URL: z.string().url('REDIS_URL должен быть валидным URL'),

        // Данные для seed
        ADMIN_EMAIL: z.string().email('Email админа должен быть валидным').default('admin@test.com'),
        ADMIN_PASSWORD: z
            .string()
            .min(5, 'Пароль админа должен содержать минимум 5 символов')
            .default('admin_password'),
    })
    .passthrough();

export type EnvConfig = z.infer<typeof envSchema>;
