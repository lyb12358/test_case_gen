import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useMessage } from '@/hooks/useMessage';
import { Project, projectService } from '../services/projectService';

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  loading: boolean;
  error: string | null;
  selectProject: (project: Project) => void;
  loadProjects: (activeOnly?: boolean) => Promise<void>;
  createProject: (projectData: any) => Promise<Project>;
  switchProject: (projectId: number) => Promise<void>;
  refreshCurrentProject: () => Promise<void>;
  clearError: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const message = useMessage();

  // Refs to prevent race conditions
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);
  const projectIdRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load projects on mount
  useEffect(() => {
    initializeProjectData();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setLoadingState = useCallback((loading: boolean) => {
    if (mountedRef.current) {
      setLoading(loading);
      loadingRef.current = loading;
    }
  }, []);

  const setErrorState = useCallback((errorMessage: string | null) => {
    if (mountedRef.current) {
      setError(errorMessage);
      if (errorMessage) {
        console.error('ProjectContext Error:', errorMessage);
      }
    }
  }, []);

  const loadProjects = useCallback(async (activeOnly: boolean = true): Promise<void> => {
    if (loadingRef.current) {
      console.log('Projects loading already in progress, skipping...');
      return;
    }

    try {
      setLoadingState(true);
      setErrorState(null);

      const response = await projectService.getProjects(activeOnly);

      if (mountedRef.current) {
        setProjects(response.projects);
        setErrorState(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载项目列表失败';
      setErrorState(errorMessage);
      if (message && typeof message.error === 'function') {
        message.error('加载项目列表失败');
      }
      console.error('Failed to load projects:', error);
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState]);

  const loadCurrentProject = useCallback(async (): Promise<void> => {
    let savedProjectId: number | null = null;

    // Try to get current project from localStorage
    try {
      const savedId = localStorage.getItem('currentProjectId');
      if (savedId) {
        savedProjectId = parseInt(savedId, 10);
        projectIdRef.current = savedProjectId;
      }
    } catch (error) {
      console.warn('Failed to parse saved project ID:', error);
      localStorage.removeItem('currentProjectId');
    }

    if (savedProjectId) {
      try {
        const project = await projectService.getProject(savedProjectId);
        if (mountedRef.current) {
          setCurrentProject(project);
          setErrorState(null);
        }
        return;
      } catch (error) {
        console.warn('Failed to load saved project:', error);
        localStorage.removeItem('currentProjectId');
        projectIdRef.current = null;
      }
    }

    // If no saved project or failed to load, try to get or create default project
    try {
      const defaultProject = await projectService.getOrCreateDefaultProject();
      if (mountedRef.current) {
        setCurrentProject(defaultProject);
        localStorage.setItem('currentProjectId', defaultProject.id.toString());
        projectIdRef.current = defaultProject.id;
        setErrorState(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '无法加载默认项目';
      setErrorState(errorMessage);
      if (message && typeof message.error === 'function') {
        message.error('无法加载默认项目');
      }
      console.error('Failed to get default project:', error);
    }
  }, [setErrorState]);

  const initializeProjectData = useCallback(async () => {
    // Load projects and current project in parallel
    await Promise.all([
      loadProjects(),
      loadCurrentProject()
    ]);
  }, [loadProjects, loadCurrentProject]);

  const selectProject = useCallback((project: Project) => {
    if (!mountedRef.current) return;

    try {
      setCurrentProject(project);
      projectIdRef.current = project.id;
      localStorage.setItem('currentProjectId', project.id.toString());
      setErrorState(null);

      // Safety check for message API
      if (message && typeof message.success === 'function') {
        message.success(`已切换到项目: ${project.name}`);
      } else {
        console.warn('Message API not available, project switched successfully');
      }
    } catch (error) {
      console.error('Failed to select project:', error);
      setErrorState('选择项目失败');
    }
  }, [setErrorState]);

  const createProject = useCallback(async (projectData: any): Promise<Project> => {
    try {
      setErrorState(null);
      const newProject = await projectService.createProject(projectData);

      // Refresh projects list
      await loadProjects();

      if (mountedRef.current) {
        if (message && typeof message.success === 'function') {
          message.success('项目创建成功');
        }
      }

      return newProject;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建项目失败';
      setErrorState(errorMessage);
      if (message && typeof message.error === 'function') {
        message.error('创建项目失败');
      }
      console.error('Failed to create project:', error);
      throw error;
    }
  }, [loadProjects, setErrorState]);

  const switchProject = useCallback(async (projectId: number): Promise<void> => {
    // Prevent switching to the same project
    if (projectIdRef.current === projectId) {
      console.log('Already on target project, skipping switch');
      return;
    }

    try {
      setErrorState(null);
      const project = await projectService.getProject(projectId);
      selectProject(project);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '切换项目失败';
      setErrorState(errorMessage);
      if (message && typeof message.error === 'function') {
        message.error('切换项目失败');
      }
      console.error('Failed to switch project:', error);
      throw error;
    }
  }, [selectProject, setErrorState]);

  const refreshCurrentProject = useCallback(async (): Promise<void> => {
    if (!currentProject || !mountedRef.current) {
      return;
    }

    try {
      setErrorState(null);
      const updatedProject = await projectService.getProject(currentProject.id);

      if (mountedRef.current) {
        setCurrentProject(updatedProject);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '刷新项目信息失败';
      setErrorState(errorMessage);
      console.error('Failed to refresh current project:', error);
      // Don't show error message for refresh failures to avoid spam
    }
  }, [currentProject, setErrorState]);

  const value: ProjectContextType = {
    currentProject,
    projects,
    loading,
    error,
    selectProject,
    loadProjects,
    createProject,
    switchProject,
    refreshCurrentProject,
    clearError,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export default ProjectContext;