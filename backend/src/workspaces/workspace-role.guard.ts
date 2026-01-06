import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WORKSPACE_ROLES_KEY } from './workspace-role.decorator';
import { WorkspaceRole } from '@prisma/client';
import { WorkspacePermissionService } from './workspace-permission.service';
import type { AuthUser } from '../auth/auth-user.interface';

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly workspacePermissionService: WorkspacePermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.getAllAndOverride<WorkspaceRole[]>(
        WORKSPACE_ROLES_KEY,
        [context.getHandler(), context.getClass()],
      ) || [];

    // If no roles specified, guard lets the request through
    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest() as {
      user?: AuthUser;
      params: Record<string, any>;
      query: Record<string, any>;
      body: Record<string, any>;
    };

    const authUser = request.user;
    if (!authUser) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    const workspaceId =
      await this.workspacePermissionService.resolveWorkspaceIdFromRequest(
        request.params || {},
        request.query || {},
        request.body || {},
      );

    await this.workspacePermissionService.ensureWorkspaceRole(
      authUser,
      workspaceId,
      requiredRoles,
    );

    return true;
  }
}