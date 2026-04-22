import {
  Controller,
  Get,
  Post,
  Patch,
  Req,
  UseGuards,
  Param,
  Query,
  Body,
  Delete,
} from '@nestjs/common';
import { Request } from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { MfaGuard } from 'src/guards/mfaGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { UsersService } from 'src/services/users.service';
import { ActiveDirectoryService } from 'src/services/active-directory.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adService: ActiveDirectoryService,
  ) {}

  @UseGuards(AuthGuard, MfaGuard)
  @Roles(Role.Admin)
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

  @UseGuards(AuthGuard, MfaGuard)
  @Roles(Role.Admin)
  @Post()
  async insertOne(@Body() body: any): Promise<any> {
    return this.usersService.insertOne(body);
  }

  @UseGuards(AuthGuard, MfaGuard)
  @Roles(Role.Admin)
  @Post('/many')
  async insertMany(@Body() body: any): Promise<any> {
    return this.usersService.insertMany(body);
  }

  @UseGuards(AuthGuard, MfaGuard)
  @Roles(Role.Admin)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<any> {
    return this.usersService.delete(id);
  }

  @UseGuards(AuthGuard, MfaGuard)
  @Roles(Role.Admin)
  @Patch(':id')
  async update(@Body() body: any, @Param('id') id: string): Promise<any> {
    return this.usersService.update(body, id);
  }

  @UseGuards(AuthGuard)
  @Get('/table')
  async findAllTable(@Query() query: any): Promise<any> {
    return this.usersService.findAllTable(query);
  }

  @UseGuards(AuthGuard)
  @Get('/filters')
  async getFilters() {
    return this.usersService.getFilterOptions();
  }

  @UseGuards(AuthGuard)
  @Get('/approvers')
  async findApprovers(): Promise<any> {
    return this.usersService.findApprovers();
  }

  @UseGuards(AuthGuard)
  @Get('/:id')
  async findUser(@Param('id') id: string): Promise<any> {
    return this.usersService.findUser(id);
  }
}
