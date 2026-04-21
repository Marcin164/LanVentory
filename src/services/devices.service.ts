import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Devices } from 'src/entities/devices.entity';
import { uuidv4 } from 'src/helpers/uuidv4';
import { hashAgentSecret } from 'src/guards/agentGuard.guard';

const PREV_SECRET_GRACE_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Devices)
    private devicesRepository: Repository<Devices>,
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

  async markScanReceived(deviceId: string) {
    await this.devicesRepository.update(deviceId, { lastScanAt: new Date() });
  }

  async updateScanInfoBySerialTag(scanInfo: any): Promise<any> {
    return await this.devicesRepository
      .createQueryBuilder()
      .update(Devices)
      .set({
        system: scanInfo.system,
        hardware: scanInfo.hardware,
        software: scanInfo.software,
        network: scanInfo.network,
        users: scanInfo.users_and_groups,
        security: scanInfo.security,
        peripherals: scanInfo.peripherals,
        eventLogs: scanInfo.events,
        serialNumber: scanInfo?.hardware?.baseboard?.serial_number,
        assetName: scanInfo?.system.hostname,
      })
      .where('id = :id', { id: 1 })
      .orWhere('serialNumber = :serialNumber', {
        serialNumber: scanInfo?.hardware?.baseboard?.serial_number ?? null,
      })
      .execute();
  }

  async findDevicesWithApplication(id: any): Promise<any> {
    return this.devicesRepository
      .createQueryBuilder('devices')
      .leftJoin('devices_devices', 'da', 'da.deviceId = devices.id')
      .select([
        'devices.id AS id',
        'devices.system AS system',
        'devices.serialNumber AS serialNumber',
      ])
      .where('da.deviceId = :id', { id })
      .getRawMany();
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
