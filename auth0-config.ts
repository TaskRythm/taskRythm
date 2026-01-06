// auth0-config.ts
export const auth0Config = {
  domain: 'dev-mh588qvxm3wuxkgc.us.auth0.com',
  clientId: 'wryPWYFigcIfkws6xZLwu0c5m4uUPYIO',
  authorizationParams: {
    redirect_uri: 'http://localhost:3000/auth/callback',
    audience: 'https://api.taskrythm.io',
    scope: 'openid profile email read:projects offline_access',
  },
  cacheLocation: 'localstorage' as const,
};
