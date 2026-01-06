import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskStatus, TaskPriority, TaskType } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import type { AuthUser } from '../auth/auth-user.interface';
import { WorkspaceRoleGuard } from '../workspaces/workspace-role.guard';
import { ExecutionContext } from '@nestjs/common';

// Mock guard that always allows access
class MockWorkspaceRoleGuard {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;

  const mockUser: AuthUser = {
    auth0Id: 'auth0|123',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/pic.jpg',
    permissions: [],
  };

  const mockProjectId = 'project-123';
  const mockTaskId = 'task-123';
  const mockSubtaskId = 'subtask-123';

  const mockTask = {
    id: mockTaskId,
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    type: TaskType.TASK,
    projectId: mockProjectId,
    createdById: 'user-123',
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

  const mockTasksService = {
    create: jest.fn(),
    findByProject: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createSubtask: jest.fn(),
    updateSubtask: jest.fn(),
    removeSubtask: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    })
      .overrideGuard(WorkspaceRoleGuard)
      .useClass(MockWorkspaceRoleGuard)
      .compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a task and return it wrapped in an object', async () => {
      const createDto: CreateTaskDto = {
        projectId: mockProjectId,
        title: 'New Task',
        description: 'New task description',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        type: TaskType.FEATURE,
      };

      mockTasksService.create.mockResolvedValue(mockTask);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual({ task: mockTask });
      expect(mockTasksService.create).toHaveBeenCalledWith(mockUser, createDto);
      expect(mockTasksService.create).toHaveBeenCalledTimes(1);
    });

    it('should handle task creation with minimal data', async () => {
      const minimalDto: CreateTaskDto = {
        projectId: mockProjectId,
        title: 'Minimal Task',
      };

      mockTasksService.create.mockResolvedValue(mockTask);

      const result = await controller.create(mockUser, minimalDto);

      expect(result).toEqual({ task: mockTask });
      expect(mockTasksService.create).toHaveBeenCalledWith(mockUser, minimalDto);
    });

    it('should handle task creation with parent task', async () => {
      const dtoWithParent: CreateTaskDto = {
        projectId: mockProjectId,
        title: 'Subtask',
        parentTaskId: 'parent-task-id',
      };

      const taskWithParent = { ...mockTask, parentTaskId: 'parent-task-id' };
      mockTasksService.create.mockResolvedValue(taskWithParent);

      const result = await controller.create(mockUser, dtoWithParent);

      expect(result).toEqual({ task: taskWithParent });
      expect(mockTasksService.create).toHaveBeenCalledWith(mockUser, dtoWithParent);
    });
  });

  describe('findByProject', () => {
    it('should return all tasks for a project', async () => {
      const mockTasks = [mockTask, { ...mockTask, id: 'task-456', title: 'Another Task' }];
      mockTasksService.findByProject.mockResolvedValue(mockTasks);

      const result = await controller.findByProject(mockUser, mockProjectId);

      expect(result).toEqual({ tasks: mockTasks });
      expect(mockTasksService.findByProject).toHaveBeenCalledWith(mockUser, mockProjectId);
      expect(mockTasksService.findByProject).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when project has no tasks', async () => {
      mockTasksService.findByProject.mockResolvedValue([]);

      const result = await controller.findByProject(mockUser, mockProjectId);

      expect(result).toEqual({ tasks: [] });
      expect(mockTasksService.findByProject).toHaveBeenCalledWith(mockUser, mockProjectId);
    });

    it('should include subtasks in returned tasks', async () => {
      const taskWithSubtasks = {
        ...mockTask,
        subtasks: [mockSubtask],
      };
      mockTasksService.findByProject.mockResolvedValue([taskWithSubtasks]);

      const result = await controller.findByProject(mockUser, mockProjectId);

      expect(result.tasks[0].subtasks).toHaveLength(1);
      expect(result.tasks[0].subtasks[0]).toEqual(mockSubtask);
    });
  });

  describe('update', () => {
    it('should update a task and return it', async () => {
      const updateDto: UpdateTaskDto = {
        title: 'Updated Title',
        status: TaskStatus.IN_PROGRESS,
      };

      const updatedTask = { ...mockTask, ...updateDto };
      mockTasksService.update.mockResolvedValue(updatedTask);

      const result = await controller.update(mockUser, mockTaskId, updateDto);

      expect(result).toEqual({ task: updatedTask });
      expect(mockTasksService.update).toHaveBeenCalledWith(mockUser, mockTaskId, updateDto);
      expect(mockTasksService.update).toHaveBeenCalledTimes(1);
    });

    it('should handle updating task status', async () => {
      const updateDto: UpdateTaskDto = {
        status: TaskStatus.DONE,
      };

      const updatedTask = { ...mockTask, status: TaskStatus.DONE };
      mockTasksService.update.mockResolvedValue(updatedTask);

      const result = await controller.update(mockUser, mockTaskId, updateDto);

      expect(result.task.status).toBe(TaskStatus.DONE);
      expect(mockTasksService.update).toHaveBeenCalledWith(mockUser, mockTaskId, updateDto);
    });

    // priority values limited to LOW/MEDIUM/HIGH in schema; remove URGENT test

    it('should handle multiple field updates', async () => {
      const updateDto: UpdateTaskDto = {
        title: 'Multi-Update',
        description: 'Updated description',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.LOW,
      };

      const updatedTask = { ...mockTask, ...updateDto };
      mockTasksService.update.mockResolvedValue(updatedTask);

      const result = await controller.update(mockUser, mockTaskId, updateDto);

      expect(result.task.title).toBe(updateDto.title);
      expect(result.task.description).toBe(updateDto.description);
      expect(result.task.status).toBe(updateDto.status);
      expect(result.task.priority).toBe(updateDto.priority);
    });

    it('should handle assignment updates', async () => {
      const updateDto: UpdateTaskDto = {
        assigneeIds: ['new-user-id'],
      };

      const updatedTask = { ...mockTask, assignees: [] };
      mockTasksService.update.mockResolvedValue(updatedTask);

      const result = await controller.update(mockUser, mockTaskId, updateDto);

      expect(Array.isArray(result.task.assignees)).toBe(true);
    });
  });

  describe('remove', () => {
    it('should delete a task and return success', async () => {
      mockTasksService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockUser, mockTaskId);

      expect(result).toEqual({ success: true });
      expect(mockTasksService.remove).toHaveBeenCalledWith(mockUser, mockTaskId);
      expect(mockTasksService.remove).toHaveBeenCalledTimes(1);
    });

    it('should call service remove method with correct parameters', async () => {
      mockTasksService.remove.mockResolvedValue(undefined);

      await controller.remove(mockUser, mockTaskId);

      expect(mockTasksService.remove).toHaveBeenCalledWith(mockUser, mockTaskId);
    });
  });

  describe('Subtask Operations', () => {
    describe('createSubtask', () => {
      it('should create a subtask and return it', async () => {
        const createDto: CreateSubtaskDto = {
          title: 'New Subtask',
        };

        mockTasksService.createSubtask.mockResolvedValue(mockSubtask);

        const result = await controller.createSubtask(mockUser, mockTaskId, createDto);

        expect(result).toEqual({ subtask: mockSubtask });
        expect(mockTasksService.createSubtask).toHaveBeenCalledWith(mockUser, mockTaskId, createDto);
        expect(mockTasksService.createSubtask).toHaveBeenCalledTimes(1);
      });

      it('should handle subtask creation with all fields', async () => {
        const createDto: CreateSubtaskDto = {
          title: 'Detailed Subtask',
        };

        const detailedSubtask = {
          ...mockSubtask,
          title: createDto.title,
        };
        mockTasksService.createSubtask.mockResolvedValue(detailedSubtask);

        const result = await controller.createSubtask(mockUser, mockTaskId, createDto);

        expect(result.subtask.title).toBe(createDto.title);
        expect(mockTasksService.createSubtask).toHaveBeenCalledWith(mockUser, mockTaskId, createDto);
      });
    });

    describe('updateSubtask', () => {
      it('should update a subtask and return it', async () => {
        const updateDto: UpdateSubtaskDto = {
          title: 'Updated Subtask',
        };

        const updatedSubtask = { ...mockSubtask, ...updateDto };
        mockTasksService.updateSubtask.mockResolvedValue(updatedSubtask);

        const result = await controller.updateSubtask(mockUser, mockSubtaskId, updateDto);

        expect(result).toEqual({ subtask: updatedSubtask });
        expect(mockTasksService.updateSubtask).toHaveBeenCalledWith(mockUser, mockSubtaskId, updateDto);
        expect(mockTasksService.updateSubtask).toHaveBeenCalledTimes(1);
      });

      it('should handle updating subtask completion status', async () => {
        const updateDto: UpdateSubtaskDto = {
          isCompleted: true,
        };

        const completedSubtask = { ...mockSubtask, isCompleted: true };
        mockTasksService.updateSubtask.mockResolvedValue(completedSubtask);

        const result = await controller.updateSubtask(mockUser, mockSubtaskId, updateDto);

        expect(result.subtask.isCompleted).toBe(true);
        expect(mockTasksService.updateSubtask).toHaveBeenCalledWith(mockUser, mockSubtaskId, updateDto);
      });

      it('should handle updating both title and completion status', async () => {
        const updateDto: UpdateSubtaskDto = {
          title: 'Completed Subtask',
          isCompleted: true,
        };

        const updatedSubtask = { ...mockSubtask, ...updateDto };
        mockTasksService.updateSubtask.mockResolvedValue(updatedSubtask);

        const result = await controller.updateSubtask(mockUser, mockSubtaskId, updateDto);

        expect(result.subtask.title).toBe(updateDto.title);
        expect(result.subtask.isCompleted).toBe(true);
      });
    });

    describe('removeSubtask', () => {
      it('should delete a subtask and return success', async () => {
        mockTasksService.removeSubtask.mockResolvedValue(undefined);

        const result = await controller.removeSubtask(mockUser, mockSubtaskId);

        expect(result).toEqual({ success: true });
        expect(mockTasksService.removeSubtask).toHaveBeenCalledWith(mockUser, mockSubtaskId);
        expect(mockTasksService.removeSubtask).toHaveBeenCalledTimes(1);
      });

      it('should call service removeSubtask method with correct parameters', async () => {
        mockTasksService.removeSubtask.mockResolvedValue(undefined);

        await controller.removeSubtask(mockUser, mockSubtaskId);

        expect(mockTasksService.removeSubtask).toHaveBeenCalledWith(mockUser, mockSubtaskId);
      });
    });
  });
});
