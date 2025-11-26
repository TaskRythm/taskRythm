'use client';
import { useAuth0 } from '@auth0/auth0-react';
import Link from 'next/link';
import { useState } from 'react';

export default function Navigation() {
  const { user, isAuthenticated, logout, loginWithRedirect } = useAuth0();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogin = () => {
    loginWithRedirect({
      authorizationParams: {
        redirect_uri: `${window.location.origin}/auth/callback`,
      },
      appState: {
        returnTo: '/',
      },
    });
  };

  const handleSignup = () => {
    loginWithRedirect({
      authorizationParams: {
        redirect_uri: `${window.location.origin}/auth/callback`,
        screen_hint: 'signup',
      },
      appState: {
        returnTo: '/',
      },
    });
  };

  const handleLogoutConfirm = () => {
    logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <>
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #e1e5e9',
        padding: '16px 0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div className="container">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {/* Logo & Navigation Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
              <Link 
                href="/" 
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#0052cc',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                TaskRythm
              </Link>
              
              {/* Navigation Links - Different based on auth state */}
              {isAuthenticated ? (
                // Logged-in navigation
                <div style={{ display: 'flex', gap: '24px' }}>
                  <Link 
                    href="/" 
                    style={{
                      color: '#0052cc',
                      textDecoration: 'none',
                      fontWeight: '500',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      backgroundColor: '#f4f5f7',
                      transition: 'all 0.2s ease',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e4e5e7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f4f5f7';
                    }}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/projects" 
                    style={{
                      color: '#42526e',
                      textDecoration: 'none',
                      fontWeight: '500',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#0052cc';
                      e.currentTarget.style.backgroundColor = '#f4f5f7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#42526e';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Projects
                  </Link>
                  <Link 
                    href="/team" 
                    style={{
                      color: '#42526e',
                      textDecoration: 'none',
                      fontWeight: '500',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#0052cc';
                      e.currentTarget.style.backgroundColor = '#f4f5f7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#42526e';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Team
                  </Link>
                  <Link 
                    href="/reports" 
                    style={{
                      color: '#42526e',
                      textDecoration: 'none',
                      fontWeight: '500',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#0052cc';
                      e.currentTarget.style.backgroundColor = '#f4f5f7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#42526e';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Reports
                  </Link>
                </div>
              ) : (
                // Logged-out navigation
                <div style={{ display: 'flex', gap: '24px' }}>
                  <Link 
                    href="/features" 
                    style={{
                      color: '#42526e',
                      textDecoration: 'none',
                      fontWeight: '500',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#0052cc';
                      e.currentTarget.style.backgroundColor = '#f4f5f7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#42526e';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Features
                  </Link>
                  <Link 
                    href="/pricing" 
                    style={{
                      color: '#42526e',
                      textDecoration: 'none',
                      fontWeight: '500',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#0052cc';
                      e.currentTarget.style.backgroundColor = '#f4f5f7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#42526e';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Pricing
                  </Link>
                  <Link 
                    href="/resources" 
                    style={{
                      color: '#42526e',
                      textDecoration: 'none',
                      fontWeight: '500',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#0052cc';
                      e.currentTarget.style.backgroundColor = '#f4f5f7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#42526e';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Resources
                  </Link>
                </div>
              )}
            </div>

            {/* Auth Buttons */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px'
            }}>
              {isAuthenticated ? (
                // Logged-in user section
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px'
                }}>
                  {/* Notifications Bell */}
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6b778c',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease',
                      fontSize: '16px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#0052cc';
                      e.currentTarget.style.backgroundColor = '#f4f5f7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#6b778c';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    🔔
                  </button>

                  {/* User Profile */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    padding: '8px 16px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e1e5e9',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f2f4';
                    e.currentTarget.style.borderColor = '#d0d3d8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.borderColor = '#e1e5e9';
                  }}
                  >
                    {user?.picture && (
                      <img 
                        src={user.picture} 
                        alt="Profile" 
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%',
                          border: '2px solid #fff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }} 
                      />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ 
                        color: '#172b4d',
                        fontSize: '14px',
                        fontWeight: '600',
                        lineHeight: '1.2'
                      }}>
                        {user?.name || user?.nickname || 'User'}
                      </span>
                      <span style={{ 
                        color: '#6b778c',
                        fontSize: '12px',
                        lineHeight: '1.2'
                      }}>
                        {user?.email}
                      </span>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button 
                    onClick={handleLogoutClick}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      background: 'transparent',
                      color: '#de350b',
                      border: '2px solid #de350b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#de350b';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#de350b';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span>🚪</span>
                    Log Out
                  </button>
                </div>
              ) : (
                // Logged-out auth buttons
                <>
                  {/* Login Button */}
                  <button 
                    onClick={handleLogin}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      background: 'transparent',
                      color: '#0052cc',
                      border: '2px solid #0052cc',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#0052cc';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#0052cc';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Log In
                  </button>

                  {/* Signup Button */}
                  <button 
                    onClick={handleSignup}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      background: '#0052cc',
                      color: 'white',
                      border: '2px solid #0052cc',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,82,204,0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#0747a6';
                      e.currentTarget.style.borderColor = '#0747a6';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,82,204,0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#0052cc';
                      e.currentTarget.style.borderColor = '#0052cc';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,82,204,0.3)';
                    }}
                  >
                    Get Started Free
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              🚪
            </div>
            
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#172b4d',
              marginBottom: '8px'
            }}>
              Log out of TaskRythm?
            </h2>
            
            <p style={{
              color: '#6b778c',
              fontSize: '16px',
              lineHeight: '1.5',
              marginBottom: '32px'
            }}>
              Are you sure you want to log out? You'll need to sign in again to access your projects.
            </p>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleCancelLogout}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  background: 'transparent',
                  color: '#42526e',
                  border: '2px solid #dfe1e6',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flex: 1
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f4f5f7';
                  e.currentTarget.style.borderColor = '#c1c7d0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#dfe1e6';
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleLogoutConfirm}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  background: '#de350b',
                  color: 'white',
                  border: '2px solid #de350b',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flex: 1
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#bf2600';
                  e.currentTarget.style.borderColor = '#bf2600';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#de350b';
                  e.currentTarget.style.borderColor = '#de350b';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}