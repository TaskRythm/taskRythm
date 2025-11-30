// backend/src/projects/projects.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

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

  async listByWorkspace(workspaceId: string, userId: string) {
    await this.assertWorkspaceMembership(workspaceId, userId);

    return this.prisma.project.findMany({
      where: { workspaceId },
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
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.assertWorkspaceMembership(project.workspaceId, userId);

    return project;
  }

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
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        archived: dto.archived ?? existing.archived,
      },
    });
  }
  async remove(id: string, userId: string) {
    const existing = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    await this.assertWorkspaceMembership(existing.workspaceId, userId);

    return this.prisma.project.delete({
      where: { id },
    });
  }
}