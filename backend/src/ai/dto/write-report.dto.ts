import { IsArray, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CompletedTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  tag: string; 
}

export class WriteReportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompletedTaskDto)
  tasks: CompletedTaskDto[];
}