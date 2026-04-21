import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from 'src/entities/users.entity';

/**
 * Allows access to the global history feed only for a narrow set of users
 * (admins and approvers). Per-entity endpoints (device/user history) keep
 * the plain AuthGuard so that existing screens are not affected.
 */
@Injectable()
export class HistoryAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(Users)
    private usersRepository: Repository<Users>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId: string | undefined =
      req?.user?.properties?.metadata?.id ?? req?.user?.id;

    if (!userId) {
      throw new ForbiddenException('User context missing');
    }

    const user = await this.usersRepository.findOneBy({ id: userId });
    if (
      !user ||
      (!user.isAdmin && !user.isApprover && !user.isAuditor)
    ) {
      throw new ForbiddenException(
        'History feed access requires admin, approver or auditor role',
      );
    }
    return true;
  }
}
