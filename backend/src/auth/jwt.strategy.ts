import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { AuthUser } from './auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `${process.env.AUTH0_ISSUER}/`,
      algorithms: ['RS256'],
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksUri: `${process.env.AUTH0_ISSUER}/.well-known/jwks.json`,
        jwksRequestsPerMinute: 10,
      }) as any,
    });
  }

  async validate(payload: any): Promise<AuthUser> {
    // Read standard claims
    let email = payload.email;
    let name = payload.name || payload.nickname;
    let picture = payload.picture;

    // If Auth0 Action added custom claims, use those (they override standard claims)
    // Custom claims are namespaced to avoid conflicts (e.g., "https://taskrythm.io/email")
    const namespace = process.env.AUTH0_CUSTOM_CLAIM_NAMESPACE || 'https://taskrythm.io';
    if (payload[`${namespace}/email`]) {
      email = payload[`${namespace}/email`];
    }
    if (payload[`${namespace}/name`]) {
      name = payload[`${namespace}/name`];
    }
    if (payload[`${namespace}/picture`]) {
      picture = payload[`${namespace}/picture`];
    }

    const user: AuthUser = {
      auth0Id: payload.sub,
      email,
      name,
      picture,
      permissions: payload.permissions || [],
    };

    return user;
  }
}