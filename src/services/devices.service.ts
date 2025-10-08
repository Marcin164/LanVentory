import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Devices } from 'src/entities/devices.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Devices)
    private devicesRepository: Repository<Devices>,
  ) {}

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
      .set({}) //scanInfo: JSON.stringify(scanInfo)
      .where('iddevices = :idDevices', { idDevices: scanInfo.idDevice })
      .orWhere('serialNumber = :serialNumber', {
        serialNumber: scanInfo.hardware_info.baseboard.serial_number,
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
