import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from '../workspaces/dto/create-project.dto';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getProjects(
    @CurrentUser() user: AuthUser,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) {
      return { projects: [] };
    }

    const internalUser = await this.prisma.user.findUnique({
      where: { auth0Id: user.auth0Id },
    });

    if (!internalUser) {
      return { projects: [] };
    }

    const projects = await this.projectsService.listForWorkspace(
      internalUser.id,
      workspaceId,
    );

    return { projects };
  }

  @Post()
  async createProject(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProjectDto,
  ) {
    const internalUser = await this.prisma.user.findUnique({
      where: { auth0Id: user.auth0Id },
    });

    if (!internalUser) {
      throw new Error('User not found in local database');
    }

    const project = await this.projectsService.createForWorkspace(
      internalUser.id,
      dto,
    );

    return { project };
  }
}