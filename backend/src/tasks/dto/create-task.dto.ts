import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, IsInt, Min, IsNotEmpty } from 'class-validator';
import { TaskPriority, TaskStatus, TaskType  } from '@prisma/client';

export class CreateTaskDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, IsInt, Min } from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class CreateTaskDto {
  @IsUUID()
  projectId: string;

  @IsString()
  title: string;

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
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
  @IsDateString()
  dueDate?: string; // ISO string

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
  @IsUUID()
  parentTaskId?: string;
}