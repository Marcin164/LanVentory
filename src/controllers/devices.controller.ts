import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Req,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import { Request } from '@nestjs/common';
import { DevicesService } from 'src/services/devices.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  async findAll(@Req() req: Request): Promise<any> {
    return this.devicesService.findAll();
  }

  @Get('/:deviceId')
  async findDevice(@Param('deviceId') deviceId: string): Promise<any> {
    return this.devicesService.findDevice(deviceId);
  }

  @Get('/user/:userId')
  async findUserDevices(@Param('userId') userId: string): Promise<any> {
    return this.devicesService.findUserDevices(userId);
  }

  @Post('/agent/data')
  receiveData(@Body() body: any) {
    return this.devicesService.updateScanInfoBySerialTag(body);
  }
}
