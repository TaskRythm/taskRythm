import { SetMetadata } from '@nestjs/common';
import { Permissions, PERMISSIONS_KEY } from './permissions.decorator';

// Mock SetMetadata
jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn((key, value) => ({ key, value })),
}));

describe('Permissions Decorator', () => {
  it('should set metadata with correct key', () => {
    Permissions('read:projects');
    expect(SetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, ['read:projects']);
  });

  it('should handle single permission', () => {
    Permissions('write:projects');
    expect(SetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, ['write:projects']);
  });

  it('should handle multiple permissions', () => {
    Permissions('read:projects', 'write:projects', 'delete:projects');
    expect(SetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, [
      'read:projects',
      'write:projects',
      'delete:projects',
    ]);
  });

  it('should handle no permissions', () => {
    Permissions();
    expect(SetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, []);
  });

  it('should have correct PERMISSIONS_KEY constant', () => {
    expect(PERMISSIONS_KEY).toBe('permissions');
  });
});
