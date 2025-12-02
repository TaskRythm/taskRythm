import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';


// this is for the dto for generating a project plan based on a prompt
export class GeneratePlanDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(5, { message: 'Project description must be at least 5 characters' })
    @MaxLength(500, { message: 'Description is too long (max 500 chars)' })
    prompt: string;
}


// this is for refining a task title (like breaking it down into subtasks)
export class RefineTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  taskTitle: string;
}



// why this page, -> 
// This file defines Data Transfer Objects (DTOs) for AI-related operations in the backend. 
// The GeneratePlanDto class ensures that the prompt provided for generating a project plan 
// meets specific validation criteria, such as being a non-empty string with a length between 5 and 500 characters. 
// The RefineTaskDto class validates that the task title is a non-empty string. 
// These DTOs help maintain data integrity and consistency when handling requests related to AI functionalities in the application.