import request from 'supertest';
import setCookieParser from 'set-cookie-parser';
import { beforeAll, afterAll, describe, it, expect } from '@jest/globals';
import { setupTestApplication } from './test.setup';
import { TestContext } from './test.setup';
import { User } from '@prisma/client';
import { JwtPayload } from '../src/auth/interfaces/jwt-payload.interface';
import { RedisService } from '../src/redis/redis.service';

describe('POST /api/auth/register', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 201 and create user', async () => {
        const registerData = {
            name: 'max_e2e',
            email: 'max_e2e@test.com',
            password: 'max_e2e_password',
        };

        const response = await request(context.app.getHttpServer()).post('/api/auth/register').send(registerData);

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            name: registerData.name,
            email: registerData.email,
        });
        expect(response.body).not.toHaveProperty('password');
    });
});

describe('POST /api/auth/login', () => {
    let context: TestContext;

    let user: User;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 200, generate tokens and create session', async () => {
        const testPassword = 'testPassword';

        user = await context.generator.createUser({ password: testPassword });

        const response = await request(context.app.getHttpServer())
            .post('/api/auth/login')
            .send({ email: user.email, password: testPassword });

        expect(response.status).toBe(200);

        const accessToken = response.body.accessToken;

        expect(accessToken).toBeDefined();
        expect(typeof accessToken).toBe('string');

        const decoded = context.jwtService.decode<JwtPayload>(accessToken);

        expect(decoded).not.toBeNull();
        expect(decoded).toMatchObject({
            sub: user.id,
            role: user.role,
        });

        const rawCookies = response.get('Set-Cookie');
        const cookies = setCookieParser.parse(rawCookies ?? []);
        const refreshTokenCookie = cookies.find((c) => c.name === 'refreshToken');

        expect(refreshTokenCookie).toBeDefined();

        const refreshToken = refreshTokenCookie!.value;

        const session = await context.prisma.session.findUnique({
            where: { refreshToken },
        });

        expect(session).not.toBeNull();
        expect(session?.userId).toBe(user.id);
    });
});

describe('POST /api/auth/refresh', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 200 and accessToken, update refreshToken and session', async () => {
        const user = await context.generator.createUser();
        const tokens = await context.authService.generateTokens(user.id, user.role);
        await context.authService.createSession(user.id, tokens.refreshToken, tokens.expiresAt, null, null);

        const response = await request(context.app.getHttpServer())
            .post('/api/auth/refresh')
            .set('Cookie', [`refreshToken=${tokens.refreshToken}`]);

        expect(response.status).toBe(200);

        const accessToken = response.body.accessToken;

        expect(accessToken).toBeDefined();
        expect(typeof accessToken).toBe('string');

        const decoded = context.jwtService.decode<JwtPayload>(accessToken);

        expect(decoded).not.toBeNull();
        expect(decoded).toMatchObject({
            sub: user.id,
            role: user.role,
        });

        const rawCookies = response.get('Set-Cookie');
        const cookies = setCookieParser.parse(rawCookies ?? []);
        const refreshTokenCookie = cookies.find((c) => c.name === 'refreshToken');

        expect(refreshTokenCookie).toBeDefined();

        const refreshToken = refreshTokenCookie!.value;

        const sessionCount = await context.prisma.session.count({ where: { refreshToken } });

        expect(sessionCount).toBe(1);
    });
});

describe('POST /api/auth/logout', () => {
    let context: TestContext;
    let redis: RedisService;

    beforeAll(async () => {
        context = await setupTestApplication();
        redis = context.app.get<RedisService>(RedisService);
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 204, clear refreshToken cookie, invalidate accessToken and remove session', async () => {
        const user = await context.generator.createUser();
        const tokens = await context.authService.generateTokens(user.id, user.role);
        await context.authService.createSession(user.id, tokens.refreshToken, tokens.expiresAt, null, null);

        const response = await request(context.app.getHttpServer())
            .post('/api/auth/logout')
            .set('Cookie', [`refreshToken=${tokens.refreshToken}`])
            .set('Authorization', `Bearer ${tokens.accessToken}`);

        expect(response.status).toBe(204);

        const rawCookies = response.get('Set-Cookie');
        const cookies = setCookieParser.parse(rawCookies ?? []);
        const refreshTokenCookie = cookies.find((c) => c.name === 'refreshToken');

        expect(refreshTokenCookie).toBeDefined();

        const refreshToken = refreshTokenCookie!.value;

        expect(refreshToken).toBe('');

        const blacklistedToken = await redis.get(`blacklist:token:${tokens.accessToken}`);

        expect(blacklistedToken).toBeTruthy();

        const sessionInDb = await context.prisma.session.findUnique({ where: { refreshToken: tokens.refreshToken } });

        expect(sessionInDb).toBeNull();
    });
});
