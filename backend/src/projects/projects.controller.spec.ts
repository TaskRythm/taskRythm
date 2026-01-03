import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AuthUser } from '../auth/auth-user.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { WorkspaceRoleGuard } from '../workspaces/workspace-role.guard';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let projectsService: ProjectsService;
  let workspacesService: WorkspacesService;

  const mockUser: AuthUser = {
    auth0Id: 'auth0|123456',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
    permissions: [],
  };

  const mockInternalUser = {
    id: 'user-internal-1',
    auth0Id: 'auth0|123456',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
  };

  const mockProjectsService = {
    listByWorkspace: jest.fn(),
    createForWorkspace: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    deleteProjectForUser: jest.fn(),
  };

  const mockWorkspacesService = {
    ensureUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
        {
          provide: WorkspacesService,
          useValue: mockWorkspacesService,
        },
      ],
    })
      .overrideGuard(WorkspaceRoleGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ProjectsController>(ProjectsController);
    projectsService = module.get<ProjectsService>(ProjectsService);
    workspacesService = module.get<WorkspacesService>(WorkspacesService);

    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup default behavior for ensureUser
    mockWorkspacesService.ensureUser.mockResolvedValue(mockInternalUser);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listProjects', () => {
    it('should list projects for a workspace', async () => {
      const workspaceId = 'workspace-1';
      const mockProjects = [
        { id: 'proj-1', name: 'Project 1', workspaceId, archived: false },
        { id: 'proj-2', name: 'Project 2', workspaceId, archived: false },
      ];

      mockProjectsService.listByWorkspace.mockResolvedValue(mockProjects);

      const result = await controller.listProjects(mockUser, workspaceId);

      expect(result).toEqual({ projects: mockProjects });
      expect(workspacesService.ensureUser).toHaveBeenCalledWith(
        mockUser.auth0Id,
        mockUser.email,
        mockUser.name,
        mockUser.picture,
      );
      expect(projectsService.listByWorkspace).toHaveBeenCalledWith(
        workspaceId,
        mockInternalUser.id,
      );
    });

    it('should handle Auth0 user with sub instead of auth0Id', async () => {
      const userWithSub = {
        sub: 'auth0|789',
        auth0Id: 'auth0|789',
        email: 'other@example.com',
        name: 'Other User',
        permissions: [],
      } as AuthUser;
      const workspaceId = 'workspace-1';

      mockWorkspacesService.ensureUser.mockResolvedValue({
        id: 'user-internal-2',
        auth0Id: 'auth0|789',
        email: 'other@example.com',
      });
      mockProjectsService.listByWorkspace.mockResolvedValue([]);

      await controller.listProjects(userWithSub, workspaceId);

      expect(workspacesService.ensureUser).toHaveBeenCalledWith(
        'auth0|789',
        'other@example.com',
        'Other User',
        undefined,
      );
    });

    it('should return empty array when no projects exist', async () => {
      const workspaceId = 'workspace-1';
      mockProjectsService.listByWorkspace.mockResolvedValue([]);

      const result = await controller.listProjects(mockUser, workspaceId);

      expect(result).toEqual({ projects: [] });
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const createDto: CreateProjectDto = {
        workspaceId: 'workspace-1',
        name: 'New Project',
        description: 'Test Description',
      };

      const mockProject = {
        id: 'proj-1',
        ...createDto,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProjectsService.createForWorkspace.mockResolvedValue(mockProject);

      const result = await controller.createProject(mockUser, createDto);

      expect(result).toEqual({ project: mockProject });
      expect(workspacesService.ensureUser).toHaveBeenCalledWith(
        mockUser.auth0Id,
        mockUser.email,
        mockUser.name,
        mockUser.picture,
      );
      expect(projectsService.createForWorkspace).toHaveBeenCalledWith(
        createDto,
        mockInternalUser.id,
      );
    });

    it('should create project without description', async () => {
      const createDto: CreateProjectDto = {
        workspaceId: 'workspace-1',
        name: 'New Project',
      };

      const mockProject = {
        id: 'proj-1',
        workspaceId: createDto.workspaceId,
        name: createDto.name,
        description: null,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProjectsService.createForWorkspace.mockResolvedValue(mockProject);

      const result = await controller.createProject(mockUser, createDto);

      expect(result).toEqual({ project: mockProject });
      expect(projectsService.createForWorkspace).toHaveBeenCalledWith(
        createDto,
        mockInternalUser.id,
      );
    });
  });

  describe('getProject', () => {
    it('should get a specific project', async () => {
      const projectId = 'proj-1';
      const mockProject = {
        id: projectId,
        name: 'Test Project',
        workspaceId: 'workspace-1',
        description: 'Test Description',
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProjectsService.findOne.mockResolvedValue(mockProject);

      const result = await controller.getProject(mockUser, projectId);

      expect(result).toEqual({ project: mockProject });
      expect(workspacesService.ensureUser).toHaveBeenCalledWith(
        mockUser.auth0Id,
        mockUser.email,
        mockUser.name,
        mockUser.picture,
      );
      expect(projectsService.findOne).toHaveBeenCalledWith(
        projectId,
        mockInternalUser.id,
      );
    });
  });

  describe('updateProject', () => {
    it('should update a project with name and description', async () => {
      const projectId = 'proj-1';
      const updateDto: UpdateProjectDto = {
        name: 'Updated Name',
        description: 'Updated Description',
      };

      const mockProject = {
        id: projectId,
        workspaceId: 'workspace-1',
        ...updateDto,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProjectsService.update.mockResolvedValue(mockProject);

      const result = await controller.updateProject(mockUser, projectId, updateDto);

      expect(result).toEqual({ project: mockProject });
      expect(workspacesService.ensureUser).toHaveBeenCalledWith(
        mockUser.auth0Id,
        mockUser.email,
        mockUser.name,
        mockUser.picture,
      );
      expect(projectsService.update).toHaveBeenCalledWith(
        projectId,
        updateDto,
        mockInternalUser.id,
      );
    });

    it('should update only the name', async () => {
      const projectId = 'proj-1';
      const updateDto: UpdateProjectDto = {
        name: 'Updated Name Only',
      };

      const mockProject = {
        id: projectId,
        workspaceId: 'workspace-1',
        name: updateDto.name,
        description: 'Original Description',
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProjectsService.update.mockResolvedValue(mockProject);

      const result = await controller.updateProject(mockUser, projectId, updateDto);

      expect(result).toEqual({ project: mockProject });
      expect(projectsService.update).toHaveBeenCalledWith(
        projectId,
        updateDto,
        mockInternalUser.id,
      );
    });

    it('should update archived status', async () => {
      const projectId = 'proj-1';
      const updateDto: UpdateProjectDto = {
        archived: true,
      };

      const mockProject = {
        id: projectId,
        workspaceId: 'workspace-1',
        name: 'Project Name',
        description: 'Description',
        archived: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProjectsService.update.mockResolvedValue(mockProject);

      const result = await controller.updateProject(mockUser, projectId, updateDto);

      expect(result).toEqual({ project: mockProject });
    });
  });

  describe('archiveProject', () => {
    it('should archive a project', async () => {
      const projectId = 'proj-1';
      const mockProject = {
        id: projectId,
        workspaceId: 'workspace-1',
        name: 'Project Name',
        description: 'Description',
        archived: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProjectsService.archive.mockResolvedValue(mockProject);

      const result = await controller.archiveProject(mockUser, projectId);

      expect(result).toEqual({ project: mockProject });
      expect(workspacesService.ensureUser).toHaveBeenCalledWith(
        mockUser.auth0Id,
        mockUser.email,
        mockUser.name,
        mockUser.picture,
      );
      expect(projectsService.archive).toHaveBeenCalledWith(
        projectId,
        mockInternalUser.id,
      );
    });

    it('should handle archiving an already archived project', async () => {
      const projectId = 'proj-1';
      const mockProject = {
        id: projectId,
        workspaceId: 'workspace-1',
        name: 'Project Name',
        description: 'Description',
        archived: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProjectsService.archive.mockResolvedValue(mockProject);

      const result = await controller.archiveProject(mockUser, projectId);

      expect(result).toEqual({ project: mockProject });
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      const projectId = 'proj-1';

      mockProjectsService.deleteProjectForUser.mockResolvedValue(undefined);

      const result = await controller.deleteProject(mockUser, projectId);

      expect(result).toEqual({ success: true });
      expect(workspacesService.ensureUser).toHaveBeenCalledWith(
        mockUser.auth0Id,
        mockUser.email,
        mockUser.name,
        mockUser.picture,
      );
      expect(projectsService.deleteProjectForUser).toHaveBeenCalledWith(
        projectId,
        mockInternalUser.id,
      );
    });

    it('should return success even if service returns void', async () => {
      const projectId = 'proj-1';

      mockProjectsService.deleteProjectForUser.mockResolvedValue(void 0);

      const result = await controller.deleteProject(mockUser, projectId);

      expect(result).toEqual({ success: true });
      expect(projectsService.deleteProjectForUser).toHaveBeenCalled();
    });
  });

  describe('getOrCreateUserId (integration)', () => {
    it('should call ensureUser with correct parameters', async () => {
      const workspaceId = 'workspace-1';
      mockProjectsService.listByWorkspace.mockResolvedValue([]);

      await controller.listProjects(mockUser, workspaceId);

      expect(workspacesService.ensureUser).toHaveBeenCalledTimes(1);
      expect(workspacesService.ensureUser).toHaveBeenCalledWith(
        mockUser.auth0Id,
        mockUser.email,
        mockUser.name,
        mockUser.picture,
      );
    });

    it('should use sub field when auth0Id is not present', async () => {
      const userWithSub = {
        sub: 'auth0|456',
        auth0Id: 'auth0|456',
        email: 'sub@example.com',
        name: 'Sub User',
        permissions: [],
      } as AuthUser;

      mockWorkspacesService.ensureUser.mockResolvedValue({
        id: 'user-internal-3',
        auth0Id: 'auth0|456',
      });
      mockProjectsService.listByWorkspace.mockResolvedValue([]);

      await controller.listProjects(userWithSub, 'workspace-1');

      expect(workspacesService.ensureUser).toHaveBeenCalledWith(
        'auth0|456',
        'sub@example.com',
        'Sub User',
        undefined,
      );
    });

    it('should pass internal user ID to service methods', async () => {
      const projectId = 'proj-1';
      const internalUserId = 'internal-user-123';

      mockWorkspacesService.ensureUser.mockResolvedValue({
        id: internalUserId,
        auth0Id: mockUser.auth0Id,
      });
      mockProjectsService.findOne.mockResolvedValue({
        id: projectId,
        name: 'Test',
      });

      await controller.getProject(mockUser, projectId);

      expect(projectsService.findOne).toHaveBeenCalledWith(projectId, internalUserId);
    });
  });
});
