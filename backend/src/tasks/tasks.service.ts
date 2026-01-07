import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import type { AuthUser } from '../auth/auth-user.interface';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { Prisma } from '@prisma/client';

const ASSIGNEE_SELECT = {
  id: true,
  name: true,
  email: true,
  picture: true,
} as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  private async getOrCreateUserId(user: AuthUser): Promise<string> {
    const auth0Id = (user as any).auth0Id || (user as any).sub;
    const dbUser = await this.workspacesService.ensureUser(
      auth0Id,
      user.email,
      user.name,
      user.picture,
    );
    return dbUser.id;
  }

  private async ensureProjectMembership(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { workspace: true },
    });

    if (!project) throw new NotFoundException('Project not found');

    // OWNER always allowed
    if (project.workspace.ownerId === userId) return project;

    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId: project.workspaceId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    return project;
  }

  private async ensureTaskMembership(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true },
    });

    if (!task) throw new NotFoundException('Task not found');

    await this.ensureProjectMembership(task.projectId, userId);
    return task;
  }

  private mapTaskAssignees<T extends { assignees?: any[] }>(task: T) {
    return {
      ...task,
      assignees: task.assignees?.map((a: any) => a.user) ?? [],
    } as T;
  }

  private async assertAssigneesAreWorkspaceMembers(
    projectId: string,
    assigneeUserIds: string[],
  ) {
    if (assigneeUserIds.length > 5) {
      throw new BadRequestException('A task can have at most 5 assignees');
    }

    const uniqueIds = [...new Set(assigneeUserIds)];

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: project.workspaceId, userId: { in: uniqueIds } },
      select: { userId: true },
    });

    const memberIds = new Set(members.map((m) => m.userId));
    const missing = uniqueIds.filter((id) => !memberIds.has(id));

    if (missing.length > 0) {
      throw new ForbiddenException('All assignees must be members of this workspace');
    }
  }

  async findByProject(user: AuthUser, projectId: string) {
    const userId = await this.getOrCreateUserId(user);
    await this.ensureProjectMembership(projectId, userId);

    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      include: {
        subtasks: true,
        assignees: {
          include: {
            user: { select: ASSIGNEE_SELECT },
          },
        },
      },
    });

    return tasks.map((task) => this.mapTaskAssignees(task));
  }

  async create(user: AuthUser, dto: CreateTaskDto) {
    const userId = await this.getOrCreateUserId(user);
    await this.ensureProjectMembership(dto.projectId, userId);
    const assigneeIds = dto.assigneeIds ? [...new Set(dto.assigneeIds)] : [];
    if (assigneeIds.length > 0) {
      await this.assertAssigneesAreWorkspaceMembers(dto.projectId, assigneeIds);
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Safe orderIndex (prevents collisions)
      const last = await tx.task.findFirst({
        where: { projectId: dto.projectId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });

      const maxOrderIndex = last?.orderIndex ?? -1;
      
      // If orderIndex is provided, add it to the max to avoid collisions
      const nextOrderIndex =
        typeof dto.orderIndex === 'number'
          ? maxOrderIndex + 1 + dto.orderIndex
          : maxOrderIndex + 1;

      const data: Prisma.TaskCreateInput = {
        title: dto.title,
        description: dto.description ?? null,
        status: dto.status ?? 'TODO',
        priority: dto.priority ?? 'MEDIUM',
        type: dto.type ?? 'TASK',
        orderIndex: nextOrderIndex,
        estimateMinutes:
          typeof dto.estimateMinutes === 'number' ? dto.estimateMinutes : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,

        project: { connect: { id: dto.projectId } },
        createdBy: { connect: { id: userId } },
        parentTask: dto.parentTaskId
          ? { connect: { id: dto.parentTaskId } }
          : undefined,
      };

      const task = await tx.task.create({
        data,
      });

      if (assigneeIds.length > 0) {
        await tx.taskAssignee.createMany({
          data: assigneeIds.map((assigneeId) => ({
            taskId: task.id,
            userId: assigneeId,
          })),
          skipDuplicates: true,
        });
      }

      const created = await tx.task.findUniqueOrThrow({
        where: { id: task.id },
        include: {
          subtasks: true,
          assignees: {
            include: { user: { select: ASSIGNEE_SELECT } },
          },
          project: { select: { workspaceId: true } },
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          workspaceId: (created.project as any).workspaceId,
          projectId: created.projectId,
          taskId: created.id,
          userId,
          type: 'TASK_CREATED',
          message: `Created task "${created.title}"`,
        },
      });

      return this.mapTaskAssignees(created);
    });
  }

  async update(user: AuthUser, taskId: string, dto: UpdateTaskDto) {
    const userId = await this.getOrCreateUserId(user);
    const existing = await this.ensureTaskMembership(taskId, userId);

    const assigneeIdsRaw = dto.assigneeIds;
    const assigneeIds = Array.isArray(assigneeIdsRaw)
      ? [...new Set(assigneeIdsRaw)]
      : assigneeIdsRaw === undefined
        ? undefined
        : [];

    if (assigneeIds !== undefined) {
      await this.assertAssigneesAreWorkspaceMembers(
        existing.projectId,
        assigneeIds,
      );
    }

    const data: Prisma.TaskUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description ?? null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.orderIndex !== undefined) data.orderIndex = dto.orderIndex;
    if (dto.estimateMinutes !== undefined)
      data.estimateMinutes = dto.estimateMinutes;

    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    // ✅ FIX: parent relation update
    if (dto.parentTaskId !== undefined) {
      data.parentTask = dto.parentTaskId
        ? { connect: { id: dto.parentTaskId } }
        : { disconnect: true };
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.task.update({
        where: { id: existing.id },
        data,
      });

      if (assigneeIds !== undefined) {
        await tx.taskAssignee.deleteMany({
          where: {
            taskId: existing.id,
            ...(assigneeIds.length > 0
              ? { userId: { notIn: assigneeIds } }
              : {}),
          },
        });

        if (assigneeIds.length > 0) {
          await tx.taskAssignee.createMany({
            data: assigneeIds.map((assigneeId) => ({
              taskId: existing.id,
              userId: assigneeId,
            })),
            skipDuplicates: true,
          });
        }
      }

      const updated = await tx.task.findUniqueOrThrow({
        where: { id: existing.id },
        include: {
          subtasks: true,
          assignees: {
            include: { user: { select: ASSIGNEE_SELECT } },
          },
          project: { select: { workspaceId: true } },
        },
      });

      // Log activity
      const oldTask = await tx.task.findUnique({
        where: { id: existing.id },
        select: { status: true },
      });
      
      if (dto.status && oldTask && oldTask.status !== dto.status) {
        await tx.activityLog.create({
          data: {
            workspaceId: (updated.project as any).workspaceId,
            projectId: updated.projectId,
            taskId: updated.id,
            userId,
            type: 'TASK_STATUS_CHANGED',
            message: `Changed task "${updated.title}" from ${oldTask.status} to ${dto.status}`,
          },
        });
      } else {
        await tx.activityLog.create({
          data: {
            workspaceId: (updated.project as any).workspaceId,
            projectId: updated.projectId,
            taskId: updated.id,
            userId,
            type: 'TASK_UPDATED',
            message: `Updated task "${updated.title}"`,
          },
        });
      }

      return this.mapTaskAssignees(updated);
    });
  }

  async remove(user: AuthUser, taskId: string): Promise<void> {
    const userId = await this.getOrCreateUserId(user);
    const task = await this.ensureTaskMembership(taskId, userId);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
     await tx.subtask.deleteMany({ where: { taskId: task.id } });
      await tx.taskAssignee.deleteMany({ where: { taskId: task.id } });
      await tx.task.delete({ where: { id: task.id } });
    });
  }

  // ---------- Subtasks ----------

  async createSubtask(user: AuthUser, taskId: string, dto: CreateSubtaskDto) {
    const userId = await this.getOrCreateUserId(user);
    await this.ensureTaskMembership(taskId, userId);

    return this.prisma.subtask.create({
      data: { taskId, title: dto.title, isCompleted: false },
    });
  }

  async updateSubtask(
    user: AuthUser,
    subtaskId: string,
    dto: UpdateSubtaskDto,
  ) {
    const userId = await this.getOrCreateUserId(user);

    const existing = await this.prisma.subtask.findUnique({
      where: { id: subtaskId },
      select: { id: true, taskId: true },
    });

    if (!existing) throw new NotFoundException('Subtask not found');

    await this.ensureTaskMembership(existing.taskId, userId);

    return this.prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        title: dto.title ?? undefined,
        isCompleted: dto.isCompleted ?? undefined,
      },
    });
  }

  async removeSubtask(user: AuthUser, subtaskId: string): Promise<void> {
    const userId = await this.getOrCreateUserId(user);

    const existing = await this.prisma.subtask.findUnique({
      where: { id: subtaskId },
      select: { id: true, taskId: true },
    });

    if (!existing) throw new NotFoundException('Subtask not found');

    await this.ensureTaskMembership(existing.taskId, userId);

    await this.prisma.subtask.delete({ where: { id: subtaskId } });
  }
}