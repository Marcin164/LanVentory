import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Req,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Request } from '@nestjs/common';
import { FormsService } from 'src/services/forms.service';

@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  async findAll(@Req() req: Request): Promise<any> {
    return this.formsService.findAll();
  }
}
