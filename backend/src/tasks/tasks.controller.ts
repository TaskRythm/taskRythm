import {Body,Controller,Get,Param,Patch,Post,Delete,} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.interface';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    const task = await this.tasksService.create(user, dto);
    return { task };
  }

  @Get('project/:projectId')
  async findByProject(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    const tasks = await this.tasksService.findByProject(user, projectId);
    return { tasks };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const task = await this.tasksService.update(user, id, dto);
    return { task };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tasksService.remove(user, id);
  }
}
