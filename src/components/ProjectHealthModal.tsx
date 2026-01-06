'use client';

import { X, Activity, AlertTriangle, Lightbulb, CheckCircle } from 'lucide-react';

interface HealthData {
  score: number;
  status: string;
  analysis: string;
  recommendation: string;
}

interface ProjectHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  data: HealthData | null;
  loading: boolean;
}

export default function ProjectHealthModal({ isOpen, onClose, projectName, data, loading }: ProjectHealthModalProps) {
  if (!isOpen) return null;

  // Helper to determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('risk') || s.includes('critical')) return 'bg-red-100 text-red-800';
    if (s.includes('healthy') || s.includes('good')) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'white', width: '100%', maxWidth: '500px', borderRadius: '12px',
        overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity className="text-pink-600" />
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#1f2937' }}>
              Doctor Report: {projectName}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Activity className="animate-bounce" style={{ margin: '0 auto', color: '#ec4899' }} size={48} />
              <p style={{ marginTop: '16px', color: '#6b7280', fontWeight: 500 }}>Analyzing project vitals...</p>
            </div>
          ) : data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Score Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Health Score</p>
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span className={getScoreColor(data.score)} style={{ fontSize: '48px', fontWeight: '900', lineHeight: 1 }}>
                      {data.score}
                    </span>
                    <span style={{ fontSize: '24px', color: '#9ca3af', fontWeight: 'bold' }}>/100</span>
                  </div>
                </div>
                <div className={getStatusColor(data.status)} style={{ padding: '8px 16px', borderRadius: '99px', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>
                  {data.status}
                </div>
              </div>

              {/* Analysis Section */}
              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', color: '#374151', fontWeight: '600' }}>
                  <AlertTriangle size={18} /> Diagnosis
                </div>
                <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.5', margin: 0 }}>{data.analysis}</p>
              </div>

              {/* Recommendation Section */}
              <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', color: '#1e40af', fontWeight: '600' }}>
                  <Lightbulb size={18} /> Prescription
                </div>
                <p style={{ fontSize: '14px', color: '#1d4ed8', fontWeight: '500', margin: 0 }}>{data.recommendation}</p>
              </div>

            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#ef4444' }}>
              Failed to analyze project. Please try again.
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'flex-end' }}>
             <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontWeight: 500 }}>
               Close Report
             </button>
        </div>

      </div>
    </div>
  );
}