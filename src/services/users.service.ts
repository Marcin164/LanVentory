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
        'users.id AS id',
        'users.displayName AS displayName',
        'users.username AS username',
        'devices.system AS system',
        'devices.model AS model',
        'users.lastLogon AS lastLogon',
        'users.department AS department',
        'users.office AS office',
        'users.country AS country',
        'users.city AS city',
        'users.company AS company',
        'users.title AS title',
        'users.streetAddress AS street',
        'users.postalCode AS postalCode',
        'users.manager AS manager',
        // 'users.enabled AS enabled',
      ])
      .getRawMany();
  }

  async findUser(id: any): Promise<any> {
    return this.usersRepository.findOneBy({ id: id });
  }

  async getFilterOptions() {
    const filterFields = [
      'department',
      'company',
      'office',
      'city',
      'country',
      'title',
      'streetAddress',
      'postalCode',
      'manager',
      // 'enabled',
      // 'model',
      // 'assetName',
    ];

    const options: Record<string, string[]> = {};

    for (const field of filterFields) {
      const values = await this.usersRepository
        .createQueryBuilder('users')
        .select(`DISTINCT users.${field}`, 'value')
        .where(`users.${field} IS NOT NULL AND users.${field} != ''`)
        .orderBy('value', 'ASC')
        .getRawMany();

      options[field] = values.map((v) => v.value);
    }

    return options;
  }
}
