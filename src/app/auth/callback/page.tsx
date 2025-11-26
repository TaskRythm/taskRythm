'use client';

import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export default function AuthCallback() {
  const { handleRedirectCallback } = useAuth0();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Handling auth callback...');
        const result = await handleRedirectCallback();
        console.log('✅ Auth callback successful:', result);

        const returnTo =
          (result && (result.appState as any)?.returnTo) || '/';
        window.location.href = returnTo;
      } catch (error) {
        console.error('❌ Auth callback error:', error);
        window.location.href = '/';
      }
    };

    handleAuthCallback();
  }, [handleRedirectCallback]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
      }}
    >
      <h2>Processing login...</h2>
      <p>Please wait while we complete your authentication.</p>
    </div>
  );
}
