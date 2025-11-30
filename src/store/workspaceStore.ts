import { create } from "zustand";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface WorkspaceMembership {
  workspaceId: string;
  role: WorkspaceRole;
  workspace: {
    id: string;
    name: string;
    slug?: string;
    createdAt: string;
  };
}

interface WorkspaceState {
  workspaces: WorkspaceMembership[];
  activeWorkspaceId: string | null;

  loading: boolean;
  creating: boolean;
  error: string | null;

  setWorkspaces: (data: WorkspaceMembership[]) => void;
  setActiveWorkspace: (id: string | null) => void;

  setLoading: (state: boolean) => void;
  setCreating: (state: boolean) => void;
  setError: (msg: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeWorkspaceId: null,

  loading: false,
  creating: false,
  error: null,

  setWorkspaces: (data) => set({ workspaces: data }),
  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

  setLoading: (state) => set({ loading: state }),
  setCreating: (state) => set({ creating: state }),
  setError: (msg) => set({ error: msg }),
}));