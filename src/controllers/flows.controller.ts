import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { FlowsService } from 'src/services/flows.service';

@UseGuards(AuthGuard)
@Controller('flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Get()
  async findAll(@Req() req: Request): Promise<any> {
    return this.flowsService.findAll();
  }
}
