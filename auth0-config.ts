export const auth0Config = {
  domain: 'dev-mh588qvxm3wuxkgc.us.auth0.com',
  clientId: 'wryPWYFigcIfkws6xZLwu0c5m4uUPYIO',
  authorizationParams: {
    redirect_uri: 'http://localhost:3000/api/auth/callback', // ← Exact match
    audience: 'https://api.taskrythm.io',
    scope: 'openid profile email read:projects',
  },
  cacheLocation: 'localstorage' as const,
};