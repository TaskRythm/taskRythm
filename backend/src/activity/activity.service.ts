// backend/src/activity/activity.service.ts
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/auth-user.interface';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureUser(authUser: AuthUser) {
    const auth0Id = authUser.auth0Id || (authUser as any).sub;
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

  private async assertWorkspaceMembership(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
  }

  async listForWorkspace(authUser: AuthUser, workspaceId: string) {
    const user = await this.ensureUser(authUser);
    await this.assertWorkspaceMembership(workspaceId, user.id);

    const activity = await this.prisma.activityLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return activity;
  }

  async listForProject(authUser: AuthUser, projectId: string) {
    const user = await this.ensureUser(authUser);

    // ensure user has access to this project via workspace membership
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: {
            some: { userId: user.id },
          },
        },
      },
      include: {
        workspace: true,
      },
    });

    if (!project) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const activity = await this.prisma.activityLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return activity;
  }
}
