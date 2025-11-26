import { Body, Controller, Get, Post } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.interface';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  async getMyWorkspaces(@CurrentUser() userPayload: AuthUser) {
    // `JwtStrategy.validate` returns a typed AuthUser
    const auth0Id = userPayload.auth0Id || (userPayload as any).sub;
    const email = userPayload.email;
    const name = userPayload.name;
    const picture = userPayload.picture;

    const user = await this.workspacesService.ensureUser(auth0Id, email, name, picture);

    const memberships = await this.workspacesService.findAllForUser(user.id);

    // Shape response nicely for frontend
    return memberships.map((m) => ({
      workspaceId: m.workspaceId,
      role: m.role,
      workspace: m.workspace,
    }));
  }

  @Post()
  async createWorkspace(@CurrentUser() userPayload: AuthUser, @Body() dto: CreateWorkspaceDto) {
    const auth0Id = userPayload.auth0Id || (userPayload as any).sub;
    const email = userPayload.email;
    const name = userPayload.name;
    const picture = userPayload.picture;

    const user = await this.workspacesService.ensureUser(auth0Id, email, name, picture);

    const workspace = await this.workspacesService.createForUser(user.id, dto);

    return { workspace };
  }
}