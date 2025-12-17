'use client';

import { X, Send, Bot, User, MessageSquare } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { chatWithProject } from '@/api/ai'; // Import API
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

interface ProjectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  contextTasks: any[]; // The tasks we feed the brain
}

export default function ProjectChatModal({ isOpen, onClose, projectName, contextTasks }: ProjectChatModalProps) {
  const { getAccessTokenSilently } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'ai', text: `Hello! I have studied the tasks for "${projectName}". Ask me anything!` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput("");
    
    // 1. Add User Message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const token = await getAccessTokenSilently();
      
      // 2. Call AI API
      // We send the Question + The Task List
      const result = await chatWithProject(userText, contextTasks, token);
      
      // 3. Add AI Response
      const aiText = result.answer || result.response || "I couldn't generate an answer.";
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', text: aiText };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error("Chat Error", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: "Sorry, I encountered an error connecting to the server." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'white', width: '100%', maxWidth: '450px', height: '600px', borderRadius: '12px',
        overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column'
      }}>
        
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare className="text-green-600" size={20} />
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#166534' }}>The Brain</h2>
              <p style={{ fontSize: '11px', margin: 0, color: '#15803d' }}>Context: {projectName}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
        </div>

        {/* Messages Area */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#f9fafb' }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', gap: '12px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                backgroundColor: msg.role === 'ai' ? '#dcfce7' : '#dbeafe', 
                color: msg.role === 'ai' ? '#166534' : '#1e40af'
              }}>
                {msg.role === 'ai' ? <Bot size={18} /> : <User size={18} />}
              </div>

              <div style={{ 
                maxWidth: '80%', padding: '12px', borderRadius: '12px', fontSize: '14px', lineHeight: '1.5',
                backgroundColor: msg.role === 'ai' ? 'white' : '#2563eb',
                color: msg.role === 'ai' ? '#374151' : 'white',
                border: msg.role === 'ai' ? '1px solid #e5e7eb' : 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          
          {loading && (
             <div style={{ display: 'flex', gap: '12px' }}>
               <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={18} className="text-green-700"/></div>
               <div style={{ padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', color: '#6b7280', fontSize: '13px', fontStyle: 'italic' }}>Thinking...</div>
             </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} style={{ padding: '16px', borderTop: '1px solid #e5e7eb', backgroundColor: 'white', display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about tasks, bugs, or priorities..."
            style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', fontSize: '14px' }}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || loading}
            style={{ 
              padding: '10px 14px', borderRadius: '8px', border: 'none', 
              backgroundColor: input.trim() && !loading ? '#16a34a' : '#d1d5db', 
              color: 'white', cursor: input.trim() && !loading ? 'pointer' : 'default'
            }}
          >
            <Send size={18} />
          </button>
        </form>

      </div>
    </div>
  );
}