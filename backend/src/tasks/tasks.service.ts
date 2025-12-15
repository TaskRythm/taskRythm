import {
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

  async findByProject(user: AuthUser, projectId: string) {
    const userId = await this.getOrCreateUserId(user);
    await this.ensureProjectMembership(projectId, userId);

    return this.prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      include: { subtasks: true },
    });
  }

  async create(user: AuthUser, dto: CreateTaskDto) {
    const userId = await this.getOrCreateUserId(user);
    await this.ensureProjectMembership(dto.projectId, userId);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Safe orderIndex (prevents collisions)
      const last = await tx.task.findFirst({
        where: { projectId: dto.projectId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });

      const nextOrderIndex =
        typeof dto.orderIndex === 'number'
          ? dto.orderIndex
          : (last?.orderIndex ?? -1) + 1;

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

        assignedTo: dto.assignedToUserId
          ? { connect: { id: dto.assignedToUserId } }
          : undefined,

        // ✅ FIX: parent relation, not parentTaskId
        parentTask: dto.parentTaskId
          ? { connect: { id: dto.parentTaskId } }
          : undefined,
      };

      return tx.task.create({
        data,
        include: { subtasks: true },
      });
    });
  }

  async update(user: AuthUser, taskId: string, dto: UpdateTaskDto) {
    const userId = await this.getOrCreateUserId(user);
    const existing = await this.ensureTaskMembership(taskId, userId);

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

    if (dto.assignedToUserId !== undefined) {
      data.assignedTo = dto.assignedToUserId
        ? { connect: { id: dto.assignedToUserId } }
        : { disconnect: true };
    }

    // ✅ FIX: parent relation update
    if (dto.parentTaskId !== undefined) {
      data.parentTask = dto.parentTaskId
        ? { connect: { id: dto.parentTaskId } }
        : { disconnect: true };
    }

    return this.prisma.task.update({
      where: { id: existing.id },
      data,
      include: { subtasks: true },
    });
  }

  async remove(user: AuthUser, taskId: string): Promise<void> {
    const userId = await this.getOrCreateUserId(user);
    const task = await this.ensureTaskMembership(taskId, userId);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.subtask.deleteMany({ where: { taskId: task.id } });
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