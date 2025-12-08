import { render, screen } from '@testing-library/react';
import UserProfile from '../UserProfile';
import { useAuth } from '@/hooks/useAuth';

// Mock the useAuth hook
jest.mock('@/hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('UserProfile', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com',
    picture: 'https://example.com/avatar.jpg',
  };

  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: undefined,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      logout: mockLogout,
      callApi: jest.fn(),
    });

    const { container } = render(<UserProfile />);
    expect(container.firstChild).toBeNull();
  });

  it('should render user profile when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: mockLogout,
      callApi: jest.fn(),
    });

    render(<UserProfile />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByAltText('Test User')).toHaveAttribute('src', mockUser.picture);
  });

  it('should render logout button', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: mockLogout,
      callApi: jest.fn(),
    });

    render(<UserProfile />);
    
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('should display user avatar', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: mockLogout,
      callApi: jest.fn(),
    });

    render(<UserProfile />);
    
    const avatar = screen.getByAltText('Test User');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });
});
