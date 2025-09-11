import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from 'src/entities/device.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
  ) {}

  async findAll(): Promise<Device[]> {
    return this.devicesRepository.find();
  }

  async findDevice(deviceId: any): Promise<any> {
    const data: any = await this.devicesRepository.findOneBy({
      iddevices: deviceId,
    });

    const scanInfoParsed = JSON.parse(data?.scanInfo);

    data.scanInfo = scanInfoParsed;
    return data;
  }

  async updateScanInfoBySerialTag(scanInfo: any): Promise<any> {
    return await this.devicesRepository
      .createQueryBuilder()
      .update(Device)
      .set({ scanInfo: JSON.stringify(scanInfo) })
      .where('iddevices = :idDevices', { idDevices: scanInfo.idDevice })
      .orWhere('serialNumber = :serialNumber', {
        serialNumber: scanInfo.hardware_info.baseboard.serial_number,
      })
      .execute();
  }

  async findUserDevices(userId: string): Promise<any> {
    return await this.devicesRepository
      .createQueryBuilder('device')
      .where('device.owner = :ownerId', { ownerId: userId })
      .getMany();
  }
}
