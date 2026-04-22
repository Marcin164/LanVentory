import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { initBaseAuth } from '@propelauth/node';
import { Users } from 'src/entities/users.entity';
import {
  Role,
  ROLES_KEY,
  userHasAnyRole,
} from 'src/decorators/roles.decorator';

const { validateAccessTokenAndGetUserClass } = initBaseAuth({
  authUrl: 'https://3187297.propelauthtest.com',
  apiKey:
    '0748e2c0b528c828501effb1d3e42bced3af1a9b51047c586a101715ce367db978f52483b7d686bf22438f029911a9b7',
});

/**
 * Reads `@Roles(...)` metadata and grants access if the current user has any of
 * the listed flags. Registered globally via APP_GUARD, which runs before any
 * controller-level `@UseGuards(AuthGuard)`. To avoid race with AuthGuard, this
 * guard validates the token itself when `req.user` is not yet populated.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();

    if (!req.user) {
      const authHeader = req.headers?.authorization;
      if (!authHeader) throw new UnauthorizedException('Missing Authorization');
      const [type, token] = authHeader.split(' ');
      if (type !== 'Bearer' || !token) {
        throw new UnauthorizedException('Invalid Authorization header');
      }
      try {
        req.user = await validateAccessTokenAndGetUserClass(token);
      } catch {
        throw new UnauthorizedException('Token invalid or expired');
      }
    }

    const reqUser = req.user;
    const internalId: string | undefined = reqUser?.properties?.metadata?.id;
    const authId: string | undefined =
      reqUser?.userId ?? reqUser?.id ?? reqUser?.user_id;
    const email: string | undefined = reqUser?.email;

    let user: Users | null = null;
    if (internalId) {
      user = await this.usersRepository.findOneBy({ id: internalId });
    }
    if (!user && authId) {
      user = await this.usersRepository.findOneBy({ authUserId: authId });
    }
    if (!user && email) {
      user = await this.usersRepository.findOneBy({ email });
    }

    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    if (!userHasAnyRole(user, required)) {
      throw new ForbiddenException(
        `Required role(s): ${required.join(', ')}`,
      );
    }

    if (authId && !user.authUserId) {
      await this.usersRepository.update(user.id, { authUserId: authId });
    }

    (req as any).appUser = user;
    return true;
  }
}
