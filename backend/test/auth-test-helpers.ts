import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '../src/auth/jwt.guard';

/**
 * Mock JWT Auth Guard for testing
 * This bypasses actual JWT validation and allows you to test with mock users
 */
export class MockJwtAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Set a default mock user if none exists
    request.user = request.user || {
      auth0Id: 'auth0|test123',
      email: 'test@example.com',
      permissions: [],
    };
    return true;
  }
}

/**
 * Create a mock user with specific permissions
 */
export const createMockUser = (overrides?: Partial<{
  auth0Id: string;
  email: string;
  permissions: string[];
}>) => {
  return {
    auth0Id: overrides?.auth0Id || 'auth0|123456',
    email: overrides?.email || 'test@example.com',
    permissions: overrides?.permissions || [],
  };
};

/**
 * Mock users for common test scenarios
 */
export const mockUsers = {
  regular: createMockUser({
    auth0Id: 'auth0|regular123',
    email: 'user@example.com',
    permissions: ['read:projects'],
  }),
  
  admin: createMockUser({
    auth0Id: 'auth0|admin123',
    email: 'admin@example.com',
    permissions: ['read:projects', 'write:projects', 'delete:projects', 'admin:all'],
  }),
  
  editor: createMockUser({
    auth0Id: 'auth0|editor123',
    email: 'editor@example.com',
    permissions: ['read:projects', 'write:projects'],
  }),
  
  noPermissions: createMockUser({
    auth0Id: 'auth0|noperm123',
    email: 'noperm@example.com',
    permissions: [],
  }),
};

/**
 * Helper to set mock user in request for E2E tests
 */
export const setMockUser = (request: any, user: any) => {
  request.user = user;
  return request;
};
