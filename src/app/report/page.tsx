'use client';

import { FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReportPage() {
  const router = useRouter();

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 100%)',
      paddingTop: '80px'
    }}>
      <div style={{
        background: 'white',
        padding: '60px 80px',
        borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)'
        }}>
          <FileText size={40} color="white" />
        </div>
        
        <h1 style={{
          fontSize: '32px',
          fontWeight: '800',
          color: '#1e293b',
          marginBottom: '16px',
          letterSpacing: '-0.5px'
        }}>
          Reports
        </h1>
        
        <p style={{
          fontSize: '18px',
          color: '#64748b',
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          This feature is currently under development and will be available soon.
        </p>
        
        <div style={{
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          color: 'white',
          borderRadius: '10px',
          fontWeight: '600',
          fontSize: '14px',
          display: 'inline-block',
          marginBottom: '24px'
        }}>
          Coming Soon
        </div>
        
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'block',
            width: '100%',
            padding: '14px',
            background: '#f1f5f9',
            color: '#3B82F6',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
