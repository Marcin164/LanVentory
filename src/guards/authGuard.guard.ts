// propelauth-auth.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';
import { validateAccessTokenAndGetUserClass } from 'src/helpers/propelAuthClient';

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

    let user: any;
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
