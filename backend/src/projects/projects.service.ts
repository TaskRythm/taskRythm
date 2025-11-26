import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from '../workspaces/dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensure that the user is a member of the given workspace.
   * Throws ForbiddenException if not.
   */
  private async ensureWorkspaceMember(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You are not a member of this workspace.',
      );
    }

    return membership;
  }

  async listForWorkspace(userId: string, workspaceId: string) {
    await this.ensureWorkspaceMember(userId, workspaceId);

    return this.prisma.project.findMany({
      where: {
        workspaceId,
        archived: false,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async createForWorkspace(userId: string, dto: CreateProjectDto) {
    await this.ensureWorkspaceMember(userId, dto.workspaceId);

    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        workspaceId: dto.workspaceId,
      },
    });
  }
}
