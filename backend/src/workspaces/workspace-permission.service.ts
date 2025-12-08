import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth-user.interface';

@Injectable()
export class WorkspacePermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensure we have a local User row for this Auth0 identity.
   * (Same logic as in TasksService.ensureUser, but centralised for RBAC.)
   */
  private async ensureUser(authUser: AuthUser) {
    const auth0Id = (authUser as any).auth0Id || (authUser as any).sub;
    if (!auth0Id) {
      throw new UnauthorizedException('Missing Auth0 user id');
    }

    let user = await this.prisma.user.findUnique({
      where: { auth0Id },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          auth0Id,
          email: authUser.email,
          name: authUser.name,
          picture: authUser.picture,
        },
      });
    }

    return user;
  }

  /**
   * Get the role of the current user in a workspace, or null if not a member.
   * Owner is always OWNER, even if membership row has a different role.
   */
  async getRoleForUserInWorkspace(
    authUser: AuthUser,
    workspaceId: string,
  ): Promise<WorkspaceRole | null> {
    const user = await this.ensureUser(authUser);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        ownerId: true,
        members: {
          where: { userId: user.id },
          select: { role: true },
        },
      },
    });

    if (!workspace) {
      throw new ForbiddenException('Workspace not found');
    }

    // Owner is always OWNER, even if membership row has a different role
    if (workspace.ownerId === user.id) {
      return WorkspaceRole.OWNER;
    }

    const membership = workspace.members[0];
    return membership ? membership.role : null;
  }

  /**
   * Ensure the current user is a member of the workspace and has at least one of the allowed roles.
   * Returns the resolved role for convenience.
   */
  async ensureWorkspaceRole(
    authUser: AuthUser,
    workspaceId: string,
    allowedRoles: WorkspaceRole[],
  ): Promise<WorkspaceRole> {
    const role = await this.getRoleForUserInWorkspace(authUser, workspaceId);

    if (!role) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    if (!allowedRoles.includes(role)) {
      throw new ForbiddenException('Insufficient permissions for this workspace');
    }

    return role;
  }

  /**
   * Resolve workspaceId from route params / query / body.
   * Supports:
   *  - workspaceId (param, query, body)
   *  - projectId (param, query, body, or generic :id if it matches a project)
   *  - taskId (param, query, body, or generic :id if it matches a task)
   *  - subtaskId (param, query, body)
   *  - token (from invite endpoint) - looks up workspace from invite
   */
  async resolveWorkspaceIdFromRequest(
    params: Record<string, any>,
    query: Record<string, any>,
    body: Record<string, any>,
  ): Promise<string> {
    // 1) Direct workspaceId
    const workspaceId =
      params.workspaceId ?? query.workspaceId ?? body.workspaceId;
    if (workspaceId) {
      return String(workspaceId);
    }

    // 2) Invite token resolution (for /invites/:token/accept)
    const token = params.token ?? query.token ?? body.token ?? null;
    if (token) {
      const invite = await this.prisma.workspaceInvite.findUnique({
        where: { token: String(token) },
        select: { workspaceId: true },
      });

      if (invite) {
        return invite.workspaceId;
      }
      // If token is invalid, fall through to error below
    }

    // 3) Project-based resolution
    let projectId =
      params.projectId ?? query.projectId ?? body.projectId ?? null;

    // If not explicitly provided, try treating :id as a projectId
    if (!projectId && params.id) {
      const project = await this.prisma.project.findUnique({
        where: { id: String(params.id) },
        select: { workspaceId: true },
      });

      if (project) {
        return project.workspaceId;
      }
    }

    if (projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: String(projectId) },
        select: { workspaceId: true },
      });

      if (!project) {
        throw new ForbiddenException('Project not found');
      }

      return project.workspaceId;
    }

    // 4) Task-based resolution
    let taskId = params.taskId ?? query.taskId ?? body.taskId ?? null;

    // If still not found, try treating :id as a taskId
    if (!taskId && params.id) {
      const task = await this.prisma.task.findUnique({
        where: { id: String(params.id) },
        select: {
          project: {
            select: { workspaceId: true },
          },
        },
      });

      if (task && task.project) {
        return task.project.workspaceId;
      }
    }

    if (taskId) {
      const task = await this.prisma.task.findUnique({
        where: { id: String(taskId) },
        select: {
          project: {
            select: { workspaceId: true },
          },
        },
      });

      if (!task || !task.project) {
        throw new ForbiddenException('Task not found');
      }

      return task.project.workspaceId;
    }

    // 5) Subtask-based resolution (for subtask endpoints)
    const subtaskId =
      params.subtaskId ?? query.subtaskId ?? body.subtaskId ?? null;

    if (subtaskId) {
      const subtask = await this.prisma.subtask.findUnique({
        where: { id: String(subtaskId) },
        select: {
          task: {
            select: {
              project: {
                select: { workspaceId: true },
              },
            },
          },
        },
      });

      if (!subtask || !subtask.task || !subtask.task.project) {
        throw new ForbiddenException('Subtask not found');
      }

      return subtask.task.project.workspaceId;
    }

    throw new Error(
      'WorkspaceRoleGuard could not resolve workspaceId from request. ' +
        'Expected workspaceId, projectId, taskId, subtaskId, or token.',
    );
  }
}