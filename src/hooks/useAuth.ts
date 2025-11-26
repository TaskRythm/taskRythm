'use client';

import { useAuth0 } from '@auth0/auth0-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  const callApi = async (
    endpoint: string,
    options: RequestInit = {},
  ): Promise<any> => {
    const token = await getAccessTokenSilently();

    const response = await fetch(`${API_BASE}/${endpoint}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `API error ${response.status}: ${text || response.statusText}`,
      );
    }

    // If no content (204), just return null
    if (response.status === 204) {
      return null;
    }

    return response.json();
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login: () =>
      loginWithRedirect({
        authorizationParams: {
          redirect_uri: `${window.location.origin}/auth/callback`,
        },
        appState: {
          returnTo: '/',
        },
      }),
    logout: () =>
      logout({
        logoutParams: {
          returnTo: window.location.origin,
        },
      }),
    callApi,
  };
};
