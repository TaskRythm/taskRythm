// src/components/WorkspaceSidebar.tsx
'use client';

import { useState } from 'react';
import { Layers, Plus, Building2, X, Loader2, Check, Sparkles } from 'lucide-react';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useToast } from '@/contexts/ToastContext';

export default function WorkspaceSidebar() {
  const { workspaces, loading, creating, error, createWorkspace } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.warning('Please enter a workspace name');
      return;
    }

    try {
      await createWorkspace({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      });

      toast.success(`Workspace "${newName.trim()}" created successfully!`);
      setNewName('');
      setNewDesc('');
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Failed to create workspace. Please try again.');
    }
  };

  return (
    <>
      <div
        style={{
          width: '280px',
          borderRight: '1px solid #e2e8f0',
          padding: '20px 16px',
          background: '#fafbfc',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          minHeight: '100%',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '16px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
              }}
            >
              <Layers size={18} color="white" strokeWidth={2.5} />
            </div>
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: '#1e293b',
                margin: 0,
                letterSpacing: '-0.3px',
              }}
            >
              Workspaces
            </h3>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#3B82F6',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#3B82F6';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.color = '#3B82F6';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div
            style={{
              fontSize: '13px',
              color: '#64748b',
              padding: '24px 16px',
              background: 'white',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                margin: '0 auto 12px',
                borderRadius: '50%',
                border: '3px solid #f1f5f9',
                borderTopColor: '#3B82F6',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div style={{ fontWeight: 600 }}>Loading...</div>
          </div>
        ) : error ? (
          <div
            style={{
              fontSize: '13px',
              color: '#ef4444',
              padding: '14px',
              background: '#fef2f2',
              borderRadius: '10px',
              border: '1px solid #fecaca',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : workspaces.length === 0 ? (
          <div
            style={{
              fontSize: '13px',
              color: '#64748b',
              padding: '32px 20px',
              background: 'white',
              borderRadius: '12px',
              border: '2px dashed #cbd5e1',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 12px',
                background: '#f8fafc',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={24} color="#94a3b8" />
            </div>
            <div style={{ fontWeight: 700, marginBottom: '4px', color: '#475569' }}>
              No workspaces
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Click + to create</div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {workspaces.map((m: any) => {
              const isActive = m.workspaceId === activeWorkspaceId;
              const isHovered = hoveredId === m.workspaceId;

              return (
                <div
                  key={m.workspaceId}
                  onClick={() => setActiveWorkspace(m.workspaceId)}
                  onMouseEnter={() => setHoveredId(m.workspaceId)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: isActive ? '#f0f0ff' : isHovered ? '#fafbfc' : 'white',
                    border: isActive ? '2px solid #3B82F6' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                  }}
                >
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '3px',
                        height: '60%',
                        background: 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)',
                        borderRadius: '0 3px 3px 0',
                      }}
                    />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: isActive
                          ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                          : '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 800,
                        color: isActive ? 'white' : '#64748b',
                        flexShrink: 0,
                        border: isActive ? 'none' : '1px solid #e2e8f0',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {m.workspace.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: isActive ? '#3B82F6' : '#1e293b',
                          marginBottom: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.workspace.name}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: isActive ? '#8b5cf6' : '#94a3b8',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {m.role.toLowerCase()}
                      </div>
                    </div>
                  </div>

                  {isActive && (
                    <Check
                      size={16}
                      color="#3B82F6"
                      strokeWidth={3}
                      style={{
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !creating) setIsModalOpen(false);
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '32px',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'slideUp 0.3s ease',
            }}
          >
            {/* Modal Header */}
            <div style={{ marginBottom: '28px' }}>
              
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#1e293b',
                  margin: '0 0 8px 0',
                  letterSpacing: '-0.4px',
                }}
              >
                Create Workspace
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                Set up a new collaborative space for your team
              </p>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Workspace Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering Team"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newName.trim() && !creating) {
                      e.preventDefault();
                      handleCreate(e);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '2px solid #e2e8f0',
                    fontSize: '14px',
                    outline: 'none',
                    fontWeight: 600,
                    color: '#1e293b',
                    transition: 'all 0.2s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3B82F6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="What is this workspace for?"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '2px solid #e2e8f0',
                    fontSize: '14px',
                    outline: 'none',
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    resize: 'none',
                    color: '#1e293b',
                    transition: 'all 0.2s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3B82F6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={creating}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid #e2e8f0',
                    background: 'white',
                    fontWeight: 700,
                    fontSize: '14px',
                    color: '#64748b',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!creating) {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background:
                      creating || !newName.trim()
                        ? '#cbd5e1'
                        : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    fontWeight: 700,
                    fontSize: '14px',
                    color: 'white',
                    cursor: creating || !newName.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow:
                      creating || !newName.trim()
                        ? 'none'
                        : '0 4px 12px rgba(102, 126, 234, 0.4)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!creating && newName.trim()) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow =
                      creating || !newName.trim()
                        ? 'none'
                        : '0 4px 12px rgba(102, 126, 234, 0.4)';
                  }}
                >
                  {creating ? (
                    <>
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: 'white',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }}
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} strokeWidth={2.5} />
                      Create Workspace
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
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
    </>
  );
}