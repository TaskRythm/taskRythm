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

  // Generic authenticated API helper
  const callApi = async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    const token = await getAccessTokenSilently();

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE}/${endpoint.replace(/^\//, '')}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `API ${response.status} ${response.statusText}${
          text ? ` – ${text}` : ''
        }`,
      );
    }

    // 204 No Content etc.
    if (response.status === 204) return null;

    return response.json();
  };

  const login = () =>
    loginWithRedirect({
      authorizationParams: {
        redirect_uri: `${window.location.origin}/auth/callback`,
      },
      appState: {
        returnTo: '/',
      },
    });

  const logoutFn = () =>
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout: logoutFn,
    callApi,
  };
};