import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.interface';
import { WorkspaceRole } from '@prisma/client';
import { WorkspaceRoleGuard } from '../workspaces/workspace-role.guard';
import { WorkspaceRoles } from '../workspaces/workspace-role.decorator';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    const task = await this.tasksService.create(user, dto);
    return { task };
  }

  @Get('project/:projectId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.VIEWER,
  )
  async findByProject(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    const tasks = await this.tasksService.findByProject(user, projectId);
    return { tasks };
  }

  @Patch(':id')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const task = await this.tasksService.update(user, id, dto);
    return { task };
  }

  @Delete(':id')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.tasksService.remove(user, id);
    return { success: true };
  }

  // ---------- Subtasks ----------

  @Post(':taskId/subtasks')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  async createSubtask(
    @CurrentUser() user: AuthUser,
    @Param('taskId') taskId: string,
    @Body() dto: CreateSubtaskDto,
  ) {
    const subtask = await this.tasksService.createSubtask(user, taskId, dto);
    return { subtask };
  }

  @Patch('subtasks/:subtaskId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  async updateSubtask(
    @CurrentUser() user: AuthUser,
    @Param('subtaskId') subtaskId: string,
    @Body() dto: UpdateSubtaskDto,
  ) {
    const subtask = await this.tasksService.updateSubtask(
      user,
      subtaskId,
      dto,
    );
    return { subtask };
  }

  @Delete('subtasks/:subtaskId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER
  )
  async removeSubtask(
    @CurrentUser() user: AuthUser,
    @Param('subtaskId') subtaskId: string,
  ) {
    await this.tasksService.removeSubtask(user, subtaskId);
    return { success: true };
  }
}
