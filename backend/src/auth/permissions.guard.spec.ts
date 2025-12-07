import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from './permissions.decorator';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const context = createMockExecutionContext({ permissions: [] });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow access when user has all required permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['read:projects']);
    const context = createMockExecutionContext({
      permissions: ['read:projects', 'write:projects'],
    });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should deny access when user lacks required permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['delete:projects']);
    const context = createMockExecutionContext({
      permissions: ['read:projects'],
    });

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should deny access when user has no permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['read:projects']);
    const context = createMockExecutionContext({
      permissions: [],
    });

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should deny access when user is undefined', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['read:projects']);
    const context = createMockExecutionContext(undefined);

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should allow access when user has all of multiple required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['read:projects', 'write:projects']);
    const context = createMockExecutionContext({
      permissions: ['read:projects', 'write:projects', 'delete:projects'],
    });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should deny access when user has only some of multiple required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['read:projects', 'write:projects', 'delete:projects']);
    const context = createMockExecutionContext({
      permissions: ['read:projects', 'write:projects'],
    });

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });
});
