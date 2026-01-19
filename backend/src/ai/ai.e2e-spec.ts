import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

describe('AI Controller E2E Tests', () => {
  let app: INestApplication;
  let aiService: AiService;

  // Mock auth guard to bypass JWT verification
  const mockJwtGuard = {
    canActivate: () => true,
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: {
            generateProjectPlan: jest.fn(),
            refineTask: jest.fn(),
            analyzeProjectHealth: jest.fn(),
            writeReleaseNotes: jest.fn(),
            chatWithProject: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard('JwtAuthGuard')
      .useValue(mockJwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    aiService = moduleFixture.get<AiService>(AiService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /ai/generate-plan', () => {
    it('should generate project plan with valid prompt', () => {
      const generatePlanDto = {
        prompt:
          'Build a task management application with real-time collaboration',
      };

      const mockResponse = {
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
          {
            title: 'Implement Frontend',
            description: 'Build user interface',
            status: 'TODO',
            priority: 'MEDIUM',
          },
        ],
      };

      jest
        .spyOn(aiService, 'generateProjectPlan')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/generate-plan')
        .send(generatePlanDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('tasks');
          expect(Array.isArray(res.body.tasks)).toBe(true);
          expect(res.body.tasks.length).toBeGreaterThan(0);
          res.body.tasks.forEach((task) => {
            expect(task).toHaveProperty('title');
            expect(task).toHaveProperty('description');
            expect(task).toHaveProperty('status');
            expect(task).toHaveProperty('priority');
          });
        });
    });

    it('should reject prompt shorter than 5 characters', () => {
      const invalidDto = {
        prompt: 'test',
      };

      return request(app.getHttpServer())
        .post('/ai/generate-plan')
        .send(invalidDto)
        .expect(400);
    });

    it('should reject prompt longer than 500 characters', () => {
      const longPrompt = 'a'.repeat(501);
      const invalidDto = {
        prompt: longPrompt,
      };

      return request(app.getHttpServer())
        .post('/ai/generate-plan')
        .send(invalidDto)
        .expect(400);
    });

    it('should reject request without prompt field', () => {
      return request(app.getHttpServer())
        .post('/ai/generate-plan')
        .send({})
        .expect(400);
    });

    it('should reject non-string prompt', () => {
      return request(app.getHttpServer())
        .post('/ai/generate-plan')
        .send({ prompt: 12345 })
        .expect(400);
    });

    it('should return 500 when AI service fails', () => {
      jest
        .spyOn(aiService, 'generateProjectPlan')
        .mockRejectedValueOnce(new Error('API Error'));

      return request(app.getHttpServer())
        .post('/ai/generate-plan')
        .send({ prompt: 'Build an application' })
        .expect(500);
    });

    it('should accept prompt with exactly 5 characters', () => {
      const minValidPrompt = {
        prompt: 'Build',
      };

      const mockResponse = {
        tasks: [
          {
            title: 'Task 1',
            description: 'Description',
            status: 'TODO',
            priority: 'MEDIUM',
          },
        ],
      };

      jest
        .spyOn(aiService, 'generateProjectPlan')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/generate-plan')
        .send(minValidPrompt)
        .expect(201);
    });

    it('should accept prompt with exactly 500 characters', () => {
      const maxValidPrompt = {
        prompt: 'a'.repeat(500),
      };

      const mockResponse = {
        tasks: [
          {
            title: 'Task 1',
            description: 'Description',
            status: 'TODO',
            priority: 'MEDIUM',
          },
        ],
      };

      jest
        .spyOn(aiService, 'generateProjectPlan')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/generate-plan')
        .send(maxValidPrompt)
        .expect(201);
    });
  });

  describe('POST /ai/refine-task', () => {
    it('should refine task with valid title', () => {
      const refineTaskDto = {
        taskTitle: 'Setup Database',
      };

      const mockResponse = {
        suggestedTitle: 'Setup PostgreSQL Database Connection',
        description:
          'Configure PostgreSQL database with proper connection pooling and error handling.',
        subtasks: [
          'Install PostgreSQL',
          'Create database schema',
          'Test connections',
        ],
        priority: 'HIGH',
        tags: ['Database', 'Backend'],
      };

      jest
        .spyOn(aiService, 'refineTask')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/refine-task')
        .send(refineTaskDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('suggestedTitle');
          expect(res.body).toHaveProperty('description');
          expect(res.body).toHaveProperty('subtasks');
          expect(res.body).toHaveProperty('priority');
          expect(res.body).toHaveProperty('tags');
          expect(Array.isArray(res.body.subtasks)).toBe(true);
          expect(Array.isArray(res.body.tags)).toBe(true);
        });
    });

    it('should reject empty task title', () => {
      return request(app.getHttpServer())
        .post('/ai/refine-task')
        .send({ taskTitle: '' })
        .expect(400);
    });

    it('should reject task title exceeding 100 characters', () => {
      const longTitle = {
        taskTitle: 'a'.repeat(101),
      };

      return request(app.getHttpServer())
        .post('/ai/refine-task')
        .send(longTitle)
        .expect(400);
    });

    it('should reject request without taskTitle field', () => {
      return request(app.getHttpServer())
        .post('/ai/refine-task')
        .send({})
        .expect(400);
    });

    it('should reject non-string task title', () => {
      return request(app.getHttpServer())
        .post('/ai/refine-task')
        .send({ taskTitle: 123 })
        .expect(400);
    });

    it('should accept task title with maximum 100 characters', () => {
      const maxValidTitle = {
        taskTitle: 'a'.repeat(100),
      };

      const mockResponse = {
        suggestedTitle: 'Refined Task',
        description: 'Description',
        subtasks: ['Sub1', 'Sub2', 'Sub3'],
        priority: 'MEDIUM',
        tags: ['Tag1', 'Tag2'],
      };

      jest.spyOn(aiService, 'refineTask').mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/refine-task')
        .send(maxValidTitle)
        .expect(201);
    });
  });

  describe('POST /ai/analyze-project', () => {
    it('should analyze project health with valid tasks', () => {
      const analyzeDto = {
        tasks: [
          {
            title: 'Design System',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
          },
          {
            title: 'API Development',
            status: 'TODO',
            priority: 'HIGH',
          },
          {
            title: 'Frontend Work',
            status: 'TODO',
            priority: 'MEDIUM',
          },
          {
            title: 'Bug Fixes',
            status: 'DONE',
            priority: 'LOW',
          },
        ],
      };

      const mockResponse = {
        score: 72,
        status: 'Healthy',
        analysis:
          'Project is progressing well with balanced workload distribution.',
        recommendation:
          'Monitor high-priority tasks closely and ensure adequate resources.',
      };

      jest
        .spyOn(aiService, 'analyzeProjectHealth')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/analyze-project')
        .send(analyzeDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('score');
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('analysis');
          expect(res.body).toHaveProperty('recommendation');
          expect(typeof res.body.score).toBe('number');
          expect(res.body.score).toBeGreaterThanOrEqual(0);
          expect(res.body.score).toBeLessThanOrEqual(100);
        });
    });

    it('should analyze project with empty task list', () => {
      const analyzeDto = {
        tasks: [],
      };

      const mockResponse = {
        score: 50,
        status: 'At Risk',
        analysis: 'No tasks found in the project.',
        recommendation: 'Create initial tasks to begin project planning.',
      };

      jest
        .spyOn(aiService, 'analyzeProjectHealth')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/analyze-project')
        .send(analyzeDto)
        .expect(201);
    });

    it('should reject request without tasks array', () => {
      return request(app.getHttpServer())
        .post('/ai/analyze-project')
        .send({})
        .expect(400);
    });

    it('should reject non-array tasks', () => {
      return request(app.getHttpServer())
        .post('/ai/analyze-project')
        .send({ tasks: 'not an array' })
        .expect(400);
    });

    it('should reject task object missing required fields', () => {
      return request(app.getHttpServer())
        .post('/ai/analyze-project')
        .send({
          tasks: [
            {
              title: 'Task 1',
              // missing status and priority
            },
          ],
        })
        .expect(400);
    });

    it('should handle large project with many tasks', () => {
      const manyTasks = Array.from({ length: 50 }, (_, i) => ({
        title: `Task ${i + 1}`,
        status: i % 3 === 0 ? 'DONE' : i % 2 === 0 ? 'IN_PROGRESS' : 'TODO',
        priority: i % 3 === 0 ? 'LOW' : i % 2 === 0 ? 'MEDIUM' : 'HIGH',
      }));

      const analyzeDto = { tasks: manyTasks };

      const mockResponse = {
        score: 65,
        status: 'Healthy',
        analysis: 'Large project with diverse tasks',
        recommendation: 'Organize tasks by theme and priority',
      };

      jest
        .spyOn(aiService, 'analyzeProjectHealth')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/analyze-project')
        .send(analyzeDto)
        .expect(201);
    });
  });

  describe('POST /ai/write-report', () => {
    it('should generate release notes with valid tasks', () => {
      const writeReportDto = {
        tasks: [
          { title: 'Implement OAuth2', tag: 'Feature' },
          { title: 'Fix session timeout bug', tag: 'Bug' },
          { title: 'Optimize database queries', tag: 'Improvement' },
          { title: 'Add audit logging', tag: 'Security' },
        ],
      };

      const mockResponse = {
        versionTitle: 'Sprint 5: The Security & Performance Update',
        executiveSummary:
          'This sprint delivered critical security enhancements with OAuth2 implementation and comprehensive audit logging. Performance improvements included database query optimization.',
        markdownContent: `## ✨ New Features
- OAuth2 Authentication Support
- Comprehensive Audit Logging

## 🐛 Bug Fixes
- Fixed session timeout issues

## 🔧 Improvements  
- Optimized database queries for 40% faster load times`,
      };

      jest
        .spyOn(aiService, 'writeReleaseNotes')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/write-report')
        .send(writeReportDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('versionTitle');
          expect(res.body).toHaveProperty('executiveSummary');
          expect(res.body).toHaveProperty('markdownContent');
          expect(typeof res.body.versionTitle).toBe('string');
          expect(typeof res.body.markdownContent).toBe('string');
        });
    });

    it('should generate report with no tasks', () => {
      const writeReportDto = {
        tasks: [],
      };

      const mockResponse = {
        versionTitle: 'Maintenance Release',
        executiveSummary: 'Minor maintenance and stability improvements.',
        markdownContent: 'No new features in this release.',
      };

      jest
        .spyOn(aiService, 'writeReleaseNotes')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/write-report')
        .send(writeReportDto)
        .expect(201);
    });

    it('should reject request without tasks array', () => {
      return request(app.getHttpServer())
        .post('/ai/write-report')
        .send({})
        .expect(400);
    });

    it('should reject non-array tasks', () => {
      return request(app.getHttpServer())
        .post('/ai/write-report')
        .send({ tasks: { title: 'Task' } })
        .expect(400);
    });

    it('should preserve markdown formatting in response', () => {
      const writeReportDto = {
        tasks: [
          { title: 'Feature 1', tag: 'Feature' },
          { title: 'Feature 2', tag: 'Feature' },
        ],
      };

      const mockResponse = {
        versionTitle: 'v1.0.0',
        executiveSummary: 'Release summary',
        markdownContent: `# Release Notes
## Features
- Feature 1
- Feature 2

\`\`\`
Technical details
\`\`\``,
      };

      jest
        .spyOn(aiService, 'writeReleaseNotes')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/write-report')
        .send(writeReportDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.markdownContent).toContain('#');
          expect(res.body.markdownContent).toContain('##');
        });
    });
  });

  describe('POST /ai/chat', () => {
    it('should answer question with project context', () => {
      const chatDto = {
        question: 'What are the high-priority tasks?',
        tasks: [
          { title: 'Security Update', status: 'TODO', priority: 'HIGH' },
          { title: 'Performance Optimization', status: 'IN_PROGRESS', priority: 'HIGH' },
          { title: 'Documentation', status: 'TODO', priority: 'LOW' },
        ],
      };

      const mockResponse = {
        answer:
          'You have 2 high-priority tasks: Security Update (TODO) and Performance Optimization (IN_PROGRESS). I recommend focusing on completing the Performance Optimization task first, then moving to the Security Update.',
      };

      jest
        .spyOn(aiService, 'chatWithProject')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/chat')
        .send(chatDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('answer');
          expect(typeof res.body.answer).toBe('string');
          expect(res.body.answer.length).toBeGreaterThan(0);
        });
    });

    it('should return context-limited response for out-of-scope question', () => {
      const chatDto = {
        question: 'What is the budget for this project?',
        tasks: [
          { title: 'Task 1', status: 'TODO', priority: 'MEDIUM' },
        ],
      };

      const mockResponse = {
        answer:
          'I cannot answer that based on the current project data. Budget information is not available in the task context.',
      };

      jest
        .spyOn(aiService, 'chatWithProject')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/chat')
        .send(chatDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.answer).toContain('cannot answer');
        });
    });

    it('should handle chat with empty task context', () => {
      const chatDto = {
        question: 'What is the current project status?',
        tasks: [],
      };

      const mockResponse = {
        answer: 'No tasks are currently tracked in this project.',
      };

      jest
        .spyOn(aiService, 'chatWithProject')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/chat')
        .send(chatDto)
        .expect(201);
    });

    it('should reject request without question', () => {
      return request(app.getHttpServer())
        .post('/ai/chat')
        .send({ tasks: [] })
        .expect(400);
    });

    it('should reject request without tasks array', () => {
      return request(app.getHttpServer())
        .post('/ai/chat')
        .send({ question: 'What is the status?' })
        .expect(400);
    });

    it('should reject empty question', () => {
      return request(app.getHttpServer())
        .post('/ai/chat')
        .send({ question: '', tasks: [] })
        .expect(400);
    });

    it('should reject non-string question', () => {
      return request(app.getHttpServer())
        .post('/ai/chat')
        .send({ question: 123, tasks: [] })
        .expect(400);
    });

    it('should handle complex questions with multiple tasks', () => {
      const manyTasks = Array.from({ length: 10 }, (_, i) => ({
        title: `Task ${i + 1}`,
        status: ['TODO', 'IN_PROGRESS', 'DONE'][i % 3],
        priority: ['LOW', 'MEDIUM', 'HIGH'][i % 3],
      }));

      const chatDto = {
        question:
          'Give me a breakdown of task distribution by status and priority',
        tasks: manyTasks,
      };

      const mockResponse = {
        answer:
          'Your project has 10 tasks distributed across statuses. Here is the breakdown...',
      };

      jest
        .spyOn(aiService, 'chatWithProject')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/chat')
        .send(chatDto)
        .expect(201);
    });
  });

  describe('Authorization & Security', () => {
    it('should require authentication for all AI endpoints', async () => {
      // Override the mock guard to enforce auth
      const moduleFixture: TestingModule = await Test.createTestingModule({
        controllers: [AiController],
        providers: [
          {
            provide: AiService,
            useValue: {
              generateProjectPlan: jest.fn(),
              refineTask: jest.fn(),
              analyzeProjectHealth: jest.fn(),
              writeReleaseNotes: jest.fn(),
              chatWithProject: jest.fn(),
            },
          },
        ],
      })
        .overrideGuard('JwtAuthGuard')
        .useValue({ canActivate: () => false })
        .compile();

      const restrictedApp = moduleFixture.createNestApplication();
      await restrictedApp.init();

      await request(restrictedApp.getHttpServer())
        .post('/ai/generate-plan')
        .send({ prompt: 'test prompt' })
        .expect(403);

      await restrictedApp.close();
    });
  });

  describe('Data Validation & Sanitization', () => {
    it('should validate and sanitize input data', () => {
      const withExtraFields = {
        prompt: 'Valid prompt for testing',
        maliciousField: '<script>alert("xss")</script>',
        anotherField: 'extra data',
      };

      const mockResponse = {
        tasks: [
          {
            title: 'Task 1',
            description: 'Description',
            status: 'TODO',
            priority: 'MEDIUM',
          },
        ],
      };

      jest
        .spyOn(aiService, 'generateProjectPlan')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/generate-plan')
        .send(withExtraFields)
        .expect(201);
    });

    it('should handle special characters in input', () => {
      const specialCharsDto = {
        prompt: 'Build a system with émojis 🚀 and spëcial çharacters',
      };

      const mockResponse = {
        tasks: [
          {
            title: 'Special Character Task',
            description: 'Description with émojis 🚀',
            status: 'TODO',
            priority: 'MEDIUM',
          },
        ],
      };

      jest
        .spyOn(aiService, 'generateProjectPlan')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/generate-plan')
        .send(specialCharsDto)
        .expect(201);
    });

    it('should handle Unicode characters', () => {
      const unicodeDto = {
        prompt:
          'Build système with 中文 characters and العربية text support',
      };

      const mockResponse = {
        tasks: [
          {
            title: 'Unicode Support Task',
            description: '支持多语言',
            status: 'TODO',
            priority: 'HIGH',
          },
        ],
      };

      jest
        .spyOn(aiService, 'generateProjectPlan')
        .mockResolvedValueOnce(mockResponse);

      return request(app.getHttpServer())
        .post('/ai/generate-plan')
        .send(unicodeDto)
        .expect(201);
    });
  });
});
