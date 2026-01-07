// src/components/WorkspaceHeader.tsx
"use client";

import { useMemo, useState } from "react";
import { useWorkspaceStore, WorkspaceRole } from "@/store/workspaceStore";
import { canInviteMembers } from "@/lib/rbac";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useToast } from "@/contexts/ToastContext";
import { Edit2, Save, X } from "lucide-react";

export function WorkspaceHeader() {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const { updateWorkspace } = useWorkspaces();
  const toast = useToast();

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.workspaceId === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  const currentRole: WorkspaceRole | null = currentWorkspace?.role ?? null;
  const canInvite = canInviteMembers(currentRole);
  const workspaceName = currentWorkspace?.workspace.name ?? "Workspace";
  const canRename = currentRole === "OWNER" || currentRole === "ADMIN";

  const [renameMode, setRenameMode] = useState(false);
  const [renameValue, setRenameValue] = useState(workspaceName);
  const [saving, setSaving] = useState(false);

  const handleRename = async () => {
    if (!activeWorkspaceId) return;
    const next = (renameValue || "").trim();
    if (!next) {
      setRenameMode(false);
      setRenameValue(workspaceName);
      return;
    }
    try {
      setSaving(true);
      await updateWorkspace(activeWorkspaceId, { name: next });
      setRenameMode(false);
      toast.success("Workspace renamed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to rename workspace");
    } finally {
      setSaving(false);
    }
  };

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
        {renameMode ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Workspace name"
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #d0d7de",
                fontSize: "14px",
                fontWeight: 600,
                background: "#ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
              autoFocus
              onFocus={(e) => {
                e.currentTarget.style.border = "1px solid #94a3b8";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(148,163,184,0.25)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = "1px solid #d0d7de";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
              }}
            />
            <button
              onClick={handleRename}
              disabled={saving || !renameValue.trim()}
              style={{
                border: "none",
                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                color: "white",
                padding: "8px 12px",
                borderRadius: "8px",
                fontWeight: 700,
                cursor: saving || !renameValue.trim() ? "not-allowed" : "pointer",
                opacity: saving || !renameValue.trim() ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 6px 16px rgba(22, 163, 74, 0.25)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(22, 163, 74, 0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(22, 163, 74, 0.25)";
              }}
            >
              <Save size={14} /> {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setRenameMode(false);
                setRenameValue(workspaceName);
              }}
              disabled={saving}
              style={{
                border: "1px solid #d0d7de",
                background: "#f8fafc",
                color: "#172b4d",
                padding: "8px 12px",
                borderRadius: "8px",
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#eef2f7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f8fafc";
              }}
            >
              <X size={14} /> Cancel
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
            {canRename && (
              <button
                onClick={() => {
                  setRenameValue(workspaceName);
                  setRenameMode(true);
                }}
                style={{
                  border: "none",
                  background: "#e5e7eb",
                  color: "#111827",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                title="Rename workspace"
              >
                <Edit2 size={14} /> Rename
              </button>
            )}
          </div>
        )}
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