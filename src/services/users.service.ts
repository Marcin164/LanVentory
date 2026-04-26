import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from 'src/entities/users.entity';
import { uuidv4 } from 'src/helpers/uuidv4';
import { validateSod } from 'src/config/sod';
import { logoutAllUserSessions } from 'src/helpers/propelAuthClient';

const ROLE_FIELDS = [
  'isAdmin',
  'isApprover',
  'isAuditor',
  'isCompliance',
  'isHelpdesk',
  'isDpo',
] as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

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

  async update(dto: any, id: string): Promise<any> {
    const existing = await this.usersRepository.findOneBy({ id });
    if (!existing) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const merged = { ...existing, ...dto };
    const conflicts = validateSod(merged);
    if (conflicts.length > 0) {
      throw new BadRequestException({
        message: 'Role assignment violates segregation of duties',
        conflicts,
      });
    }

    const user = await this.usersRepository.preload({ id, ...dto });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const saved = await this.usersRepository.save(user);

    const roleChanged = ROLE_FIELDS.some(
      (f) => Boolean(existing[f]) !== Boolean(saved[f]),
    );

    if (roleChanged && existing.authUserId) {
      try {
        await logoutAllUserSessions(existing.authUserId);
        this.logger.log(
          `Forced logout of all sessions for user ${id} (authUserId=${existing.authUserId}) after role change`,
        );
      } catch (err) {
        this.logger.warn(
          `Failed to logout sessions for user ${id}: ${(err as Error).message}`,
        );
      }
    }

    return saved;
  }

  async delete(id: string): Promise<any> {
    console.log(id);
    return await this.usersRepository.delete({ id });
  }

  async insertManyUsersAD(usersData: Partial<Users>[]): Promise<any> {
    if (!Array.isArray(usersData) || usersData.length === 0) {
      throw new Error('Brak danych użytkowników do wstawienia.');
    }

    const parseAdDate = (value: any): Date | null => {
      if (!value) return null;
      const str = String(value);
      // AD FILETIME format (ticks since 1601)
      if (/^\d{17,}$/.test(str)) {
        const ms = Number(BigInt(str) / 10000n) - 11644473600000;
        return ms > 0 ? new Date(ms) : null;
      }
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    };

    const users: any = usersData
      .filter((user: any) => user.givenName)
      .map((user: any) => ({
        name: user.givenName,
        surname: user.sn,
        email: user.userPrincipalName,
        username: user.sAMAccountName,
        distinguishedName: user.distinguishedName,
        userAccountControl: user.userAccountControl
          ? String(user.userAccountControl)
          : null,
        phone: user.telephoneNumber,
        title: user.title,
        department: user.department,
        company: user.company,
        office: user.physicalDeliveryOfficeName || user.office,
        streetAddress: user.streetAddress,
        city: user.l,
        postalCode: user.postalCode,
        country: user.co,
        manager: user.manager,
        memberOf: user.memberOf || null,
        whenCreated: parseAdDate(user.whenCreated),
        pwdLastSet: parseAdDate(user.pwdLastSet),
      }));

    let created = 0;
    let updated = 0;

    for (const user of users) {
      const existing = user.distinguishedName
        ? await this.usersRepository.findOneBy({
            distinguishedName: user.distinguishedName,
          })
        : null;

      if (existing) {
        await this.usersRepository.update(existing.id, user);
        updated++;
      } else {
        await this.usersRepository.insert({ id: uuidv4(), ...user });
        created++;
      }
    }

    return { created, updated, total: users.length };
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

  async findAllTable(query: any = {}): Promise<any> {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(query.limit, 10) || 30, 1);
    const search: string | undefined = query.search?.toString().trim();

    const FILTER_FIELDS = [
      'department',
      'company',
      'office',
      'city',
      'country',
      'title',
      'streetAddress',
      'postalCode',
      'manager',
    ];

    const applyFilters = (qb: any) => {
      if (search) {
        qb.andWhere(
          `(users.name ILIKE :search
            OR users.surname ILIKE :search
            OR users.username ILIKE :search
            OR users.email ILIKE :search)`,
          { search: `%${search}%` },
        );
      }

      for (const field of FILTER_FIELDS) {
        const value = query[field];
        if (!value) continue;
        const arr = Array.isArray(value) ? value : [value];
        if (arr.length === 0) continue;
        qb.andWhere(`users.${field} IN (:...${field})`, { [field]: arr });
      }
    };

    const dataQb = this.usersRepository
      .createQueryBuilder('users')
      .leftJoin('devices', 'devices', 'users.id = devices.userId')
      .select([
        'users.id AS id',
        'users.name AS name',
        'users.surname AS surname',
        'users.username AS username',
        'users.email AS email',
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
        'users.isAdmin AS "isAdmin"',
        'users.isApprover AS "isApprover"',
        'users.isAuditor AS "isAuditor"',
        'users.isCompliance AS "isCompliance"',
        'users.isHelpdesk AS "isHelpdesk"',
        'users.isDpo AS "isDpo"',
      ])
      .groupBy('users.id')
      .addGroupBy('users.name')
      .addGroupBy('users.surname')
      .addGroupBy('users.username')
      .addGroupBy('users.email')
      .addGroupBy('users.department')
      .addGroupBy('users.office')
      .addGroupBy('users.country')
      .addGroupBy('users.city')
      .addGroupBy('users.company')
      .addGroupBy('users.title')
      .addGroupBy('users.streetAddress')
      .addGroupBy('users.postalCode')
      .addGroupBy('users.manager')
      .addGroupBy('users.isAdmin')
      .addGroupBy('users.isApprover')
      .addGroupBy('users.isAuditor')
      .addGroupBy('users.isCompliance')
      .addGroupBy('users.isHelpdesk')
      .addGroupBy('users.isDpo')
      .orderBy('users.surname', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit);

    applyFilters(dataQb);

    const countQb = this.usersRepository
      .createQueryBuilder('users')
      .select('COUNT(DISTINCT users.id)', 'count');

    applyFilters(countQb);

    const [data, countRow] = await Promise.all([
      dataQb.getRawMany(),
      countQb.getRawOne(),
    ]);

    const total = parseInt(countRow?.count, 10) || 0;

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
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
