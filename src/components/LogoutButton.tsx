'use client';
import { useAuth0 } from '@auth0/auth0-react';

export default function LogoutButton() {
  const { logout, isAuthenticated } = useAuth0();

  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: window.location.origin // Where to redirect after logout
      }
    });
  };

  if (!isAuthenticated) return null;

  return (
    <button 
      onClick={handleLogout}
      style={{ 
        padding: '10px 20px', 
        fontSize: '16px',
        backgroundColor: '#ff4444',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        marginLeft: '10px'
      }}
    >
      Log Out
    </button>
  );
}