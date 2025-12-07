import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    // Set up environment variables for testing
    process.env.AUTH0_AUDIENCE = 'https://api.taskrythm.com';
    process.env.AUTH0_ISSUER = 'https://dev-test.auth0.com';

    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    delete process.env.AUTH0_AUDIENCE;
    delete process.env.AUTH0_ISSUER;
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object with auth0Id, email, and permissions', async () => {
      const payload = {
        sub: 'auth0|123456789',
        email: 'test@example.com',
        permissions: ['read:projects', 'write:projects'],
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        auth0Id: 'auth0|123456789',
        email: 'test@example.com',
        permissions: ['read:projects', 'write:projects'],
      });
    });

    it('should return empty permissions array when permissions not in payload', async () => {
      const payload = {
        sub: 'auth0|123456789',
        email: 'test@example.com',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        auth0Id: 'auth0|123456789',
        email: 'test@example.com',
        permissions: [],
      });
    });

    it('should handle payload with multiple permissions', async () => {
      const payload = {
        sub: 'auth0|987654321',
        email: 'admin@example.com',
        permissions: [
          'read:projects',
          'write:projects',
          'delete:projects',
          'admin:all',
        ],
      };

      const result = await strategy.validate(payload);

      expect(result.permissions).toHaveLength(4);
      expect(result.permissions).toContain('admin:all');
    });
  });
});
