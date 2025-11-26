export interface AuthUser {
  auth0Id: string;
  email?: string;
  name?: string;
  picture?: string;
  permissions: string[];
}
