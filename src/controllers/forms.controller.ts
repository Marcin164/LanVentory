import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { FormsService } from 'src/services/forms.service';

@UseGuards(AuthGuard)
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  async findAll(@Req() req: Request): Promise<any> {
    return this.formsService.findAll();
  }
}
