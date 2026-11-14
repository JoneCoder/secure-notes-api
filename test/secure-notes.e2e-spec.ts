import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Secure Notes System (E2E)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let user2Token: string;
  let adminId: string;
  let userId: string;
  let userNoteId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    await app.init();

    // 1. Login with seeded Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin@123456' })
      .expect(200);

    adminToken = adminLoginRes.body.accessToken;
    adminId = adminLoginRes.body.user._id;

    // 2. Login with seeded User (Alice)
    const userLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'alice@example.com', password: 'User@123456' })
      .expect(200);

    userToken = userLoginRes.body.accessToken;
    userId = userLoginRes.body.user._id;

    // 3. Login with seeded User 2 (Bob)
    const user2LoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'bob@example.com', password: 'User@123456' })
      .expect(200);

    user2Token = user2LoginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication & Profile', () => {
    it('GET /api/v1/auth/me - returns authenticated user profile without password', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.email).toBe('alice@example.com');
      expect(res.body.password).toBeUndefined();
    });

    it('POST /api/v1/auth/register - registers new user with user role', async () => {
      const timestamp = Date.now();
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Dave Test',
          email: `dave_${timestamp}@example.com`,
          password: 'Password@123',
          interests: ['coding', 'music'],
        })
        .expect(201);

      expect(res.body.user.role).toBe('user');
      expect(res.body.accessToken).toBeDefined();
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('GET /api/v1/admin/users - regular user receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('GET /api/v1/admin/users - admin receives 200 and paginated list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
    });
  });

  describe('Notes Management & Ownership Enforcement', () => {
    it('POST /api/v1/notes - user creates a private note', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Alice Special Secret Note',
          content: 'This note is confidential to Alice only.',
        })
        .expect(201);

      userNoteId = res.body._id;
      expect(res.body.title).toBe('Alice Special Secret Note');
    });

    it('GET /api/v1/notes - user can view their notes with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notes?page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.total).toBeGreaterThan(0);
    });

    it('PUT /api/v1/notes/:id - unauthorized user cannot edit another user note', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/notes/${userNoteId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ title: 'Hacked Title', content: 'Hacked Content' })
        .expect(403);
    });

    it('GET /api/v1/admin/notes - admin can view all notes across users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/notes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Aggregation Tasks', () => {
    it('GET /api/v1/admin/users/group-by-interests - Scenario 1 aggregation', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users/group-by-interests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
      const firstGroup = res.body[0];
      expect(firstGroup.interest).toBeDefined();
      expect(firstGroup.userCount).toBeGreaterThan(0);
      expect(firstGroup.users).toBeInstanceOf(Array);
    });

    it('GET /api/v1/users/:id/posts - Scenario 2 aggregation with $lookup', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/posts`)
        .expect(200);

      expect(res.body._id).toBe(userId);
      expect(res.body.posts).toBeInstanceOf(Array);
      expect(res.body.posts.length).toBeGreaterThan(0);
      expect(res.body.password).toBeUndefined();
    });
  });

  describe('Admin Safety Protections', () => {
    it('DELETE /api/v1/admin/users/:id - admin cannot delete own account', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
