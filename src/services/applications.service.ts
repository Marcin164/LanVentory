import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Applications } from 'src/entities/applications.entity';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Applications)
    private applicationsRepository: Repository<Applications>,
  ) {}

  async findAll(): Promise<Applications[]> {
    return this.applicationsRepository.find();
  }

  async findAllTable(): Promise<Applications[]> {
    return this.applicationsRepository
      .createQueryBuilder('applications')
      .leftJoin(
        'devices_applications',
        'da',
        'da.applicationId = applications.id',
      )
      .select([
        'applications.id AS id',
        'applications.name AS name',
        'applications.version AS version',
        'applications.publisher AS publisher',
        'applications.size AS size',
      ])
      .addSelect('COUNT(da.*)', 'count')
      .groupBy('applications.id')
      .getRawMany();
  }

  async findApplication(id: any): Promise<any> {
    return this.applicationsRepository.findOneBy({ id });
  }
}
