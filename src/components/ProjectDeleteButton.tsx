"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAuth } from "@/hooks/useAuth";
import { deleteProject } from "@/api/projects";

function normalizeApiError(err: any): string {
  const raw = err?.message || String(err || "Unknown error");
  const withoutPrefix = raw.replace(/^API\s+\d+\s+\w+\s+–\s+/i, "");

  let message = withoutPrefix;
  const jsonStart = withoutPrefix.indexOf("{");
  if (jsonStart !== -1) {
    const possibleJson = withoutPrefix.slice(jsonStart);
    try {
      const parsed = JSON.parse(possibleJson);
      if (parsed?.message) {
        message = parsed.message;
      }
    } catch {
      // ignore
    }
  }

  return message;
}

interface ProjectDeleteButtonProps {
  projectId: string;
  projectName: string;
  onDeleted?: () => void;
}

export function ProjectDeleteButton({
  projectId,
  projectName,
  onDeleted,
}: ProjectDeleteButtonProps) {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const { callApi } = useAuth();

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
  } | null>(null);

  const currentWorkspaceMembership =
    workspaces.find((w) => w.workspaceId === activeWorkspaceId) ??
    workspaces[0] ??
    null;

  const currentRole = currentWorkspaceMembership?.role ?? null;
  const canDelete = currentRole === "OWNER" || currentRole === "ADMIN";

  const handleDeleteProject = () => {
    const message =
      `Delete project "${projectName}" and all its tasks?\n\n` +
      "This cannot be undone.";

    setConfirmDialog({
      title: "Delete project",
      message,
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setIsDeleting(true);
          setError(null);
          await deleteProject(callApi, projectId, activeWorkspaceId ?? undefined);
          onDeleted?.();
          setConfirmDialog(null);
        } catch (err: any) {
          setError(normalizeApiError(err));
          setConfirmDialog(null);
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  if (!canDelete) {
    return null; // Only OWNER/ADMIN see delete button
  }

  return (
    <>
      {error && (
        <div
          style={{
            marginBottom: "8px",
            padding: "6px 8px",
            borderRadius: "4px",
            background: "#ffeceb",
            fontSize: "11px",
            color: "#de350b",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleDeleteProject}
        disabled={isDeleting}
        style={{
          padding: "8px",
          background: "transparent",
          color: "#cc0000ff",
          border: "1.5px solid #cc0000ff",
          borderRadius: "6px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
        aria-label="Delete Project"

      >
        <Trash2 size={16} />
        {isDeleting ? "..." : ""}
      </button>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1300,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 16px 48px rgba(9,30,66,0.4)",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "#172b4d",
                margin: 0,
                marginBottom: "8px",
              }}
            >
              {confirmDialog.title}
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "#6b778c",
                lineHeight: "1.5",
                whiteSpace: "pre-line",
                margin: 0,
                marginBottom: "20px",
              }}
            >
              {confirmDialog.message}
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                style={{
                  padding: "8px 14px",
                  fontSize: "14px",
                  borderRadius: "4px",
                  border: "1px solid #c1c7d0",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 500,
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
                  padding: "8px 14px",
                  fontSize: "14px",
                  borderRadius: "4px",
                  border: "none",
                  background: "linear-gradient(135deg, #de350b 0%, #f45e3f 100%)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProjectDeleteButton;
