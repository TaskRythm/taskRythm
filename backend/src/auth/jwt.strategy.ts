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
    const user: AuthUser = {
      auth0Id: payload.sub,
      email: payload.email,
      name: payload.name || payload.nickname,
      picture: payload.picture,
      permissions: payload.permissions || [],
    };

    return user;
  }
}