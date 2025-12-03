import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { JwtStrategy } from './auth/jwt.strategy';
import { PermissionsGuard } from './auth/permissions.guard';
import { JwtAuthGuard } from './auth/jwt.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { ActivityModule } from './activity/activity.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AiModule,
    PrismaModule,
    WorkspacesModule,
    ProjectsModule,
    TasksModule,
    ActivityModule,
  ],
  controllers: [AppController],
  providers: [
    JwtStrategy,
    PermissionsGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}