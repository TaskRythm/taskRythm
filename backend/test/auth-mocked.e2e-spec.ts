import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { JwtAuthGuard } from '../src/auth/jwt.guard';
import { MockJwtAuthGuard, mockUsers } from './auth-test-helpers';

describe('Authentication E2E Tests (Mocked)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return health status without authentication', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect({ ok: true });
    });
  });

  describe('/auth/me (GET) - With Mock Authentication', () => {
    it('should return authenticated user info', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.auth0Id).toBeDefined();
      expect(response.body.user.email).toBeDefined();
    });
  });

  describe('/projects (GET) - Permission Testing', () => {
    it('should allow access when user has read:projects permission', async () => {
      // Since we're using MockJwtAuthGuard, we need to test the permission guard separately
      // This test verifies the endpoint is accessible with proper authentication
      const response = await request(app.getHttpServer())
        .get('/projects')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

describe('Authentication Integration Tests', () => {
  let app: INestApplication;

  describe('Without Mock - Real Guards', () => {
    beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should reject requests without authentication token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should reject requests with invalid token format', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });

    it('should reject protected endpoints without authentication', () => {
      return request(app.getHttpServer())
        .get('/projects')
        .expect(401);
    });
  });
});
