import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form } from 'src/entities/form.entity';

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(Form)
    private formsRepository: Repository<Form>,
  ) {}

  async findAll(): Promise<Form[]> {
    return this.formsRepository.find();
  }
}
