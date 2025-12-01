import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
// import { JwtAuthGuard } from '../auth/jwt.guard'; // 👈 Commented out

@Controller('ai')
// @UseGuards(JwtAuthGuard) // 👈 Commented out (This is the most important one)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-plan')
  async generatePlan(@Body() body: any) { // Changed to 'any' to avoid DTO errors for now
    return this.aiService.generateProjectPlan(body.prompt);
  }
}