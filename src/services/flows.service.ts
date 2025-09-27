import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flows } from 'src/entities/flows.entity';

@Injectable()
export class FlowsService {
  constructor(
    @InjectRepository(Flows)
    private flowsRepository: Repository<Flows>,
  ) {}

  async findAll(): Promise<Flows[]> {
    return this.flowsRepository.find();
  }
}
