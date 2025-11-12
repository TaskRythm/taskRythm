import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]) || [];

    if (!required.length) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { permissions?: string[] } | undefined;
    const perms = user?.permissions ?? [];

    return required.every(p => perms.includes(p));
  }
}