import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Devices } from 'src/entities/devices.entity';
import { uuidv4 } from 'src/helpers/uuidv4';
import { hashAgentSecret } from 'src/guards/agentGuard.guard';
import {
  SoftwareInventoryService,
  extractSoftwareList,
} from 'src/services/softwareInventory.service';
import { ComplianceService } from 'src/services/compliance.service';
import { DeviceScanService } from 'src/services/deviceScan.service';

const PREV_SECRET_GRACE_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Devices)
    private devicesRepository: Repository<Devices>,
    private readonly softwareInventory: SoftwareInventoryService,
    private readonly compliance: ComplianceService,
    private readonly scanHistory: DeviceScanService,
  ) {}

  async findDevicesWithSerial(): Promise<any> {
    return this.devicesRepository
      .createQueryBuilder('devices')
      .select([
        'devices.id AS id',
        'devices.model AS model',
        'devices.manufacturer AS manufacturer',
        'devices.serialNumber AS serialNumber',
      ])
      .where("devices.group='Computers'")
      .orWhere("devices.group='Peripherals'")
      .getRawMany();
  }

  async assignDeviceToUser(deviceId: string, userId: any): Promise<Devices> {
    const device = await this.devicesRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }

    device.userId = userId;

    return this.devicesRepository.save(device);
  }

  async addDevice(device: any): Promise<any> {
    const newDevice = this.devicesRepository.create({
      id: uuidv4(),
      group: device.group,
      subgroup: device.subgroup,
      userId: device.userId,
      state: 'active',
      isOn: false,
      serialNumber: device.serialNumber,
      assetName: device.assetName,
      model: device.model,
      manufacturer: device.manufacturer,
      location: device.location,
    });

    return await this.devicesRepository.save(newDevice);
  }

  async findAll(): Promise<Devices[]> {
    return this.devicesRepository.find();
  }

  async findDevice(deviceId: any): Promise<any> {
    return await this.devicesRepository.findOneBy({
      id: deviceId,
    });
  }

  async rotateAgentSecret(deviceId: string): Promise<{ secret: string }> {
    const device = await this.devicesRepository.findOneBy({ id: deviceId });
    if (!device) throw new NotFoundException('Device not found');
    const secret = randomBytes(32).toString('hex');
    const now = new Date();
    device.apiSecretHashPrev = device.apiSecretHash;
    device.apiSecretPrevValidUntil = device.apiSecretHash
      ? new Date(now.getTime() + PREV_SECRET_GRACE_MS)
      : null;
    device.apiSecretHash = hashAgentSecret(secret);
    device.apiSecretRotatedAt = now;
    await this.devicesRepository.save(device);
    return { secret };
  }

  async revokeAgentSecret(deviceId: string): Promise<void> {
    const device = await this.devicesRepository.findOneBy({ id: deviceId });
    if (!device) throw new NotFoundException('Device not found');
    device.apiSecretHash = null;
    device.apiSecretHashPrev = null;
    device.apiSecretPrevValidUntil = null;
    await this.devicesRepository.save(device);
  }

  /**
   * Persist an incoming scan against the device that authenticated via
   * AgentGuard. Single write, only overwrites jsonb sections actually
   * present in the payload (so a partial scan doesn't wipe other fields),
   * and backfills scalar columns (assetName, serialNumber, manufacturer,
   * model) when the scan carries a better value.
   *
   * Returns `{ device, serialChanged }` so the caller can audit a serial
   * swap (legitimate mobo replacement or a sign of host re-imaging).
   */
  async recordScan(
    device: Devices,
    scan: any,
  ): Promise<{
    device: Devices;
    serialChanged: boolean;
    software: { added: number; refreshed: number; uninstalled: number } | null;
  }> {
    const patch: Partial<Devices> = {};

    if (scan?.system !== undefined) patch.system = scan.system;
    if (scan?.hardware !== undefined) patch.hardware = scan.hardware;
    if (scan?.software !== undefined) patch.software = scan.software;
    if (scan?.network !== undefined) patch.network = scan.network;
    if (scan?.users_and_groups !== undefined) patch.users = scan.users_and_groups;
    if (scan?.security !== undefined) patch.security = scan.security;
    if (scan?.peripherals !== undefined) patch.peripherals = scan.peripherals;
    if (scan?.events !== undefined) patch.eventLogs = scan.events;

    const hostname = scan?.system?.hostname;
    if (hostname && !device.assetName) patch.assetName = hostname;

    const scanSerial =
      scan?.hardware?.baseboard?.serial_number ?? scan?.serialNumber ?? null;
    const serialChanged =
      !!scanSerial && !!device.serialNumber && scanSerial !== device.serialNumber;
    if (scanSerial && !device.serialNumber) {
      patch.serialNumber = scanSerial;
    }

    const manufacturer = scan?.hardware?.baseboard?.manufacturer;
    if (manufacturer && !device.manufacturer) patch.manufacturer = manufacturer;

    const model = scan?.hardware?.baseboard?.product;
    if (model && !device.model) patch.model = model;

    patch.lastScanAt = new Date();

    await this.devicesRepository.update({ id: device.id }, patch);
    const updated = await this.devicesRepository.findOneBy({ id: device.id });

    let software: { added: number; refreshed: number; uninstalled: number } | null =
      null;
    if (scan?.software !== undefined) {
      try {
        const observed = extractSoftwareList(scan.software);
        software = await this.softwareInventory.reconcileForDevice(
          device.id,
          observed,
        );
      } catch (err) {
        this.logger.warn(
          `Software reconciliation failed for device ${device.id}: ${(err as Error).message}`,
        );
      }
    }

    try {
      await this.compliance.evaluateDevice(device.id);
    } catch (err) {
      this.logger.warn(
        `Compliance evaluation failed for device ${device.id}: ${(err as Error).message}`,
      );
    }

    try {
      await this.scanHistory.record(device.id, {
        system: scan?.system,
        hardware: scan?.hardware,
        software: scan?.software,
        network: scan?.network,
        security: scan?.security,
        peripherals: scan?.peripherals,
        users: scan?.users_and_groups,
        eventLogs: scan?.events,
      });
    } catch (err) {
      this.logger.warn(
        `Scan history persist failed for device ${device.id}: ${(err as Error).message}`,
      );
    }

    return { device: updated ?? device, serialChanged, software };
  }

  async softwareForDevice(deviceId: string, includeUninstalled = false) {
    return this.softwareInventory.forDevice(deviceId, includeUninstalled);
  }

  async listScans(deviceId: string, limit: number) {
    return this.scanHistory.listForDevice(deviceId, limit);
  }

  async getScan(deviceId: string, scanId: string) {
    const scan = await this.scanHistory.findById(scanId);
    if (scan.deviceId !== deviceId) {
      throw new NotFoundException('Scan does not belong to this device');
    }
    return scan;
  }

  async diffLatestTwo(deviceId: string) {
    return this.scanHistory.diffLatestTwo(deviceId);
  }

  async diffScans(deviceId: string, fromId: string, toId: string) {
    return this.scanHistory.diffPair(deviceId, fromId, toId);
  }

  async bulkAssignUser(
    deviceIds: string[],
    userId: string | null,
  ): Promise<number> {
    if (deviceIds.length === 0) return 0;
    const result = await this.devicesRepository
      .createQueryBuilder()
      .update(Devices)
      .set({ userId: userId as any })
      .where('id IN (:...ids)', { ids: deviceIds })
      .execute();
    return result.affected ?? 0;
  }

  async bulkUpdateLifecycle(
    deviceIds: string[],
    lifecycle: string,
    note: string | null,
  ): Promise<number> {
    if (deviceIds.length === 0) return 0;
    const result = await this.devicesRepository
      .createQueryBuilder()
      .update(Devices)
      .set({ lifecycle: lifecycle as any, lifecycleNote: note })
      .where('id IN (:...ids)', { ids: deviceIds })
      .execute();
    return result.affected ?? 0;
  }

  async updateLifecycle(
    deviceId: string,
    patch: Partial<Devices>,
  ): Promise<{ previous: Devices; updated: Devices }> {
    const previous = await this.devicesRepository.findOneBy({ id: deviceId });
    if (!previous) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    const cleaned: Partial<Devices> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      (cleaned as any)[k] = v === '' ? null : v;
    }

    await this.devicesRepository.update({ id: deviceId }, cleaned);
    const updated = await this.devicesRepository.findOneBy({ id: deviceId });
    return { previous, updated: updated ?? previous };
  }

  async findDevicesWithApplication(applicationId: string): Promise<any> {
    return this.softwareInventory.devicesForApplication(applicationId);
  }

  async findUserDevices(userId: string): Promise<any> {
    return await this.devicesRepository
      .createQueryBuilder('device')
      .where('device.userId = :userId', { userId: userId })
      .getMany();
  }

  async findDevicesTable(query: any = {}): Promise<any> {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(query.limit, 10) || 30, 1);
    const search: string | undefined = query.search?.toString().trim();

    const FILTER_FIELDS = [
      'group',
      'model',
      'subgroup',
      'state',
      'location',
      'manufacturer',
    ];

    const qb = this.devicesRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.user', 'user');

    if (search) {
      qb.andWhere(
        `(d.assetName ILIKE :search
          OR d.serialNumber ILIKE :search
          OR d.model ILIKE :search
          OR d.manufacturer ILIKE :search
          OR d.location ILIKE :search
          OR user.name ILIKE :search
          OR user.surname ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    for (const field of FILTER_FIELDS) {
      const value = query[field];
      if (!value) continue;
      const arr = Array.isArray(value) ? value : [value];
      if (arr.length === 0) continue;
      qb.andWhere(`d.${field} IN (:...${field})`, { [field]: arr });
    }

    qb.orderBy('d.assetName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    // Attach tag IDs per device (cheap — single IN query over the page).
    if (data.length > 0) {
      const ids = data.map((d) => d.id);
      const rows = await this.devicesRepository.manager.query(
        `SELECT "deviceId", "tagId" FROM device_tag_map WHERE "deviceId" = ANY($1::text[])`,
        [ids],
      );
      const byDevice = new Map<string, string[]>();
      for (const r of rows as Array<{ deviceId: string; tagId: string }>) {
        const list = byDevice.get(r.deviceId) ?? [];
        list.push(r.tagId);
        byDevice.set(r.deviceId, list);
      }
      for (const d of data) {
        (d as any).tagIds = byDevice.get(d.id) ?? [];
      }
    }

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFilterOptions() {
    const filterFields = [
      'group',
      'model',
      'subgroup',
      'state',
      'location',
      'manufacturer',
    ];

    const options: Record<string, string[]> = {};

    for (const field of filterFields) {
      const values = await this.devicesRepository
        .createQueryBuilder('devices')
        .select(`DISTINCT devices.${field}`, 'value')
        .where(`devices.${field} IS NOT NULL AND devices.${field} != ''`)
        .orderBy('value', 'ASC')
        .getRawMany();

      options[field] = values.map((v) => v.value);
    }

    return options;
  }
}
