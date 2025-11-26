'use client';

import { useState } from 'react';
import { useWorkspaces } from '../hooks/useWorkspaces';

export default function WorkspaceSidebar() {
  const {
    workspaces,
    loading,
    creating,
    error,
    createWorkspace,
  } = useWorkspaces();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createWorkspace({ name: name.trim(), description: description.trim() || undefined });
    setName('');
    setDescription('');
  };

  return (
    <div
      style={{
        width: '260px',
        borderRight: '1px solid #e1e5e9',
        padding: '24px 16px',
        background: '#f7f8fa',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <div>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#172b4d',
            marginBottom: '8px',
          }}
        >
          Workspaces
        </h3>

        {loading ? (
          <div style={{ fontSize: '14px', color: '#6b778c' }}>
            Loading workspaces…
          </div>
        ) : error ? (
          <div style={{ fontSize: '13px', color: '#de350b' }}>{error}</div>
        ) : workspaces.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#6b778c' }}>
            No workspaces yet. Create your first one below.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {workspaces.map((m) => (
              <li
                key={m.workspaceId}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: '#ffffff',
                  border: '1px solid #e1e5e9',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#172b4d',
                  }}
                >
                  {m.workspace.name}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#6b778c',
                    marginTop: '2px',
                  }}
                >
                  Role: {m.role}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#172b4d',
            marginBottom: '8px',
          }}
        >
          Create workspace
        </h4>

        <form
          onSubmit={handleCreate}
          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          <input
            type="text"
            placeholder="Workspace name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: '4px',
              border: '1px solid #dfe1e6',
              fontSize: '13px',
            }}
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{
              padding: '8px 10px',
              borderRadius: '4px',
              border: '1px solid #dfe1e6',
              fontSize: '13px',
              resize: 'vertical',
            }}
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            style={{
              padding: '8px 10px',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '4px',
              border: 'none',
              cursor: creating ? 'default' : 'pointer',
              background: creating ? '#c1c7d0' : '#0052cc',
              color: '#ffffff',
              marginTop: '4px',
            }}
          >
            {creating ? 'Creating…' : 'Create workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}
