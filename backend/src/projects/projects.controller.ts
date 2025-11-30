import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.interface';
import { WorkspacesService } from '../workspaces/workspaces.service';

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
  async listProjects(
    @CurrentUser() user: AuthUser,
    @Query('workspaceId') workspaceId: string,
  ) {
    const userId = await this.getOrCreateUserId(user);
    const projects = await this.projectsService.listByWorkspace(workspaceId, userId);

    return { projects };
  }

  @Post()
  async createProject(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProjectDto,
  ) {
    const userId = await this.getOrCreateUserId(user);
    const project = await this.projectsService.createForWorkspace(dto, userId);

    return { project };
  }

  @Get(':id')
  async getProject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const userId = await this.getOrCreateUserId(user);
    const project = await this.projectsService.findOne(id, userId);

    return { project };
  }

  @Patch(':id')
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
  async archiveProject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const userId = await this.getOrCreateUserId(user);
    const project = await this.projectsService.remove(id, userId);

    return { project };
  }
}
