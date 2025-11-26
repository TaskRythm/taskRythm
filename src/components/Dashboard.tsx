'use client';
import { useAuth0 } from '@auth0/auth0-react';
import WorkspaceSidebar from './WorkspaceSidebar';

interface DashboardProps {
  user: any;
}

export default function Dashboard({ user }: DashboardProps) {
  const { logout } = useAuth0();

  // Sample projects data (still static for now)
  const projects = [
    { id: 1, name: 'Website Redesign', progress: 75, tasks: 12, members: 4 },
    { id: 2, name: 'Mobile App Launch', progress: 30, tasks: 8, members: 3 },
    { id: 3, name: 'API Integration', progress: 90, tasks: 5, members: 2 },
    { id: 4, name: 'Q4 Marketing Campaign', progress: 45, tasks: 15, members: 6 },
  ];

  const recentActivity = [
    { id: 1, action: 'created', project: 'Website Redesign', time: '2 hours ago' },
    { id: 2, action: 'completed', project: 'API Documentation', time: '5 hours ago' },
    { id: 3, action: 'commented', project: 'Mobile App Launch', time: '1 day ago' },
    { id: 4, action: 'assigned', project: 'Q4 Marketing', time: '2 days ago' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f4f5f7',
        display: 'flex', // ← add flex to support sidebar + main
      }}
    >
      {/* LEFT: Workspaces sidebar (real data from backend) */}
      <WorkspaceSidebar />

      {/* RIGHT: your existing dashboard UI */}
      <div style={{ flex: 1, padding: 0 }}>
        {/* Dashboard Header */}
        <div
          style={{
            background: 'white',
            borderBottom: '1px solid #e1e5e9',
            padding: '32px 0',
          }}
        >
          <div className="container">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#172b4d',
                    marginBottom: '8px',
                  }}
                >
                  Welcome back, {user?.name || 'User'}!
                </h1>
                <p
                  style={{
                    color: '#6b778c',
                    fontSize: '16px',
                    margin: 0,
                  }}
                >
                  Here's what's happening with your projects today.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    padding: '12px 20px',
                    background: '#0052cc',
                    color: 'white',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  + New Project
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="container" style={{ padding: '32px 0' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '32px',
              alignItems: 'start',
            }}
          >
            {/* Left Column - Projects */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '24px',
                }}
              >
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: '#172b4d',
                    margin: 0,
                  }}
                >
                  Your Projects
                </h2>
                <span
                  style={{
                    color: '#6b778c',
                    fontSize: '14px',
                  }}
                >
                  {projects.length} projects
                </span>
              </div>

              {/* Projects Grid */}
              <div
                style={{
                  display: 'grid',
                  gap: '16px',
                }}
              >
                {projects.map((project) => (
                  <div
                    key={project.id}
                    style={{
                      background: 'white',
                      padding: '24px',
                      borderRadius: '8px',
                      border: '1px solid #e1e5e9',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '16px',
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#172b4d',
                          margin: 0,
                        }}
                      >
                        {project.name}
                      </h3>
                      <div
                        style={{
                          padding: '4px 12px',
                          background: '#e3fcef',
                          color: '#00875a',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                        }}
                      >
                        {project.progress}%
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        height: '6px',
                        background: '#dfe1e6',
                        borderRadius: '3px',
                        marginBottom: '16px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          background: '#0052cc',
                          width: `${project.progress}%`,
                          borderRadius: '3px',
                          transition: 'width 0.3s ease',
                        }}
                      ></div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          gap: '16px',
                          fontSize: '14px',
                          color: '#6b778c',
                        }}
                      >
                        <span>📋 {project.tasks} tasks</span>
                        <span>👥 {project.members} members</span>
                      </div>
                      <button
                        style={{
                          padding: '8px 16px',
                          background: 'transparent',
                          color: '#0052cc',
                          border: '1px solid #0052cc',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        View Project
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div>
              {/* Quick Stats */}
              <div
                style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '8px',
                  border: '1px solid #e1e5e9',
                  marginBottom: '24px',
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#172b4d',
                    marginBottom: '16px',
                  }}
                >
                  Quick Stats
                </h3>

                <div
                  style={{
                    display: 'grid',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f4f5f7',
                      borderRadius: '6px',
                    }}
                  >
                    <span style={{ color: '#6b778c' }}>Active Projects</span>
                    <span style={{ fontWeight: '600', color: '#172b4d' }}>4</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f4f5f7',
                      borderRadius: '6px',
                    }}
                  >
                    <span style={{ color: '#6b778c' }}>Completed Tasks</span>
                    <span style={{ fontWeight: '600', color: '#172b4d' }}>28</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f4f5f7',
                      borderRadius: '6px',
                    }}
                  >
                    <span style={{ color: '#6b778c' }}>Team Members</span>
                    <span style={{ fontWeight: '600', color: '#172b4d' }}>8</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div
                style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '8px',
                  border: '1px solid #e1e5e9',
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#172b4d',
                    marginBottom: '16px',
                  }}
                >
                  Recent Activity
                </h3>

                <div
                  style={{
                    display: 'grid',
                    gap: '12px',
                  }}
                >
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px',
                        borderRadius: '6px',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          background: '#0052cc',
                          borderRadius: '50%',
                        }}
                      ></div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            color: '#172b4d',
                          }}
                        >
                          You <strong>{activity.action}</strong> {activity.project}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#6b778c',
                          }}
                        >
                          {activity.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
