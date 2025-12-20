'use client';
import { useAuth0 } from '@auth0/auth0-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  LayoutGrid, 
  KanbanSquare, 
  Settings, 
  MessageSquare, 
  Folder, 
  Search, 
  Bell, 
  LogOut, 
  User,
  Plus
} from 'lucide-react';

export default function Navigation() {
  const { user, isAuthenticated, logout, loginWithRedirect } = useAuth0();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const pathname = usePathname();

  // --- Auth Handlers (Preserved from your code) ---
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

  const NavIcon = ({ href, icon: Icon, active }: { href: string; icon: any; active: boolean }) => (
    <Link 
      href={href} 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        color: active ? '#fff' : '#64748b',
        background: active ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
        transition: 'all 0.2s ease',
        marginBottom: '16px',
        boxShadow: active ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none'
      }}
    >
      <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    </Link>
  );

  return (
    <>
      {/* 1. VERTICAL SIDEBAR (Left Rail) */}
      <aside style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: '90px',
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 0',
        zIndex: 1000,
        boxShadow: '4px 0 24px rgba(0,0,0,0.02)'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '800',
            fontSize: '20px'
          }}>
            TR
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <NavIcon href="/" icon={LayoutGrid} active={pathname === '/'} />
          <NavIcon href="/projects" icon={KanbanSquare} active={pathname.includes('/projects')} />
          <NavIcon href="/messages" icon={MessageSquare} active={pathname.includes('/messages')} />
          <NavIcon href="/files" icon={Folder} active={pathname.includes('/files')} />
          <div style={{ marginTop: 'auto' }}>
            <NavIcon href="/settings" icon={Settings} active={pathname.includes('/settings')} />
          </div>
        </nav>
      </aside>

      {/* 2. HORIZONTAL TOP BAR */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: '90px', // Pushes it to the right of sidebar
        right: 0,
        height: '80px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        zIndex: 900
      }}>
        {/* Left: Search Bar */}
        <div style={{ position: 'relative', width: '400px' }}>
          <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search anything..." 
            style={{
              width: '100%',
              padding: '12px 16px 12px 48px',
              borderRadius: '12px',
              border: '1px solid #f1f5f9',
              background: '#f8fafc',
              fontSize: '14px',
              color: '#1e293b',
              outline: 'none'
            }}
          />
        </div>

        {/* Right: Actions & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Action Icons */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}>
              <Bell size={24} color="#64748b" />
              <span style={{ position: 'absolute', top: -2, right: -2, width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></span>
            </button>
          </div>

          {/* User Section */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '24px', borderLeft: '1px solid #e2e8f0' }}>
              <div style={{ textAlign: 'right', display: 'none', md: 'block' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{user?.name}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{user?.email}</div>
              </div>
              
              <button 
                onClick={() => setShowLogoutModal(true)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  padding: 0 
                }}
              >
                <img 
                  src={user?.picture || "https://avatar.vercel.sh/user"} 
                  alt="Profile" 
                  style={{ width: '40px', height: '40px', borderRadius: '12px', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleLogin} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', color: '#64748b', cursor: 'pointer' }}>Log In</button>
              <button onClick={handleSignup} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0f172a', fontWeight: '600', color: 'white', cursor: 'pointer' }}>Sign Up</button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Padding Helper 
          (Use this class in your Layout to push content away from bars) 
      */}
      <style jsx global>{`
        main {
          margin-left: 90px;
          margin-top: 80px;
          padding: 32px;
        }
      `}</style>

      {/* Logout Modal (Preserved) */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
          backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
        }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '64px', height: '64px', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <LogOut size={32} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Log out?</h2>
            <p style={{ color: '#64748b', marginBottom: '32px' }}>Are you sure you want to log out? You'll need to sign in again to access your projects.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowLogoutModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleLogoutConfirm} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#ef4444', fontWeight: '600', color: 'white', cursor: 'pointer' }}>Log Out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}