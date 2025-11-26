export const auth0Config = {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || '',
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '',
  authorizationParams: {
    redirect_uri: process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || ''}/auth/callback`,
  },
  cacheLocation: process.env.NEXT_PUBLIC_AUTH0_CACHE_LOCATION || 'memory',
};
