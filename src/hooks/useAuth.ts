import { useAuth0 } from '@auth0/auth0-react';

export const useAuth = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    loginWithRedirect, 
    logout,
    getAccessTokenSilently 
  } = useAuth0();

  const callApi = async (endpoint: string) => {
    const token = await getAccessTokenSilently();
    const response = await fetch(`http://localhost:4000/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.json();
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login: () => loginWithRedirect(),
    logout: () => logout({ returnTo: window.location.origin }),
    callApi,
  };
};