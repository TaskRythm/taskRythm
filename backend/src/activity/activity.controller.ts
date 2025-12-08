// backend/src/activity/activity.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.interface';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('workspace/:workspaceId')
  async getWorkspaceActivity(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    const activity = await this.activityService.listForWorkspace(
      user,
      workspaceId,
    );
    return { activity };
  }

  @Get('project/:projectId')
  async getProjectActivity(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    const activity = await this.activityService.listForProject(user, projectId);
    return { activity };
  }
}
