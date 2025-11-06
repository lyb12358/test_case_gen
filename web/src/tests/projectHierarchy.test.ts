/**
 * Comprehensive tests for project hierarchy frontend functionality.
 *
 * This module tests:
 * - ProjectContext state management
 * - ProjectSelection component
 * - ProjectSwitcher component
 * - ProjectProtectedRoute component
 * - Project-based navigation and filtering
 * - Backend compatibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Components to test
import { ProjectProvider, useProject } from '../contexts/ProjectContext';
import ProjectSelection from '../components/ProjectSelection/ProjectSelection';
import ProjectSwitcher from '../components/ProjectSelection/ProjectSwitcher';
import ProjectProtectedRoute from '../components/Routing/ProjectProtectedRoute';

// Mock API service
import * as projectService from '../services/projectService';

// Mock the project service
vi.mock('../services/projectService');

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <BrowserRouter>
      <ProjectProvider>
        {children}
      </ProjectProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

describe('ProjectContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default project', async () => {
    const mockProjects = [
      {
        id: 1,
        name: '远控场景',
        description: 'Default TSP remote control scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
    ];

    vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

    const TestComponent = () => {
      const { currentProject, isLoading } = useProject();

      if (isLoading) {
        return <div>Loading...</div>;
      }

      return (
        <div>
          <span data-testid="project-name">{currentProject?.name}</span>
          <span data-testid="project-id">{currentProject?.id}</span>
        </div>
      );
    };

    render(<TestComponent />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('project-name')).toHaveTextContent('远控场景');
      expect(screen.getByTestId('project-id')).toHaveTextContent('1');
    });
  });

  it('should handle project switching', async () => {
    const mockProjects = [
      {
        id: 1,
        name: '远控场景',
        description: 'Default TSP remote control scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
      {
        id: 2,
        name: '智能座舱',
        description: 'Smart cockpit scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
    ];

    vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

    const TestComponent = () => {
      const { currentProject, setCurrentProject, isLoading } = useProject();

      if (isLoading) {
        return <div>Loading...</div>;
      }

      const handleSwitchProject = () => {
        const newProject = mockProjects.find(p => p.id === 2);
        if (newProject) {
          setCurrentProject(newProject);
        }
      };

      return (
        <div>
          <span data-testid="project-name">{currentProject?.name}</span>
          <button onClick={handleSwitchProject} data-testid="switch-project">
            Switch Project
          </button>
        </div>
      );
    };

    render(<TestComponent />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('project-name')).toHaveTextContent('远控场景');
    });

    fireEvent.click(screen.getByTestId('switch-project'));

    await waitFor(() => {
      expect(screen.getByTestId('project-name')).toHaveTextContent('智能座舱');
    });
  });

  it('should handle project creation', async () => {
    const mockProjects = [
      {
        id: 1,
        name: '远控场景',
        description: 'Default TSP remote control scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
    ];

    const newProject = {
      id: 2,
      name: 'New Test Project',
      description: 'A new test project',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: null,
    };

    vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);
    vi.mocked(projectService.createProject).mockResolvedValue(newProject);

    const TestComponent = () => {
      const { currentProject, createProject, isLoading } = useProject();

      if (isLoading) {
        return <div>Loading...</div>;
      }

      const handleCreateProject = async () => {
        await createProject({
          name: 'New Test Project',
          description: 'A new test project',
          is_active: true,
        });
      };

      return (
        <div>
          <span data-testid="project-count">{currentProject ? '1' : '0'}</span>
          <button onClick={handleCreateProject} data-testid="create-project">
            Create Project
          </button>
        </div>
      );
    };

    render(<TestComponent />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('project-count')).toHaveTextContent('1');
    });

    fireEvent.click(screen.getByTestId('create-project'));

    await waitFor(() => {
      expect(projectService.createProject).toHaveBeenCalledWith({
        name: 'New Test Project',
        description: 'A new test project',
        is_active: true,
      });
    });
  });
});

describe('ProjectSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render project selection modal', async () => {
    const mockProjects = [
      {
        id: 1,
        name: '远控场景',
        description: 'Default TSP remote control scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
      {
        id: 2,
        name: '智能座舱',
        description: 'Smart cockpit scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
    ];

    vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

    const onClose = vi.fn();
    const onProjectSelect = vi.fn();

    render(
      <ProjectSelection
        visible={true}
        onClose={onClose}
        onProjectSelect={onProjectSelect}
      />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('远控场景')).toBeInTheDocument();
      expect(screen.getByText('智能座舱')).toBeInTheDocument();
    });
  });

  it('should handle project selection', async () => {
    const mockProjects = [
      {
        id: 1,
        name: '远控场景',
        description: 'Default TSP remote control scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
      {
        id: 2,
        name: '智能座舱',
        description: 'Smart cockpit scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
    ];

    vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

    const onClose = vi.fn();
    const onProjectSelect = vi.fn();

    render(
      <ProjectSelection
        visible={true}
        onClose={onClose}
        onProjectSelect={onProjectSelect}
      />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('智能座舱')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('智能座舱'));

    await waitFor(() => {
      expect(onProjectSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2, name: '智能座舱' })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should handle project creation', async () => {
    const mockProjects = [
      {
        id: 1,
        name: '远控场景',
        description: 'Default TSP remote control scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
    ];

    const newProject = {
      id: 2,
      name: 'New Project',
      description: 'A new project',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: null,
    };

    vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);
    vi.mocked(projectService.createProject).mockResolvedValue(newProject);

    const onClose = vi.fn();
    const onProjectSelect = vi.fn();

    render(
      <ProjectSelection
        visible={true}
        onClose={onClose}
        onProjectSelect={onProjectSelect}
      />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('创建新项目')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('创建新项目'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('项目名称')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('项目名称');
    const descriptionInput = screen.getByPlaceholderText('项目描述');

    fireEvent.change(nameInput, { target: { value: 'New Project' } });
    fireEvent.change(descriptionInput, { target: { value: 'A new project' } });

    fireEvent.click(screen.getByText('创建'));

    await waitFor(() => {
      expect(projectService.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: 'A new project',
        is_active: true,
      });
    });
  });
});

describe('ProjectSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display current project name', async () => {
    const mockProjects = [
      {
        id: 1,
        name: '远控场景',
        description: 'Default TSP remote control scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
    ];

    vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

    render(<ProjectSwitcher />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('远控场景')).toBeInTheDocument();
    });
  });

  it('should open project selection on click', async () => {
    const mockProjects = [
      {
        id: 1,
        name: '远控场景',
        description: 'Default TSP remote control scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
    ];

    vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

    render(<ProjectSwitcher />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('远控场景')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('远控场景'));

    await waitFor(() => {
      expect(screen.getByText('选择项目')).toBeInTheDocument();
    });
  });
});

describe('ProjectProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when project is selected', async () => {
    const mockProjects = [
      {
        id: 1,
        name: '远控场景',
        description: 'Default TSP remote control scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
    ];

    vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

    const TestChildComponent = () => <div data-testid="protected-content">Protected Content</div>;

    render(
      <ProjectProtectedRoute>
        <TestChildComponent />
      </ProjectProtectedRoute>,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  it('should show loading state when project is loading', () => {
    const TestChildComponent = () => <div data-testid="protected-content">Protected Content</div>;

    // Mock the context to return loading state
    const MockProjectProvider = ({ children }: { children: React.ReactNode }) => (
      <div>
        {React.cloneElement(children as React.ReactElement, {
          currentProject: null,
          isLoading: true
        })}
      </div>
    );

    render(
      <MockProjectProvider>
        <ProjectProtectedRoute>
          <TestChildComponent />
        </ProjectProtectedRoute>
      </MockProjectProvider>
    );

    expect(screen.getByText('加载项目信息中...')).toBeInTheDocument();
  });

  it('should redirect to project selection when no project is selected', () => {
    const TestChildComponent = () => <div data-testid="protected-content">Protected Content</div>;

    // Mock the context to return no project selected
    const MockProjectProvider = ({ children }: { children: React.ReactNode }) => (
      <div>
        {React.cloneElement(children as React.ReactElement, {
          currentProject: null,
          isLoading: false
        })}
      </div>
    );

    render(
      <MockProjectProvider>
        <ProjectProtectedRoute>
          <TestChildComponent />
        </ProjectProtectedRoute>
      </MockProjectProvider>
    );

    expect(screen.getByText('请选择项目')).toBeInTheDocument();
  });
});

describe('Project Templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display available project templates', async () => {
    const mockProjects = [
      {
        id: 1,
        name: '远控场景',
        description: 'Default TSP remote control scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
    ];

    vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

    const onClose = vi.fn();
    const onProjectSelect = vi.fn();

    render(
      <ProjectSelection
        visible={true}
        onClose={onClose}
        onProjectSelect={onProjectSelect}
      />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('远控场景')).toBeInTheDocument();
      expect(screen.getByText('智能座舱')).toBeInTheDocument();
      expect(screen.getByText('安全测试')).toBeInTheDocument();
      expect(screen.getByText('性能测试')).toBeInTheDocument();
      expect(screen.getByText('用户体验测试')).toBeInTheDocument();
      expect(screen.getByText('兼容性测试')).toBeInTheDocument();
    });
  });

  it('should create project from template', async () => {
    const mockProjects = [
      {
        id: 1,
        name: '远控场景',
        description: 'Default TSP remote control scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
    ];

    const newProject = {
      id: 2,
      name: '智能座舱项目',
      description: '基于智能座舱模板创建的项目',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: null,
    };

    vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);
    vi.mocked(projectService.createProject).mockResolvedValue(newProject);

    const onClose = vi.fn();
    const onProjectSelect = vi.fn();

    render(
      <ProjectSelection
        visible={true}
        onClose={onClose}
        onProjectSelect={onProjectSelect}
      />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('智能座舱')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('智能座舱'));

    await waitFor(() => {
      expect(projectService.createProject).toHaveBeenCalledWith({
        name: '智能座舱项目',
        description: '基于智能座舱模板创建的项目',
        is_active: true,
      });
    });
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle project loading errors gracefully', async () => {
    vi.mocked(projectService.getProjects).mockRejectedValue(new Error('Network error'));

    const TestComponent = () => {
      const { error, isLoading } = useProject();

      if (isLoading) {
        return <div>Loading...</div>;
      }

      if (error) {
        return <div data-testid="error-message">{error.message}</div>;
      }

      return <div>No error</div>;
    };

    render(<TestComponent />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Network error');
    });
  });

  it('should handle project creation errors gracefully', async () => {
    const mockProjects = [
      {
        id: 1,
        name: '远控场景',
        description: 'Default TSP remote control scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
    ];

    vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);
    vi.mocked(projectService.createProject).mockRejectedValue(new Error('Creation failed'));

    const onClose = vi.fn();
    const onProjectSelect = vi.fn();

    render(
      <ProjectSelection
        visible={true}
        onClose={onClose}
        onProjectSelect={onProjectSelect}
      />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('创建新项目')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('创建新项目'));

    const nameInput = screen.getByPlaceholderText('项目名称');
    fireEvent.change(nameInput, { target: { value: 'Test Project' } });

    fireEvent.click(screen.getByText('创建'));

    await waitFor(() => {
      expect(screen.getByText(/创建项目失败/)).toBeInTheDocument();
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete full project selection workflow', async () => {
    const mockProjects = [
      {
        id: 1,
        name: '远控场景',
        description: 'Default TSP remote control scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
      {
        id: 2,
        name: '智能座舱',
        description: 'Smart cockpit scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
    ];

    vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

    const TestComponent = () => {
      const { currentProject, setCurrentProject, isLoading } = useProject();

      if (isLoading) {
        return <div>Loading...</div>;
      }

      return (
        <div>
          <span data-testid="current-project">{currentProject?.name}</span>
          <ProjectSwitcher />
        </div>
      );
    };

    render(<TestComponent />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('current-project')).toHaveTextContent('远控场景');
    });

    // Open project switcher
    fireEvent.click(screen.getByText('远控场景'));

    await waitFor(() => {
      expect(screen.getByText('选择项目')).toBeInTheDocument();
    });

    // Select different project
    fireEvent.click(screen.getByText('智能座舱'));

    await waitFor(() => {
      expect(screen.getByTestId('current-project')).toHaveTextContent('智能座舱');
    });
  });

  it('should handle rapid project switching', async () => {
    const mockProjects = [
      {
        id: 1,
        name: '远控场景',
        description: 'Default TSP remote control scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
      {
        id: 2,
        name: '智能座舱',
        description: 'Smart cockpit scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
      {
        id: 3,
        name: '安全测试',
        description: 'Security testing scenario',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
      },
    ];

    vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

    const TestComponent = () => {
      const { currentProject, setCurrentProject, isLoading } = useProject();

      if (isLoading) {
        return <div>Loading...</div>;
      }

      return (
        <div>
          <span data-testid="current-project">{currentProject?.name}</span>
          <button
            onClick={() => setCurrentProject(mockProjects[1])}
            data-testid="switch-to-project-2"
          >
            Switch to Project 2
          </button>
          <button
            onClick={() => setCurrentProject(mockProjects[2])}
            data-testid="switch-to-project-3"
          >
            Switch to Project 3
          </button>
        </div>
      );
    };

    render(<TestComponent />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('current-project')).toHaveTextContent('远控场景');
    });

    // Rapid switching
    fireEvent.click(screen.getByTestId('switch-to-project-2'));
    fireEvent.click(screen.getByTestId('switch-to-project-3'));

    await waitFor(() => {
      expect(screen.getByTestId('current-project')).toHaveTextContent('安全测试');
    });
  });
});