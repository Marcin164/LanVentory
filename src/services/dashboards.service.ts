import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dashboards } from 'src/entities/dashboards.entity';
import { uuidv4 } from 'src/helpers/uuidv4';

@Injectable()
export class DashboardsService {
  constructor(
    @InjectRepository(Dashboards)
    private dashboardsRepository: Repository<Dashboards>,
  ) {}

  async findAll(): Promise<Dashboards[]> {
    return this.dashboardsRepository.find();
  }

  async createDashboard(name: string, userId: string): Promise<Dashboards> {
    const newDashboard = this.dashboardsRepository.create({
      id: uuidv4(),
      name,
      userId,
      cards: [],
    });

    return this.dashboardsRepository.save(newDashboard);
  }
}
