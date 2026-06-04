import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { Tag, User } from '@prisma/client';
import { setupTestApplication, TestContext } from './test.setup';
import { JwtTokens } from 'src/auth/interfaces/jwt-tokens.interface';
import { TemplateResponseDto } from 'src/templates/dto/template-response.dto';
import { PaginationMetaResponseDto } from 'src/common/dto/list-response.dto';

describe('POST /api/templates', () => {
    let context: TestContext;

    let user: User;
    let tag: Tag;
    let tokens: JwtTokens;

    beforeAll(async () => {
        context = await setupTestApplication();

        user = await context.generator.createUser();
        tag = await context.generator.createTag(user.id, { scopeUserId: null });
        tokens = await context.authService.generateTokens(user.id, user.role);
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 201 and create template with existing or new tags', async () => {
        const userToken = tokens.accessToken;

        const newTemplateData = {
            title: 'New template title',
            content: [
                { type: 'text', data: 'some text' },
                { type: 'image', data: 'https://image.png' },
            ],
            tagIds: [tag.id],
            newTagNames: ['Non_existant_tag_name'],
        };

        const response = await request(context.app.getHttpServer())
            .post('/api/templates')
            .send(newTemplateData)
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(201);

        const template: TemplateResponseDto = response.body;

        expect(template.tags).toHaveLength(2);
        expect(template.content).toBeInstanceOf(Array);

        const templateInDb = await context.prisma.template.findUnique({
            where: { id: template.id },
        });

        expect(templateInDb).not.toBeNull();
        expect(templateInDb).toMatchObject({
            title: newTemplateData.title,
            content: newTemplateData.content,
        });
    });

    it('should return 400 if tags array is empty', async () => {
        const userToken = tokens.accessToken;

        const response = await request(context.app.getHttpServer())
            .post('/api/templates')
            .send({ title: 'Invalid tags', content: [], tagIds: [], newTagNames: [] })
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(400);
    });
});

describe('GET /api/templates', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 200 and template list based on tags and pagination', async () => {
        const user1 = await context.generator.createUser();
        const user1Tokens = await context.authService.generateTokens(user1.id, user1.role);
        const user1Token = user1Tokens.accessToken;

        const user2 = await context.generator.createUser();

        const tag1 = await context.generator.createTag(user1.id, { scopeUserId: user1.id });
        const tag2 = await context.generator.createTag(user2.id, { scopeUserId: null });

        await context.generator.createTemplate(user1.id, { isPublic: false, tagIds: [tag1.id] });
        await context.generator.createTemplate(user2.id, { isPublic: false, tagIds: [tag1.id, tag2.id] });
        await context.generator.createTemplate(user2.id, { isPublic: true, tagIds: [tag2.id] });

        const guestResponse = await request(context.app.getHttpServer())
            .get('/api/templates')
            .query({ page: 1, limit: 3, sortBy: 'title', order: 'desc' });

        expect(guestResponse.status).toBe(200);

        expect(guestResponse.body.data).toBeInstanceOf(Array);
        expect(guestResponse.body.data).toHaveLength(1);
        expect(guestResponse.body.data[0].isPublic).toBe(true);

        expect(guestResponse.body.selectedTags).toBeInstanceOf(Array);
        expect(guestResponse.body.selectedTags).toHaveLength(0);

        expect(guestResponse.body.availableTags).toBeInstanceOf(Array);
        expect(guestResponse.body.availableTags).toHaveLength(1);

        expect(guestResponse.body.suggestedParents).toBeInstanceOf(Array);
        expect(guestResponse.body.suggestedParents).toHaveLength(0);

        const user1Response = await request(context.app.getHttpServer())
            .get('/api/templates')
            .query({ page: 1, limit: 3, sortBy: 'title', order: 'desc' })
            .set('Authorization', `Bearer ${user1Token}`);

        expect(user1Response.status).toBe(200);

        expect(user1Response.body.data).toBeInstanceOf(Array);
        expect(user1Response.body.data).toHaveLength(2);
        for (const template of user1Response.body.data) {
            expect(template.authorId === user1.id || template.isPublic === true).toBe(true);
        }
        expect(user1Response.body.data[0].title > user1Response.body.data[1].title).toBe(true);
    });
});

describe('GET /api/templates/me', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 200 and own template list based on pagination', async () => {
        const user = await context.generator.createUser();
        const tokens = await context.authService.generateTokens(user.id, user.role);
        const userToken = tokens.accessToken;
        await Promise.all(Array.from({ length: 5 }).map(() => context.generator.createTemplate(user.id)));

        const user2 = await context.generator.createUser();
        await context.generator.createTemplate(user2.id);

        const response = await request(context.app.getHttpServer())
            .get('/api/templates/me')
            .query({ page: 1, limit: 3, sortBy: 'title', order: 'desc' })
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);

        const templates: TemplateResponseDto[] = response.body.data;

        expect(templates).toBeInstanceOf(Array);
        expect(templates).toHaveLength(3);
        for (const template of templates) {
            expect(template.authorId).toBe(user.id);
        }
        expect(templates[0].title > templates[1].title).toBe(true);

        const meta: PaginationMetaResponseDto = response.body.meta;

        expect(meta).toBeDefined();
        expect(meta).toMatchObject({
            totalItems: 5,
            totalPages: 2,
            currentPage: 1,
            limit: 3,
        });
    });
});

describe('GET /api/templates/:id', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 200 and template, increment useCount', async () => {
        const user = await context.generator.createUser();
        const tag = await context.generator.createTag(user.id, { scopeUserId: null });
        const newTemplate = await context.generator.createTemplate(user.id, { isPublic: true, tagIds: [tag.id] });

        const guestResponse = await request(context.app.getHttpServer()).get(`/api/templates/${newTemplate.id}`);

        expect(guestResponse.status).toBe(200);

        const template: TemplateResponseDto = guestResponse.body;

        expect(template).not.toBeNull();
        expect(template.id).toBe(newTemplate.id);
        expect(template.useCount).toBe(1);
        expect(template.tags).toBeInstanceOf(Array);
        expect(template.tags).toHaveLength(1);
        expect(template.tags[0].id).toBe(tag.id);
    });
});

describe('PATCH /api/templates/:id', () => {
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

        const tag = await context.generator.createTag(user.id);
        const template = await context.generator.createTemplate(user.id, { tagIds: [tag.id] });

        const newContent = [
            { type: 'text', data: 'new_text' },
            { type: 'image', data: 'https://new_image.jpg' },
        ];
        const newTagName = 'new_tag_name';

        const response = await request(context.app.getHttpServer())
            .patch(`/api/templates/${template.id}`)
            .send({ content: newContent, newTagNames: [newTagName] })
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);

        const templateInDb = await context.prisma.template.findUnique({
            where: { id: template.id },
            include: {
                tags: {
                    select: { id: true, name: true },
                },
            },
        });

        expect(templateInDb).not.toBeNull();
        expect(templateInDb).toMatchObject({
            title: template.title,
            content: newContent,
        });
        expect(templateInDb!.tags).toBeInstanceOf(Array);
        expect(templateInDb!.tags).toHaveLength(2);
        expect(templateInDb!.tags).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: tag.id }),
                expect.objectContaining({ name: newTagName }),
            ]),
        );
    });
});

describe('POST /api/templates/:id/publish', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 200 and publish template', async () => {
        const user = await context.generator.createUser();
        const tokens = await context.authService.generateTokens(user.id, user.role);
        const userToken = tokens.accessToken;

        const tag = await context.generator.createTag(user.id, { scopeUserId: user.id });
        const template = await context.generator.createTemplate(user.id, { tagIds: [tag.id] });

        const response = await request(context.app.getHttpServer())
            .post(`/api/templates/${template.id}/publish`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);

        const templateInDb = await context.prisma.template.findUnique({
            where: { id: template.id },
            include: {
                tags: {
                    select: { id: true, scopeUserId: true },
                },
            },
        });

        expect(templateInDb).not.toBeNull();
        expect(templateInDb!.isPublic).toBe(true);
        expect(templateInDb!.tags).toBeInstanceOf(Array);
        expect(templateInDb!.tags).toHaveLength(1);
        expect(templateInDb!.tags).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: tag.id, scopeUserId: null })]),
        );
    });
});

describe('POST /api/templates/:id/unpublish', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 200 and unpublish template', async () => {
        const user = await context.generator.createUser();
        const tokens = await context.authService.generateTokens(user.id, user.role);
        const userToken = tokens.accessToken;

        const tag1 = await context.generator.createTag(user.id, { scopeUserId: user.id });
        const tag2 = await context.generator.createTag(user.id, { scopeUserId: null });
        const template = await context.generator.createTemplate(user.id, {
            tagIds: [tag1.id, tag2.id],
            isPublic: true,
        });

        const response = await request(context.app.getHttpServer())
            .post(`/api/templates/${template.id}/unpublish`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);

        const templateInDb = await context.prisma.template.findUnique({
            where: { id: template.id },
            include: {
                tags: {
                    select: { id: true, scopeUserId: true },
                },
            },
        });

        expect(templateInDb).not.toBeNull();
        expect(templateInDb!.isPublic).toBe(false);
        expect(templateInDb!.tags).toBeInstanceOf(Array);
        expect(templateInDb!.tags).toHaveLength(2);
        templateInDb!.tags.forEach((tag) => {
            expect(tag.scopeUserId).toBe(user.id);
        });
    });
});

describe('DELETE /api/templates/:id', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 204 and delete template, delete unused tags', async () => {
        const user = await context.generator.createUser();
        const tokens = await context.authService.generateTokens(user.id, user.role);
        const userToken = tokens.accessToken;
        const tagToRemain = await context.generator.createTag(user.id, { scopeUserId: null });
        const tagToDelete = await context.generator.createTag(user.id, { scopeUserId: null });
        const privateTemplate = await context.generator.createTemplate(user.id, {
            tagIds: [tagToRemain.id],
            isPublic: false,
        });
        const publicTemplate = await context.generator.createTemplate(user.id, {
            tagIds: [tagToRemain.id, tagToDelete.id],
            isPublic: true,
        });

        const response = await request(context.app.getHttpServer())
            .delete(`/api/templates/${publicTemplate.id}`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(204);

        const deletedTemplateInDb = await context.prisma.template.findUnique({ where: { id: publicTemplate.id } });

        expect(deletedTemplateInDb).toBeNull();

        const deletedTagInDb = await context.prisma.tag.findUnique({ where: { id: tagToDelete.id } });

        expect(deletedTagInDb).toBeNull();

        const remainingTagInDb = await context.prisma.tag.findUnique({ where: { id: tagToRemain.id } });

        expect(remainingTagInDb).not.toBeNull();
        expect(remainingTagInDb!.scopeUserId).toBe(user.id);

        const privateTemplateInDb = await context.prisma.template.findUnique({
            where: {
                id: privateTemplate.id,
                tags: { some: { id: tagToRemain.id } },
            },
            include: { tags: { select: { id: true } } },
        });

        expect(privateTemplateInDb).not.toBeNull();
        expect(privateTemplateInDb!.tags).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: tagToRemain.id })]),
        );
    });
});
