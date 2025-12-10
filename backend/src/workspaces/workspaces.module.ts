import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacePermissionService } from './workspace-permission.service';
import { WorkspaceRoleGuard } from './workspace-role.guard';

@Module({
  imports: [PrismaModule],
  providers: [
    WorkspacesService,
    WorkspacePermissionService,
    WorkspaceRoleGuard,
  ],
  controllers: [WorkspacesController],
  exports: [WorkspacesService, WorkspacePermissionService, WorkspaceRoleGuard],
})
export class WorkspacesModule {}
