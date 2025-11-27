import {
  Controller,
  Get,
  Post,
  Req,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { DevicesService } from 'src/services/devices.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @UseGuards(AuthGuard)
  @Post()
  async addDevice(@Body() body: any): Promise<any> {
    return this.devicesService.addDevice(body);
  }

  @UseGuards(AuthGuard)
  @Post('assign')
  async assignDevice(@Body() body: { deviceId: any; ownerId: any }) {
    return this.devicesService.assignDeviceToUser(body.deviceId, body.ownerId);
  }

  // @UseGuards(AuthGuard)
  @Get('/options')
  async findDevicesWithSerial(): Promise<any> {
    return this.devicesService.findDevicesWithSerial();
  }

  @UseGuards(AuthGuard)
  @Get()
  async findAll(@Req() req: Request): Promise<any> {
    return this.devicesService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get('/filters')
  async getFilters() {
    return this.devicesService.getFilterOptions();
  }

  @UseGuards(AuthGuard)
  @Get('/:deviceId')
  async findDevice(@Param('deviceId') deviceId: string): Promise<any> {
    return this.devicesService.findDevice(deviceId);
  }

  @UseGuards(AuthGuard)
  @Get('/user/:userId')
  async findUserDevices(@Param('userId') userId: string): Promise<any> {
    return this.devicesService.findUserDevices(userId);
  }

  @UseGuards(AuthGuard)
  @Get('/application/:id')
  async findDevicesWithApllication(@Param('id') id: string): Promise<any> {
    return this.devicesService.findDevicesWithApplication(id);
  }

  @Post('/agent/data')
  receiveData(@Body() body: any) {
    return this.devicesService.updateScanInfoBySerialTag(body);
  }
}
