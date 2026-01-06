import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceRole, Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/auth-user.interface';

@Injectable()
export class WorkspacePermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hardened user ensure:
   * - Find by auth0Id
   * - Else link by email
   * - Else create
   */
  private async ensureUser(authUser: AuthUser) {
    const auth0Id = (authUser as any).auth0Id || (authUser as any).sub;
    if (!auth0Id) throw new UnauthorizedException('Missing Auth0 user id');

    const email = authUser.email?.toLowerCase();
    const fallbackName =
      (authUser.name && authUser.name.trim()) ||
      (email ? email.split('@')[0] : undefined);

    let user = await this.prisma.user.findUnique({ where: { auth0Id } });

    if (!user && email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            auth0Id,
            name: fallbackName ?? byEmail.name ?? undefined,
            picture: authUser.picture ?? byEmail.picture ?? undefined,
          },
        });
      }
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          auth0Id,
          email: email ?? `${auth0Id}@placeholder.local`,
          name: fallbackName,
          picture: authUser.picture,
        },
      });
      return user;
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (email && user.email !== email) updateData.email = email;
    if (fallbackName && user.name !== fallbackName) updateData.name = fallbackName;
    if (authUser.picture && user.picture !== authUser.picture) updateData.picture = authUser.picture;

    if (Object.keys(updateData).length) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: updateData });
    }

    return user;
  }

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

    if (!workspace) throw new ForbiddenException('Workspace not found');

    if (workspace.ownerId === user.id) return WorkspaceRole.OWNER;

    const membership = workspace.members[0];
    return membership ? membership.role : null;
  }

  async ensureWorkspaceRole(
    authUser: AuthUser,
    workspaceId: string,
    allowedRoles: WorkspaceRole[],
  ): Promise<WorkspaceRole> {
    const role = await this.getRoleForUserInWorkspace(authUser, workspaceId);

    if (!role) throw new ForbiddenException('You are not a member of this workspace');
    if (!allowedRoles.includes(role)) {
      throw new ForbiddenException('Insufficient permissions for this workspace');
    }

    return role;
  }

  async resolveWorkspaceIdFromRequest(
    params: Record<string, any>,
    query: Record<string, any>,
    body: Record<string, any>,
  ): Promise<string> {
    const workspaceId = params.workspaceId ?? query.workspaceId ?? body.workspaceId;
    if (workspaceId) return String(workspaceId);

    const token = params.token ?? query.token ?? body.token ?? null;
    if (token) {
      const invite = await this.prisma.workspaceInvite.findUnique({
        where: { token: String(token) },
        select: { workspaceId: true },
      });
      if (invite) return invite.workspaceId;
    }

    let projectId = params.projectId ?? query.projectId ?? body.projectId ?? null;

    if (!projectId && params.id) {
      const project = await this.prisma.project.findUnique({
        where: { id: String(params.id) },
        select: { workspaceId: true },
      });
      if (project) return project.workspaceId;
    }

    if (projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: String(projectId) },
        select: { workspaceId: true },
      });
      if (!project) throw new ForbiddenException('Project not found');
      return project.workspaceId;
    }

    let taskId = params.taskId ?? query.taskId ?? body.taskId ?? null;

    if (!taskId && params.id) {
      const task = await this.prisma.task.findUnique({
        where: { id: String(params.id) },
        select: { project: { select: { workspaceId: true } } },
      });
      if (task?.project) return task.project.workspaceId;
    }

    if (taskId) {
      const task = await this.prisma.task.findUnique({
        where: { id: String(taskId) },
        select: { project: { select: { workspaceId: true } } },
      });
      if (!task?.project) throw new ForbiddenException('Task not found');
      return task.project.workspaceId;
    }

    const subtaskId = params.subtaskId ?? query.subtaskId ?? body.subtaskId ?? null;
    if (subtaskId) {
      const subtask = await this.prisma.subtask.findUnique({
        where: { id: String(subtaskId) },
        select: { task: { select: { project: { select: { workspaceId: true } } } } },
      });
      if (!subtask?.task?.project) throw new ForbiddenException('Subtask not found');
      return subtask.task.project.workspaceId;
    }

    throw new Error(
      'WorkspaceRoleGuard could not resolve workspaceId from request. Expected workspaceId, projectId, taskId, subtaskId, or token.',
    );
  }
}