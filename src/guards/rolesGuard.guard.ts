import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from 'src/entities/users.entity';
import {
  Role,
  ROLES_KEY,
  userHasAnyRole,
} from 'src/decorators/roles.decorator';

/**
 * Reads `@Roles(...)` metadata and grants access if the current user has any of
 * the listed flags. Admins always pass. Endpoints without `@Roles(...)` are
 * not affected — combine with AuthGuard separately.
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
    const userId: string | undefined =
      req?.user?.properties?.metadata?.id ?? req?.user?.id;

    if (!userId) {
      throw new ForbiddenException('User context missing');
    }

    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!userHasAnyRole(user, required)) {
      throw new ForbiddenException(
        `Required role(s): ${required.join(', ')}`,
      );
    }

    (req as any).appUser = user;
    return true;
  }
}
