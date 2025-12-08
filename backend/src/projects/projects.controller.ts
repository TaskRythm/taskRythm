import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.interface';
import { WorkspacesService } from '../workspaces/workspaces.service';

import { WorkspaceRole } from '@prisma/client';
import { WorkspaceRoleGuard } from '../workspaces/workspace-role.guard';
import { WorkspaceRoles } from '../workspaces/workspace-role.decorator';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  /**
   * Helper: ensure we have a local User row for this Auth0 user,
   * and return the internal user.id used by Prisma relations.
   */
  private async getOrCreateUserId(userPayload: AuthUser) {
    const auth0Id = userPayload.auth0Id || (userPayload as any).sub;
    const email = userPayload.email;
    const name = userPayload.name;
    const picture = userPayload.picture;

    const user = await this.workspacesService.ensureUser(auth0Id, email, name, picture);
    return user.id;
  }

  @Get()
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.VIEWER,
  )
  async listProjects(
    @CurrentUser() user: AuthUser,
    @Query('workspaceId') workspaceId: string,
  ) {
    const userId = await this.getOrCreateUserId(user);
    const projects = await this.projectsService.listByWorkspace(workspaceId, userId);

    return { projects };
  }

  @Post()
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  async createProject(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProjectDto,
  ) {
    const userId = await this.getOrCreateUserId(user);
    const project = await this.projectsService.createForWorkspace(dto, userId);

    return { project };
  }

  @Get(':id')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.VIEWER,
  )
  async getProject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const userId = await this.getOrCreateUserId(user);
    const project = await this.projectsService.findOne(id, userId);

    return { project };
  }

  @Patch(':id')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  async updateProject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const userId = await this.getOrCreateUserId(user);
    const project = await this.projectsService.update(id, dto, userId);

    return { project };
  }

  // Soft delete
  @Patch(':id/archive')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async archiveProject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const userId = await this.getOrCreateUserId(user);
    const project = await this.projectsService.remove(id, userId);

    return { project };
  }

  // Permanent delete (with RBAC check)
  @Delete(':id')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async deleteProject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const userId = await this.getOrCreateUserId(user);
    await this.projectsService.deleteProjectForUser(id, userId);

    return { success: true };
  }
}
