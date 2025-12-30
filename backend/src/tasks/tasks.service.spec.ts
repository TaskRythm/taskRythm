import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TaskStatus, TaskPriority, TaskType } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

describe('TasksService', () => {
  let service: TasksService;
  let prismaService: PrismaService;
  let workspacesService: WorkspacesService;

  const mockUserId = 'user-123';
  const mockAuth0Id = 'auth0|123';
  const mockProjectId = 'project-123';
  const mockWorkspaceId = 'workspace-123';
  const mockTaskId = 'task-123';
  const mockSubtaskId = 'subtask-123';

  const mockUser = {
    auth0Id: mockAuth0Id,
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/pic.jpg',
  };

  const mockDbUser = {
    id: mockUserId,
    auth0Id: mockAuth0Id,
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/pic.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProject = {
    id: mockProjectId,
    name: 'Test Project',
    workspaceId: mockWorkspaceId,
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    workspace: {
      id: mockWorkspaceId,
      name: 'Test Workspace',
      ownerId: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockTask = {
    id: mockTaskId,
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    type: TaskType.TASK,
    projectId: mockProjectId,
    createdById: mockUserId,
    assignedToId: null,
    parentTaskId: null,
    orderIndex: 0,
    estimateMinutes: null,
    dueDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    subtasks: [],
  };

  const mockSubtask = {
    id: mockSubtaskId,
    taskId: mockTaskId,
    title: 'Test Subtask',
    isCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    workspaceMember: {
      findFirst: jest.fn(),
    },
    task: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    subtask: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockWorkspacesService = {
    ensureUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WorkspacesService,
          useValue: mockWorkspacesService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prismaService = module.get<PrismaService>(PrismaService);
    workspacesService = module.get<WorkspacesService>(WorkspacesService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByProject', () => {
    it('should return tasks for a valid project', async () => {
      mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.task.findMany.mockResolvedValue([mockTask]);

      const result = await service.findByProject(mockUser as any, mockProjectId);

      expect(result).toEqual([mockTask]);
      expect(mockWorkspacesService.ensureUser).toHaveBeenCalledWith(
        mockAuth0Id,
        mockUser.email,
        mockUser.name,
        mockUser.picture,
      );
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: mockProjectId },
        include: { workspace: true },
      });
      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith({
        where: { projectId: mockProjectId },
        orderBy: { createdAt: 'asc' },
        include: { subtasks: true },
      });
    });

    it('should throw NotFoundException for non-existent project', async () => {
      mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(
        service.findByProject(mockUser as any, 'invalid-project-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not workspace member', async () => {
      const differentOwnerId = 'different-owner-id';
      const projectWithDifferentOwner = {
        ...mockProject,
        workspace: {
          ...mockProject.workspace,
          ownerId: differentOwnerId,
        },
      };

      mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
      mockPrismaService.project.findUnique.mockResolvedValue(projectWithDifferentOwner);
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue(null);

      await expect(
        service.findByProject(mockUser as any, mockProjectId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    const createDto: CreateTaskDto = {
      projectId: mockProjectId,
      title: 'New Task',
      description: 'New task description',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      type: TaskType.FEATURE,
    };

    it('should create a task successfully', async () => {
      mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.task.findFirst.mockResolvedValue(null);
      mockPrismaService.task.create.mockResolvedValue({
        ...mockTask,
        ...createDto,
      });

      const result = await service.create(mockUser as any, createDto);

      expect(result.title).toBe(createDto.title);
      expect(result.description).toBe(createDto.description);
      expect(result.status).toBe(createDto.status);
      expect(result.priority).toBe(createDto.priority);
      expect(mockPrismaService.task.create).toHaveBeenCalled();
    });

    it('should create task with default values when not provided', async () => {
      const minimalDto: CreateTaskDto = {
        projectId: mockProjectId,
        title: 'Minimal Task',
      };

      mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.task.findFirst.mockResolvedValue(null);
      mockPrismaService.task.create.mockResolvedValue({
        ...mockTask,
        title: minimalDto.title,
      });

      const result = await service.create(mockUser as any, minimalDto);

      expect(result.title).toBe(minimalDto.title);
      expect(mockPrismaService.task.create).toHaveBeenCalled();
    });

    it('should handle orderIndex correctly', async () => {
      const lastTask = { orderIndex: 5 };
      mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.task.findFirst.mockResolvedValue(lastTask);
      mockPrismaService.task.create.mockResolvedValue({
        ...mockTask,
        orderIndex: 6,
      });

      const result = await service.create(mockUser as any, { ...createDto });

      expect(result.orderIndex).toBe(6);
    });

    it('should create task with parent task', async () => {
      const dtoWithParent: CreateTaskDto = {
        ...createDto,
        parentTaskId: 'parent-task-id',
      };

      mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.task.findFirst.mockResolvedValue(null);
      mockPrismaService.task.create.mockResolvedValue({
        ...mockTask,
        parentTaskId: dtoWithParent.parentTaskId,
      });

      const result = await service.create(mockUser as any, dtoWithParent);

      expect(result.parentTaskId).toBe(dtoWithParent.parentTaskId);
    });
  });

  describe('update', () => {
    const updateDto: UpdateTaskDto = {
      title: 'Updated Task',
      status: TaskStatus.IN_PROGRESS,
    };

    it('should update a task successfully', async () => {
      mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.task.update.mockResolvedValue({
        ...mockTask,
        ...updateDto,
      });

      const result = await service.update(mockUser as any, mockTaskId, updateDto);

      expect(result.title).toBe(updateDto.title);
      expect(result.status).toBe(updateDto.status);
      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: mockTaskId },
        data: expect.objectContaining({
          title: updateDto.title,
          status: updateDto.status,
        }),
        include: { subtasks: true },
      });
    });

    it('should throw NotFoundException for non-existent task', async () => {
      mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockUser as any, 'invalid-task-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle assignment updates', async () => {
      const assignDto: UpdateTaskDto = {
        assignedToId: 'new-assignee-id',
      };

      mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.task.update.mockResolvedValue({
        ...mockTask,
        assignedToId: assignDto.assignedToId,
      });

      const result = await service.update(mockUser as any, mockTaskId, assignDto);

      expect(result.assignedToId).toBe(assignDto.assignedToId);
    });

    it('should handle unassignment (setting assignedToId to null)', async () => {
      const unassignDto: UpdateTaskDto = {
        assignedToId: null,
      };

      mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.task.update.mockResolvedValue({
        ...mockTask,
        assignedToId: null,
      });

      const result = await service.update(mockUser as any, mockTaskId, unassignDto);

      expect(result.assignedToId).toBeNull();
    });
  });

  describe('remove', () => {
    it('should delete a task and its subtasks', async () => {
      mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.subtask.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaService.task.delete.mockResolvedValue(mockTask);

      await service.remove(mockUser as any, mockTaskId);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.subtask.deleteMany).toHaveBeenCalledWith({
        where: { taskId: mockTaskId },
      });
      expect(mockPrismaService.task.delete).toHaveBeenCalledWith({
        where: { id: mockTaskId },
      });
    });

    it('should throw NotFoundException for non-existent task', async () => {
      mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(
        service.remove(mockUser as any, 'invalid-task-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Subtask Operations', () => {
    describe('createSubtask', () => {
      it('should create a subtask successfully', async () => {
        const subtaskDto = { title: 'New Subtask' };

        mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
        mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
        mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
        mockPrismaService.subtask.create.mockResolvedValue(mockSubtask);

        const result = await service.createSubtask(mockUser as any, mockTaskId, subtaskDto);

        expect(result).toEqual(mockSubtask);
        expect(mockPrismaService.subtask.create).toHaveBeenCalledWith({
          data: { taskId: mockTaskId, title: subtaskDto.title, isCompleted: false },
        });
      });

      it('should throw NotFoundException for non-existent task', async () => {
        mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
        mockPrismaService.task.findUnique.mockResolvedValue(null);

        await expect(
          service.createSubtask(mockUser as any, 'invalid-task-id', { title: 'Test' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateSubtask', () => {
      it('should update subtask title', async () => {
        const updateDto = { title: 'Updated Subtask' };

        mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
        mockPrismaService.subtask.findUnique.mockResolvedValue(mockSubtask);
        mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
        mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
        mockPrismaService.subtask.update.mockResolvedValue({
          ...mockSubtask,
          ...updateDto,
        });

        const result = await service.updateSubtask(mockUser as any, mockSubtaskId, updateDto);

        expect(result.title).toBe(updateDto.title);
        expect(mockPrismaService.subtask.update).toHaveBeenCalled();
      });

      it('should update subtask completion status', async () => {
        const updateDto = { isCompleted: true };

        mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
        mockPrismaService.subtask.findUnique.mockResolvedValue(mockSubtask);
        mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
        mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
        mockPrismaService.subtask.update.mockResolvedValue({
          ...mockSubtask,
          isCompleted: true,
        });

        const result = await service.updateSubtask(mockUser as any, mockSubtaskId, updateDto);

        expect(result.isCompleted).toBe(true);
      });

      it('should throw NotFoundException for non-existent subtask', async () => {
        mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
        mockPrismaService.subtask.findUnique.mockResolvedValue(null);

        await expect(
          service.updateSubtask(mockUser as any, 'invalid-subtask-id', { title: 'Test' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('removeSubtask', () => {
      it('should delete a subtask', async () => {
        mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
        mockPrismaService.subtask.findUnique.mockResolvedValue(mockSubtask);
        mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
        mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
        mockPrismaService.subtask.delete.mockResolvedValue(mockSubtask);

        await service.removeSubtask(mockUser as any, mockSubtaskId);

        expect(mockPrismaService.subtask.delete).toHaveBeenCalledWith({
          where: { id: mockSubtaskId },
        });
      });

      it('should throw NotFoundException for non-existent subtask', async () => {
        mockWorkspacesService.ensureUser.mockResolvedValue(mockDbUser);
        mockPrismaService.subtask.findUnique.mockResolvedValue(null);

        await expect(
          service.removeSubtask(mockUser as any, 'invalid-subtask-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });
});
