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

  // Feature 3: Project Health Doctor
  async analyzeProjectHealth(tasks: any[]) {
    this.logger.log(`Analyzing project health for ${tasks.length} tasks`);

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Sanitize Data (Privacy & Token Efficiency)
      // We convert the array to a simple string to save tokens
      const projectSnapshot = tasks.map(t => 
        `- [${t.status}] [${t.priority}] ${t.title}`
      ).join('\n');

      // The "Project Doctor" Prompt
      const prompt = `
        You are a Senior Agile Project Manager and Risk Analyst.
        Analyze this project snapshot (Kanban Board):
        
        ${projectSnapshot}

        Perform a health check based on these rules:
        - Too many "HIGH" priority tasks in "TODO" is a risk.
        - Too many "IN_PROGRESS" tasks at once suggests a bottleneck.
        - Analyze TASK TITLES to identify technical debt or critical infrastructure risks.
        - If mostly "DONE", the health is good.

        Output ONLY raw JSON.
        
        JSON Schema:
        { 
          "score": number, // 0 to 100 (100 is perfect health)
          "status": "String", // "Healthy", "At Risk", or "Critical"
          "analysis": "String", // 1-2 sentences summarizing the situation
          "recommendation": "String" // A specific action to fix the biggest problem
        }
      `;

      const result = await model.generateContent(prompt);
      return this.cleanJson(result.response.text());

    } catch (error) {
      this.logger.error('Analyze Project Error', error);
      throw new InternalServerErrorException('Failed to analyze project');
    }
  }

  // Feature 4: My Writing Partner (Release Notes Generator)
  async writeReleaseNotes(tasks: any[]) {
    this.logger.log(`Generating release notes for ${tasks.length} tasks`);

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Convert tasks to a text list
      const taskList = tasks.map(t => `- ${t.title} (${t.tag || 'General'})`).join('\n');

      // The "Technical Writer" Prompt
      const prompt = `
        You are a Senior Technical Writer.
        Draft a professional "Sprint Release Report" based on these completed tasks:
        
        ${taskList}

        Requirements:
        1. Categorize the tasks smartly (e.g., "✨New Features", "🐛 Bug Fixes", "🔧 Improvements").
        2. Write a short, exciting "Executive Summary" (2 sentences).
        3. Use Markdown formatting for the main content.
        
        Output ONLY raw JSON.
        
        JSON Schema:
        { 
          "versionTitle": "String", // e.g. "Sprint 4: The Security Update"
          "executiveSummary": "String",
          "markdownContent": "String" // The full formatted report
        }
      `;

      const result = await model.generateContent(prompt);
      return this.cleanJson(result.response.text());

    } catch (error) {
      this.logger.error('Writing Partner Error', error);
      throw new InternalServerErrorException('Failed to generate report');
    }
  }
}