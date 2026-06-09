import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from 'src/app.module';
import { AuthService } from 'src/auth/auth.service';
import { GeneratorService } from 'src/common/services/generator.service';
import { PrismaService } from 'src/prisma/prisma.service';

export interface TestContext {
    app: INestApplication;
    prisma: PrismaService;
    generator: GeneratorService;
    authService: AuthService;
    jwtService: JwtService;
    close: () => Promise<void>;
}

export const setupTestApplication = async (): Promise<TestContext> => {
    const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.use(cookieParser());

    await app.init();

    const prisma = moduleRef.get(PrismaService);
    const generator = new GeneratorService(prisma);
    const authService = moduleRef.get(AuthService);
    const jwtService = moduleRef.get(JwtService);

    await prisma.template.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    const close = async () => {
        const server = app.getHttpServer();

        if (server && typeof server.close === 'function') {
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }

        await prisma.$disconnect();
        await app.close();
    };

    return { app, prisma, generator, authService, jwtService, close };
};
