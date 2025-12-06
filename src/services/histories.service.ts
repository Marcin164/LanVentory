import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { uuidv4 } from 'src/helpers/uuidv4';
import { Histories } from 'src/entities/histories.entity';
import { HistoryApprovers } from 'src/entities/historyApprovers.entity';
import { HistoryComponents } from 'src/entities/historyComponents.entity';

@Injectable()
export class HistoriesService {
  constructor(
    @InjectRepository(Histories)
    private historiesRepository: Repository<Histories>,

    @InjectRepository(HistoryApprovers)
    private historyApproversRepository: Repository<HistoryApprovers>,

    @InjectRepository(HistoryComponents)
    private historyComponentsRepository: Repository<HistoryComponents>,
  ) {}

  async findAll(): Promise<Histories[]> {
    return this.historiesRepository.find();
  }

  async createHistory(history: any): Promise<any> {
    const historyId = uuidv4();

    const savedHistory = await this.historiesRepository.save({
      id: historyId,
      userId: history?.userId,
      justification: history?.justification || '',
      ticket: history?.ticket || '',
      details: history?.details || '',
      date: history?.date || '',
      deviceId: history?.deviceId || '',
      type: history?.type || '',
      agent: history?.agent || '',
      isUserFault: history?.isUserFault || '',
      fixes: history?.fixes || '',
      damages: history?.damages || '',
    });

    if (history?.type === 3 && history.removedComponents?.length > 0) {
      const componentsToSave = history.removedComponents.map(
        (component: any) => ({
          id: uuidv4(),
          historyId: historyId,
          deviceId: component.deviceId,
          type: component.type,
        }),
      );

      await this.historyComponentsRepository.save(componentsToSave);
    }

    return savedHistory;
  }

  async findDeviceOwners(deviceId: string): Promise<any[]> {
    const histories = await this.historiesRepository
      .createQueryBuilder('h')
      .where('h.deviceId = :deviceId', { deviceId })
      .leftJoinAndSelect('h.components', 'components')
      .leftJoin('components.device', 'device')
      .addSelect([
        'device.location',
        'device.manufacturer',
        'device.serialNumber',
        'device.assetName',
        'device.group',
        'device.subgroup',
        'device.model',
      ])
      .getMany();

    histories.forEach((h: any) => {
      h.components = h.components.map((c: any) => ({
        id: c.id,
        historyId: c.historyId,
        deviceId: c.deviceId,
        type: c.type,

        location: c.device?.location ?? null,
        manufacturer: c.device?.manufacturer ?? null,
        serialNumber: c.device?.serialNumber ?? null,
        assetName: c.device?.assetName ?? null,
        group: c.device?.group ?? null,
        subgroup: c.device?.subgroup ?? null,
        model: c.device?.model ?? null,
      }));
    });

    return histories;
  }
}
