'use client';

import { X, FileText, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  content: string;
  loading: boolean;
}

export default function ReleaseNotesModal({ isOpen, onClose, projectName, content, loading }: ReleaseNotesModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'white', width: '100%', maxWidth: '600px', borderRadius: '12px',
        overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '85vh'
      }}>
        
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText className="text-blue-600" size={20} />
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#1f2937' }}>
              Release Notes: {projectName}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
        </div>

        {/* Content */}
        <div style={{ padding: '0', flex: 1, overflowY: 'auto', position: 'relative' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <FileText className="animate-bounce" style={{ margin: '0 auto', color: '#3b82f6', marginBottom: '16px' }} size={40} />
              <p style={{ color: '#6b7280', fontWeight: 500 }}>The Scribe is writing your report...</p>
            </div>
          ) : (
            <textarea 
              readOnly 
              value={content} 
              style={{ 
                width: '100%', height: '400px', padding: '24px', border: 'none', resize: 'none', 
                fontSize: '14px', lineHeight: '1.6', fontFamily: 'monospace', color: '#374151', outline: 'none'
              }} 
            />
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button 
              onClick={handleCopy} 
              style={{ 
                padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', 
                cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', color: '#374151'
              }}
            >
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
            <button 
              onClick={onClose} 
              style={{ 
                padding: '8px 16px', borderRadius: '6px', background: '#2563eb', color: 'white', 
                border: 'none', cursor: 'pointer', fontWeight: 500 
              }}
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
}