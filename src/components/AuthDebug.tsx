'use client';
import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';

export default function AuthDebug() {
  const { error, isLoading } = useAuth0();

  useEffect(() => {
    console.log('🔧 Auth Debug:', { 
      error, 
      isLoading,
      currentUrl: window.location.href 
    });
  }, [error, isLoading]);

  if (error) {
    return (
      <div style={{
        background: '#ffebee',
        border: '1px solid #f44336',
        padding: '15px',
        margin: '10px',
        borderRadius: '4px'
      }}>
        <h3>🚨 Authentication Error</h3>
        <p><strong>Message:</strong> {error.message}</p>
        <p><strong>Check:</strong></p>
        <ul>
          <li>✅ Client ID is correct in Auth0 dashboard</li>
          <li>✅ Domain matches exactly</li>
          <li>✅ Application type is "Single Page Application"</li>
        </ul>
        <button 
          onClick={() => window.location.reload()}
          style={{ padding: '8px 16px', marginTop: '10px' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}