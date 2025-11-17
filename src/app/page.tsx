'use client';
import { useAuth0 } from '@auth0/auth0-react';
import Navigation from '../components/Navigation';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import Footer from '../components/Footer';
import Dashboard from '../components/Dashboard';

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f4f5f7'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <h2 style={{ color: '#42526e' }}>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navigation />
      {isAuthenticated ? (
        <Dashboard user={user} />
      ) : (
        <>
          <HeroSection />
          <FeaturesSection />
          <Footer />
        </>
      )}
    </div>
  );
}