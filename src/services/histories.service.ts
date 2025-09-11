import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { History } from 'src/entities/history.entity';

@Injectable()
export class HistoriesService {
  constructor(
    @InjectRepository(History)
    private historiesRepository: Repository<History>,
  ) {}

  async findAll(): Promise<History[]> {
    return this.historiesRepository.find();
  }
}
