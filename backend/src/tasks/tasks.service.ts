import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ActivityType, TaskStatus } from '@prisma/client';
import type { AuthUser } from '../auth/auth-user.interface';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensure we have a local User row for this Auth0 identity.
   */
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

  /**
   * Ensure the current user is a member of the workspace that owns this project.
   */
  private async ensureProjectAccess(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: {
            some: {
              userId,
            },
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

    return project;
  }

  /**
   * Ensure the current user can access this task (via workspace membership).
   */
  private async findTaskWithAccess(taskId: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          workspace: {
            members: {
              some: { userId },
            },
          },
        },
      },
      include: {
        project: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }

    return task;
  }

  /**
   * Create activity log helper.
   */
  private async logActivity(params: {
    workspaceId: string;
    projectId: string;
    taskId: string;
    userId: string;
    type: ActivityType;
    message: string;
    payload?: any;
  }) {
    const { workspaceId, projectId, taskId, userId, type, message, payload } = params;

    await this.prisma.activityLog.create({
      data: {
        workspaceId,
        projectId,
        taskId,
        userId,
        type,
        message,
        payload,
      },
    });
  }

  /**
   * Create a new task under a project.
   */
  async create(authUser: AuthUser, dto: CreateTaskDto) {
    const user = await this.ensureUser(authUser);

    const project = await this.ensureProjectAccess(dto.projectId, user.id);

    const task = await this.prisma.task.create({
      data: {
        projectId: project.id,
        title: dto.title,
        description: dto.description,
        status: dto.status ?? TaskStatus.TODO,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        orderIndex: dto.orderIndex,
        createdById: user.id,
        assignedToId: dto.assignedToUserId ?? undefined,
      },
    });

    await this.logActivity({
      workspaceId: project.workspaceId,
      projectId: project.id,
      taskId: task.id,
      userId: user.id,
      type: ActivityType.TASK_CREATED,
      message: `${user.name || 'Someone'} created task "${task.title}"`,
      payload: {
        title: task.title,
        status: task.status,
        priority: task.priority,
      },
    });

    return task;
  }

  /**
   * Get all tasks for a given project (only if user is a member).
   */
  async findByProject(authUser: AuthUser, projectId: string) {
    const user = await this.ensureUser(authUser);

    await this.ensureProjectAccess(projectId, user.id);

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
      },
      orderBy: [
        { orderIndex: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        assignedTo: true,
        createdBy: true,
      },
    });

    return tasks;
  }

  /**
   * Update a task (title, status, assignee, etc.).
   */
  async update(authUser: AuthUser, taskId: string, dto: UpdateTaskDto) {
    const user = await this.ensureUser(authUser);

    const existing = await this.findTaskWithAccess(taskId, user.id);

    const updated = await this.prisma.task.update({
      where: { id: existing.id },
      data: {
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        status: dto.status ?? existing.status,
        priority: dto.priority ?? existing.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : existing.dueDate,
        orderIndex: dto.orderIndex ?? existing.orderIndex,
        assignedToId:
          dto.assignedToUserId !== undefined
            ? dto.assignedToUserId
            : existing.assignedToId,
      },
    });

    // Log generic update
    await this.logActivity({
      workspaceId: existing.project.workspaceId,
      projectId: existing.projectId,
      taskId: existing.id,
      userId: user.id,
      type: ActivityType.TASK_UPDATED,
      message: `${user.name || 'Someone'} updated task "${updated.title}"`,
      payload: {
        before: {
          status: existing.status,
          priority: existing.priority,
        },
        after: {
          status: updated.status,
          priority: updated.priority,
        },
      },
    });

    // Extra log if status specifically changed
    if (existing.status !== updated.status) {
      await this.logActivity({
        workspaceId: existing.project.workspaceId,
        projectId: existing.projectId,
        taskId: existing.id,
        userId: user.id,
        type: ActivityType.TASK_STATUS_CHANGED,
        message: `${user.name || 'Someone'} moved task "${updated.title}" from ${existing.status} to ${updated.status}`,
      });
    }

    return updated;
  }

  /**
   * Delete a task.
   */
  async remove(authUser: AuthUser, taskId: string) {
    const user = await this.ensureUser(authUser);

    const existing = await this.findTaskWithAccess(taskId, user.id);

    await this.prisma.task.delete({
      where: { id: existing.id },
    });

    await this.logActivity({
      workspaceId: existing.project.workspaceId,
      projectId: existing.projectId,
      taskId: existing.id,
      userId: user.id,
      type: ActivityType.TASK_UPDATED,
      message: `${user.name || 'Someone'} deleted task "${existing.title}"`,
    });

    return { success: true };
  }
}