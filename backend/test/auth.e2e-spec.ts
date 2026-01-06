import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Authentication E2E Tests', () => {
  let app: INestApplication;

  // Mock valid JWT token payload
  const mockValidUser = {
    auth0Id: 'auth0|123456789',
    email: 'test@example.com',
    permissions: ['read:projects'],
  };

  const mockAdminUser = {
    auth0Id: 'auth0|admin123',
    email: 'admin@example.com',
    permissions: ['read:projects', 'write:projects', 'delete:projects'],
  };

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

  describe('/health (GET)', () => {
    it('should return health status without authentication', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect({ ok: true });
    });
  });

  describe('/auth/me (GET)', () => {
    it('should return 401 when no token is provided', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should return 401 when invalid token is provided', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    // Note: For real JWT validation, you'd need to generate a valid token
    // or mock the JWT strategy. This is a placeholder test.
    it.skip('should return user info when valid token is provided', () => {
      // This test requires a valid JWT token from Auth0
      // In a real scenario, you would:
      // 1. Generate a test token using Auth0 test credentials
      // 2. Or mock the JwtStrategy to bypass actual validation
      const validToken = 'YOUR_VALID_TEST_TOKEN_HERE';

      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.ok).toBe(true);
          expect(res.body.user).toBeDefined();
          expect(res.body.user.auth0Id).toBeDefined();
          expect(res.body.user.email).toBeDefined();
        });
    });
  });

  describe('/projects (GET)', () => {
    it('should return 401 when no token is provided', () => {
      return request(app.getHttpServer())
        .get('/projects')
        .expect(401);
    });

    it('should return 401 when invalid token is provided', () => {
      return request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    // Note: For testing permission-based access, you need tokens with different permissions
    it.skip('should return 403 when user lacks required permissions', () => {
      // Token with no 'read:projects' permission
      const tokenWithoutPermission = 'TOKEN_WITHOUT_READ_PROJECTS_PERMISSION';

      return request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${tokenWithoutPermission}`)
        .expect(403);
    });

    it.skip('should return projects when user has required permissions', () => {
      // Token with 'read:projects' permission
      const tokenWithPermission = 'TOKEN_WITH_READ_PROJECTS_PERMISSION';

      return request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${tokenWithPermission}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });
});
