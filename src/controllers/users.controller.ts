import { Controller, Get, Req, UseGuards, Param } from '@nestjs/common';
import { Request } from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { UsersService } from 'src/services/users.service';

@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Req() req: Request): Promise<any> {
    return this.usersService.findAll();
  }

  @Get('/table')
  async findAllTable(@Req() req: Request): Promise<any> {
    return this.usersService.findAllTable();
  }

  @Get('/filters')
  async getFilters() {
    return this.usersService.getFilterOptions();
  }

  @Get('/:id')
  async findUser(@Param('id') id: string): Promise<any> {
    return this.usersService.findUser(id);
  }
}
