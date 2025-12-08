'use client';

import { useState } from 'react';
import { Sparkles, Loader2, X, Check } from 'lucide-react'; // Icons
import { useAuth } from '../hooks/useAuth'; // Your existing hook
import { generateProjectPlan } from '../api/ai';

interface AiProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (tasks: any[]) => void; // Function to save tasks
}

export default function AiProjectModal({ isOpen, onClose, onAccept }: AiProjectModalProps) {
  const { callApi } = useAuth(); // Use callApi to call AI endpoint
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await generateProjectPlan(prompt, callApi);
      setResult(data);
    } catch (err) {
      console.error(err);
      alert('AI Generation Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="text-purple-600" /> 
            AI Project Planner
          </h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {/* Input Step */}
        {!result && (
          <>
            <p className="text-gray-600 mb-2">Describe your project idea:</p>
            <textarea 
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-purple-500 mb-4"
              rows={4}
              placeholder="E.g., Plan a 2-day hackathon event..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button 
              onClick={handleGenerate}
              disabled={loading || !prompt}
              className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Generate Plan'}
            </button>
          </>
        )}

        {/* Review Step */}
        {result && (
          <div className="space-y-4">
            <h3 className="font-semibold text-green-700">AI Suggested Tasks:</h3>
            <div className="max-h-60 overflow-y-auto space-y-2 border p-2 rounded">
              {result.tasks?.map((t: any, i: number) => (
                <div key={i} className="bg-gray-50 p-2 text-sm border-l-4 border-purple-500">
                  <span className="font-bold">{t.title}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
               <button 
                 onClick={() => setResult(null)} 
                 className="flex-1 border py-2 rounded-lg hover:bg-gray-50"
               >
                 Back
               </button>
               <button 
                 onClick={() => onAccept(result.tasks)}
                 className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex justify-center items-center gap-2"
               >
                 <Check size={18} /> Create Project
               </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}