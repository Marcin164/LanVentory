import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormsController } from 'src/controllers/forms.controller';
import { Form } from 'src/entities/form.entity';
import { FormsService } from 'src/services/forms.service';

@Module({
  imports: [TypeOrmModule.forFeature([Form])],
  controllers: [FormsController],
  providers: [FormsService],
})
export class FormsModule {}
