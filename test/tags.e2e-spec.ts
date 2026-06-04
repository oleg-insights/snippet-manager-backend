import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { setupTestApplication, TestContext } from './test.setup';
import { TagResponseDto } from 'src/tags/dto/tag-response.dto';

describe('GET /api/tags', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 200 and tag list based on pagination', async () => {
        const user = await context.generator.createUser();

        await Promise.all(Array.from({ length: 5 }).map(() => context.generator.createTag(user.id)));

        const response = await request(context.app.getHttpServer())
            .get('/api/tags')
            .query({ page: 1, limit: 3, sortBy: 'name', order: 'desc' });

        expect(response.status).toBe(200);

        const tags: TagResponseDto[] = response.body?.data;

        expect(Array.isArray(tags)).toBe(true);
        expect(tags).toHaveLength(3);

        for (let i = 1; i < tags.length; i++) {
            expect(tags[i].name < tags[i - 1].name).toBe(true);
        }

        expect(tags[0]).toMatchObject({
            authorId: user.id,
            scopeUserId: null,
        });

        const meta = response.body?.meta;

        expect(meta).toBeDefined();
        expect(meta).toMatchObject({
            totalItems: 5,
            totalPages: 2,
            currentPage: 1,
            limit: 3,
        });
    });
});

describe('POST /api/tags/merge', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 200 and connect targetTag, disconnect and delete sourceTag', async () => {
        const user = await context.generator.createUser();
        const tokens = await context.authService.generateTokens(user.id, user.role);
        const userToken = tokens.accessToken;

        const tag1 = await context.generator.createTag(user.id, { scopeUserId: user.id });
        const tag2 = await context.generator.createTag(user.id, { scopeUserId: user.id });

        const template1 = await context.generator.createTemplate(user.id, { tagIds: [tag2.id, tag1.id] });
        const template2 = await context.generator.createTemplate(user.id, { tagIds: [tag2.id] });

        const response = await request(context.app.getHttpServer())
            .post('/api/tags/merge')
            .send({ sourceTagId: tag2.id, targetTagId: tag1.id })
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);

        const tag2InDb = await context.prisma.tag.findUnique({ where: { id: tag2.id } });

        expect(tag2InDb).toBeNull();

        const tag1InDb = await context.prisma.tag.findUnique({
            where: { id: tag1.id },
            include: {
                templates: {
                    select: { id: true },
                },
            },
        });

        expect(tag1InDb).not.toBeNull();
        expect(tag1InDb).toMatchObject({
            templates: [{ id: template1.id }, { id: template2.id }],
        });

        const template2InDb = await context.prisma.template.findUnique({
            where: { id: template2.id },
            include: {
                tags: {
                    select: { id: true },
                },
            },
        });

        expect(template2InDb).not.toBeNull();
        expect(template2InDb).toMatchObject({
            tags: [{ id: tag1.id }],
        });
    });
});
