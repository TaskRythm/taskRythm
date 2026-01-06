'use client';

import { useState } from 'react';
import { Sparkles, Loader2, X, CheckCircle, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth'; 
import { generateProjectPlan, Task } from '../api/ai'; 

interface AiProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (tasks: Task[]) => void;
}

export default function AiProjectModal({ isOpen, onClose, onAccept }: AiProjectModalProps) {
const { getAccessTokenSilently } = useAuth();  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState<Task[] | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
const token = await getAccessTokenSilently();
     if (!token) throw new Error("Please log in to use AI features.");

      const data = await generateProjectPlan(prompt, token);
      
      if (data && data.tasks && Array.isArray(data.tasks)) {
        setGeneratedTasks(data.tasks);
      } else {
        throw new Error("AI response was empty or invalid.");
      }
    } catch (err: any) {
      console.error("AI Modal Error:", err);
      setError(err.message || "Failed to generate plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (generatedTasks) {
      onAccept(generatedTasks);
      setGeneratedTasks(null);
      setPrompt('');
      onClose();
    }
  };

  return (
    // 🔴 FIXED: Using inline styles to match your dashboard and force top layer
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999, // Extremely high Z-Index to stay on top
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'white',
        width: '100%',
        maxWidth: '600px',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        
        {/* Header */}
        <div style={{
          backgroundColor: '#6b21a8', // Purple
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#fde047" fill="#fde047" />
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>AI Project Architect</h2>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '24px', overflowY: 'auto' }}>
          
          {/* Error Message Banner */}
          {error && (
            <div style={{
              marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', 
              color: '#b91c1c', borderRadius: '8px', display: 'flex', 
              alignItems: 'center', gap: '8px', fontSize: '14px', border: '1px solid #fecaca'
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {!generatedTasks ? (
            /* STATE 1: INPUT FORM */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  What project do you want to plan?
                </label>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                  Describe your goal (e.g., "Launch a coffee shop website") and the AI will create a Kanban board.
                </p>
              </div>
              
              <textarea
                style={{
                  width: '100%', border: '1px solid #d1d5db', borderRadius: '8px',
                  padding: '12px', height: '128px', outline: 'none', resize: 'none',
                  fontSize: '14px'
                }}
                placeholder="E.g., Plan a 3-day hackathon event with a focus on React and AI..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
              />
              
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                style={{
                  width: '100%', backgroundColor: loading || !prompt.trim() ? '#d8b4fe' : '#9333ea',
                  color: 'white', padding: '12px', borderRadius: '8px', fontWeight: 600,
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                  border: 'none', cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Generate Plan
                  </>
                )}
              </button>
            </div>
          ) : (
            /* STATE 2: REVIEW RESULTS */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 600, color: '#1f2937', margin: 0 }}>
                  Suggested Plan ({generatedTasks.length} Tasks)
                </h3>
                <button 
                  onClick={() => setGeneratedTasks(null)} 
                  style={{ fontSize: '14px', color: '#9333ea', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                >
                  Edit Prompt
                </button>
              </div>

              {/* Scrollable List of Tasks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '4px' }}>
                {generatedTasks.map((task, idx) => (
                  <div key={idx} style={{
                    backgroundColor: 'white', padding: '12px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', display: 'flex', gap: '12px',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ marginTop: '4px', color: '#a855f7', backgroundColor: '#f3e8ff', padding: '6px', borderRadius: '6px', height: 'fit-content' }}>
                      <FileText size={16} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827', margin: '0 0 4px 0' }}>{task.title}</p>
                      <p style={{ fontSize: '12px', color: '#4b5563', margin: '0 0 8px 0' }}>{task.description}</p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '9999px', textTransform: 'uppercase' }}>
                          {task.status || 'TODO'}
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '9999px', textTransform: 'uppercase' }}>
                          {task.priority || 'MEDIUM'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                <button
                  onClick={() => setGeneratedTasks(null)}
                  style={{
                    flex: 1, padding: '10px', border: '1px solid #d1d5db', color: '#374151',
                    borderRadius: '8px', backgroundColor: 'white', fontWeight: 500, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccept}
                  style={{
                    flex: 1, padding: '10px', backgroundColor: '#16a34a', color: 'white',
                    borderRadius: '8px', fontWeight: 500, display: 'flex', justifyContent: 'center',
                    alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <CheckCircle size={18} /> 
                  Accept Plan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}