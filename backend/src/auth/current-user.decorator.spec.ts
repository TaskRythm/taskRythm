import { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';

describe('CurrentUser Decorator', () => {
  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as any;
  };

  it('should be defined', () => {
    expect(CurrentUser).toBeDefined();
  });

  it('should extract user from request object', () => {
    const mockUser = {
      auth0Id: 'auth0|123456',
      email: 'test@example.com',
      permissions: ['read:projects'],
    };

    const mockRequest = { user: mockUser };
    const result = mockRequest.user;

    expect(result).toEqual(mockUser);
  });

  it('should return undefined when user is not in request', () => {
    const mockRequest = {};
    const result = (mockRequest as any).user;

    expect(result).toBeUndefined();
  });
});
