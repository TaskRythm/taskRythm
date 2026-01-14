"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Link as LinkIcon, UserPlus, Crown, Shield, Eye, Trash2, Mail, Calendar, AlertTriangle, Maximize2, Minimize2 } from "lucide-react";
import {
  useWorkspaceStore,
  type WorkspaceRole,
} from "@/store/workspaceStore";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useToast } from "@/contexts/ToastContext";
import {
  fetchWorkspaceMembers,
  fetchWorkspaceInvites,
  inviteWorkspaceMember,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  type WorkspaceMember,
  type WorkspaceInvite,
} from "@/api/workspaceMembers";

/**
 * Turn our ugly "API 403 Forbidden – {...}" into something human readable.
 */
function normalizeApiError(err: any): string {
  const raw = err?.message || String(err || "Unknown error");

  // Strip generic prefix like "API 403 Forbidden – "
  const withoutPrefix = raw.replace(/^API\s+\d+\s+\w+\s+–\s+/i, "");

  // Try to parse JSON body if present
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
      // ignore JSON parse failure, fall back to original text
    }
  }

  // Friendly mappings for known cases
  if (message.includes("Cannot demote the last owner")) {
    return "You are the last owner of this workspace. Add another owner before changing your role.";
  }

  if (message.includes("Insufficient permissions")) {
    return "You don't have permission to perform this action in this workspace.";
  }

  return message;
}

function getInitials(nameOrEmail: string | null | undefined) {
  if (!nameOrEmail) return "?";
  const value = nameOrEmail.trim();
  if (!value) return "?";
  if (value.includes("@")) {
    return value[0].toUpperCase();
  }
  const parts = value.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

function displayNameFromUser(user: { name?: string | null; email?: string | null }) {
  const name = (user.name || "").trim();
  const email = (user.email || "").trim();

  if (name) return name;
  if (!email) return "Member";

  if (email.endsWith("@placeholder.local")) {
    // Extract a short ID from the placeholder email (e.g., "google-oauth2|123..." -> "google-123")
    const prefix = email.split("@")[0] || "Member";
    if (prefix.includes("|")) {
      const [provider, id] = prefix.split("|");
      return `${provider.replace("-oauth2", "")}-${id.slice(0, 6)}`;
    }
    return prefix;
  }
  return email;
}

function displayEmailFromUser(user: { email?: string | null }) {
  const email = (user.email || "").trim();
  if (!email || email.endsWith("@placeholder.local")) return "";
  return email;
}

function getRoleIcon(role: WorkspaceRole) {
  switch (role) {
    case "OWNER":
      return <Crown size={14} />;
    case "ADMIN":
      return <Shield size={14} />;
    case "VIEWER":
      return <Eye size={14} />;
    default:
      return <Users size={14} />;
  }
}

function getRoleColor(role: WorkspaceRole) {
  switch (role) {
    case "OWNER":
      return { bg: "#fef3c7", color: "#92400e", border: "#fde68a" };
    case "ADMIN":
      return { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" };
    case "VIEWER":
      return { bg: "#f3f4f6", color: "#4b5563", border: "#e5e7eb" };
    default:
      return { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" };
  }
}

export function WorkspaceMembersCard({ isExpanded, onExpandAction }: { isExpanded?: boolean; onExpandAction?: (expanded: boolean) => void }) {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { callApi, user: currentUser } = useAuth();
  const { reload: reloadWorkspaces } = useWorkspaces();
  const toast = useToast();
  const router = useRouter();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesError, setInvitesError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("MEMBER");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [roleSavingId, setRoleSavingId] = useState<string | null>(null);
  const [removeSavingId, setRemoveSavingId] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    isDangerous?: boolean;
  } | null>(null);

  const currentWorkspaceMembership = useMemo(
    () =>
      workspaces.find((w) => w.workspaceId === activeWorkspaceId) ??
      workspaces[0] ??
      null,
    [workspaces, activeWorkspaceId]
  );

  const workspaceName =
    currentWorkspaceMembership?.workspace?.name ?? "Workspace";

  // Compute current user's role from members list (live source of truth)
  const currentUserMember = useMemo(
    () => members.find((m) => m.user.auth0Id === currentUser?.sub),
    [members, currentUser?.sub]
  );

  const currentRole: WorkspaceRole | null = currentUserMember?.role ?? null;

  const canManageMembers =
    currentRole === "OWNER" || currentRole === "ADMIN";
  const canInvite = currentRole === "OWNER" || currentRole === "ADMIN";
  const canPromoteToOwner = currentRole === "OWNER";

  // Helper to check if current user can change a member's role
  const canChangeRole = (member: any, newRole: WorkspaceRole): boolean => {
    // Only OWNER or ADMIN can manage
    if (!canManageMembers) return false;

    // OWNER can change anyone to any role
    if (currentRole === "OWNER") return true;

    // ADMIN can only change roles to MEMBER or VIEWER (lower positions)
    if (currentRole === "ADMIN") {
      // ADMINs cannot promote to OWNER or ADMIN
      if (newRole === "OWNER" || newRole === "ADMIN") return false;
      // ADMINs can demote to MEMBER or VIEWER
      return true;
    }

    return false;
  };

  const ownerCount = useMemo(
    () => members.filter((m) => m.role === "OWNER").length,
    [members]
  );

  // ===== Load members =====
  useEffect(() => {
    if (!activeWorkspaceId) {
      setMembers([]);
      return;
    }

    const load = async () => {
      try {
        setMembersLoading(true);
        setMembersError(null);
        const data = await fetchWorkspaceMembers(callApi, activeWorkspaceId);
        setMembers(data);
      } catch (err: any) {
        setMembersError(normalizeApiError(err));
      } finally {
        setMembersLoading(false);
      }
    };

    void load();
  }, [activeWorkspaceId, callApi]);

  // ===== Load invites (only for OWNER / ADMIN) =====
  useEffect(() => {
    if (!activeWorkspaceId || !canInvite) {
      setInvites([]);
      setInvitesError(null);
      setGlobalError(null);
      return;
    }

    const load = async () => {
      try {
        setInvitesLoading(true);
        setInvitesError(null);
        setGlobalError(null);
        const data = await fetchWorkspaceInvites(callApi, activeWorkspaceId);
        setInvites(data);
      } catch (err: any) {
        const msg = normalizeApiError(err);

        // Swallow 403 / permission errors – treat as "no invites"
        if (
          msg.includes("permission") ||
          msg.includes("don't have permission")
        ) {
          setInvites([]);
          setInvitesError(null);
        } else {
          setInvitesError(msg);
        }
      } finally {
        setInvitesLoading(false);
      }
    };

    void load();
  }, [activeWorkspaceId, callApi, canInvite]);

  // ===== Auto-dismiss globalError after 2 seconds =====
  useEffect(() => {
    if (!globalError) return;

    const timer = setTimeout(() => {
      setGlobalError(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [globalError]);

  // ===== Handlers =====

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !inviteEmail.trim() || inviteSaving) return;

    const trimmedEmail = inviteEmail.trim().toLowerCase();

    // Check if already a member
    const isAlreadyMember = members.some((m) => m.user.email?.toLowerCase() === trimmedEmail);
    if (isAlreadyMember) {
      setGlobalError("This user is already a member of the workspace.");
      toast.error("This user is already a member of the workspace.");
      return;
    }

    // Check if already invited
    const isAlreadyInvited = invites.some((inv) => inv.email.toLowerCase() === trimmedEmail);
    if (isAlreadyInvited) {
      setGlobalError("This user has already been invited.");
      toast.error("This user has already been invited.");
      return;
    }

    setInviteSaving(true);
    setGlobalError(null);
    
    inviteWorkspaceMember(callApi, activeWorkspaceId, {
      email: trimmedEmail,
      role: inviteRole,
    }).then((created) => {
      setInvites((prev) => [created, ...prev]);
      setInviteEmail("");
      setInviteRole("MEMBER");
      setInviteOpen(false);
      toast.success(`Invite sent to ${trimmedEmail}`);
    }).catch((err: any) => {
      const errorMsg = normalizeApiError(err);
      setGlobalError(errorMsg);
      toast.error(errorMsg || 'Failed to send invite');
    }).finally(() => {
      setInviteSaving(false);
    });
  };

  const handleChangeRole = async (memberId: string, role: WorkspaceRole) => {
    if (!activeWorkspaceId) return;

    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    if (member.role === role) return;

    const displayName = displayNameFromUser(member.user);
    const fromRole = member.role.toLowerCase();
    const toRole = role.toLowerCase();

    // Check if this is the current user changing their own role
    const isCurrentUser = currentUser?.sub === member.user.auth0Id;

    let title = "Change member role";
    let message = `Change ${displayName}'s role from ${fromRole} to ${toRole}?`;
    let isDangerous = false;

    if (isCurrentUser) {
      // Changing your own role
      title = `Change your role to ${toRole}`;
      message =
        `You are about to change your role from ${fromRole} to ${toRole}.\n\n` +
        `This will affect your access and permissions in this workspace.`;

      if (fromRole === "owner") {
        isDangerous = true;
        message =
          `You are about to step down as owner.\n\n` +
          `You will no longer have full control of this workspace. ` +
          `Make sure another owner is available to manage it.`;
      }
    } else {
      // Changing someone else's role
      if (role === "OWNER") {
        title = "Make owner";
        message =
          `You are about to make ${displayName} an owner.\n\n` +
          "Owners have full control of this workspace, including managing members and deleting it.";
        isDangerous = true;
      } else if (role === "ADMIN" && member.role !== "ADMIN") {
        title = "Make admin";
        message =
          `You are about to make ${displayName} an admin.\n\n` +
          "Admins can manage members and settings.";
      }
    }

    const doChangeRole = async () => {
      try {
        setRoleSavingId(memberId);
        setGlobalError(null);
        const updated = await updateWorkspaceMemberRole(
          callApi,
          activeWorkspaceId,
          memberId,
          role
        );
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? updated : m))
        );

        // Update Zustand if we changed our own role
        if (isCurrentUser) {
          const { workspaces } = useWorkspaceStore.getState();
          const updated_workspaces = workspaces.map((w) =>
            w.workspaceId === activeWorkspaceId ? { ...w, role } : w
          );
          useWorkspaceStore.setState({ workspaces: updated_workspaces });
        }
        
        toast.success(`Role updated to ${role} successfully`);
      } catch (err: any) {
        const errorMsg = normalizeApiError(err);
        setGlobalError(errorMsg);
        toast.error(errorMsg || 'Failed to update role');
      } finally {
        setRoleSavingId(null);
      }
    };

    setConfirmDialog({
      title,
      message,
      confirmText: isCurrentUser ? "Change my role" : "Confirm",
      cancelText: "Cancel",
      isDangerous,
      onConfirm: doChangeRole,
    });
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeWorkspaceId) return;

    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const displayName = displayNameFromUser(member.user);
    const role = member.role.toLowerCase();
    const isCurrentUser = currentUser?.sub === member.user.auth0Id;

    const message = isCurrentUser
      ? `You are about to leave this workspace.\n\n` +
        `You will immediately lose access to all projects and tasks in this workspace.`
      : `Remove ${displayName} (${role}) from this workspace?\n\n` +
        "They will immediately lose access to all projects and tasks in this workspace.";

    const doRemove = async () => {
      try {
        setRemoveSavingId(memberId);
        setGlobalError(null);
        
        if (isCurrentUser) {
          // Clear workspace FIRST before removing
          setActiveWorkspace(null);
        }
        
        await removeWorkspaceMember(callApi, activeWorkspaceId, memberId);
        
        if (isCurrentUser) {
          // Reload and then redirect
          await reloadWorkspaces();
          toast.success("You have left the workspace");
          // Give a moment for state to update before redirect
          setTimeout(() => {
            router.push("/");
          }, 500);
        } else {
          // If removing someone else
          setMembers((prev) => prev.filter((m) => m.id !== memberId));
          toast.success(`${displayNameFromUser(member.user)} removed from workspace`);
        }
      } catch (err: any) {
        const errorMsg = normalizeApiError(err);
        // Only show error if not a permission error from leaving
        if (!isCurrentUser || !errorMsg.includes("member")) {
          setGlobalError(errorMsg);
          toast.error(errorMsg || 'Failed to remove member');
        }
      } finally {
        setRemoveSavingId(null);
      }
    };

    setConfirmDialog({
      title: isCurrentUser ? "Leave workspace" : "Remove member",
      message,
      confirmText: isCurrentUser ? "Leave" : "Remove",
      cancelText: "Cancel",
      isDangerous: true,
      onConfirm: doRemove,
    });
  };

  const handleCopyInviteLink = async (invite: WorkspaceInvite) => {
    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://app.taskrythm.com";
      const url = `${origin}/accept-invite?token=${encodeURIComponent(
        invite.token
      )}`;
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Invite link copied to clipboard!");
      } else {
        // fallback
        prompt("Copy this invite link:", url);
      }
    } catch (err) {
      console.error("Failed to copy invite link", err);
      toast.error("Failed to copy link. Please copy manually.");
    }
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        padding: "24px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
        marginBottom: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: "2px solid #f1f5f9",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "6px",
            }}
          >
          
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#1e293b",
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              Workspace Members
            </h3>
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "#64748b",
              margin: 0,
              paddingLeft: "0px",
              fontWeight: 500,
            }}
          >
            {workspaceName}
            {currentRole && (
              <>
                {" "}
                · Your role:{" "}
                <span
                  style={{
                    fontWeight: 700,
                    color: getRoleColor(currentRole).color,
                  }}
                >
                  {currentRole.toLowerCase()}
                </span>
              </>
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {onExpandAction && (
            <button
              type="button"
              onClick={() => onExpandAction(!isExpanded)}
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                background: "white",
                color: "#64748b",
                cursor: "pointer",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.background = "white";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.04)";
              }}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}

          {canInvite && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                fontSize: "13px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
              }}
            >
              <UserPlus size={16} />
              
            </button>
          )}
        </div>
      </div>

      {globalError && (
        <div
          style={{
            marginBottom: "16px",
            fontSize: "13px",
            color: "#ef4444",
            background: "#fef2f2",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid #fecaca",
            fontWeight: 600,
          }}
        >
          {globalError}
        </div>
      )}

      {/* Members list */}
      <div
        style={{
          marginBottom: "24px",
        }}
      >
        <h4
          style={{
            fontSize: "14px",
            fontWeight: 800,
            color: "#475569",
            margin: 0,
            marginBottom: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Active Members
        </h4>

        {membersError && (
          <div
            style={{
              fontSize: "13px",
              color: "#ef4444",
              background: "#fef2f2",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "1px solid #fecaca",
              marginBottom: "12px",
              fontWeight: 600,
            }}
          >
            {membersError}
          </div>
        )}

        {membersLoading ? (
          <div
            style={{
              fontSize: "14px",
              color: "#64748b",
              textAlign: "center",
              padding: "32px 16px",
              background: "#f8fafc",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                margin: "0 auto 12px",
                borderRadius: "50%",
                border: "3px solid #e2e8f0",
                borderTopColor: "#10b981",
                animation: "spin 1s linear infinite",
              }}
            />
            Loading members…
          </div>
        ) : members.length === 0 ? (
          <div
            style={{
              fontSize: "14px",
              color: "#64748b",
              textAlign: "center",
              padding: "32px 16px",
              background: "#f8fafc",
              borderRadius: "12px",
              border: "2px dashed #cbd5e1",
            }}
          >
            <Users size={32} color="#94a3b8" style={{ marginBottom: "8px" }} />
            <div style={{ fontWeight: 600 }}>No members yet</div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {members.map((m) => {
              const displayName = displayNameFromUser(m.user);
              const displayEmail = displayEmailFromUser(m.user);

              const isOwner = m.role === "OWNER";
              const isLastOwner = isOwner && ownerCount === 1;
              const roleColors = getRoleColor(m.role);

              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 16px",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "white";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: 800,
                        color: "white",
                        flexShrink: 0,
                        boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                      }}
                    >
                      {getInitials(displayName || displayEmail)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#1e293b",
                          marginBottom: "2px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {displayName}
                      </div>
                      {displayEmail && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Mail size={12} />
                          {displayEmail}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexShrink: 0,
                    }}
                  >
                    {canManageMembers ? (
                      isLastOwner ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 12px",
                            background: roleColors.bg,
                            color: roleColors.color,
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 700,
                            border: `1px solid ${roleColors.border}`,
                          }}
                        >
                          {getRoleIcon(m.role)}
                          owner (required)
                        </div>
                      ) : (
                        <select
                          value={m.role}
                          onChange={(e) =>
                            handleChangeRole(
                              m.id,
                              e.target.value as WorkspaceRole
                            )
                          }
                          disabled={roleSavingId === m.id || !canChangeRole(m, m.role)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "2px solid #e2e8f0",
                            fontSize: "13px",
                            background: "white",
                            fontWeight: 600,
                            cursor: roleSavingId === m.id || !canChangeRole(m, m.role) ? "not-allowed" : "pointer",
                            transition: "all 0.2s ease",
                            opacity: !canChangeRole(m, m.role) ? 0.5 : 1,
                          }}
                          onFocus={(e) => {
                            if (canChangeRole(m, m.role)) {
                              e.currentTarget.style.borderColor = "#10b981";
                              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)";
                            }
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          {canPromoteToOwner && (
                            <option value="OWNER">Owner</option>
                          )}
                          {(currentRole === "OWNER" || (currentRole === "ADMIN")) && (
                            <option value="ADMIN">Admin</option>
                          )}
                          <option value="MEMBER">Member</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      )
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          background: roleColors.bg,
                          color: roleColors.color,
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: 700,
                          border: `1px solid ${roleColors.border}`,
                        }}
                      >
                        {getRoleIcon(m.role)}
                        {m.role.toLowerCase()}
                      </div>
                    )}

                    {(currentRole === "OWNER" || currentUser?.sub === m.user.auth0Id) && m.role !== "OWNER" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        disabled={removeSavingId === m.id}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#ef4444",
                          fontSize: "12px",
                          cursor:
                            removeSavingId === m.id
                              ? "not-allowed"
                              : "pointer",
                          padding: "8px",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontWeight: 600,
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (removeSavingId !== m.id) {
                            e.currentTarget.style.background = "#fef2f2";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                        title={currentUser?.sub === m.user.auth0Id ? "Leave workspace" : "Remove member"}
                      >
                        {removeSavingId === m.id ? (
                          <div
                            style={{
                              width: "14px",
                              height: "14px",
                              border: "2px solid #fecaca",
                              borderTopColor: "#ef4444",
                              borderRadius: "50%",
                              animation: "spin 0.8s linear infinite",
                            }}
                          />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending invites – only for OWNER/ADMIN */}
      {canInvite && (
        <div>
          <h4
            style={{
              fontSize: "14px",
              fontWeight: 800,
              color: "#475569",
              margin: 0,
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Pending Invites
          </h4>

          {invitesError && (
            <div
              style={{
                fontSize: "13px",
                color: "#ef4444",
                background: "#fef2f2",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid #fecaca",
                marginBottom: "12px",
                fontWeight: 600,
              }}
            >
              {invitesError}
            </div>
          )}

          {invitesLoading ? (
            <div
              style={{
                fontSize: "14px",
                color: "#64748b",
                textAlign: "center",
                padding: "20px 16px",
                background: "#f8fafc",
                borderRadius: "12px",
              }}
            >
              Loading invites…
            </div>
          ) : invites.length === 0 ? (
            <div
              style={{
                fontSize: "13px",
                color: "#64748b",
                padding: "16px",
                background: "#f8fafc",
                borderRadius: "12px",
                textAlign: "center",
                border: "1px dashed #cbd5e1",
              }}
            >
              No active invites
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {invites.map((inv) => {
                const roleColors = getRoleColor(inv.role);

                const copyColors = {
                  bg: "#ecfdf5",     
                  color: "#047857",  
                  border: "#d1fae5", 
                };

                const badgeStyle = (
                  colors: { bg: string; color: string; border: string },
                  clickable = false
                ): React.CSSProperties => ({
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  background: colors.bg,
                  color: colors.color,
                  borderRadius: "999px",
                  fontWeight: 600,
                  fontSize: "12px",
                  border: `1px solid ${colors.border}`,
                  lineHeight: 1.2,
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  cursor: clickable ? "pointer" : "default",
                  transition: "all 0.15s ease",
                });

                return (
                  <div
                    key={inv.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      padding: "16px",
                      borderRadius: "12px",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {/* Email */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Mail size={16} color="#d97706" />
                      </div>

                      <div
                        style={{
                          fontSize: "14px",
                          color: "#92400e",
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                        title={inv.email}
                      >
                        {inv.email}
                      </div>
                    </div>

                    {/* Role + Copy Link */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={badgeStyle(roleColors, false)}>
                        {getRoleIcon(inv.role)}
                        {inv.role.toLowerCase()}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyInviteLink(inv)}
                        style={badgeStyle(copyColors, true)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.filter = "brightness(0.95)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.filter = "none";
                        }}
                        title="Copy invite link"
                      >
                        <LinkIcon size={13} />
                        copy link
                      </button>
                    </div>

                    {/* Expiry */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "#b45309",
                        fontSize: "12px",
                        fontWeight: 500,
                      }}
                    >
                      <Calendar size={13} />
                      Expires {formatDate(inv.expiresAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Invite Modal */}
      {inviteOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1200,
            animation: "fadeIn 0.2s ease",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !inviteSaving) {
              setInviteOpen(false);
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
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              animation: "slideUp 0.3s ease",
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                  boxShadow: "0 4px 16px rgba(16, 185, 129, 0.3)",
                }}
              >
                <UserPlus size={24} color="white" />
              </div>
              <h3
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#1e293b",
                  marginBottom: "8px",
                  letterSpacing: "-0.4px",
                }}
              >
                Invite Member
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#64748b",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                Generate an invite link for this workspace. You can share it manually via email or chat.
              </p>
            </div>

            {globalError && (
              <div
                style={{
                  marginBottom: "16px",
                  fontSize: "13px",
                  color: "#ef4444",
                  background: "#fef2f2",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1px solid #fecaca",
                  fontWeight: 600,
                }}
              >
                {globalError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#475569",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleInviteSubmit(e);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "2px solid #e2e8f0",
                    fontSize: "14px",
                    fontWeight: 500,
                    outline: "none",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#10b981";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#475569",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as WorkspaceRole)
                  }
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "2px solid #e2e8f0",
                    fontSize: "14px",
                    fontWeight: 600,
                    background: "white",
                    outline: "none",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#10b981";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>

              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  disabled={inviteSaving}
                  style={{
                    padding: "12px 24px",
                    fontSize: "14px",
                    fontWeight: 700,
                    borderRadius: "10px",
                    border: "2px solid #e2e8f0",
                    background: "white",
                    color: "#64748b",
                    cursor: inviteSaving ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!inviteSaving) {
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
                  onClick={handleInviteSubmit}
                  disabled={inviteSaving || !inviteEmail.trim()}
                  style={{
                    padding: "12px 28px",
                    fontSize: "14px",
                    fontWeight: 700,
                    borderRadius: "10px",
                    border: "none",
                    background:
                      inviteSaving || !inviteEmail.trim()
                        ? "#cbd5e1"
                        : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "white",
                    cursor:
                      inviteSaving || !inviteEmail.trim()
                        ? "not-allowed"
                        : "pointer",
                    boxShadow:
                      inviteSaving || !inviteEmail.trim()
                        ? "none"
                        : "0 4px 12px rgba(16, 185, 129, 0.4)",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                  onMouseEnter={(e) => {
                    if (!inviteSaving && inviteEmail.trim()) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.5)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      inviteSaving || !inviteEmail.trim()
                        ? "none"
                        : "0 4px 12px rgba(16, 185, 129, 0.4)";
                  }}
                >
                  {inviteSaving ? (
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
                      Generating…
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      Generate invite
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog */}
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
        >
          <div
            style={{
              background: "white",
              padding: "32px",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.4)",
              animation: "slideUp 0.3s ease",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: confirmDialog.isDangerous
                  ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                  : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                boxShadow: confirmDialog.isDangerous
                  ? "0 4px 16px rgba(239, 68, 68, 0.3)"
                  : "0 4px 16px rgba(59, 130, 246, 0.3)",
              }}
            >
              {confirmDialog.isDangerous ? (
                <AlertTriangle size={24} color="white" />
              ) : (
                <Users size={24} color="white" />
              )}
            </div>
            <h3
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "#1e293b",
                margin: 0,
                marginBottom: "12px",
                letterSpacing: "-0.3px",
              }}
            >
              {confirmDialog.title}
            </h3>
            <p
              style={{
                fontSize: "15px",
                color: "#64748b",
                lineHeight: "1.6",
                whiteSpace: "pre-line",
                margin: 0,
                marginBottom: "24px",
              }}
            >
              {confirmDialog.message}
            </p>

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
                  background: confirmDialog.isDangerous
                    ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                    : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  color: "white",
                  cursor: "pointer",
                  boxShadow: confirmDialog.isDangerous
                    ? "0 4px 12px rgba(239, 68, 68, 0.4)"
                    : "0 4px 12px rgba(59, 130, 246, 0.4)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = confirmDialog.isDangerous
                    ? "0 6px 16px rgba(239, 68, 68, 0.5)"
                    : "0 6px 16px rgba(59, 130, 246, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = confirmDialog.isDangerous
                    ? "0 4px 12px rgba(239, 68, 68, 0.4)"
                    : "0 4px 12px rgba(59, 130, 246, 0.4)";
                }}
              >
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

export default WorkspaceMembersCard;