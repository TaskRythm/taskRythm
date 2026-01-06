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

  private async assertWorkspaceMembership(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    if (!workspace) throw new NotFoundException('Workspace not found');

    if (workspace.ownerId === userId) return { role: WorkspaceRole.OWNER };

    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    return membership;
  }

  private async assertWorkspaceRole(
    workspaceId: string,
    userId: string,
    allowedRoles: WorkspaceRole[],
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    if (!workspace) throw new NotFoundException('Workspace not found');

    if (workspace.ownerId === userId) return { role: WorkspaceRole.OWNER };

    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions for this workspace');
    }

    return membership;
  }

  async listByWorkspace(workspaceId: string, userId: string) {
    await this.assertWorkspaceMembership(workspaceId, userId);

    return this.prisma.project.findMany({
      where: { workspaceId, archived: false },
      orderBy: { createdAt: 'asc' },
    });
  }

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

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    await this.assertWorkspaceMembership(project.workspaceId, userId);
    return project;
  }

  async update(id: string, dto: UpdateProjectDto, userId: string) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');

    await this.assertWorkspaceMembership(existing.workspaceId, userId);

    return this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        archived: typeof dto.archived === 'boolean' ? dto.archived : existing.archived,
      },
    });
  }

  async archive(id: string, userId: string) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');

    await this.assertWorkspaceMembership(existing.workspaceId, userId);

    return this.prisma.project.update({
      where: { id },
      data: { archived: true },
    });
  }

  async deleteProjectForUser(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, workspaceId: true },
    });

    if (!project) throw new NotFoundException('Project not found');

    await this.assertWorkspaceRole(project.workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    const tasks = await this.prisma.task.findMany({
      where: { projectId: project.id },
      select: { id: true },
    });

    const taskIds = tasks.map((t) => t.id);

    await this.prisma.$transaction([
      this.prisma.activityLog.deleteMany({ where: { projectId: project.id } }),
      ...(taskIds.length
        ? [this.prisma.subtask.deleteMany({ where: { taskId: { in: taskIds } } })]
        : []),
      this.prisma.task.deleteMany({ where: { projectId: project.id } }),
      this.prisma.project.delete({ where: { id: project.id } }),
    ]);
  }
}