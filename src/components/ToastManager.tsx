'use client';

import React from 'react';
import { useToast } from '@/contexts/ToastContext';
import { ToastNotification } from './ToastNotification';

export const ToastManager: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        {toasts.map((toast) => (
          <ToastNotification key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
};
