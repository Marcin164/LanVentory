// propelauth-auth.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { initBaseAuth } from '@propelauth/node';
import { Request } from 'express';

const { validateAccessTokenAndGetUserClass } = initBaseAuth({
  authUrl: 'https://3187297.propelauthtest.com'!,
  apiKey:
    '0748e2c0b528c828501effb1d3e42bced3af1a9b51047c586a101715ce367db978f52483b7d686bf22438f029911a9b7'!,
});

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Brak nagłówka Authorization');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Nieprawidłowy nagłówek Authorization');
    }

    let user;
    try {
      user = await validateAccessTokenAndGetUserClass(token);
    } catch (err) {
      console.error('Błąd w weryfikacji tokena PropelAuth:', err);
      throw new UnauthorizedException('Token niepoprawny lub wygasł');
    }

    (req as any).user = user;

    return true;
  }
}
