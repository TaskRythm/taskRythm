'use client';

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Toast, ToastType } from '@/contexts/ToastContext';

interface ToastNotificationProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const toastStyles: Record<ToastType, { bg: string; border: string; text: string; iconColor: string }> = {
  success: {
    bg: '#dcfce7',
    border: '#16a34a',
    text: '#166534',
    iconColor: '#16a34a',
  },
  error: {
    bg: '#fee2e2',
    border: '#dc2626',
    text: '#991b1b',
    iconColor: '#dc2626',
  },
  warning: {
    bg: '#fef3c7',
    border: '#eab308',
    text: '#854d0e',
    iconColor: '#eab308',
  },
  info: {
    bg: '#dbeafe',
    border: '#3b82f6',
    text: '#1e40af',
    iconColor: '#3b82f6',
  },
};

const getIcon = (type: ToastType, color: string) => {
  const iconProps = { size: 20, style: { color } };
  switch (type) {
    case 'success':
      return <CheckCircle {...iconProps} />;
    case 'error':
      return <XCircle {...iconProps} />;
    case 'warning':
      return <AlertTriangle {...iconProps} />;
    case 'info':
      return <Info {...iconProps} />;
  }
};

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  const style = toastStyles[toast.type];

  return (
    <div
      style={{
        backgroundColor: style.bg,
        borderLeft: `4px solid ${style.border}`,
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        padding: '16px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        minWidth: '320px',
        maxWidth: '500px',
        animation: 'slideIn 0.3s ease-out',
      }}
      role="alert"
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}>
        {getIcon(toast.type, style.iconColor)}
      </div>
      <div style={{ flex: 1, color: style.text, fontSize: '14px', fontWeight: 500, lineHeight: '1.5' }}>
        {toast.message}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#9ca3af',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
        }}
        aria-label="Close"
      >
        <X size={18} />
      </button>
    </div>
  );
};
