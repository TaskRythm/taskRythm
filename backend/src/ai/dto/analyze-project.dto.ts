import { IsArray, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TaskSummaryDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  status: string; // e.g., "TODO", "IN_PROGRESS", "DONE"

  @IsString()
  priority: string; // e.g., "HIGH", "LOW"
}

export class AnalyzeProjectDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskSummaryDto)
  tasks: TaskSummaryDto[];
}