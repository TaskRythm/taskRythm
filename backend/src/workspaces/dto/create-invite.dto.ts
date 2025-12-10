import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { WorkspaceRole } from '@prisma/client';

export class CreateInviteDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(WorkspaceRole)
  role?: WorkspaceRole;
}