import { IsArray, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TaskContextDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  status: string;

  @IsString()
  priority: string;
}

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskContextDto)
  tasks: TaskContextDto[];
}