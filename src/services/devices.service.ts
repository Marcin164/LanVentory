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

  async findUserDevices(userId: string): Promise<any> {
    return await this.devicesRepository
      .createQueryBuilder('device')
      .where('device.ownerId = :ownerId', { ownerId: userId })
      .getMany();
  }
}
