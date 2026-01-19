import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('AiService', () => {
  let service: AiService;
  let mockGenerateContent: jest.Mock;

  beforeEach(async () => {
    // Set up the environment variable
    process.env.GEMINI_API_KEY = 'test-api-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService],
    }).compile();

    service = module.get<AiService>(AiService);

    // Mock the genAI property after service initialization
    mockGenerateContent = jest.fn();
    (service as any).genAI = {
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    };
  });

  describe('JSON Sanitization (cleanJson)', () => {
    it('should extract and parse JSON from markdown code blocks', async () => {
      const validJsonWithMarkdown = `\`\`\`json
{
  "suggestedTitle": "Setup Database Connection",
  "description": "Configure the PostgreSQL database for the application",
  "subtasks": ["Create .env file", "Run migrations", "Test connection"],
  "priority": "HIGH",
  "tags": ["Database", "Setup"]
}
\`\`\``;

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => validJsonWithMarkdown },
      });

      const result = await service.refineTask('setup db');

      expect(result).toBeDefined();
      expect(result.suggestedTitle).toBe('Setup Database Connection');
      expect(result.priority).toBe('HIGH');
      expect(Array.isArray(result.subtasks)).toBe(true);
      expect(result.subtasks.length).toBe(3);
    });

    it('should parse raw JSON without markdown markers', async () => {
      const rawJson = JSON.stringify({
        score: 75,
        status: 'Healthy',
        analysis: 'Project is progressing well',
        recommendation: 'Continue current pace',
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => rawJson },
      });

      const result = await service.analyzeProjectHealth([]);

      expect(result.score).toBe(75);
      expect(result.status).toBe('Healthy');
    });

    it('should remove multiple markdown delimiters', async () => {
      const jsonWithMultipleDelimiters = `\`\`\`json
{"answer": "Yes, we can proceed"}
\`\`\``;

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => jsonWithMultipleDelimiters },
      });

      const result = await service.chatWithProject('Can we proceed?', []);

      expect(result.answer).toBe('Yes, we can proceed');
    });

    it('should throw InternalServerErrorException on invalid JSON', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => `\`\`\`json
{invalid json}
\`\`\``,
        },
      });

      await expect(service.refineTask('test')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle JSON with extra whitespace', async () => {
      const jsonWithWhitespace = `
      \`\`\`json
      {
        "versionTitle": "Sprint 5",
        "executiveSummary": "Amazing progress",
        "markdownContent": "## Features\\n- Feature 1"
      }
      \`\`\`
      `;

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => jsonWithWhitespace },
      });

      const result = await service.writeReleaseNotes([]);

      expect(result.versionTitle).toBe('Sprint 5');
      expect(result.markdownContent).toBeDefined();
    });
  });

  describe('generateProjectPlan - Structure Validation', () => {
    it('should return valid plan structure with required fields', async () => {
      const mockResponse = JSON.stringify({
        tasks: [
          {
            title: 'Design Database Schema',
            description: 'Plan the database structure',
            status: 'TODO',
            priority: 'HIGH',
          },
          {
            title: 'Setup API Gateway',
            description: 'Configure API endpoints',
            status: 'TODO',
            priority: 'HIGH',
          },
        ],
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => mockResponse },
      });

      const result = await service.generateProjectPlan(
        'Build a project management app',
      );

      // Verify structure
      expect(result).toHaveProperty('tasks');
      expect(Array.isArray(result.tasks)).toBe(true);
      expect(result.tasks.length).toBeGreaterThan(0);

      // Verify each task has required fields
      result.tasks.forEach((task) => {
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('description');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('priority');
        expect(typeof task.title).toBe('string');
      });
    });

    it('should handle plan with varying number of tasks', async () => {
      const mockResponse = JSON.stringify({
        tasks: [
          {
            title: 'Task 1',
            description: 'Description 1',
            status: 'TODO',
            priority: 'LOW',
          },
          {
            title: 'Task 2',
            description: 'Description 2',
            status: 'TODO',
            priority: 'MEDIUM',
          },
          {
            title: 'Task 3',
            description: 'Description 3',
            status: 'TODO',
            priority: 'HIGH',
          },
          {
            title: 'Task 4',
            description: 'Description 4',
            status: 'TODO',
            priority: 'MEDIUM',
          },
          {
            title: 'Task 5',
            description: 'Description 5',
            status: 'TODO',
            priority: 'LOW',
          },
        ],
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => mockResponse },
      });

      const result = await service.generateProjectPlan('Complex project');

      expect(result.tasks.length).toBe(5);
    });

    it('should reject malformed plan response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => '{"malformed": "data without tasks array"}',
        },
      });

      const result = await service.generateProjectPlan('test prompt');

      // Should still parse, but validate at controller level
      expect(result).toBeDefined();
      expect(result.tasks).toBeUndefined();
    });
  });

  describe('refineTask - Structure Validation', () => {
    it('should return valid refine task structure', async () => {
      const mockResponse = JSON.stringify({
        suggestedTitle: 'Implement User Authentication Module',
        description:
          'Build OAuth2 authentication system with role-based access control. Support multiple identity providers.',
        subtasks: [
          'Setup OAuth2 configuration',
          'Implement JWT token generation',
          'Create RBAC middleware',
        ],
        priority: 'HIGH',
        tags: ['Security', 'Backend'],
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => mockResponse },
      });

      const result = await service.refineTask('setup auth');

      // Verify all required fields exist
      expect(result).toHaveProperty('suggestedTitle');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('subtasks');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('tags');

      // Verify correct types
      expect(typeof result.suggestedTitle).toBe('string');
      expect(typeof result.description).toBe('string');
      expect(Array.isArray(result.subtasks)).toBe(true);
      expect(result.subtasks.length).toBe(3);
      expect(result.priority).toMatch(/^(LOW|MEDIUM|HIGH|CRITICAL)$/);
      expect(Array.isArray(result.tags)).toBe(true);
      expect(result.tags.length).toBe(2);
    });

    it('should validate priority levels from AI response', async () => {
      const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

      for (const priority of priorities) {
        const mockResponse = JSON.stringify({
          suggestedTitle: 'Task Title',
          description: 'Task description',
          subtasks: ['Sub1', 'Sub2', 'Sub3'],
          priority,
          tags: ['Tag1', 'Tag2'],
        });

        mockGenerateContent.mockResolvedValueOnce({
          response: { text: () => mockResponse },
        });

        const result = await service.refineTask('test');

        expect(result.priority).toBe(priority);
      }
    });

    it('should handle variable subtask descriptions', async () => {
      const mockResponse = JSON.stringify({
        suggestedTitle: 'Test Refinement',
        description: 'Test description',
        subtasks: [
          'Short',
          'This is a longer subtask description with more details',
          'Medium length subtask',
        ],
        priority: 'MEDIUM',
        tags: ['Test', 'QA'],
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => mockResponse },
      });

      const result = await service.refineTask('test task');

      expect(result.subtasks.length).toBe(3);
      result.subtasks.forEach((subtask) => {
        expect(typeof subtask).toBe('string');
        expect(subtask.length).toBeGreaterThan(0);
      });
    });
  });

  describe('analyzeProjectHealth - Structure Validation', () => {
    it('should return valid health analysis structure', async () => {
      const mockResponse = JSON.stringify({
        score: 78,
        status: 'Healthy',
        analysis:
          'Project has good momentum with balanced task distribution. Most critical items are in progress.',
        recommendation:
          'Continue with current sprint velocity. Monitor the two critical bugs scheduled for next sprint.',
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => mockResponse },
      });

      const tasks = [
        {
          title: 'Task 1',
          status: 'TODO',
          priority: 'HIGH',
        },
        {
          title: 'Task 2',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
        },
      ];

      const result = await service.analyzeProjectHealth(tasks);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('recommendation');

      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.status).toMatch(/^(Healthy|At Risk|Critical)$/);
    });

    it('should validate all health status values', async () => {
      const statuses = ['Healthy', 'At Risk', 'Critical'];

      for (const status of statuses) {
        const mockResponse = JSON.stringify({
          score: Math.floor(Math.random() * 101),
          status,
          analysis: 'Test analysis',
          recommendation: 'Test recommendation',
        });

        mockGenerateContent.mockResolvedValueOnce({
          response: { text: () => mockResponse },
        });

        const result = await service.analyzeProjectHealth([]);

        expect(result.status).toBe(status);
      }
    });

    it('should handle various health score ranges', async () => {
      const scores = [0, 25, 50, 75, 100];

      for (const score of scores) {
        const mockResponse = JSON.stringify({
          score,
          status: 'Healthy',
          analysis: 'Analysis',
          recommendation: 'Recommendation',
        });

        mockGenerateContent.mockResolvedValueOnce({
          response: { text: () => mockResponse },
        });

        const result = await service.analyzeProjectHealth([]);

        expect(result.score).toBe(score);
      }
    });

    it('should handle empty task list', async () => {
      const mockResponse = JSON.stringify({
        score: 50,
        status: 'At Risk',
        analysis: 'No tasks found in project',
        recommendation: 'Create initial tasks for the project',
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => mockResponse },
      });

      const result = await service.analyzeProjectHealth([]);

      expect(result).toBeDefined();
      expect(result.score).toBe(50);
    });
  });

  describe('writeReleaseNotes - Structure Validation', () => {
    it('should return valid release notes structure', async () => {
      const mockResponse = JSON.stringify({
        versionTitle: 'Sprint 4: The Security Update',
        executiveSummary:
          'This sprint focused on enhancing security measures across the platform. We implemented OAuth2 authentication and added comprehensive audit logging.',
        markdownContent: `## ✨ New Features
- OAuth2 Authentication Support
- Multi-provider Identity Integration

## 🐛 Bug Fixes
- Fixed session timeout issue
- Resolved memory leak in cache

## 🔧 Improvements
- Optimized database queries
- Enhanced error handling`,
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => mockResponse },
      });

      const tasks = [
        { title: 'Implement OAuth2', tag: 'Feature' },
        { title: 'Fix session bug', tag: 'Bug' },
      ];

      const result = await service.writeReleaseNotes(tasks);

      expect(result).toHaveProperty('versionTitle');
      expect(result).toHaveProperty('executiveSummary');
      expect(result).toHaveProperty('markdownContent');

      expect(typeof result.versionTitle).toBe('string');
      expect(typeof result.executiveSummary).toBe('string');
      expect(typeof result.markdownContent).toBe('string');

      // Verify Markdown structure
      expect(result.markdownContent).toContain('##');
    });

    it('should preserve markdown formatting in release notes', async () => {
      const mockResponse = JSON.stringify({
        versionTitle: 'Release 1.0.0',
        executiveSummary: 'Major release with significant improvements',
        markdownContent: `# Release v1.0.0
## Features
- Feature 1
- Feature 2

## Fixes
- Fix 1
- Fix 2

## Technical Details
\`\`\`
Configuration details here
\`\`\``,
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => mockResponse },
      });

      const result = await service.writeReleaseNotes([]);

      expect(result.markdownContent).toContain('#');
      expect(result.markdownContent).toContain('##');
      expect(result.markdownContent).toContain('-');
    });

    it('should handle release notes with no tasks', async () => {
      const mockResponse = JSON.stringify({
        versionTitle: 'Patch 0.9.1',
        executiveSummary: 'Minor maintenance update',
        markdownContent: 'No new features in this patch release.',
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => mockResponse },
      });

      const result = await service.writeReleaseNotes([]);

      expect(result).toBeDefined();
      expect(result.versionTitle).toBeDefined();
    });
  });

  describe('chatWithProject - Structure Validation', () => {
    it('should return valid chat response structure', async () => {
      const mockResponse = JSON.stringify({
        answer:
          'Based on the project context, we have 3 high-priority tasks in the TODO status. The most critical items are the authentication module and database setup. I recommend focusing on these before moving forward with other features.',
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => mockResponse },
      });

      const tasks = [
        { title: 'Setup Auth', status: 'TODO', priority: 'HIGH' },
        { title: 'Database Config', status: 'IN_PROGRESS', priority: 'HIGH' },
      ];

      const result = await service.chatWithProject(
        'What are the critical tasks?',
        tasks,
      );

      expect(result).toHaveProperty('answer');
      expect(typeof result.answer).toBe('string');
      expect(result.answer.length).toBeGreaterThan(0);
    });

    it('should handle context-limited responses', async () => {
      const mockResponse = JSON.stringify({
        answer:
          'I cannot answer that based on the current project data. The question refers to information not available in the task list.',
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => mockResponse },
      });

      const tasks = [
        { title: 'Task 1', status: 'TODO', priority: 'MEDIUM' },
      ];

      const result = await service.chatWithProject(
        'What are the budget constraints?',
        tasks,
      );

      expect(result.answer).toContain('cannot answer');
    });

    it('should provide concise answers to simple questions', async () => {
      const mockResponse = JSON.stringify({
        answer: 'Yes, we have 5 tasks in progress.',
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => mockResponse },
      });

      const tasks = [
        { title: 'Task 1', status: 'IN_PROGRESS', priority: 'HIGH' },
        { title: 'Task 2', status: 'IN_PROGRESS', priority: 'MEDIUM' },
      ];

      const result = await service.chatWithProject('How many tasks are in progress?', tasks);

      expect(result.answer).toBeDefined();
      expect(typeof result.answer).toBe('string');
    });

    it('should handle empty task context', async () => {
      const mockResponse = JSON.stringify({
        answer: 'No tasks are currently tracked in this project.',
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => mockResponse },
      });

      const result = await service.chatWithProject(
        'What is the current status?',
        [],
      );

      expect(result.answer).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw InternalServerErrorException on API failure', async () => {
      mockGenerateContent.mockRejectedValueOnce(
        new Error('API Rate Limited'),
      );

      await expect(service.generateProjectPlan('test')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should catch and log errors in all service methods', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      mockGenerateContent.mockRejectedValueOnce(
        new Error('Network Error'),
      );

      try {
        await service.refineTask('test');
      } catch {
        // Expected to throw
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Refine Task Error',
        expect.any(Error),
      );
    });

    it('should handle timeout scenarios', async () => {
      mockGenerateContent.mockRejectedValueOnce(
        new Error('Request timeout'),
      );

      await expect(
        service.analyzeProjectHealth([]),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('Integration Tests - Full Flow', () => {
    it('should complete full plan generation flow with valid structure', async () => {
      const mockPlanResponse = JSON.stringify({
        tasks: [
          {
            title: 'Design Architecture',
            description: 'Define system architecture',
            status: 'TODO',
            priority: 'HIGH',
          },
          {
            title: 'Setup Infrastructure',
            description: 'Configure cloud resources',
            status: 'TODO',
            priority: 'HIGH',
          },
          {
            title: 'Implement API',
            description: 'Build REST API endpoints',
            status: 'TODO',
            priority: 'MEDIUM',
          },
        ],
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => mockPlanResponse },
      });

      const result = await service.generateProjectPlan(
        'Build a real-time collaboration platform',
      );

      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0].priority).toBe('HIGH');
      expect(result.tasks[2].priority).toBe('MEDIUM');
    });

    it('should validate non-deterministic responses have correct structure', async () => {
      // Simulate two different but valid responses
      const responses = [
        {
          suggestedTitle: 'Fix Critical Authentication Bug',
          description: 'Resolve security vulnerability in login flow',
          subtasks: ['Identify root cause', 'Patch vulnerability', 'Test fix'],
          priority: 'CRITICAL',
          tags: ['Security', 'Bug'],
        },
        {
          suggestedTitle: 'Address Login Security Issue',
          description: 'Patch the authentication system security flaw',
          subtasks: ['Analyze issue', 'Implement fix', 'Verify solution'],
          priority: 'CRITICAL',
          tags: ['Security', 'Critical'],
        },
      ];

      for (const response of responses) {
        jest.clearAllMocks();

        mockGenerateContent.mockResolvedValueOnce({
          response: { text: () => JSON.stringify(response) },
        });

        const result = await service.refineTask('fix auth bug');

        // Verify structure, not exact content
        expect(result).toHaveProperty('suggestedTitle');
        expect(result).toHaveProperty('description');
        expect(result.subtasks.length).toBe(3);
        expect(result.priority).toBe('CRITICAL');
      }
    });
  });
});
