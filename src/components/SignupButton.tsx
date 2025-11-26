'use client';
import { useAuth0 } from '@auth0/auth0-react';

export default function SignupButton() {
  const { loginWithRedirect } = useAuth0();

  const handleSignup = () => {
    loginWithRedirect({
      authorizationParams: {
        redirect_uri: `${window.location.origin}/auth/callback`,
        screen_hint: 'signup' // This tells Auth0 to show the signup form
      },
      appState: {
        returnTo: '/'
      }
    });
  };

  return (
    <button 
      onClick={handleSignup}
      style={{ 
        padding: '10px 20px', 
        fontSize: '16px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        marginLeft: '10px'
      }}
    >
      Sign Up
    </button>
  );
}