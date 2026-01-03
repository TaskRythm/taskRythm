import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceRole } from '@prisma/client';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    workspace: {
      findUnique: jest.fn(),
    },
    workspaceMember: {
      findFirst: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    activityLog: {
      deleteMany: jest.fn(),
    },
    subtask: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listByWorkspace', () => {
    const workspaceId = 'workspace-1';
    const userId = 'user-1';

    it('should list projects for workspace owner', async () => {
      const mockProjects = [
        { id: 'proj-1', name: 'Project 1', workspaceId, archived: false },
        { id: 'proj-2', name: 'Project 2', workspaceId, archived: false },
      ];

      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: userId,
      });
      mockPrismaService.project.findMany.mockResolvedValue(mockProjects);

      const result = await service.listByWorkspace(workspaceId, userId);

      expect(result).toEqual(mockProjects);
      expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
        where: { id: workspaceId },
        select: { ownerId: true },
      });
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: { workspaceId, archived: false },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should list projects for workspace member', async () => {
      const mockProjects = [{ id: 'proj-1', name: 'Project 1', workspaceId, archived: false }];

      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: 'different-user',
      });
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue({
        role: WorkspaceRole.MEMBER,
      });
      mockPrismaService.project.findMany.mockResolvedValue(mockProjects);

      const result = await service.listByWorkspace(workspaceId, userId);

      expect(result).toEqual(mockProjects);
      expect(prisma.workspaceMember.findFirst).toHaveBeenCalledWith({
        where: { workspaceId, userId },
        select: { role: true },
      });
    });

    it('should throw NotFoundException for non-existent workspace', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);

      await expect(service.listByWorkspace(workspaceId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.listByWorkspace(workspaceId, userId)).rejects.toThrow(
        'Workspace not found',
      );
    });

    it('should throw ForbiddenException for non-member', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: 'different-user',
      });
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue(null);

      await expect(service.listByWorkspace(workspaceId, userId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.listByWorkspace(workspaceId, userId)).rejects.toThrow(
        'You are not a member of this workspace',
      );
    });
  });

  describe('createForWorkspace', () => {
    const userId = 'user-1';
    const workspaceId = 'workspace-1';
    const createDto = {
      workspaceId,
      name: 'New Project',
      description: 'Test project',
    };

    it('should create project for workspace owner', async () => {
      const mockProject = {
        id: 'proj-1',
        ...createDto,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: userId,
      });
      mockPrismaService.project.create.mockResolvedValue(mockProject);

      const result = await service.createForWorkspace(createDto, userId);

      expect(result).toEqual(mockProject);
      expect(prisma.project.create).toHaveBeenCalledWith({
        data: {
          workspaceId,
          name: createDto.name,
          description: createDto.description,
          archived: false,
        },
      });
    });

    it('should create project for workspace member', async () => {
      const mockProject = {
        id: 'proj-1',
        ...createDto,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: 'different-user',
      });
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue({
        role: WorkspaceRole.MEMBER,
      });
      mockPrismaService.project.create.mockResolvedValue(mockProject);

      const result = await service.createForWorkspace(createDto, userId);

      expect(result).toEqual(mockProject);
    });

    it('should create project with archived flag', async () => {
      const createDtoWithArchived = { ...createDto, archived: true };
      const mockProject = {
        id: 'proj-1',
        ...createDtoWithArchived,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: userId,
      });
      mockPrismaService.project.create.mockResolvedValue(mockProject);

      await service.createForWorkspace(createDtoWithArchived, userId);

      expect(prisma.project.create).toHaveBeenCalledWith({
        data: {
          workspaceId,
          name: createDto.name,
          description: createDto.description,
          archived: true,
        },
      });
    });

    it('should throw ForbiddenException for non-member', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: 'different-user',
      });
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue(null);

      await expect(service.createForWorkspace(createDto, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findOne', () => {
    const projectId = 'proj-1';
    const workspaceId = 'workspace-1';
    const userId = 'user-1';

    it('should find project for workspace member', async () => {
      const mockProject = {
        id: projectId,
        name: 'Test Project',
        workspaceId,
        archived: false,
      };

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: userId,
      });

      const result = await service.findOne(projectId, userId);

      expect(result).toEqual(mockProject);
      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
      });
    });

    it('should throw NotFoundException for non-existent project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne(projectId, userId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(projectId, userId)).rejects.toThrow('Project not found');
    });

    it('should throw ForbiddenException for non-member', async () => {
      const mockProject = {
        id: projectId,
        name: 'Test Project',
        workspaceId,
        archived: false,
      };

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: 'different-user',
      });
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue(null);

      await expect(service.findOne(projectId, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const projectId = 'proj-1';
    const workspaceId = 'workspace-1';
    const userId = 'user-1';
    const existingProject = {
      id: projectId,
      name: 'Old Name',
      description: 'Old Description',
      workspaceId,
      archived: false,
    };

    it('should update project name and description', async () => {
      const updateDto = {
        name: 'New Name',
        description: 'New Description',
      };

      const updatedProject = { ...existingProject, ...updateDto };

      mockPrismaService.project.findUnique.mockResolvedValue(existingProject);
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: userId,
      });
      mockPrismaService.project.update.mockResolvedValue(updatedProject);

      const result = await service.update(projectId, updateDto, userId);

      expect(result).toEqual(updatedProject);
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: {
          name: updateDto.name,
          description: updateDto.description,
          archived: existingProject.archived,
        },
      });
    });

    it('should update only provided fields', async () => {
      const updateDto = { name: 'New Name Only' };

      mockPrismaService.project.findUnique.mockResolvedValue(existingProject);
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: userId,
      });
      mockPrismaService.project.update.mockResolvedValue({
        ...existingProject,
        name: updateDto.name,
      });

      await service.update(projectId, updateDto, userId);

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: {
          name: updateDto.name,
          description: existingProject.description,
          archived: existingProject.archived,
        },
      });
    });

    it('should update archived status', async () => {
      const updateDto = { archived: true };

      mockPrismaService.project.findUnique.mockResolvedValue(existingProject);
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: userId,
      });
      mockPrismaService.project.update.mockResolvedValue({
        ...existingProject,
        archived: true,
      });

      await service.update(projectId, updateDto, userId);

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: {
          name: existingProject.name,
          description: existingProject.description,
          archived: true,
        },
      });
    });

    it('should throw NotFoundException for non-existent project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.update(projectId, {}, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-member', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(existingProject);
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: 'different-user',
      });
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue(null);

      await expect(service.update(projectId, {}, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('archive', () => {
    const projectId = 'proj-1';
    const workspaceId = 'workspace-1';
    const userId = 'user-1';
    const existingProject = {
      id: projectId,
      name: 'Test Project',
      workspaceId,
      archived: false,
    };

    it('should archive project', async () => {
      const archivedProject = { ...existingProject, archived: true };

      mockPrismaService.project.findUnique.mockResolvedValue(existingProject);
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: userId,
      });
      mockPrismaService.project.update.mockResolvedValue(archivedProject);

      const result = await service.archive(projectId, userId);

      expect(result).toEqual(archivedProject);
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { archived: true },
      });
    });

    it('should throw NotFoundException for non-existent project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.archive(projectId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-member', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(existingProject);
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: 'different-user',
      });
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue(null);

      await expect(service.archive(projectId, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteProjectForUser', () => {
    const projectId = 'proj-1';
    const workspaceId = 'workspace-1';
    const userId = 'user-1';

    it('should delete project with tasks for workspace owner', async () => {
      const mockProject = { id: projectId, workspaceId };
      const mockTasks = [{ id: 'task-1' }, { id: 'task-2' }];

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: userId,
      });
      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}, {}]);

      await service.deleteProjectForUser(projectId, userId);

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { projectId },
        select: { id: true },
      });
      expect(prisma.$transaction).toHaveBeenCalled();

      const transactionCalls = mockPrismaService.$transaction.mock.calls[0][0];
      expect(transactionCalls).toHaveLength(4); // activityLog, subtask, task, project
    });

    it('should delete project without tasks', async () => {
      const mockProject = { id: projectId, workspaceId };

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: userId,
      });
      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}]);

      await service.deleteProjectForUser(projectId, userId);

      const transactionCalls = mockPrismaService.$transaction.mock.calls[0][0];
      expect(transactionCalls).toHaveLength(3); // activityLog, task, project (no subtask)
    });

    it('should allow admin to delete project', async () => {
      const mockProject = { id: projectId, workspaceId };

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: 'different-user',
      });
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue({
        role: WorkspaceRole.ADMIN,
      });
      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}]);

      await service.deleteProjectForUser(projectId, userId);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.deleteProjectForUser(projectId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for member (not owner/admin)', async () => {
      const mockProject = { id: projectId, workspaceId };

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: 'different-user',
      });
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue({
        role: WorkspaceRole.MEMBER,
      });

      await expect(service.deleteProjectForUser(projectId, userId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.deleteProjectForUser(projectId, userId)).rejects.toThrow(
        'Insufficient permissions for this workspace',
      );
    });

    it('should throw ForbiddenException for viewer', async () => {
      const mockProject = { id: projectId, workspaceId };

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: 'different-user',
      });
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue({
        role: WorkspaceRole.VIEWER,
      });

      await expect(service.deleteProjectForUser(projectId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for non-member', async () => {
      const mockProject = { id: projectId, workspaceId };

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
        ownerId: 'different-user',
      });
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue(null);

      await expect(service.deleteProjectForUser(projectId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
