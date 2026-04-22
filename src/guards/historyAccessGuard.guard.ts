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
    const reqUser = req?.user;
    const internalId: string | undefined = reqUser?.properties?.metadata?.id;
    const authId: string | undefined = reqUser?.userId ?? reqUser?.id;

    let user: Users | null = null;
    if (internalId) {
      user = await this.usersRepository.findOneBy({ id: internalId });
    }
    if (!user && authId) {
      user = await this.usersRepository.findOneBy({ authUserId: authId });
    }

    if (!user) {
      throw new ForbiddenException('User context missing');
    }
    if (!user.isAdmin && !user.isApprover && !user.isAuditor) {
      throw new ForbiddenException(
        'History feed access requires admin, approver or auditor role',
      );
    }
    return true;
  }
}
