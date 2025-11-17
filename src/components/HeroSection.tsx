'use client';
import { useAuth0 } from '@auth0/auth0-react';

export default function HeroSection() {
  const { loginWithRedirect } = useAuth0();

  const handleFreeTrial = () => {
    loginWithRedirect({
      authorizationParams: {
        redirect_uri: 'http://localhost:3000/api/auth/callback',
        screen_hint: 'signup'
      },
      appState: {
        returnTo: '/'
      }
    });
  };

  const handleWatchDemo = () => {
    // You can implement demo video logic here
    alert('Demo video would play here');
  };

  return (
    <section style={{
      background: 'linear-gradient(135deg, #0052cc 0%, #0747a6 100%)',
      color: 'white',
      padding: '120px 0 80px',
      textAlign: 'center'
    }}>
      <div className="container">
        <h1 style={{
          fontSize: '64px',
          fontWeight: '700',
          marginBottom: '24px',
          lineHeight: '1.1'
        }}>
          The #1 project management tool for teams
        </h1>
        
        <p style={{
          fontSize: '24px',
          marginBottom: '48px',
          opacity: '0.9',
          maxWidth: '800px',
          margin: '0 auto 48px'
        }}>
          Plan, track, and manage your projects with TaskRythm. 
          Empower your team to work more collaboratively and get more done.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={handleFreeTrial}
            style={{ 
              padding: '16px 32px',
              fontSize: '16px',
              fontWeight: '500',
              background: '#00c7e5',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,199,229,0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#00b8d9';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,199,229,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#00c7e5';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,199,229,0.3)';
            }}
          >
            Start Free Trial
          </button>
          <button 
            onClick={handleWatchDemo}
            style={{ 
              padding: '16px 32px',
              fontSize: '16px',
              fontWeight: '500',
              background: 'transparent',
              color: 'white',
              border: '2px solid white',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Watch Demo
          </button>
        </div>
      </div>
    </section>
  );
}