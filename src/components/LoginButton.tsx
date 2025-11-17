'use client';
import { useAuth0 } from '@auth0/auth0-react';

export default function LoginButton() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  const handleLogin = () => {
    loginWithRedirect({
      authorizationParams: {
        redirect_uri: 'http://localhost:3000/api/auth/callback'
      },
      appState: {
        returnTo: '/'
      }
    });
  };

  if (isLoading) return <div>Loading...</div>;
  if (isAuthenticated) return <div>Already logged in!</div>;

  return (
    <button 
      onClick={handleLogin}
      style={{ 
        padding: '10px 20px', 
        fontSize: '16px',
        backgroundColor: '#007acc',
        color: 'white',
        border: 'none',
        borderRadius: '4px'
      }}
    >
      Log In
    </button>
  );
}