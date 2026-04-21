import {
  Controller,
  Get,
  Post,
  Req,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { AgentGuard } from 'src/guards/agentGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { DevicesService } from 'src/services/devices.service';
import { AuditService } from 'src/services/audit.service';
import { DeviceScanDto } from 'src/dto/devices.dto';

@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly auditService: AuditService,
  ) {}

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Post()
  async addDevice(@Body() body: any): Promise<any> {
    return this.devicesService.addDevice(body);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Post('assign')
  async assignDevice(@Body() body: { deviceId: any; userId: any }) {
    return this.devicesService.assignDeviceToUser(body.deviceId, body.userId);
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
  @Get('/table')
  async findDevicesTable(@Query() query: any): Promise<any> {
    return this.devicesService.findDevicesTable(query);
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

  @UseGuards(AgentGuard)
  @Post('/agent/data')
  async receiveData(@Body() body: DeviceScanDto, @Req() req: any) {
    const device = (req as any).agentDevice;
    const result = await this.devicesService.updateScanInfoBySerialTag(body);
    if (device?.id) {
      await this.devicesService.markScanReceived(device.id);
      await this.auditService.log('Device', device.id, 'agent_scan', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        serialNumber: body?.serialNumber ?? null,
        sections: Object.keys(body ?? {}),
      });
    }
    return result;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Post('/:deviceId/agent/secret')
  async rotateAgentSecret(
    @Param('deviceId') deviceId: string,
    @Req() req: any,
  ) {
    const actor = req?.user?.properties?.metadata?.id ?? req?.user?.id;
    const { secret } = await this.devicesService.rotateAgentSecret(deviceId);
    await this.auditService.log('Device', deviceId, 'agent_secret_rotated', {
      actor,
    });
    return { secret };
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Post('/:deviceId/agent/secret/revoke')
  async revokeAgentSecret(
    @Param('deviceId') deviceId: string,
    @Req() req: any,
  ) {
    const actor = req?.user?.properties?.metadata?.id ?? req?.user?.id;
    await this.devicesService.revokeAgentSecret(deviceId);
    await this.auditService.log('Device', deviceId, 'agent_secret_revoked', {
      actor,
    });
    return { ok: true };
  }
}
