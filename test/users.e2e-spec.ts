import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { setupTestApplication, TestContext } from './test.setup';
import request from 'supertest';
import { UserPublicListResponseDto } from 'src/users/dto/user-public-list-response.dto';
import { UserPrivateResponseDto } from 'src/users/dto/user-private-response.dto';
import { UserPublicResponseDto } from 'src/users/dto/user-public-response.dto';
import { RedisService } from 'src/redis/redis.service';
import setCookieParser from 'set-cookie-parser';

describe('GET /api/users', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 200 and user list with pagination', async () => {
        const users = await Promise.all(Array.from({ length: 5 }, () => context.generator.createUser()));

        const tokens = await context.authService.generateTokens(users[0].id, users[0].role);
        const userToken = tokens.accessToken;

        const response = await request(context.app.getHttpServer())
            .get('/api/users')
            .query({ page: 1, limit: 4, sortBy: 'name', order: 'asc' })
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);

        const body: UserPublicListResponseDto = response.body;
        const responseUsers = body.data;

        expect(Array.isArray(responseUsers)).toBe(true);
        expect(responseUsers).toHaveLength(4);

        const names = responseUsers.map((u) => u.name);

        for (let i = 1; i < names.length; i++) {
            expect(names[i] > names[i - 1]).toBe(true);
        }

        const meta = body.meta;

        expect(meta).toBeDefined();
        expect(meta).toMatchObject({
            totalItems: 5,
            totalPages: 2,
            currentPage: 1,
            limit: 4,
        });
    });
});

describe('GET /api/users/me', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 200 and own profile data', async () => {
        const user = await context.generator.createUser();
        const tokens = await context.authService.generateTokens(user.id, user.role);
        const userToken = tokens.accessToken;

        const response = await request(context.app.getHttpServer())
            .get('/api/users/me')
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);

        const responseUser: UserPrivateResponseDto = response.body;

        expect(responseUser).not.toBeNull();
        expect(responseUser).not.toHaveProperty('status');
        expect(responseUser).toMatchObject({
            id: user.id,
            email: user.email,
        });
    });
});

describe('GET /api/users/:id', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 200 and user data', async () => {
        const user = await context.generator.createUser();
        const tokens = await context.authService.generateTokens(user.id, user.role);
        const userToken = tokens.accessToken;

        const targetUser = await context.generator.createUser();

        const response = await request(context.app.getHttpServer())
            .get(`/api/users/${targetUser.id}`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);

        const responseUser: UserPublicResponseDto = response.body;

        expect(responseUser).not.toBeNull();
        expect(responseUser).not.toHaveProperty('email');
        expect(responseUser).toMatchObject({
            id: targetUser.id,
            name: targetUser.name,
        });
    });
});

describe('PATCH /api/users/me/password', () => {
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

    it('should return 204 and update pswd, invalidate token, delete sessions, clear cookie refreshToken', async () => {
        const oldPassword = 'old_password';
        const newPassword = 'new_password';
        const user = await context.generator.createUser({ password: oldPassword });
        const tokens = await context.authService.generateTokens(user.id, user.role);
        const userToken = tokens.accessToken;
        await context.authService.createSession(user.id, tokens.refreshToken, tokens.expiresAt, null, null);

        const response = await request(context.app.getHttpServer())
            .patch('/api/users/me/password')
            .send({ oldPassword, newPassword })
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(204);

        const userInDb = await context.prisma.user.findUnique({ where: { id: user.id } });

        expect(userInDb).not.toBeNull();

        const isMatchPassword = await bcrypt.compare(newPassword, userInDb!.password);

        expect(isMatchPassword).toBe(true);

        const invalidatedToken = await redis.get(`blacklist:token:${userToken}`);

        expect(invalidatedToken).toBeTruthy();

        const sessionsCount = await context.prisma.session.count({ where: { userId: user.id } });

        expect(sessionsCount).toBe(0);

        const rawCookies = response.get('Set-Cookie');
        const cookies = setCookieParser.parse(rawCookies ?? []);
        const refreshTokenCookie = cookies.find((c) => c.name === 'refreshToken');

        expect(refreshTokenCookie).toBeDefined();

        const refreshToken = refreshTokenCookie!.value;

        expect(refreshToken).toBe('');
    });
});

describe('PATCH /api/users/me', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 200 and update provided fields', async () => {
        const user = await context.generator.createUser();
        const tokens = await context.authService.generateTokens(user.id, user.role);
        const userToken = tokens.accessToken;
        const newUserData = { name: 'new_name', email: 'new_email@test.com' };

        const response = await request(context.app.getHttpServer())
            .patch('/api/users/me')
            .send(newUserData)
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);

        const userInDb = await context.prisma.user.findUnique({ where: { id: user.id } });

        expect(userInDb).not.toBeNull();
        expect(userInDb).toMatchObject({
            name: newUserData.name,
            email: newUserData.email,
        });
        expect(userInDb!.avatar).toBe(user.avatar);
    });
});
