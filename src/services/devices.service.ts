import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Devices } from 'src/entities/devices.entity';
import { uuidv4 } from 'src/helpers/uuidv4';

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

  async assignDeviceToUser(deviceId: any, ownerId: any): Promise<Devices> {
    const device = await this.devicesRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }

    device.ownerId = ownerId;

    return await this.devicesRepository.save(device);
  }

  async addDevice(device: any): Promise<any> {
    const newDevice = this.devicesRepository.create({
      id: uuidv4(),
      group: device.group,
      subgroup: device.subgroup,
      ownerId: device.ownerId,
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
      .where('device.ownerId = :ownerId', { ownerId: userId })
      .getMany();
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
