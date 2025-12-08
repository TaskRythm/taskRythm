"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Link as LinkIcon } from "lucide-react";
import {
  useWorkspaceStore,
  type WorkspaceRole,
} from "@/store/workspaceStore";
import { useAuth } from "@/hooks/useAuth";
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
    return email.split("@")[0] || "Member";
  }
  return email;
}

function displayEmailFromUser(user: { email?: string | null }) {
  const email = (user.email || "").trim();
  if (!email || email.endsWith("@placeholder.local")) return "";
  return email;
}

export function WorkspaceMembersCard() {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const { callApi, user: currentUser } = useAuth();

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
      return;
    }

    const load = async () => {
      try {
        setInvitesLoading(true);
        setInvitesError(null);
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

  // ===== Handlers =====

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !inviteEmail.trim()) return;

    try {
      setInviteSaving(true);
      setGlobalError(null);
      const created = await inviteWorkspaceMember(callApi, activeWorkspaceId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInvites((prev) => [created, ...prev]);
      setInviteEmail("");
      setInviteRole("MEMBER");
      setInviteOpen(false);
    } catch (err: any) {
      setGlobalError(normalizeApiError(err));
    } finally {
      setInviteSaving(false);
    }
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
      } catch (err: any) {
        setGlobalError(normalizeApiError(err));
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

    const message =
      `Remove ${displayName} (${role}) from this workspace?\n\n` +
      "They will immediately lose access to all projects and tasks in this workspace.";

    const doRemove = async () => {
      try {
        setRemoveSavingId(memberId);
        setGlobalError(null);
        await removeWorkspaceMember(callApi, activeWorkspaceId, memberId);
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } catch (err: any) {
        setGlobalError(normalizeApiError(err));
      } finally {
        setRemoveSavingId(null);
      }
    };

    setConfirmDialog({
      title: "Remove member",
      message,
      confirmText: "Remove",
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
        alert("Invite link copied to clipboard");
      } else {
        // fallback
        prompt("Copy this invite link:", url);
      }
    } catch (err) {
      console.error("Failed to copy invite link", err);
      alert("Failed to copy link. Please copy manually.");
    }
  };

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
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "12px",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "2px",
            }}
          >
            <Users size={18} color="#0052cc" />
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#172b4d",
                margin: 0,
              }}
            >
              Workspace members
            </h3>
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "#6b778c",
              margin: 0,
            }}
          >
            {workspaceName}
            {currentRole && (
              <>
                {" "}
                · Your role: <strong>{currentRole.toLowerCase()}</strong>
              </>
            )}
          </p>
        </div>

        {canInvite && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "none",
              fontSize: "12px",
              background:
                "linear-gradient(135deg, #0052cc 0%, #0065ff 100%)",
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
              boxShadow: "0 1px 4px rgba(0,82,204,0.3)",
            }}
          >
            Invite
          </button>
        )}
      </div>

      {globalError && (
        <div
          style={{
            marginBottom: "8px",
            fontSize: "12px",
            color: "#de350b",
          }}
        >
          {globalError}
        </div>
      )}

      {/* Members list */}
      <div
        style={{
          marginBottom: "16px",
        }}
      >
        <h4
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#6b778c",
            margin: 0,
            marginBottom: "6px",
          }}
        >
          Members
        </h4>

        {membersError && (
          <div
            style={{
              fontSize: "12px",
              color: "#de350b",
              marginBottom: "4px",
            }}
          >
            {membersError}
          </div>
        )}

        {membersLoading ? (
          <div
            style={{
              fontSize: "13px",
              color: "#6b778c",
            }}
          >
            Loading members…
          </div>
        ) : members.length === 0 ? (
          <div
            style={{
              fontSize: "13px",
              color: "#6b778c",
              fontStyle: "italic",
            }}
          >
            No members yet.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {members.map((m) => {
              const displayName = displayNameFromUser(m.user);
              const displayEmail = displayEmailFromUser(m.user);

              const isOwner = m.role === "OWNER";
              const isLastOwner = isOwner && ownerCount === 1;

              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "999px",
                        background: "#f4f5f7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#42526e",
                      }}
                    >
                      {getInitials(displayName || displayEmail)}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#172b4d",
                        }}
                      >
                        {displayName}
                      </div>
                      {displayEmail && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#6b778c",
                          }}
                        >
                          {displayEmail}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {canManageMembers ? (
                      isLastOwner ? (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#6b778c",
                            fontWeight: 500,
                          }}
                        >
                          owner (required)
                        </span>
                      ) : (
                        <select
                          value={m.role}
                          onChange={(e) =>
                            handleChangeRole(
                              m.id,
                              e.target.value as WorkspaceRole
                            )
                          }
                          disabled={roleSavingId === m.id}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "1px solid #dfe1e6",
                            fontSize: "12px",
                            background: "white",
                          }}
                        >
                          {canPromoteToOwner && (
                            <option value="OWNER">Owner</option>
                          )}
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Member</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      )
                    ) : (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#6b778c",
                        }}
                      >
                        {m.role.toLowerCase()}
                      </span>
                    )}

                    {canManageMembers && m.role !== "OWNER" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        disabled={removeSavingId === m.id}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#de350b",
                          fontSize: "11px",
                          cursor:
                            removeSavingId === m.id
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {removeSavingId === m.id ? "…" : "Remove"}
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
              fontSize: "13px",
              fontWeight: 600,
              color: "#6b778c",
              margin: 0,
              marginBottom: "6px",
            }}
          >
            Pending invites
          </h4>

          {invitesError && (
            <div
              style={{
                fontSize: "12px",
                color: "#de350b",
                marginBottom: "4px",
              }}
            >
              {invitesError}
            </div>
          )}

          {invitesLoading ? (
            <div
              style={{
                fontSize: "13px",
                color: "#6b778c",
              }}
            >
              Loading invites…
            </div>
          ) : invites.length === 0 ? (
            <div
              style={{
                fontSize: "13px",
                color: "#6b778c",
                fontStyle: "italic",
              }}
            >
              No active invites.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "#f7f8fa",
                    border: "1px dashed #dfe1e6",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#172b4d",
                        fontWeight: 500,
                      }}
                    >
                      {inv.email}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#6b778c",
                      }}
                    >
                      Role: <strong>{inv.role.toLowerCase()}</strong> ·
                      Expires {formatDate(inv.expiresAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyInviteLink(inv)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 10px",
                      fontSize: "11px",
                      borderRadius: "6px",
                      border: "1px solid #0052cc",
                      background: "white",
                      color: "#0052cc",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    <LinkIcon size={12} />
                    Copy link
                  </button>
                </div>
              ))}
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
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1200,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 12px 32px rgba(9,30,66,0.35)",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "#172b4d",
                marginBottom: "8px",
              }}
            >
              Invite member
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "#6b778c",
                marginTop: 0,
                marginBottom: "16px",
              }}
            >
              Generate an invite link for this workspace. You can share it
              manually via email or chat.
            </p>

            {globalError && (
              <div
                style={{
                  marginBottom: "8px",
                  fontSize: "12px",
                  color: "#de350b",
                }}
              >
                {globalError}
              </div>
            )}

            <form
              onSubmit={handleInviteSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#6b778c",
                }}
              >
                Email address
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  style={{
                    marginTop: "4px",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    border: "1px solid #dfe1e6",
                    fontSize: "14px",
                    width: "100%",
                  }}
                />
              </label>

              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#6b778c",
                }}
              >
                Role
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as WorkspaceRole)
                  }
                  style={{
                    marginTop: "4px",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    border: "1px solid #dfe1e6",
                    fontSize: "14px",
                    background: "white",
                    width: "100%",
                  }}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </label>

              <div
                style={{
                  marginTop: "16px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  disabled={inviteSaving}
                  style={{
                    padding: "8px 14px",
                    fontSize: "14px",
                    borderRadius: "4px",
                    border: "1px solid #c1c7d0",
                    background: "white",
                    cursor: inviteSaving ? "default" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSaving || !inviteEmail.trim()}
                  style={{
                    padding: "8px 14px",
                    fontSize: "14px",
                    borderRadius: "4px",
                    border: "none",
                    background:
                      inviteSaving || !inviteEmail.trim()
                        ? "#c1c7d0"
                        : "linear-gradient(135deg, #0052cc 0%, #0065ff 100%)",
                    color: "white",
                    cursor:
                      inviteSaving || !inviteEmail.trim()
                        ? "default"
                        : "pointer",
                  }}
                >
                  {inviteSaving ? "Generating…" : "Generate invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog */}
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
                  background: confirmDialog.isDangerous
                    ? "linear-gradient(135deg, #de350b 0%, #f45e3f 100%)"
                    : "linear-gradient(135deg, #0052cc 0%, #0065ff 100%)",
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

export default WorkspaceMembersCard;