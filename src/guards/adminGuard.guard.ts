import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from 'src/entities/users.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectRepository(Users)
    private usersRepository: Repository<Users>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const reqUser = req?.user;
    const internalId: string | undefined = reqUser?.properties?.metadata?.id;
    const authId: string | undefined = reqUser?.userId ?? reqUser?.id;
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
    if (!user.isAdmin) {
      throw new ForbiddenException('Admin privileges required');
    }

    if (authId && !user.authUserId) {
      await this.usersRepository.update(user.id, { authUserId: authId });
    }

    return true;
  }
}
