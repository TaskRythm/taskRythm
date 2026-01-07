'use client';
import { useAuth0 } from '@auth0/auth0-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { 
  LayoutGrid, 
  Settings, 
  MessageSquare, 
  Search, 
  Bell, 
  LogOut, 
  User
} from 'lucide-react';

export default function Navigation() {
  const { user, isAuthenticated, logout, loginWithRedirect } = useAuth0();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Auth Handlers ---
  const handleLogin = () => {
    loginWithRedirect({
      authorizationParams: { redirect_uri: `${window.location.origin}/auth/callback` },
      appState: { returnTo: '/' },
    });
  };

  const handleSignup = () => {
    loginWithRedirect({
      authorizationParams: { redirect_uri: `${window.location.origin}/auth/callback`, screen_hint: 'signup' },
      appState: { returnTo: '/' },
    });
  };

  const handleLogoutConfirm = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  // --- UI Components ---

  const NavIcon = ({ 
    href, 
    icon: Icon, 
    active, 
    label, 
    customTooltip 
  }: { 
    href: string; 
    icon: any; 
    active: boolean; 
    label: string;
    customTooltip?: string;
  }) => {
    const isDisabled = !!customTooltip;

    return (
      <Link 
        href={href}
        onClick={(e) => {
            if (isDisabled) e.preventDefault();
        }}
        title={isDisabled ? '' : label} // specific title handled by custom tooltip div
        onMouseEnter={() => setHoveredIcon(label)}
        onMouseLeave={() => setHoveredIcon(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '48px',
          borderRadius: '10px',
          color: active ? '#fff' : (isDisabled ? '#94a3b8' : '#64748b'), // Lighter color for disabled
          background: active ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
          transition: 'all 0.3s ease',
          marginBottom: '12px',
          boxShadow: active ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          border: 'none',
          opacity: isDisabled ? 0.7 : 1
        }}
        onMouseMove={(e) => {
          if (!active && hoveredIcon === label && !isDisabled) {
            (e.currentTarget as HTMLElement).style.background = 'rgba(102, 126, 234, 0.1)';
          }
        }}
      >
        <Icon size={24} strokeWidth={active ? 2.5 : 2} />
        
        {/* Tooltip Logic */}
        {hoveredIcon === label && !active && (
          <div style={{
            position: 'absolute',
            left: '68px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#1e293b',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            zIndex: 1001,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            pointerEvents: 'none'
          }}>
            {customTooltip || label}
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* 1. VERTICAL SIDEBAR (Left Rail) */}
      <aside style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: '90px',
        background: 'linear-gradient(to bottom, #ffffff, #f8fafc)',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 0',
        zIndex: 1000,
        boxShadow: '0 4px 24px rgba(0,0,0,0.03)',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)'
      }}>
        {/* Logo */}
        <Link href="/" style={{ marginBottom: '48px', cursor: 'pointer', textDecoration: 'none' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '800',
            fontSize: '18px',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease',
            border: 'none'
          }}>
            TR
          </div>
        </Link>

        {/* Navigation Items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Dashboard (Active) */}
          <NavIcon 
            href="/" 
            icon={LayoutGrid} 
            active={pathname === '/'} 
            label="Dashboard" 
          />
          
          {/* Messages (Coming Soon) */}
          <NavIcon 
            href="#" 
            icon={MessageSquare} 
            active={false} 
            label="Messages" 
            customTooltip="Coming soon on the next update"
          />

          <div style={{ marginTop: 'auto' }}>
            <NavIcon href="/settings" icon={Settings} active={pathname.includes('/settings')} label="Settings" />
          </div>
        </nav>
      </aside>

      {/* 2. HORIZONTAL TOP BAR */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: '90px',
        right: 0,
        height: '80px',
        background: 'linear-gradient(to right, #ffffff, #f8fafc)',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 40px',
        zIndex: 900,
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
      }}>
        {/* Actions & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {/* Action Icons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                position: 'relative',
                padding: '8px',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
              }}
            >
              <Bell size={20} color="#64748b" />
              <span style={{ 
                position: 'absolute', 
                top: 4, 
                right: 4, 
                width: '8px', 
                height: '8px', 
                background: '#ef4444', 
                borderRadius: '50%', 
                border: '2px solid white',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
              }}></span>
            </button>
          </div>

          {/* User Section */}
          {isAuthenticated ? (
            <div 
              ref={dropdownRef}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                paddingLeft: '28px', 
                borderLeft: '1px solid #e2e8f0',
                position: 'relative'
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{user?.name || 'User'}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{user?.email || ''}</div>
              </div>
              
              <button 
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
              >
                <img 
                  src={user?.picture || "https://avatar.vercel.sh/user"} 
                  alt="Profile" 
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '10px', 
                    border: '2px solid #e2e8f0',
                    objectFit: 'cover'
                  }}
                />
              </button>

              {/* User Dropdown Menu */}
              {showUserDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '12px',
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
                  minWidth: '200px',
                  zIndex: 1001,
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '12px 0' }}>
                    <Link href="/profile" style={{ textDecoration: 'none' }}>
                      <div style={{
                        padding: '10px 16px',
                        color: '#1e293b',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <User size={16} />
                        Profile
                      </div>
                    </Link>
                    <Link href="/settings" style={{ textDecoration: 'none' }}>
                      <div style={{
                        padding: '10px 16px',
                        color: '#1e293b',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Settings size={16} />
                        Settings
                      </div>
                    </Link>
                    <div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }}></div>
                    <button 
                      onClick={() => {
                        setShowUserDropdown(false);
                        setShowLogoutModal(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        color: '#ef4444',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <LogOut size={16} />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={handleLogin} 
                style={{ 
                  padding: '10px 22px', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0', 
                  background: 'white', 
                  fontWeight: '600', 
                  color: '#64748b', 
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >Log In</button>
              <button 
                onClick={handleSignup} 
                style={{ 
                  padding: '10px 22px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                  fontWeight: '600', 
                  color: 'white', 
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                }}
              >Sign Up</button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Padding Helper */}
      <style jsx global>{`
        main {
          margin-left: 90px;
          margin-top: 80px;
          padding: 32px;
        }
      `}</style>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.5)', 
          backdropFilter: 'blur(4px)', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          zIndex: 2000
        }}>
          <div style={{ 
            background: 'white', 
            padding: '40px', 
            borderRadius: '16px', 
            width: '100%', 
            maxWidth: '420px', 
            textAlign: 'center', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            animation: 'slideUp 0.3s ease'
          }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              background: '#fef2f2', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 16px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
            }}>
              <LogOut size={32} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Log out?</h2>
            <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '14px', lineHeight: '1.6' }}>Are you sure you want to log out? You'll need to sign in again to access your account.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowLogoutModal(false)} 
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0', 
                  background: 'white', 
                  fontWeight: '600', 
                  color: '#64748b', 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >Cancel</button>
              <button 
                onClick={handleLogoutConfirm} 
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  background: '#ef4444', 
                  fontWeight: '600', 
                  color: 'white', 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dc2626';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                }}
              >Log Out</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
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