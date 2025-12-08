"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

type AcceptState = "idle" | "checking" | "success" | "error" | "no-token";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, login, callApi } = useAuth();

  const [state, setState] = useState<AcceptState>("idle");
  const [message, setMessage] = useState<string>("");

  const token = searchParams.get("token");

  // Try to accept once user is authenticated
  useEffect(() => {
    if (!token) {
      setState("no-token");
      setMessage("No invite token provided.");
      return;
    }

    if (isLoading) return;

    if (!isAuthenticated) {
      // User is not logged in – ask them to login first.
      setState("idle");
      setMessage("You need to log in to accept this workspace invite.");
      return;
    }

    // User is logged in, accept the invite
    const accept = async () => {
      try {
        setState("checking");
        setMessage("Accepting invite…");

        await callApi(`/workspaces/invites/${encodeURIComponent(token)}/accept`, {
          method: "POST",
        });

        setState("success");
        setMessage("You’ve joined the workspace successfully.");
      } catch (err: any) {
        setState("error");
        setMessage(err.message || "Failed to accept invite.");
      }
    };

    void accept();
  }, [token, isAuthenticated, isLoading, callApi]);

  const handleLoginClick = () => {
    if (!token) {
      login();
    } else {
      // after login, Auth0 will return to /accept-invite?token=...
      login(`/accept-invite?token=${encodeURIComponent(token)}`);
    }
  };

  const handleGoToApp = () => {
    router.push("/");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f5f7",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "28px 32px",
          maxWidth: "460px",
          width: "100%",
          boxShadow: "0 12px 32px rgba(9,30,66,0.2)",
          border: "1px solid #e1e5e9",
        }}
      >
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#172b4d",
            marginBottom: "8px",
          }}
        >
          Accept workspace invite
        </h1>

        <p
          style={{
            fontSize: "14px",
            color: "#6b778c",
            marginBottom: "16px",
          }}
        >
          {message ||
            "Open this page using an invite link to join a workspace in TaskRythm."}
        </p>

        {/* Actions */}
        <div
          style={{
            marginTop: "12px",
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
          }}
        >
          {(!token || state === "no-token") && (
            <button
              type="button"
              onClick={handleGoToApp}
              style={{
                padding: "8px 14px",
                fontSize: "14px",
                borderRadius: "6px",
                border: "1px solid #c1c7d0",
                background: "white",
                cursor: "pointer",
              }}
            >
              Go to app
            </button>
          )}

          {!isAuthenticated && token && (
            <button
              type="button"
              onClick={handleLoginClick}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                borderRadius: "6px",
                border: "none",
                background:
                  "linear-gradient(135deg, #0052cc 0%, #0065ff 100%)",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Log in to accept
            </button>
          )}

          {(state === "success" || state === "error") && (
            <button
              type="button"
              onClick={handleGoToApp}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                borderRadius: "6px",
                border: "none",
                background:
                  "linear-gradient(135deg, #0052cc 0%, #0065ff 100%)",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Go to workspace
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcceptInviteContent />
    </Suspense>
  );
}