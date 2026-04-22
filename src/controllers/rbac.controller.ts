import { Controller, Get, UseGuards } from '@nestjs/common';

import { AuthGuard } from 'src/guards/authGuard.guard';
import { getSodMatrix } from 'src/config/sod';

@UseGuards(AuthGuard)
@Controller('rbac')
export class RbacController {
  @Get('sod')
  getSod() {
    return getSodMatrix();
  }
}
