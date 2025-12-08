import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensure the user is a member of the workspace before allowing access.
   */
  private async assertWorkspaceMembership(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    return membership;
  }

  /**
   * Ensure the user has one of the allowed roles in the workspace.
   */
  private async assertWorkspaceRole(
    workspaceId: string,
    userId: string,
    allowedRoles: WorkspaceRole[],
  ) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions for this workspace');
    }

    return membership;
  }

  /**
   * List all non-archived projects for a workspace that the user belongs to.
   */
  async listByWorkspace(workspaceId: string, userId: string) {
    await this.assertWorkspaceMembership(workspaceId, userId);

    return this.prisma.project.findMany({
      where: { workspaceId, archived: false },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Create a project inside a workspace the user belongs to.
   */
  async createForWorkspace(dto: CreateProjectDto, userId: string) {
    await this.assertWorkspaceMembership(dto.workspaceId, userId);

    return this.prisma.project.create({
      data: {
        workspaceId: dto.workspaceId,
        name: dto.name,
        description: dto.description,
        archived: dto.archived ?? false,
      },
    });
  }

  /**
   * Find a single project by id, making sure the user is in the workspace.
   */
  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.assertWorkspaceMembership(project.workspaceId, userId);

    return project;
  }

  /**
   * Update project attributes.
   */
  async update(id: string, dto: UpdateProjectDto, userId: string) {
    const existing = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    await this.assertWorkspaceMembership(existing.workspaceId, userId);

    return this.prisma.project.update({
      where: { id },
      data: {
        // If you allow workspaceId change, carefully validate; otherwise ignore dto.workspaceId
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        archived:
          typeof dto.archived === 'boolean' ? dto.archived : existing.archived,
      },
    });
  }

  /**
   * Archive (soft-delete) a project by setting archived = true.
   */
  async archive(id: string, userId: string) {
    const existing = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    await this.assertWorkspaceMembership(existing.workspaceId, userId);

    return this.prisma.project.update({
      where: { id },
      data: { archived: true },
    });
  }

  /**
   * Delete a project permanently with RBAC check.
   * Only OWNER or ADMIN of the workspace can delete.
   */
  async deleteProjectForUser(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check role in the parent workspace
    await this.assertWorkspaceRole(project.workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    return this.prisma.$transaction(async (tx) => {
      // Remove related activity logs
      await tx.activityLog.deleteMany({
        where: { projectId: project.id },
      });

      // Remove subtasks of tasks in this project
      const tasks = await tx.task.findMany({
        where: { projectId: project.id },
        select: { id: true },
      });

      if (tasks.length > 0) {
        const taskIds = tasks.map((t) => t.id);
        await tx.subtask.deleteMany({
          where: { taskId: { in: taskIds } },
        });
      }

      // Remove tasks
      await tx.task.deleteMany({
        where: { projectId: project.id },
      });

      // Finally remove the project itself
      return tx.project.delete({
        where: { id: project.id },
      });
    });
  }
}