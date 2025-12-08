import { Body, Controller, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AiService } from './ai.service';
import { GeneratePlanDto, RefineTaskDto } from './dto/generate-plan.dto';
import { JwtAuthGuard } from '../auth/jwt.guard'; // Ensure this path is correct based on your folder structure

@Controller('ai')
@UseGuards(JwtAuthGuard) // 🔒 SECURITY IS ON
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-plan')
  @UsePipes(new ValidationPipe())
  async generatePlan(@Body() dto: GeneratePlanDto) {
    return this.aiService.generateProjectPlan(dto.prompt);
  }

  @Post('refine-task')
  @UsePipes(new ValidationPipe())
  async refineTask(@Body() dto: RefineTaskDto) {
    return this.aiService.refineTask(dto.taskTitle);
  }
}