import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, IsInt, Min, ValidateIf } from 'class-validator';
import { TaskPriority, TaskStatus, TaskType } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, IsInt, Min } from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimateMinutes?: number;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @ValidateIf((o) => o.parentTaskId !== null)
  @IsUUID()
  parentTaskId?: string | null;
}