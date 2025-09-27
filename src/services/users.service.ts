import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from 'src/entities/users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private usersRepository: Repository<Users>,
  ) {}

  async findAll(): Promise<Users[]> {
    return this.usersRepository.find();
  }

  async findAllTable(): Promise<any> {
    return this.usersRepository
      .createQueryBuilder('users')
      .leftJoin('devices', 'devices', 'users.id = devices.ownerId')
      .select([
        'users.id',
        'users.displayName',
        'users.username',
        'devices.system',
        'users.lastLogon',
        'users.department',
        'users.office',
      ])
      .getRawMany();
  }

  async findUser(id: any): Promise<any> {
    return this.usersRepository.findOneBy({ id: id });
  }
}
