// src/components/WorkspaceHeader.tsx
"use client";

import { useMemo } from "react";
import { useWorkspaceStore, WorkspaceRole } from "@/store/workspaceStore";
import { canInviteMembers } from "@/lib/rbac";

export function WorkspaceHeader() {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.workspaceId === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  const currentRole: WorkspaceRole | null = currentWorkspace?.role ?? null;
  const canInvite = canInviteMembers(currentRole);
  const workspaceName = currentWorkspace?.workspace.name ?? "Workspace";

  return (
    <div
      style={{
        padding: "12px 0",
        marginBottom: "8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #e1e5e9",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 600,
            color: "#172b4d",
          }}
        >
          {workspaceName}
        </h2>
        <p
          style={{
            margin: 0,
            marginTop: "4px",
            fontSize: "12px",
            color: "#6b778c",
          }}
        >
          Role:{" "}
          <strong>{currentRole ? currentRole.toLowerCase() : "unknown"}</strong>
        </p>
      </div>
      
      {canInvite && (
        <span
          style={{
            fontSize: "12px",
            color: "#6b778c",
          }}
        >
          You can invite members from the sidebar or members panel.
        </span>
      )}
    </div>
  );
}