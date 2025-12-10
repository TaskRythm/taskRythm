import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from './../../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspaceRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth-user.interface';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensure a User row exists for this Auth0 user.
   * auth0Id = req.user.sub
   * If no name provided, derives from email local-part (before @).
   */
  async ensureUser(
    auth0Id: string,
    email?: string,
    name?: string,
    picture?: string,
  ) {
    // If no name from Auth0, fall back to the part before "@"
    const fallbackName =
      (name && name.trim()) ||
      (email ? email.split('@')[0] : undefined);

    return this.prisma.user.upsert({
      where: { auth0Id },
      update: {
        email: email ?? undefined,
        name: fallbackName ?? undefined,
        picture: picture ?? undefined,
      },
      create: {
        auth0Id,
        email: email ?? `${auth0Id}@placeholder.local`,
        name: fallbackName,
        picture,
      },
    });
  }

  /**
   * Ensure the user is a member of the workspace with one of the allowed roles.
   * Throws Forbidden if not.
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
      throw new ForbiddenException(
        'You are not a member of this workspace',
      );
    }

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException(
        'Insufficient permissions for this workspace',
      );
    }

    return membership;
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
    if (!dto || !dto.name) {
      throw new BadRequestException('Workspace name is required');
    }

    const name = dto.name.trim();

    const slugBase = name.toLowerCase().replace(/\s+/g, '-');
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
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

  /**
   * Update workspace name / settings (OWNER/ADMIN only)
   */
  async updateWorkspace(
    workspaceId: string,
    data: { name?: string },
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data,
    });
  }

  /**
   * Delete workspace completely (for now).
   */
  async deleteWorkspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.activityLog.deleteMany({
        where: { workspaceId },
      });

      await tx.workspaceInvite.deleteMany({
        where: { workspaceId },
      });

      const projects = await tx.project.findMany({
        where: { workspaceId },
        select: { id: true },
      });

      for (const project of projects) {
        await tx.activityLog.deleteMany({
          where: { projectId: project.id },
        });

        const tasks = await tx.task.findMany({
          where: { projectId: project.id },
          select: { id: true },
        });

        for (const task of tasks) {
          await tx.subtask.deleteMany({
            where: { taskId: task.id },
          });
        }

        await tx.task.deleteMany({
          where: { projectId: project.id },
        });
      }

      await tx.project.deleteMany({
        where: { workspaceId },
      });

      await tx.workspaceMember.deleteMany({
        where: { workspaceId },
      });

      return tx.workspace.delete({
        where: { id: workspaceId },
      });
    });
  }

  /**
   * Delete workspace completely with RBAC check.
   * Only OWNER is allowed to do this.
   */
  async deleteWorkspaceForUser(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // RBAC: only OWNER can delete workspace
    await this.assertWorkspaceRole(workspaceId, userId, [WorkspaceRole.OWNER]);

    return this.prisma.$transaction(async (tx) => {
      await tx.activityLog.deleteMany({
        where: { workspaceId },
      });

      await tx.workspaceInvite.deleteMany({
        where: { workspaceId },
      });

      const projects = await tx.project.findMany({
        where: { workspaceId },
        select: { id: true },
      });

      for (const project of projects) {
        await tx.activityLog.deleteMany({
          where: { projectId: project.id },
        });

        const tasks = await tx.task.findMany({
          where: { projectId: project.id },
          select: { id: true },
        });

        for (const task of tasks) {
          await tx.subtask.deleteMany({
            where: { taskId: task.id },
          });
        }

        await tx.task.deleteMany({
          where: { projectId: project.id },
        });
      }

      await tx.project.deleteMany({
        where: { workspaceId },
      });

      await tx.workspaceMember.deleteMany({
        where: { workspaceId },
      });

      return tx.workspace.delete({
        where: { id: workspaceId },
      });
    });
  }

  /**
   * Get all members of a workspace (with their user data)
   */
  async getMembers(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            auth0Id: true,
            email: true,
            name: true,
            picture: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Update a member's role (OWNER only, with safety for last owner)
   */
  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    newRole: WorkspaceRole,
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this workspace');
    }

    if (member.role === WorkspaceRole.OWNER && newRole !== WorkspaceRole.OWNER) {
      const ownerCount = await this.prisma.workspaceMember.count({
        where: {
          workspaceId,
          role: WorkspaceRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new ForbiddenException(
          'Cannot demote the last owner of the workspace',
        );
      }
    }

    return this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            picture: true,
          },
        },
      },
    });
  }

  /**
   * Remove a member from workspace (OWNER / ADMIN)
   */
  async removeMember(workspaceId: string, memberId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this workspace');
    }

    if (member.role === WorkspaceRole.OWNER) {
      const ownerCount = await this.prisma.workspaceMember.count({
        where: {
          workspaceId,
          role: WorkspaceRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new ForbiddenException(
          'Cannot remove the last owner of the workspace',
        );
      }
    }

    return this.prisma.workspaceMember.delete({
      where: { id: memberId },
    });
  }

  /**
   * Create an invite for a workspace (OWNER/ADMIN)
   * No email sending here: token is used for link-based accept.
   */
  async createInvite(
    workspaceId: string,
    rawEmail: string,
    role: WorkspaceRole = WorkspaceRole.MEMBER,
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const email = rawEmail.trim().toLowerCase();

    // Check if user with that email is already a member
    const existingMember = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: { email },
      },
    });

    if (existingMember) {
      throw new ForbiddenException(
        'User is already a member of this workspace',
      );
    }

    // Optional: prevent duplicate active invites for same email
    const existingInvite = await this.prisma.workspaceInvite.findFirst({
      where: {
        workspaceId,
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return existingInvite;
    }

    const token = `${workspaceId}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return this.prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email,
        role,
        token,
        expiresAt,
      },
    });
  }

  /**
   * List pending (non-expired, non-accepted) invites
   */
  async listInvites(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return this.prisma.workspaceInvite.findMany({
      where: {
        workspaceId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Accept an invite by token.
   * Requires authenticated user, but no workspace role yet.
   */
  async acceptInvite(token: string, authUser: AuthUser) {
  const invite = await this.prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: true },
  });

  if (!invite) {
    throw new NotFoundException('Invite not found or invalid');
  }

  if (invite.expiresAt < new Date()) {
    throw new ForbiddenException('Invite has expired');
  }

  if (invite.acceptedAt) {
    throw new ForbiddenException('Invite has already been accepted');
  }

  const auth0Id = (authUser as any).auth0Id || (authUser as any).sub;
  const emailFromToken = (authUser as any).email || null;

  // ✅ Only enforce email check if we actually have an email from Auth0
  if (emailFromToken) {
    const inviteEmail = invite.email.toLowerCase();
    const userEmail = emailFromToken.toLowerCase();

    if (inviteEmail !== userEmail) {
      throw new ForbiddenException(
        `This invite was sent to ${invite.email}, but you are logged in as ${emailFromToken}.`,
      );
    }
  }

  const user = await this.ensureUser(
    auth0Id,
    emailFromToken ?? undefined,
    (authUser as any).name,
    (authUser as any).picture,
  );

  const existingMember = await this.prisma.workspaceMember.findFirst({
    where: {
      workspaceId: invite.workspaceId,
      userId: user.id,
    },
  });

  if (existingMember) {
    throw new ForbiddenException(
      'You are already a member of this workspace',
    );
  }

 return this.prisma.$transaction(async (tx) => {
  const membership = await tx.workspaceMember.create({
    data: {
      workspaceId: invite.workspaceId,
      userId: user.id,
      role: invite.role,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          picture: true,
        },
      },
    },
  });

  await tx.workspaceInvite.update({
    where: { token },
    data: { acceptedAt: new Date() },
  });

  return { success: true, membership, workspace: invite.workspace };
});
}
}