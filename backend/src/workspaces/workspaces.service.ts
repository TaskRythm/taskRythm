import { Injectable } from '@nestjs/common';
import { PrismaService } from './../../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensure a User row exists for this Auth0 user.
   * auth0Id = req.user.sub
   */
  async ensureUser(auth0Id: string, email?: string, name?: string, picture?: string) {
    return this.prisma.user.upsert({
      where: { auth0Id },
      update: {
        email: email ?? undefined,
        name: name ?? undefined,
        picture: picture ?? undefined,
      },
      create: {
        auth0Id,
        email: email ?? `${auth0Id}@placeholder.local`,
        name,
        picture,
      },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: true,
      },
    });
  }

  async createForUser(userId: string, dto: CreateWorkspaceDto) {
    // simple slug from name; you can improve later
    const slugBase = dto.name.trim().toLowerCase().replace(/\s+/g, '-');
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: dto.name,
          slug,
          ownerId: userId,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: WorkspaceRole.OWNER,
        },
      });

      return workspace;
    });
  }
}