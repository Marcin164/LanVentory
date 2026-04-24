import {
  Controller,
  Get,
  Post,
  Patch,
  Req,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { DeviceLifecycle } from 'src/entities/devices.entity';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { AgentGuard } from 'src/guards/agentGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import type { Response } from 'express';
import { Res } from '@nestjs/common';
import { DevicesService } from 'src/services/devices.service';
import { DeviceTagsService } from 'src/services/deviceTags.service';
import { AgentTaskService } from 'src/services/agentTask.service';
import { DeviceReportService } from 'src/services/deviceReport.service';
import { AuditService } from 'src/services/audit.service';
import { DeviceScanDto } from 'src/dto/devices.dto';
import { AgentTaskType } from 'src/entities/agentTask.entity';

@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly tagsService: DeviceTagsService,
    private readonly agentTasks: AgentTaskService,
    private readonly deviceReport: DeviceReportService,
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
  @UsePipes(new ValidationPipe({ whitelist: false, transform: true }))
  @Post('/agent/data')
  async receiveData(@Body() body: DeviceScanDto, @Req() req: any) {
    const device = (req as any).agentDevice;
    const { device: updated, serialChanged, software } =
      await this.devicesService.recordScan(device, body);

    await this.auditService.log('Device', device.id, 'agent_scan', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      serialNumber: updated.serialNumber ?? null,
      sections: Object.keys(body ?? {}),
      software,
    });
    if (serialChanged) {
      await this.auditService.log('Device', device.id, 'serial_changed', {
        ip: req.ip,
        previous: device.serialNumber,
        reported: body?.hardware?.baseboard?.serial_number ?? body?.serialNumber,
      });
    }

    return { ok: true, deviceId: device.id, software };
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin, Role.Auditor, Role.Helpdesk)
  @Get('/:deviceId/report.pdf')
  async deviceReportPdf(
    @Param('deviceId') deviceId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const actor =
      req?.user?.properties?.metadata?.id ?? req?.user?.id ?? undefined;
    const { buffer, filename, sha256 } =
      await this.deviceReport.render(deviceId, actor);
    await this.auditService.log('Device', deviceId, 'report_exported', {
      actor,
      format: 'pdf',
      sha256,
      bytes: buffer.length,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('X-Report-Sha256', sha256);
    res.send(buffer);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin, Role.Auditor, Role.Helpdesk)
  @Get('/:deviceId/scans')
  listScans(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.devicesService.listScans(deviceId, limit ? Number(limit) : 50);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin, Role.Auditor, Role.Helpdesk)
  @Get('/:deviceId/scans/diff')
  diffScans(
    @Param('deviceId') deviceId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (from && to) {
      return this.devicesService.diffScans(deviceId, from, to);
    }
    return this.devicesService.diffLatestTwo(deviceId);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin, Role.Auditor, Role.Helpdesk)
  @Get('/:deviceId/scans/:scanId')
  getScan(
    @Param('deviceId') deviceId: string,
    @Param('scanId') scanId: string,
  ) {
    return this.devicesService.getScan(deviceId, scanId);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin, Role.Auditor, Role.Helpdesk)
  @Get('/:deviceId/software')
  async getDeviceSoftware(
    @Param('deviceId') deviceId: string,
    @Query('includeUninstalled') includeUninstalled?: string,
  ) {
    return this.devicesService.softwareForDevice(
      deviceId,
      includeUninstalled === 'true',
    );
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Patch('/:deviceId/lifecycle')
  async updateLifecycle(
    @Param('deviceId') deviceId: string,
    @Body()
    body: {
      lifecycle?: DeviceLifecycle;
      lifecycleNote?: string;
      purchaseDate?: string;
      purchasePrice?: string;
      purchaseCurrency?: string;
      vendor?: string;
      purchaseOrder?: string;
      warrantyStart?: string;
      warrantyEnd?: string;
      retiredAt?: string;
      disposedAt?: string;
      disposalMethod?: string;
    },
    @Req() req: any,
  ) {
    const actor = req?.user?.properties?.metadata?.id ?? req?.user?.id;
    const { previous, updated } =
      await this.devicesService.updateLifecycle(deviceId, body);

    await this.auditService.log('Device', deviceId, 'lifecycle_updated', {
      actor,
      changes: Object.fromEntries(
        Object.entries(body).filter(
          ([k, v]) =>
            v !== undefined && (previous as any)[k] !== v,
        ),
      ),
    });

    return updated;
  }

  // ---- Tags ----

  @UseGuards(AuthGuard)
  @Roles(Role.Admin, Role.Auditor, Role.Helpdesk)
  @Get('/tags')
  listTags() {
    return this.tagsService.listTags();
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Post('/tags')
  createTag(@Body() body: any) {
    return this.tagsService.createTag(body);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Post('/tags/:id/delete')
  async deleteTag(@Param('id') id: string) {
    await this.tagsService.deleteTag(id);
    return { ok: true };
  }

  @UseGuards(AuthGuard)
  @Get('/:deviceId/tags')
  tagsForDevice(@Param('deviceId') deviceId: string) {
    return this.tagsService.tagsForDevice(deviceId);
  }

  // ---- Mass actions ----

  @UseGuards(AuthGuard)
  @Roles(Role.Admin, Role.Helpdesk)
  @Post('/bulk/tag')
  async bulkTag(
    @Body() body: { deviceIds: string[]; tagIds: string[]; action: 'attach' | 'detach' },
    @Req() req: any,
  ) {
    const actor = req?.user?.properties?.metadata?.id ?? req?.user?.id ?? null;
    const count =
      body.action === 'detach'
        ? await this.tagsService.detach(body.deviceIds, body.tagIds)
        : await this.tagsService.attach(body.deviceIds, body.tagIds, actor);
    await this.auditService.log('Device', 'bulk', `tag_${body.action}`, {
      actor,
      deviceCount: body.deviceIds.length,
      tagIds: body.tagIds,
      affected: count,
    });
    return { affected: count };
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Post('/bulk/assign')
  async bulkAssign(
    @Body() body: { deviceIds: string[]; userId: string | null },
    @Req() req: any,
  ) {
    const actor = req?.user?.properties?.metadata?.id ?? req?.user?.id ?? null;
    const count = await this.devicesService.bulkAssignUser(
      body.deviceIds,
      body.userId,
    );
    await this.auditService.log('Device', 'bulk', 'assigned', {
      actor,
      deviceCount: body.deviceIds.length,
      userId: body.userId,
      affected: count,
    });
    return { affected: count };
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Post('/bulk/lifecycle')
  async bulkLifecycle(
    @Body()
    body: { deviceIds: string[]; lifecycle: DeviceLifecycle; note?: string },
    @Req() req: any,
  ) {
    const actor = req?.user?.properties?.metadata?.id ?? req?.user?.id ?? null;
    const count = await this.devicesService.bulkUpdateLifecycle(
      body.deviceIds,
      body.lifecycle,
      body.note ?? null,
    );
    await this.auditService.log('Device', 'bulk', 'lifecycle_updated', {
      actor,
      deviceCount: body.deviceIds.length,
      lifecycle: body.lifecycle,
      affected: count,
    });
    return { affected: count };
  }

  // ---- Agent task queue ----

  @UseGuards(AuthGuard)
  @Roles(Role.Admin, Role.Auditor, Role.Helpdesk)
  @Get('/:deviceId/tasks')
  listTasks(@Param('deviceId') deviceId: string, @Query('state') state?: any) {
    return this.agentTasks.listForDevice(deviceId, { state });
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin, Role.Helpdesk)
  @Post('/:deviceId/tasks')
  async enqueueTask(
    @Param('deviceId') deviceId: string,
    @Body() body: { type: AgentTaskType; payload?: Record<string, any> },
    @Req() req: any,
  ) {
    const actor = req?.user?.properties?.metadata?.id ?? req?.user?.id ?? null;
    const task = await this.agentTasks.enqueue({
      deviceId,
      type: body.type,
      payload: body.payload,
      requestedBy: actor,
    });
    await this.auditService.log('AgentTask', task.id, 'enqueued', {
      actor,
      deviceId,
      type: body.type,
    });
    return task;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin, Role.Helpdesk)
  @Post('/bulk/tasks')
  async enqueueBulkTasks(
    @Body()
    body: {
      deviceIds: string[];
      type: AgentTaskType;
      payload?: Record<string, any>;
    },
    @Req() req: any,
  ) {
    const actor = req?.user?.properties?.metadata?.id ?? req?.user?.id ?? null;
    const count = await this.agentTasks.enqueueBulk({ ...body, requestedBy: actor });
    await this.auditService.log('AgentTask', 'bulk', 'enqueued', {
      actor,
      deviceCount: body.deviceIds.length,
      type: body.type,
      created: count,
    });
    return { created: count };
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Post('/tasks/:id/cancel')
  async cancelTask(@Param('id') id: string, @Req() req: any) {
    const actor = req?.user?.properties?.metadata?.id ?? req?.user?.id ?? null;
    const task = await this.agentTasks.cancel(id);
    await this.auditService.log('AgentTask', id, 'cancelled', { actor });
    return task;
  }

  // Agent-facing task queue endpoints. Authenticated via AgentGuard (HMAC)
  // against the device's credentials.

  @UseGuards(AgentGuard)
  @Post('/agent/tasks/claim')
  async claimTasks(@Body() body: { max?: number }, @Req() req: any) {
    const device = (req as any).agentDevice;
    const tasks = await this.agentTasks.claimForDevice(
      device.id,
      body?.max ?? 5,
    );
    return tasks.map((t) => ({
      id: t.id,
      type: t.type,
      payload: t.payload,
      leaseToken: t.leaseToken,
      leasedUntil: t.leasedUntil,
    }));
  }

  @UseGuards(AgentGuard)
  @Post('/agent/tasks/:id/complete')
  async completeTask(
    @Param('id') id: string,
    @Body() body: { leaseToken: string; result?: Record<string, any> },
  ) {
    return this.agentTasks.complete(id, body.leaseToken, body.result ?? null);
  }

  @UseGuards(AgentGuard)
  @Post('/agent/tasks/:id/fail')
  async failTask(
    @Param('id') id: string,
    @Body() body: { leaseToken: string; error: string },
  ) {
    return this.agentTasks.fail(id, body.leaseToken, body.error ?? 'unknown');
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
