import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt.guard';
import { CurrentUser } from './auth/current-user.decorator';
import { Permissions } from './auth/permissions.decorator';
import { PermissionsGuard } from './auth/permissions.guard';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth/me')
  me(@CurrentUser() user: any) {
    return { ok: true, user };
  }

  // RBAC-protected route
  // @UseGuards(JwtAuthGuard, PermissionsGuard)
  // @Permissions('read:projects')
  // @Get('projects')
  // listProjects() {
  //   return [{ id: 1, name: 'Sample' }];
  // }
}
