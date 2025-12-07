import { renderHook, waitFor } from '@testing-library/react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../useAuth';

jest.mock('@auth0/auth0-react');
const mockUseAuth0 = useAuth0 as jest.MockedFunction<typeof useAuth0>;

describe('useAuth Hook', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com',
    sub: 'auth0|123456',
  };

  const mockLoginWithRedirect = jest.fn();
  const mockLogout = jest.fn();
  const mockGetAccessTokenSilently = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    
    // Setup default window.location
    delete (window as any).location;
    window.location = { origin: 'http://localhost:3000' } as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return auth state when authenticated', () => {
    mockUseAuth0.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      loginWithRedirect: mockLoginWithRedirect,
      logout: mockLogout,
      getAccessTokenSilently: mockGetAccessTokenSilently,
    } as any);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('should return auth state when not authenticated', () => {
    mockUseAuth0.mockReturnValue({
      user: undefined,
      isAuthenticated: false,
      isLoading: false,
      loginWithRedirect: mockLoginWithRedirect,
      logout: mockLogout,
      getAccessTokenSilently: mockGetAccessTokenSilently,
    } as any);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeUndefined();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should call loginWithRedirect when login is called', () => {
    mockUseAuth0.mockReturnValue({
      user: undefined,
      isAuthenticated: false,
      isLoading: false,
      loginWithRedirect: mockLoginWithRedirect,
      logout: mockLogout,
      getAccessTokenSilently: mockGetAccessTokenSilently,
    } as any);

    const { result } = renderHook(() => useAuth());
    result.current.login();

    expect(mockLoginWithRedirect).toHaveBeenCalledTimes(1);
  });

  it('should call logout with correct returnTo when logout is called', () => {
    mockUseAuth0.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      loginWithRedirect: mockLoginWithRedirect,
      logout: mockLogout,
      getAccessTokenSilently: mockGetAccessTokenSilently,
    } as any);

    const { result } = renderHook(() => useAuth());
    result.current.logout();

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledWith({
      returnTo: 'http://localhost:3000',
    });
  });

  it('should call API with access token', async () => {
    const mockToken = 'mock-access-token';
    const mockResponse = { data: 'test data' };

    mockGetAccessTokenSilently.mockResolvedValue(mockToken);
    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    mockUseAuth0.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      loginWithRedirect: mockLoginWithRedirect,
      logout: mockLogout,
      getAccessTokenSilently: mockGetAccessTokenSilently,
    } as any);

    const { result } = renderHook(() => useAuth());
    const response = await result.current.callApi('auth/me');

    expect(mockGetAccessTokenSilently).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/auth/me',
      {
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      }
    );
    expect(response).toEqual(mockResponse);
  });

  it('should handle API call with different endpoints', async () => {
    const mockToken = 'mock-access-token';
    mockGetAccessTokenSilently.mockResolvedValue(mockToken);
    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({}),
    });

    mockUseAuth0.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      loginWithRedirect: mockLoginWithRedirect,
      logout: mockLogout,
      getAccessTokenSilently: mockGetAccessTokenSilently,
    } as any);

    const { result } = renderHook(() => useAuth());
    await result.current.callApi('projects');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/projects',
      expect.any(Object)
    );
  });

  it('should show loading state', () => {
    mockUseAuth0.mockReturnValue({
      user: undefined,
      isAuthenticated: false,
      isLoading: true,
      loginWithRedirect: mockLoginWithRedirect,
      logout: mockLogout,
      getAccessTokenSilently: mockGetAccessTokenSilently,
    } as any);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
  });
});
