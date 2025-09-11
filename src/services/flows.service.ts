import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flow } from 'src/entities/flow.entity';

@Injectable()
export class FlowsService {
  constructor(
    @InjectRepository(Flow)
    private flowsRepository: Repository<Flow>,
  ) {}

  async findAll(): Promise<Flow[]> {
    return this.flowsRepository.find();
  }
}
