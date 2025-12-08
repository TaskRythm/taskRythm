"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAuth } from "@/hooks/useAuth";
import { deleteWorkspace } from "@/api/workspaces";
import { useRouter } from "next/navigation";

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

export function WorkspaceSettings() {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const { callApi } = useAuth();
  const router = useRouter();

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
  const isOwner = currentRole === "OWNER";
  const workspaceName =
    currentWorkspaceMembership?.workspace?.name ?? "Workspace";

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
          setError(null);
          await deleteWorkspace(callApi, activeWorkspaceId);
          // After deletion: redirect to dashboard
          router.push("/dashboard");
        } catch (err: any) {
          setError(normalizeApiError(err));
          setConfirmDialog(null);
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  if (!isOwner) {
    return null; // Only owners see delete button
  }

  return (
    <div
      style={{
        background: "white",
        borderRadius: "10px",
        border: "1px solid #e1e5e9",
        padding: "20px",
        boxShadow: "0 1px 4px rgba(9,30,66,0.08)",
      }}
    >
      <h3
        style={{
          fontSize: "16px",
          fontWeight: 700,
          color: "#172b4d",
          margin: 0,
          marginBottom: "12px",
        }}
      >
        Danger Zone
      </h3>

      {error && (
        <div
          style={{
            marginBottom: "12px",
            padding: "8px 12px",
            borderRadius: "6px",
            background: "#ffeceb",
            fontSize: "12px",
            color: "#de350b",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleDeleteWorkspace}
        disabled={isDeleting}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 12px",
          fontSize: "12px",
          borderRadius: "6px",
          border: "1px solid #de350b",
          color: "#de350b",
          background: "white",
          cursor: isDeleting ? "not-allowed" : "pointer",
          fontWeight: 600,
        }}
      >
        <Trash2 size={14} />
        {isDeleting ? "Deleting..." : "Delete workspace"}
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
    </div>
  );
}

export default WorkspaceSettings;
