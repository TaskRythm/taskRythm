import { Body, Controller, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AiService } from './ai.service';
import { GeneratePlanDto, RefineTaskDto } from './dto/generate-plan.dto';
import { AnalyzeProjectDto } from './dto/analyze-project.dto'; 
import { WriteReportDto } from './dto/write-report.dto'; 
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/jwt.guard'; 

@Controller('ai')
@UseGuards(JwtAuthGuard) // SECURITY IS ON
export class AiController {
  constructor(private readonly aiService: AiService) {}

  //  Feature 3: Generate Plan Endpoint
  @Post('generate-plan')
  @UsePipes(new ValidationPipe())
  async generatePlan(@Body() dto: GeneratePlanDto) {
    return this.aiService.generateProjectPlan(dto.prompt);
  }

  //  Feature 2: Refine-Task Endpoint
  @Post('refine-task')
  @UsePipes(new ValidationPipe())
  async refineTask(@Body() dto: RefineTaskDto) {
    return this.aiService.refineTask(dto.taskTitle);
  }

  //  Feature 3: Project Doctor Endpoint
  @Post('analyze-project')
  @UsePipes(new ValidationPipe())
  async analyzeProject(@Body() dto: AnalyzeProjectDto) {
    return this.aiService.analyzeProjectHealth(dto.tasks);
  }

  //  Feature 4: My Writing Partner
  @Post('write-report')
  @UsePipes(new ValidationPipe())
  async writeReport(@Body() dto: WriteReportDto) {
    return this.aiService.writeReleaseNotes(dto.tasks);
  }

  // Feature 5: The Project Brain
  @Post('chat')
  @UsePipes(new ValidationPipe())
  async chatWithProject(@Body() dto: ChatDto) {
    return this.aiService.chatWithProject(dto.question, dto.tasks);
  }
}