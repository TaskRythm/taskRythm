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

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  /**
   * Map Auth0 user → local User row and return user.id.
   */
  private async getOrCreateUserId(user: AuthUser): Promise<string> {
    const auth0Id = user.auth0Id || (user as any).sub;
    const email = user.email;
    const name = user.name;
    const picture = user.picture;

    const dbUser = await this.workspacesService.ensureUser(
      auth0Id,
      email,
      name,
      picture,
    );

    return dbUser.id;
  }

  /**
   * Ensure the user is a member of the project’s workspace.
   */
  private async ensureProjectMembership(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: project.workspaceId,
        userId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    return { project, membership };
  }

  /**
   * Ensure the user can access the task by checking its project workspace.
   */
  private async ensureTaskMembership(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.ensureProjectMembership(task.projectId, userId);
    return task;
  }

  /**
   * List tasks for a project (with subtasks).
   */
  async findByProject(user: AuthUser, projectId: string) {
    const userId = await this.getOrCreateUserId(user);
    await this.ensureProjectMembership(projectId, userId);

    const tasks = await (this.prisma as any).task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      include: { subtasks: true },
    });

    return tasks;
  }

  /**
   * Create a new task in a project.
   */
  async create(user: AuthUser, dto: CreateTaskDto) {
    const userId = await this.getOrCreateUserId(user);
    await this.ensureProjectMembership(dto.projectId, userId);

    const data: any = {
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? 'TODO',
      priority: dto.priority ?? 'MEDIUM',
      type: dto.type ?? 'TASK',
      orderIndex: dto.orderIndex ?? 0,
      estimateMinutes:
        typeof dto.estimateMinutes === 'number'
          ? dto.estimateMinutes
          : null,
      parentTaskId: dto.parentTaskId ?? null,
    };

    if (dto.dueDate) {
      data.dueDate = new Date(dto.dueDate);
    }

    if (dto.assignedToUserId) {
      data.assignedToUserId = dto.assignedToUserId;
    }

    const task = await (this.prisma as any).task.create({
      data,
      include: { subtasks: true },
    });

    return task;
  }

  /**
   * Update a task (status, title, desc, estimate, priority, type, parent).
   */
  async update(user: AuthUser, taskId: string, dto: UpdateTaskDto) {
    const userId = await this.getOrCreateUserId(user);
    const existing = await this.ensureTaskMembership(taskId, userId);

    const data: any = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.orderIndex !== undefined) data.orderIndex = dto.orderIndex;
    if (dto.estimateMinutes !== undefined)
      data.estimateMinutes = dto.estimateMinutes;
    if (dto.parentTaskId !== undefined) data.parentTaskId = dto.parentTaskId;

    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    if (dto.assignedToUserId !== undefined) {
      data.assignedToUserId = dto.assignedToUserId ?? null;
    }

    const task = await (this.prisma as any).task.update({
      where: { id: existing.id },
      data,
      include: { subtasks: true },
    });

    return task;
  }

  /**
   * Delete a task and its subtasks.
   */
  async remove(user: AuthUser, taskId: string): Promise<void> {
    const userId = await this.getOrCreateUserId(user);
    const task = await this.ensureTaskMembership(taskId, userId);

    await this.prisma.$transaction(async (tx) => {
      await (tx as any).subtask.deleteMany({
        where: { taskId: task.id },
      });

      await (tx as any).task.delete({
        where: { id: task.id },
      });
    });
  }

  // ---------- Subtasks ----------

  async createSubtask(
    user: AuthUser,
    taskId: string,
    dto: CreateSubtaskDto,
  ) {
    const userId = await this.getOrCreateUserId(user);
    await this.ensureTaskMembership(taskId, userId);

    const subtask = await (this.prisma as any).subtask.create({
      data: {
        taskId,
        title: dto.title,
        isCompleted: false,
      },
    });

    return subtask;
  }

  async updateSubtask(
    user: AuthUser,
    subtaskId: string,
    dto: UpdateSubtaskDto,
  ) {
    const userId = await this.getOrCreateUserId(user);

    const existing = await (this.prisma as any).subtask.findUnique({
      where: { id: subtaskId },
    });

    if (!existing) {
      throw new NotFoundException('Subtask not found');
    }

    await this.ensureTaskMembership(existing.taskId, userId);

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.isCompleted !== undefined) data.isCompleted = dto.isCompleted;

    const subtask = await (this.prisma as any).subtask.update({
      where: { id: subtaskId },
      data,
    });

    return subtask;
  }

  async removeSubtask(user: AuthUser, subtaskId: string): Promise<void> {
    const userId = await this.getOrCreateUserId(user);

    const existing = await (this.prisma as any).subtask.findUnique({
      where: { id: subtaskId },
    });

    if (!existing) {
      throw new NotFoundException('Subtask not found');
    }

    await this.ensureTaskMembership(existing.taskId, userId);

    await (this.prisma as any).subtask.delete({
      where: { id: subtaskId },
    });
  }
}