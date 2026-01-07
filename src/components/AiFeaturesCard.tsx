"use client";

import { useState } from "react";
import { Sparkles, HeartPulse, FileText, MessageSquare, HelpCircle, X } from "lucide-react";

interface AiFeaturesCardProps {
  projectId: string;
  projectName: string;
  onOpenAiPlanner: (projectId: string) => void;
  onCheckHealth: (projectId: string, projectName: string) => void;
  onOpenScribe: (projectId: string, projectName: string) => void;
  onOpenChat: (projectId: string, projectName: string) => void;
}

export default function AiFeaturesCard({
  projectId,
  projectName,
  onOpenAiPlanner,
  onCheckHealth,
  onOpenScribe,
  onOpenChat,
}: AiFeaturesCardProps) {
  const [showInfoModal, setShowInfoModal] = useState(false);

  const aiFeatures = [
    {
      icon: Sparkles,
      color: "#7c3aed",
      label: "AI Architect (Plan)",
      onClick: () => onOpenAiPlanner(projectId),
    },
    {
      icon: HeartPulse,
      color: "#db2777",
      label: "AI Doctor (Health)",
      onClick: () => onCheckHealth(projectId, projectName),
    },
    {
      icon: FileText,
      color: "#2563eb",
      label: "The Scribe (Report)",
      onClick: () => onOpenScribe(projectId, projectName),
    },
    {
      icon: MessageSquare,
      color: "#16a34a",
      label: "The Brain (Chat)",
      onClick: () => onOpenChat(projectId, projectName),
    },
  ];

  return (
    <>
      <div
        style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
          marginTop: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #7c3aed 0%, #667eea 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
            }}
          >
            <Sparkles size={18} color="white" />
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 800,
                margin: 0,
                color: "#1e293b",
                letterSpacing: "-0.3px",
              }}
            >
              AI Features
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInfoModal(true);
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              title="AI Features Help"
            >
              <HelpCircle size={16} color="#64748b" />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {aiFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <button
                key={index}
                onClick={feature.onClick}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  textAlign: "left",
                  cursor: "pointer",
                  borderRadius: "10px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
              >
                <div style={{ color: feature.color, display: "flex", alignItems: "center" }}>
                  <Icon size={16} />
                </div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#334155" }}>
                  {feature.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Features Info Modal */}
      {showInfoModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(2px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 200,
          }}
          onClick={() => setShowInfoModal(false)}
        >
          <div
            style={{
              background: "white",
              padding: "32px",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowInfoModal(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={20} color="#7c3aed" />
              </div>
              <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#1e293b", margin: 0 }}>
                AI Features Guide
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ minWidth: "24px", paddingTop: "4px" }}>
                  <Sparkles size={20} color="#7c3aed" />
                </div>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                    AI Architect (Planner)
                  </h4>
                  <p style={{ margin: 0, fontSize: "14px", color: "#64748b", lineHeight: "1.5" }}>
                    Automatically breaks down a high-level goal (e.g., "Build a website") into actionable tasks
                    and subtasks for you.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ minWidth: "24px", paddingTop: "4px" }}>
                  <HeartPulse size={20} color="#db2777" />
                </div>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                    AI Doctor (Health Check)
                  </h4>
                  <p style={{ margin: 0, fontSize: "14px", color: "#64748b", lineHeight: "1.5" }}>
                    Analyzes your project for stalled tasks, bottlenecks, and risks, then suggests fixes.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ minWidth: "24px", paddingTop: "4px" }}>
                  <FileText size={20} color="#2563eb" />
                </div>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                    The Scribe (Reports)
                  </h4>
                  <p style={{ margin: 0, fontSize: "14px", color: "#64748b", lineHeight: "1.5" }}>
                    Generates professional status reports, release notes, or client updates instantly based on
                    completed tasks.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ minWidth: "24px", paddingTop: "4px" }}>
                  <MessageSquare size={20} color="#16a34a" />
                </div>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                    The Brain (Chat)
                  </h4>
                  <p style={{ margin: 0, fontSize: "14px", color: "#64748b", lineHeight: "1.5" }}>
                    An intelligent assistant that knows your project context. Ask it anything like "What's
                    blocking us?" or "Summarize progress".
                  </p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "24px", textAlign: "right" }}>
              <button
                onClick={() => setShowInfoModal(false)}
                style={{
                  padding: "10px 20px",
                  background: "#1e293b",
                  color: "white",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
