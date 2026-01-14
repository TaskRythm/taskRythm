// src/components/WorkspaceHeader.tsx
"use client";

import { useMemo, useState } from "react";
import { useWorkspaceStore, WorkspaceRole } from "@/store/workspaceStore";
import { canInviteMembers } from "@/lib/rbac";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useToast } from "@/contexts/ToastContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Edit2, Trash2, AlertTriangle, Pencil } from "lucide-react";
import { deleteWorkspace } from "@/api/workspaces";

export function WorkspaceHeader() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { updateWorkspace, reload: reloadWorkspaces } = useWorkspaces();
  const { callApi } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.workspaceId === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  const currentRole: WorkspaceRole | null = currentWorkspace?.role ?? null;
  const canInvite = canInviteMembers(currentRole);
  const workspaceName = currentWorkspace?.workspace.name ?? "Workspace";
  const canRename = currentRole === "OWNER";
  const canDelete = currentRole === "OWNER";

  const [renameDialog, setRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState(workspaceName);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
  } | null>(null);

  const handleRename = async () => {
    if (!activeWorkspaceId) return;
    const next = (renameValue || "").trim();
    if (!next) {
      setRenameDialog(false);
      setRenameValue(workspaceName);
      return;
    }
    try {
      setSaving(true);
      await updateWorkspace(activeWorkspaceId, { name: next });
      setRenameDialog(false);
      toast.success("Workspace renamed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to rename workspace");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkspace = () => {
    const message =
      `Delete "${workspaceName}" permanently?\n\n` +
      "All projects and tasks in this workspace will be deleted. This action cannot be undone.";

    setConfirmDialog({
      title: "Delete workspace",
      message,
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        if (!activeWorkspaceId) return;

        try {
          setIsDeleting(true);
          await deleteWorkspace(callApi, activeWorkspaceId);
          
          setActiveWorkspace(null);
          await reloadWorkspaces();
          
          toast.success(`Workspace "${workspaceName}" deleted successfully`);
          router.push("/");
        } catch (err: any) {
          toast.error(err?.message || 'Failed to delete workspace');
          setConfirmDialog(null);
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  return (
    <div
      style={{
        padding: "24px 0",
        marginBottom: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "24px",
            fontWeight: 600,
            color: "#111827",
          }}
        >
          {workspaceName}
        </h2>
      </div>
      
      <div style={{ display: "flex", gap: "10px" }}>
        {canRename && (
          <button
            onClick={() => {
              setRenameValue(workspaceName);
              setRenameDialog(true);
            }}
            style={{
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#374151",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            }}
            title="Rename workspace"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f9fafb";
              e.currentTarget.style.borderColor = "#d1d5db";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
            }}
          >
            <Edit2 size={14} /> Rename
          </button>
        )}
        
        {canDelete && (
          <button
            onClick={handleDeleteWorkspace}
            disabled={isDeleting}
            style={{
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#dc2626",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: isDeleting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: isDeleting ? 0.6 : 1,
              transition: "all 0.2s ease",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            }}
            title="Delete workspace"
            onMouseEnter={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.background = "#fee2e2";
                e.currentTarget.style.borderColor = "#fca5a5";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(220, 38, 38, 0.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fef2f2";
              e.currentTarget.style.borderColor = "#fecaca";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
            }}
          >
            <Trash2 size={14} /> {isDeleting ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>

      {/* Rename Dialog */}
      {renameDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1300,
            animation: "fadeIn 0.2s ease",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRenameDialog(false);
              setRenameValue(workspaceName);
            }
          }}
        >
          <div
            style={{
              background: "white",
              padding: "32px",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.4)",
              animation: "slideUp 0.3s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 20px rgba(59, 130, 246, 0.3)",
                  flexShrink: 0,
                }}
              >
                <Pencil size={28} color="white" strokeWidth={2.5} />
              </div>

              <h3
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#1e293b",
                  margin: 0,
                  letterSpacing: "-0.4px",
                }}
              >
                Rename workspace
              </h3>
            </div>

            <div
              style={{
                marginBottom: "24px",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Workspace name
              </label>
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Enter workspace name"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "15px",
                  fontWeight: 500,
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box",
                }}
                autoFocus
                onFocus={(e) => {
                  e.currentTarget.style.border = "2px solid #3b82f6";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = "2px solid #e5e7eb";
                  e.currentTarget.style.boxShadow = "none";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && renameValue.trim() && !saving) {
                    handleRename();
                  } else if (e.key === "Escape") {
                    setRenameDialog(false);
                    setRenameValue(workspaceName);
                  }
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setRenameDialog(false);
                  setRenameValue(workspaceName);
                }}
                disabled={saving}
                style={{
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  border: "2px solid #e2e8f0",
                  background: "white",
                  color: "#64748b",
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  opacity: saving ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.background = "#f8fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.background = "white";
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRename}
                disabled={saving || !renameValue.trim()}
                style={{
                  padding: "12px 28px",
                  fontSize: "14px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  border: "none",
                  background: saving || !renameValue.trim() 
                    ? "#94a3b8" 
                    : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  color: "white",
                  cursor: saving || !renameValue.trim() ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: saving || !renameValue.trim() ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!saving && renameValue.trim()) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(59, 130, 246, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.4)";
                }}
              >
                <Pencil size={16} />
                {saving ? "Saving..." : "Rename"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1300,
            animation: "fadeIn 0.2s ease",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmDialog(null);
            }
          }}
        >
          <div
            style={{
              background: "white",
              padding: "32px",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.4)",
              animation: "slideUp 0.3s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 20px rgba(239, 68, 68, 0.3)",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={28} color="white" strokeWidth={2.5} />
              </div>

              <h3
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#1e293b",
                  margin: 0,
                  letterSpacing: "-0.4px",
                }}
              >
                {confirmDialog.title}
              </h3>
            </div>

            <div
              style={{
                padding: "16px",
                background: "#fef2f2",
                borderRadius: "12px",
                border: "2px solid #fecaca",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
                <p
                  style={{
                    fontSize: "15px",
                    color: "#991b1b",
                    lineHeight: "1.6",
                    whiteSpace: "pre-line",
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  {confirmDialog.message}
                </p>
              </div>
              <div
                style={{
                  padding: "12px",
                  background: "white",
                  borderRadius: "8px",
                  border: "1px solid #fecaca",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#991b1b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  ⚠️ Warning
                </div>
                <div style={{ fontSize: "13px", color: "#b91c1c", lineHeight: "1.5" }}>
                  This action is <strong>permanent</strong> and cannot be reversed. All data will be lost forever.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                style={{
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  border: "2px solid #e2e8f0",
                  background: "white",
                  color: "#64748b",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.background = "#f8fafc";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.background = "white";
                }}
              >
                {confirmDialog.cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                style={{
                  padding: "12px 28px",
                  fontSize: "14px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "white",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(239, 68, 68, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.4)";
                }}
              >
                <Trash2 size={16} />
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}