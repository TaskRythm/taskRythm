// src/components/WorkspaceSidebar.tsx
'use client';

import { useState } from 'react';
import { Layers, Plus, Building2, Sparkles } from 'lucide-react';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useWorkspaceStore } from '@/store/workspaceStore';

export default function WorkspaceSidebar() {
  const { workspaces, loading, creating, error, createWorkspace } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hoveredWorkspace, setHoveredWorkspace] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createWorkspace({
      name: name.trim(),
      description: description.trim() || undefined,
    });

    setName('');
    setDescription('');
  };

  const handleSubmit = () => {
    if (!name.trim() || creating) return;
    
    createWorkspace({
      name: name.trim(),
      description: description.trim() || undefined,
    }).then(() => {
      setName('');
      setDescription('');
    });
  };

  return (
    <div
      style={{
        width: '280px',
        borderRight: '1px solid #e2e8f0',
        padding: '24px 16px',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        minHeight: '100%',
        boxShadow: '2px 0 12px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Workspaces Section */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '2px solid #f1f5f9',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            }}
          >
            <Layers size={16} color="white" />
          </div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: '#1e293b',
              margin: 0,
              letterSpacing: '-0.3px',
            }}
          >
            Workspaces
          </h3>
        </div>

        {loading ? (
          <div
            style={{
              fontSize: '14px',
              color: '#64748b',
              padding: '20px 16px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                margin: '0 auto 12px',
                borderRadius: '50%',
                border: '3px solid #e2e8f0',
                borderTopColor: '#667eea',
                animation: 'spin 1s linear infinite',
              }}
            />
            Loading workspaces…
          </div>
        ) : error ? (
          <div
            style={{
              fontSize: '13px',
              color: '#ef4444',
              padding: '16px',
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              borderRadius: '12px',
              border: '1px solid #fecaca',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : workspaces.length === 0 ? (
          <div
            style={{
              fontSize: '14px',
              color: '#64748b',
              padding: '24px 16px',
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
                background: '#f1f5f9',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={24} color="#94a3b8" />
            </div>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>No workspaces yet</div>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Create your first one below
            </span>
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {workspaces.map((m: any) => {
              const isActive = m.workspaceId === activeWorkspaceId;
              const isHovered = hoveredWorkspace === m.workspaceId;
              
              return (
                <li
                  key={m.workspaceId}
                  onClick={() => setActiveWorkspace(m.workspaceId)}
                  onMouseEnter={() => setHoveredWorkspace(m.workspaceId)}
                  onMouseLeave={() => setHoveredWorkspace(null)}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: isActive
                      ? 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)'
                      : isHovered
                      ? '#f8fafc'
                      : '#ffffff',
                    border: isActive ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive
                      ? '0 4px 16px rgba(139, 92, 246, 0.2)'
                      : isHovered
                      ? '0 4px 12px rgba(0, 0, 0, 0.08)'
                      : '0 1px 3px rgba(0, 0, 0, 0.04)',
                    transform: isActive ? 'translateX(4px)' : isHovered ? 'translateX(2px)' : 'translateX(0)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: isActive
                            ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 800,
                          color: '#fff',
                          flexShrink: 0,
                          boxShadow: isActive
                            ? '0 4px 12px rgba(139, 92, 246, 0.4)'
                            : '0 2px 8px rgba(102, 126, 234, 0.3)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {m.workspace.name.charAt(0).toUpperCase()}
                      </span>
                      {isActive && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            width: '12px',
                            height: '12px',
                            background: '#10b981',
                            borderRadius: '50%',
                            border: '2px solid white',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                          }}
                        />
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: isActive ? '#7c3aed' : '#1e293b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginBottom: '2px',
                          letterSpacing: '-0.2px',
                        }}
                      >
                        {m.workspace.name}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            color: isActive ? '#9333ea' : '#64748b',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            padding: '2px 8px',
                            background: isActive ? 'rgba(147, 51, 234, 0.1)' : '#f1f5f9',
                            borderRadius: '6px',
                          }}
                        >
                          {m.role.toLowerCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Create Workspace Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
          borderRadius: '16px',
          padding: '20px',
          border: '2px solid #e9d5ff',
          boxShadow: '0 4px 16px rgba(139, 92, 246, 0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            }}
          >
            <Plus size={14} color="white" />
          </div>
          <h4
            style={{
              fontSize: '14px',
              fontWeight: 800,
              color: '#1e293b',
              margin: 0,
              letterSpacing: '-0.2px',
            }}
          >
            New Workspace
          </h4>
          <Sparkles
            size={14}
            color="#8b5cf6"
            style={{ marginLeft: 'auto', opacity: 0.6 }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
          <div>
            <input
              type="text"
              placeholder="Workspace name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '2px solid #e9d5ff',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                transition: 'all 0.2s ease',
                background: 'white',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e9d5ff';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <div>
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '2px solid #e9d5ff',
                fontSize: '13px',
                fontWeight: 500,
                resize: 'none',
                outline: 'none',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
                background: 'white',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e9d5ff';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={creating || !name.trim()}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '10px',
              border: 'none',
              cursor: creating || !name.trim() ? 'not-allowed' : 'pointer',
              background:
                creating || !name.trim()
                  ? '#cbd5e1'
                  : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: '#ffffff',
              marginTop: '4px',
              transition: 'all 0.2s ease',
              boxShadow:
                creating || !name.trim()
                  ? 'none'
                  : '0 4px 12px rgba(139, 92, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (!creating && name.trim()) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow =
                creating || !name.trim()
                  ? 'none'
                  : '0 4px 12px rgba(139, 92, 246, 0.4)';
            }}
          >
            {creating ? (
              <>
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                Creating…
              </>
            ) : (
              <>
                <Plus size={16} />
                Create workspace
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}