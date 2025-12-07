import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth0 } from '@auth0/auth0-react';
import LoginButton from '../LoginButton';

// Mock useAuth0
jest.mock('@auth0/auth0-react');
const mockUseAuth0 = useAuth0 as jest.MockedFunction<typeof useAuth0>;

describe('LoginButton', () => {
  const mockLoginWithRedirect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login button when not authenticated', () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      loginWithRedirect: mockLoginWithRedirect,
    } as any);

    render(<LoginButton />);
    
    const button = screen.getByRole('button', { name: /log in/i });
    expect(button).toBeInTheDocument();
  });

  it('should show loading state while loading', () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      loginWithRedirect: mockLoginWithRedirect,
    } as any);

    render(<LoginButton />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show "already logged in" message when authenticated', () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      loginWithRedirect: mockLoginWithRedirect,
    } as any);

    render(<LoginButton />);
    
    expect(screen.getByText(/already logged in/i)).toBeInTheDocument();
  });

  it('should call loginWithRedirect when button is clicked', async () => {
    const user = userEvent.setup();
    
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      loginWithRedirect: mockLoginWithRedirect,
    } as any);

    render(<LoginButton />);
    
    const button = screen.getByRole('button', { name: /log in/i });
    await user.click(button);

    expect(mockLoginWithRedirect).toHaveBeenCalledTimes(1);
    expect(mockLoginWithRedirect).toHaveBeenCalledWith({
      authorizationParams: {
        redirect_uri: 'http://localhost:3000/api/auth/callback',
      },
      appState: {
        returnTo: '/',
      },
    });
  });

  it('should not render button when authenticated', () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      loginWithRedirect: mockLoginWithRedirect,
    } as any);

    render(<LoginButton />);
    
    const button = screen.queryByRole('button', { name: /log in/i });
    expect(button).not.toBeInTheDocument();
  });
});
