// src/components/WorkspaceSidebar.tsx
'use client';

import { useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useWorkspaceStore } from '@/store/workspaceStore';

export default function WorkspaceSidebar() {
  const { workspaces, loading, creating, error, createWorkspace } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

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

  return (
    <div
      style={{
        width: '260px',
        borderRight: '1px solid #e1e5e9',
        padding: '20px 14px',
        background: 'linear-gradient(180deg, #fafbfc 0%, #f4f5f7 100%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        minHeight: '100%',
      }}
    >
      {/* Workspaces Section */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <Layers size={18} color="#0052cc" />
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#172b4d',
              margin: 0,
              letterSpacing: '-0.2px',
            }}
          >
            Workspaces
          </h3>
        </div>

        {loading ? (
          <div
            style={{
              fontSize: '13px',
              color: '#6b778c',
              padding: '12px',
              background: '#fff',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            Loading workspaces…
          </div>
        ) : error ? (
          <div
            style={{
              fontSize: '13px',
              color: '#de350b',
              padding: '12px',
              background: '#ffebe6',
              borderRadius: '8px',
            }}
          >
            {error}
          </div>
        ) : workspaces.length === 0 ? (
          <div
            style={{
              fontSize: '13px',
              color: '#6b778c',
              padding: '16px 12px',
              background: '#fff',
              borderRadius: '8px',
              border: '1px dashed #dfe1e6',
              textAlign: 'center',
            }}
          >
            No workspaces yet.
            <br />
            <span style={{ fontSize: '12px' }}>Create your first one below.</span>
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {workspaces.map((m: any) => {
              const isActive = m.workspaceId === activeWorkspaceId;
              return (
                <li
                  key={m.workspaceId}
                  onClick={() => setActiveWorkspace(m.workspaceId)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: isActive ? '#e9f2ff' : '#ffffff',
                    border: isActive
                      ? '1.5px solid #0052cc'
                      : '1px solid #e1e5e9',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive
                      ? '0 2px 8px rgba(0,82,204,0.12)'
                      : '0 1px 3px rgba(9,30,66,0.06)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: isActive
                          ? 'linear-gradient(135deg, #0052cc 0%, #0065ff 100%)'
                          : 'linear-gradient(135deg, #6b778c 0%, #8993a4 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      {m.workspace.name.charAt(0).toUpperCase()}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: isActive ? '#0052cc' : '#172b4d',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {m.workspace.name}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#6b778c',
                          marginTop: '1px',
                          textTransform: 'capitalize',
                        }}
                      >
                        {m.role.toLowerCase()}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Create Workspace Form */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid #e1e5e9',
          boxShadow: '0 1px 4px rgba(9,30,66,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '12px',
          }}
        >
          <Plus size={16} color="#0052cc" />
          <h4
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#172b4d',
              margin: 0,
            }}
          >
            New Workspace
          </h4>
        </div>

        <form
          onSubmit={handleCreate}
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <input
            type="text"
            placeholder="Workspace name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #dfe1e6',
              fontSize: '13px',
              outline: 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #dfe1e6',
              fontSize: '13px',
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            style={{
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: creating || !name.trim() ? 'not-allowed' : 'pointer',
              background:
                creating || !name.trim()
                  ? '#c1c7d0'
                  : 'linear-gradient(135deg, #0052cc 0%, #0065ff 100%)',
              color: '#ffffff',
              marginTop: '4px',
              transition: 'opacity 0.15s ease, transform 0.1s ease',
              boxShadow:
                creating || !name.trim()
                  ? 'none'
                  : '0 2px 6px rgba(0,82,204,0.3)',
            }}
          >
            {creating ? 'Creating…' : 'Create workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}