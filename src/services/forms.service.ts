import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Forms } from 'src/entities/forms.entity';

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(Forms)
    private formsRepository: Repository<Forms>,
  ) {}

  async findAll(): Promise<Forms[]> {
    return this.formsRepository.find();
  }
}
