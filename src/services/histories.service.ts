import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Histories } from 'src/entities/histories.entity';

@Injectable()
export class HistoriesService {
  constructor(
    @InjectRepository(Histories)
    private historiesRepository: Repository<Histories>,
  ) {}

  async findAll(): Promise<Histories[]> {
    return this.historiesRepository.find();
  }
}
