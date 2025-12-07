// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Auth0
jest.mock('@auth0/auth0-react', () => ({
  useAuth0: jest.fn(),
  Auth0Provider: ({ children }) => children,
}))
