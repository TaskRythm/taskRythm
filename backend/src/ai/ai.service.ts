import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private readonly logger = new Logger(AiService.name);

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  // Helper to clean up Markdown
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
    this.logger.log(`Generating plan with Gemini for: ${userPrompt}`);
    
    try {
      // 👇 FIX: Use the model explicitly listed in your screenshot
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        You are an expert Project Manager. 
        Analyze the user's request: "${userPrompt}".
        Break it down into 5 to 8 concrete tasks.
        
        You MUST output ONLY raw JSON. Do not write any introduction.
        
        JSON Schema:
        {
          "tasks": [
            { 
              "title": "Actionable Title", 
              "description": "Brief description", 
              "status": "TODO", 
              "priority": "MEDIUM" 
            }
          ]
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.cleanJson(text);
      
    } catch (error) {
      this.logger.error('Gemini API Error', error);
      throw new InternalServerErrorException('AI Service Failed');
    }
  }

  // Feature 2: Task Refiner
  async refineTask(taskTitle: string) {
    try {
      // 👇 FIX: Use the same model here
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        Refine this vague task title: "${taskTitle}".
        Output ONLY raw JSON.
        
        JSON Schema:
        { 
          "suggestedTitle": "Professional Title", 
          "description": "Clear description", 
          "subtasks": ["Step 1", "Step 2", "Step 3"] 
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.cleanJson(text);
    } catch (error) {
      this.logger.error('Refine Task Error', error);
      throw new InternalServerErrorException('Failed to refine task');
    }
  }
}