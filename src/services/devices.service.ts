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
      .leftJoin('devices_applications', 'da', 'da.deviceId = devices.id')
      .select([
        'devices.id AS id',
        'devices.system AS system',
        'devices.serialNumber AS serialNumber',
      ])
      .where('da.applicationId = :id', { id })
      .getRawMany();
  }

  async findUserDevices(userId: string): Promise<any> {
    return await this.devicesRepository
      .createQueryBuilder('device')
      .where('device.ownerId = :ownerId', { ownerId: userId })
      .getMany();
  }
}
