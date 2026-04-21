import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from 'src/entities/users.entity';

@Injectable()
export class PrivacyService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {}

  async getPersonalData(userId: string) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      name: user.name,
      surname: user.surname,
      username: user.username,
      email: user.email,
      phone: user.phone,
      title: user.title,
      department: user.department,
      company: user.company,
      office: user.office,
      streetAddress: user.streetAddress,
      city: user.city,
      postalCode: user.postalCode,
      country: user.country,
      manager: user.manager,
      distinguishedName: user.distinguishedName,
      whenCreated: user.whenCreated,
    };
  }
}
