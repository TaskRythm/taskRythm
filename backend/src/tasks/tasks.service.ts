import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { ActivityType, TaskStatus, TaskType } from '@prisma/client';
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
    taskId: string | null;
    taskId: string;
    userId: string;
    type: ActivityType;
    message: string;
    payload?: any;
  }) {
    const { workspaceId, projectId, taskId, userId, type, message, payload } =
      params;
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

  // Create a new task under a project.
  /**
   * Create a new task under a project.
   */
  async create(authUser: AuthUser, dto: CreateTaskDto) {
    const user = await this.ensureUser(authUser);

    const project = await this.ensureProjectAccess(dto.projectId, user.id);

    // Validate parentTaskId if provided
    if (dto.parentTaskId) {
      const parentTask = await this.prisma.task.findFirst({
        where: {
          id: dto.parentTaskId,
          projectId: project.id,
          parentTaskId: null, // Parent must be a top-level task (no grandchildren)
        },
      });

      if (!parentTask) {
        throw new ForbiddenException(
          'Invalid parent task: must exist in the same project and be a top-level task',
        );
      }
    }

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
        estimateMinutes: dto.estimateMinutes ?? null,
        type: dto.type ?? TaskType.TASK,
        parentTaskId: dto.parentTaskId ?? null,
      },
      include: {
        subtasks: true,
        assignedTo: true,
        createdBy: true,
        children: true,
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
        estimateMinutes: task.estimateMinutes,
        type: task.type,
      },
    });

    return task;
  }

  /**
   * Get all tasks for a given project (only if user is a member).
   * Returns flat list with parentTaskId - frontend groups them.
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
        subtasks: true,
      },
    });

    return tasks;
  }

  // Update a task (title, status, assignee, etc.).
  /**
   * Update a task (title, status, assignee, etc.).
   */
  async update(authUser: AuthUser, taskId: string, dto: UpdateTaskDto) {
    const user = await this.ensureUser(authUser);

    const existing = await this.findTaskWithAccess(taskId, user.id);

    // Validate parentTaskId if being changed
    if (dto.parentTaskId !== undefined && dto.parentTaskId !== null) {
      // Cannot set self as parent
      if (dto.parentTaskId === existing.id) {
        throw new ForbiddenException('A task cannot be its own parent');
      }

      const parentTask = await this.prisma.task.findFirst({
        where: {
          id: dto.parentTaskId,
          projectId: existing.projectId,
          parentTaskId: null, // Parent must be a top-level task
        },
      });

      if (!parentTask) {
        throw new ForbiddenException(
          'Invalid parent task: must exist in the same project and be a top-level task',
        );
      }

      // If this task has children, it cannot become a child task (no grandchildren)
      const hasChildren = await this.prisma.task.count({
        where: { parentTaskId: existing.id },
      });

      if (hasChildren > 0) {
        throw new ForbiddenException(
          'Cannot make this task a child: it already has child tasks',
        );
      }
    }

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

        estimateMinutes:
          dto.estimateMinutes !== undefined
            ? dto.estimateMinutes
            : existing.estimateMinutes,
        type: dto.type ?? existing.type,
        parentTaskId:
          dto.parentTaskId !== undefined
            ? dto.parentTaskId
            : existing.parentTaskId,
      },
      include: {
        subtasks: true,
        assignedTo: true,
        createdBy: true,
        children: true,
      },
    });

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
          estimateMinutes: existing.estimateMinutes,
          type: existing.type,
          parentTaskId: existing.parentTaskId,
        },
        after: {
          status: updated.status,
          priority: updated.priority,
          estimateMinutes: updated.estimateMinutes,
          type: updated.type,
          parentTaskId: updated.parentTaskId,
        },
      },
    });

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

  // Delete a task (and its subtasks and child tasks)
  async remove(authUser: AuthUser, taskId: string) {
    const user = await this.ensureUser(authUser);
    const existing = await this.findTaskWithAccess(taskId, user.id);

    const taskTitle = existing.title;
    const workspaceId = existing.project.workspaceId;
    const projectId = existing.projectId;

    await this.prisma.$transaction(async (tx) => {
      // Get all child tasks
      const childTasks = await tx.task.findMany({
        where: { parentTaskId: existing.id },
        select: { id: true },
      });

      const childTaskIds = childTasks.map((t) => t.id);

      // Delete activity logs for child tasks
      if (childTaskIds.length > 0) {
        await tx.activityLog.deleteMany({
          where: { taskId: { in: childTaskIds } },
        });

        // Delete subtasks of child tasks
        await tx.subtask.deleteMany({
          where: { taskId: { in: childTaskIds } },
        });

        // Delete child tasks
        await tx.task.deleteMany({
          where: { parentTaskId: existing.id },
        });
      }

      // Delete activity logs referencing this task
      await tx.activityLog.deleteMany({
        where: { taskId: existing.id },
      });

      // Delete subtasks of this task
      await tx.subtask.deleteMany({
        where: { taskId: existing.id },
      });

      // Now delete the task itself
      await tx.task.delete({
        where: { id: existing.id },
      });

      // Log the deletion activity
      await tx.activityLog.create({
        data: {
          workspaceId,
          projectId,
          taskId: null,
          userId: user.id,
          type: ActivityType.TASK_UPDATED,
          message: `${user.name || 'Someone'} deleted task "${taskTitle}"${
            childTaskIds.length > 0
              ? ` and ${childTaskIds.length} child task(s)`
              : ''
          }`,
        },
      });
    });

    return { success: true };
  }

  /**
   * Create a subtask under a task.
   */
  async createSubtask(
    authUser: AuthUser,
    taskId: string,
    dto: CreateSubtaskDto,
  ) {
    const user = await this.ensureUser(authUser);
    const task = await this.findTaskWithAccess(taskId, user.id);

    const subtask = await this.prisma.subtask.create({
      data: {
        taskId: task.id,
        title: dto.title,
      },
    });

    await this.logActivity({
      workspaceId: task.project.workspaceId,
      projectId: task.projectId,
      taskId: task.id,
      userId: user.id,
      type: ActivityType.TASK_UPDATED,
      message: `${user.name || 'Someone'} added subtask "${subtask.title}" to "${task.title}"`,
    });

    return subtask;
  }

  /**
   * Update a subtask (title / completion).
   */
  async updateSubtask(
    authUser: AuthUser,
    subtaskId: string,
    dto: UpdateSubtaskDto,
  ) {
    const user = await this.ensureUser(authUser);

    const subtask = await this.prisma.subtask.findFirst({
      where: {
        id: subtaskId,
        task: {
          project: {
            workspace: {
              members: {
                some: { userId: user.id },
              },
            },
          },
        },
      },
      include: {
        task: {
          include: {
            project: {
              include: {
                workspace: true,
              },
            },
          },
        },
      },
    });

    if (!subtask) {
      throw new NotFoundException('Subtask not found or access denied');
    }

    const updated = await this.prisma.subtask.update({
      where: { id: subtask.id },
      data: {
        title: dto.title ?? subtask.title,
        isCompleted:
          dto.isCompleted !== undefined
            ? dto.isCompleted
            : subtask.isCompleted,
      },
    });

    await this.logActivity({
      workspaceId: subtask.task.project.workspaceId,
      projectId: subtask.task.projectId,
      taskId: subtask.taskId,
      userId: user.id,
      type: ActivityType.TASK_UPDATED,
      message: `${user.name || 'Someone'} updated a subtask on "${subtask.task.title}"`,
    });

    return updated;
  }

  /**
   * Delete a subtask.
   */
  async removeSubtask(authUser: AuthUser, subtaskId: string) {
    const user = await this.ensureUser(authUser);

    const subtask = await this.prisma.subtask.findFirst({
      where: {
        id: subtaskId,
        task: {
          project: {
            workspace: {
              members: {
                some: { userId: user.id },
              },
            },
          },
        },
      },
      include: {
        task: {
          include: {
            project: {
              include: {
                workspace: true,
              },
            },
          },
        },
      },
    });

    if (!subtask) {
      throw new NotFoundException('Subtask not found or access denied');
    }

    const taskTitle = subtask.task.title;

    await this.prisma.subtask.delete({
      where: { id: subtask.id },
    });

    await this.logActivity({
      workspaceId: subtask.task.project.workspaceId,
      projectId: subtask.task.projectId,
      taskId: subtask.taskId,
      userId: user.id,
      type: ActivityType.TASK_UPDATED,
      message: `${user.name || 'Someone'} deleted subtask "${subtask.title}" from "${taskTitle}"`,
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