import {
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { Request } from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { UsersService } from 'src/services/users.service';
import { ActiveDirectoryService } from 'src/services/active-directory.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adService: ActiveDirectoryService,
  ) {}

  @Get('/ad/user')
  async syncADUser(@Query('username') username: string) {
    const users = await this.adService.findAllUsers();
    await this.usersService.insertManyUsersAD(users);
    return users || { message: 'Użytkownik nie znaleziony' };
  }

  @UseGuards(AuthGuard)
  @Get()
  async findAll(@Req() req: Request): Promise<any> {
    return this.usersService.findAll();
  }

  @UseGuards(AuthGuard)
  @Post()
  async insertOne(@Body() body: any): Promise<any> {
    return this.usersService.insertOne(body);
  }

  @UseGuards(AuthGuard)
  @Post('/many')
  async insertMany(@Body() body: any): Promise<any> {
    return this.usersService.insertMany(body);
  }

  @UseGuards(AuthGuard)
  @Get('/table')
  async findAllTable(@Req() req: Request): Promise<any> {
    return this.usersService.findAllTable();
  }

  @UseGuards(AuthGuard)
  @Get('/filters')
  async getFilters() {
    return this.usersService.getFilterOptions();
  }

  @UseGuards(AuthGuard)
  @Get('/:id')
  async findUser(@Param('id') id: string): Promise<any> {
    return this.usersService.findUser(id);
  }
}
