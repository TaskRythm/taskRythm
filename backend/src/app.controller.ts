import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt.guard';
import { CurrentUser } from './auth/current-user.decorator';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get('health')
  health() {
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth/me')
  me(@CurrentUser() user: any) {
    return { ok: true, user };
  }
}