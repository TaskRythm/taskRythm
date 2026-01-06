"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Shield } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAuth } from "@/hooks/useAuth";
import { deleteWorkspace } from "@/api/workspaces";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";

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
  const toast = useToast();

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
          toast.success(`Workspace "${workspaceName}" deleted successfully`);
          // After deletion: redirect to home
          router.push("/");
        } catch (err: any) {
          const errorMsg = normalizeApiError(err);
          setError(errorMsg);
          toast.error(errorMsg || 'Failed to delete workspace');
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
        background: "linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)",
        borderRadius: "16px",
        border: "2px solid #fecaca",
        padding: "24px",
        boxShadow: "0 4px 16px rgba(239, 68, 68, 0.1)",
        marginBottom: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Warning Pattern Background */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "120px",
          height: "120px",
          background: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(239, 68, 68, 0.03) 10px, rgba(239, 68, 68, 0.03) 20px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
          position: "relative",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
          }}
        >
          <AlertTriangle size={20} color="white" />
        </div>
        <div>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "#991b1b",
              margin: 0,
              letterSpacing: "-0.3px",
            }}
          >
            Danger Zone
          </h3>
          <p
            style={{
              fontSize: "12px",
              color: "#b91c1c",
              margin: 0,
              fontWeight: 600,
            }}
          >
            Irreversible actions
          </p>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "16px",
            padding: "14px 16px",
            borderRadius: "12px",
            background: "#fee2e2",
            fontSize: "13px",
            color: "#dc2626",
            fontWeight: 600,
            border: "1px solid #fecaca",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "16px",
          border: "2px dashed #fca5a5",
          position: "relative",
        }}
      >
        <div
          style={{
         
            gap: "16px",
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#991b1b",
                marginBottom: "4px",
              }}
            >
              Delete this workspace
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#b91c1c",
                lineHeight: "1.5",
              }}
            >
              Once deleted, all projects and tasks will be permanently removed. This cannot be undone.
            </div>
          </div>
          <button
            type="button"
            onClick={handleDeleteWorkspace}
            disabled={isDeleting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 18px",
              fontSize: "13px",
              borderRadius: "10px",
              marginTop: "10px",
              border: "none",
              color: "white",
              background: isDeleting
                ? "#cbd5e1"
                : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              cursor: isDeleting ? "not-allowed" : "pointer",
              fontWeight: 700,
              boxShadow: isDeleting
                ? "none"
                : "0 4px 12px rgba(239, 68, 68, 0.4)",
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(239, 68, 68, 0.5)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = isDeleting
                ? "none"
                : "0 4px 12px rgba(239, 68, 68, 0.4)";
            }}
          >
            {isDeleting ? (
              <>
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    borderTopColor: "white",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Delete workspace
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
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
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
                boxShadow: "0 8px 20px rgba(239, 68, 68, 0.3)",
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
                marginBottom: "12px",
                letterSpacing: "-0.4px",
              }}
            >
              {confirmDialog.title}
            </h3>

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
                <Shield size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
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
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default WorkspaceSettings;