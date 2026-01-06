'use client';
import { Auth0Provider } from '@auth0/auth0-react';
import { auth0Config } from '../../auth0-config';
import { ToastProvider } from '@/contexts/ToastContext';
import { ToastManager } from '@/components/ToastManager';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Auth0Provider
          domain={auth0Config.domain}
          clientId={auth0Config.clientId}
          authorizationParams={auth0Config.authorizationParams}
          cacheLocation={auth0Config.cacheLocation}
        >
          <ToastProvider>
            {children}
            <ToastManager />
          </ToastProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}