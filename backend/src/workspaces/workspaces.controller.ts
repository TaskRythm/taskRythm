import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { WorkspaceRoles } from './workspace-role.decorator';
import { WorkspaceRoleGuard } from './workspace-role.guard';
import { WorkspaceRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth-user.interface';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  async getMyWorkspaces(@CurrentUser() userPayload: AuthUser) {
    const auth0Id = userPayload.auth0Id || (userPayload as any).sub;
    const email = userPayload.email;
    const name = userPayload.name;
    const picture = userPayload.picture;

    const user = await this.workspacesService.ensureUser(
      auth0Id,
      email,
      name,
      picture,
    );
    const memberships = await this.workspacesService.findAllForUser(user.id);

    return memberships.map((m) => ({
      workspaceId: m.workspaceId,
      role: m.role,
      workspace: m.workspace,
    }));
  }

  @Post()
  async createWorkspace(
    @CurrentUser() userPayload: AuthUser,
    @Body() dto: CreateWorkspaceDto,
  ) {
    const auth0Id = userPayload.auth0Id || (userPayload as any).sub;
    const email = userPayload.email;
    const name = userPayload.name;
    const picture = userPayload.picture;

    const user = await this.workspacesService.ensureUser(
      auth0Id,
      email,
      name,
      picture,
    );
    const workspace = await this.workspacesService.createForUser(user.id, dto);

    return { workspace };
  }

  @Patch(':workspaceId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async updateWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.updateWorkspace(workspaceId, dto);
  }

  @Delete(':workspaceId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  async deleteWorkspace(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() userPayload: AuthUser,
  ) {
    const auth0Id = userPayload.auth0Id || (userPayload as any).sub;
    const email = userPayload.email;
    const name = userPayload.name;
    const picture = userPayload.picture;

    const user = await this.workspacesService.ensureUser(
      auth0Id,
      email,
      name,
      picture,
    );

    await this.workspacesService.deleteWorkspaceForUser(
      workspaceId,
      user.id,
    );
    return { success: true };
  }

  @Get(':workspaceId/members')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.VIEWER,
  )
  async getMembers(@Param('workspaceId') workspaceId: string) {
    return this.workspacesService.getMembers(workspaceId);
  }

  @Patch(':workspaceId/members/:memberId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  async updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.workspacesService.updateMemberRole(
      workspaceId,
      memberId,
      dto.role,
    );
  }

  @Delete(':workspaceId/members/:memberId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
  ) {
    await this.workspacesService.removeMember(workspaceId, memberId);
    return { success: true };
  }

  /**
   * Create workspace invite (OWNER / ADMIN)
   * Used by the UI "Invite" button.
   */
  @Post(':workspaceId/invites')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async createInvite(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.workspacesService.createInvite(
      workspaceId,
      dto.email,
      (dto as any).role ?? WorkspaceRole.MEMBER,
    );
  }

  /**
   * List active (pending) invites for a workspace (OWNER / ADMIN)
   */
  @Get(':workspaceId/invites')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async listInvites(@Param('workspaceId') workspaceId: string) {
    return this.workspacesService.listInvites(workspaceId);
  }

  /**
   * Accept invite by token.
   * Global JWT auth guard should protect this,
   * but we don't use WorkspaceRoleGuard: user is not member yet.
   */
  @Post('invites/:token/accept')
  async acceptInvite(
    @Param('token') token: string,
    @CurrentUser() userPayload: AuthUser,
  ) {
    return this.workspacesService.acceptInvite(token, userPayload);
  }
}