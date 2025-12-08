import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSubtaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}