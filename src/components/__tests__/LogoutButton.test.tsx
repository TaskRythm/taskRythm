import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth0 } from '@auth0/auth0-react';
import LogoutButton from '../LogoutButton';

jest.mock('@auth0/auth0-react');
const mockUseAuth0 = useAuth0 as jest.MockedFunction<typeof useAuth0>;

describe('LogoutButton', () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when not authenticated', () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      logout: mockLogout,
    } as any);

    const { container } = render(<LogoutButton />);
    expect(container.firstChild).toBeNull();
  });

  it('should render logout button when authenticated', () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      logout: mockLogout,
    } as any);

    render(<LogoutButton />);
    
    const button = screen.getByRole('button', { name: /log out/i });
    expect(button).toBeInTheDocument();
  });

  it('should call logout when button is clicked', async () => {
    const user = userEvent.setup();
    
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      logout: mockLogout,
    } as any);

    render(<LogoutButton />);
    
    const button = screen.getByRole('button', { name: /log out/i });
    await user.click(button);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledWith({
      logoutParams: {
        returnTo: 'http://localhost',
      },
    });
  });

  it('should not render when loading and not authenticated', () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      logout: mockLogout,
    } as any);

    const { container } = render(<LogoutButton />);
    expect(container.firstChild).toBeNull();
  });
});
