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
    const userId: string | undefined =
      req?.user?.properties?.metadata?.id ?? req?.user?.id;

    if (!userId) {
      throw new ForbiddenException('User context missing');
    }

    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user || !user.isAdmin) {
      throw new ForbiddenException('Admin privileges required');
    }
    return true;
  }
}
