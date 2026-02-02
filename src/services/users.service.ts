import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from 'src/entities/users.entity';
import { uuidv4 } from 'src/helpers/uuidv4';
// import { propelAuth } from 'src/helpers/propelAuthClient';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private usersRepository: Repository<Users>,
  ) {}

  async findAll(): Promise<Users[]> {
    return this.usersRepository.find();
  }

  async insertOne(user: any): Promise<any> {
    return this.usersRepository.insert({
      id: uuidv4(),
      distinguishedName: `${user.name} ${user.surname}`,
      ...user,
    });
  }

  async insertMany(users: any): Promise<any> {
    if (!Array.isArray(users) || users.length === 0) {
      throw new Error('Brak danych użytkowników do wstawienia.');
    }

    const mappedUsers = users.map((user) => {
      return {
        id: uuidv4(),
        distinguishedName: `${user.name} ${user.surname}`,
        ...user,
      };
    });

    return await this.usersRepository.insert(mappedUsers);
  }

  async insertManyUsersAD(usersData: Partial<Users>[]): Promise<any> {
    if (!Array.isArray(usersData) || usersData.length === 0) {
      throw new Error('Brak danych użytkowników do wstawienia.');
    }

    const users = usersData.map((user: any) => {
      return {
        ...user,
        name: user.givenName,
        surname: user.sn,
        email: user.userPrincipalName,
        username: user.sAMAccountName,
        city: user.l,
        country: user.co,
        phone: user.telephoneNumber,
      };
    });

    try {
      const result = await this.usersRepository.insert(
        users.filter((user) => user.name),
      );
      return result;
    } catch (error) {
      throw new Error('Nie udało się wstawić użytkowników do bazy danych.');
    }
  }

  // async syncUsersFromAD(adUsers: any[]): Promise<void> {
  //   for (const user of adUsers) {
  //     const email = user.userPrincipalName || user.mail;

  //     if (!email) {
  //       console.log(`Pomijam użytkownika bez emaila: ${user.sAMAccountName}`);
  //       continue;
  //     }

  //     // 🔍 sprawdzenie duplikatu
  //     const existing = await propelAuth.fetchUserMetadatassssssssssssByEmail(email);
  //     if (existing) {
  //       console.log(`Użytkownik ${email} już istnieje w PropelAuth`);
  //       continue;
  //     }

  //     try {
  //       await propelAuth.createUser({
  //         email,
  //         password: '1234567890',
  //         firstName: user.givenName ?? '',
  //         lastName: user.sn ?? '',
  //         emailConfirmed: true,
  //       });

  //       console.log(`Utworzono użytkownika w PropelAuth: ${email}`);
  //     } catch (err) {
  //       console.error(`Błąd synchronizacji użytkownika ${email}`, err);
  //     }
  //   }
  // }

  async findAllTable(): Promise<any> {
    return this.usersRepository
      .createQueryBuilder('users')
      .leftJoin('devices', 'devices', 'users.id = devices.userId')
      .select([
        'users.id AS id',
        'users.name AS name',
        'users.surname AS surname',
        'users.username AS username',

        // pobieramy *dowolne jedno* urządzenie poprzez MIN()
        'MIN(devices.assetName) AS assetName',
        'MIN(devices.model) AS model',
        'MIN(devices.id) AS deviceId',

        'users.department AS department',
        'users.office AS office',
        'users.country AS country',
        'users.city AS city',
        'users.company AS company',
        'users.title AS title',
        'users.streetAddress AS street',
        'users.postalCode AS postalCode',
        'users.manager AS manager',
      ])
      .groupBy('users.id')
      .addGroupBy('users.name')
      .addGroupBy('users.surname')
      .addGroupBy('users.username')
      .addGroupBy('users.department')
      .addGroupBy('users.office')
      .addGroupBy('users.country')
      .addGroupBy('users.city')
      .addGroupBy('users.company')
      .addGroupBy('users.title')
      .addGroupBy('users.streetAddress')
      .addGroupBy('users.postalCode')
      .addGroupBy('users.manager')
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

  async resolveAuthIdToUserId(authId: string): Promise<any> {
    const user = await this.usersRepository.findOneBy({ authUserId: authId });
    return user;
  }

  async findApprovers(): Promise<any> {
    const approvers = await this.usersRepository.findBy({ isApprover: true });
    return approvers;
  }
}
