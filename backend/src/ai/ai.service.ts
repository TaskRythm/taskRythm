import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private readonly logger = new Logger(AiService.name);

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  // Helper to clean up Markdown (```json ... ```)
  private cleanJson(text: string): any {
    try {
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (error) {
      this.logger.error('Failed to parse JSON', text);
      throw new InternalServerErrorException('AI returned invalid data format');
    }
  }

  // Feature 1: Generate Project Plan
  async generateProjectPlan(userPrompt: string) {
    this.logger.log(`Generating plan for: ${userPrompt}`);
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `
        You are an expert Project Manager. 
        Analyze: "${userPrompt}". Break it down into 5-8 concrete tasks.
        Output ONLY raw JSON.
        JSON Schema: { "tasks": [{ "title": "String", "description": "String", "status": "TODO", "priority": "MEDIUM" }] }
      `;
      const result = await model.generateContent(prompt);
      return this.cleanJson(result.response.text());
    } catch (error) {
      this.logger.error('Generate Plan Error', error);
      throw new InternalServerErrorException('AI Service Failed');
    }
  }

  //  FEATURE 2: TASK REFINER (The New Part) 
  async refineTask(taskTitle: string) {
    this.logger.log(`Refining task: ${taskTitle}`);

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        You are a Senior Technical Lead.
        Refine this vague task title: "${taskTitle}".
        
        Requirements:
        1. Rename it to be professional and actionable.
        2. Write a clear description (max 2 sentences).
        3. Create 3 concrete subtasks (checklist).
        4. Assign a Priority (LOW, MEDIUM, HIGH, CRITICAL).
        5. Suggest 2 Tags (e.g., Bug, Feature, DevOps).

        Output ONLY raw JSON.
        
        JSON Schema:
        { 
          "suggestedTitle": "String", 
          "description": "String", 
          "subtasks": ["String", "String", "String"],
          "priority": "String",
          "tags": ["String", "String"]
        }
      `;

      const result = await model.generateContent(prompt);
      return this.cleanJson(result.response.text());

    } catch (error) {
      this.logger.error('Refine Task Error', error);
      throw new InternalServerErrorException('Failed to refine task');
    }
  }
}