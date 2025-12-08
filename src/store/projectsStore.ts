// src/store/projectsStore.ts
import { create } from "zustand";

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  // optional fields we *might* get from backend
  progress?: number | null;
  tasksCount?: number | null;
  membersCount?: number | null;
  archived?: boolean | null;
  createdAt?: string;
}

interface ProjectsState {
  projects: Project[];
  loading: boolean;
  creating: boolean;
  error: string | null;

  setProjects: (data: Project[]) => void;
  addProject: (project: Project) => void;

  setLoading: (state: boolean) => void;
  setCreating: (state: boolean) => void;
  setError: (msg: string | null) => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: [],
  loading: false,
  creating: false,
  error: null,

  setProjects: (data) => set({ projects: data }),
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),

  setLoading: (state) => set({ loading: state }),
  setCreating: (state) => set({ creating: state }),
  setError: (msg) => set({ error: msg }),
}));
