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
      type: history?.type || 0,
      agent: history?.agent || '',
      isUserFault: history?.isUserFault || '',
      fixes: history?.fixes || '',
      damages: history?.damages || '',
    });

    if (history?.type === 3) {
      if (history.removedComponents?.length > 0) {
        const removedComponentsToSave = history.removedComponents.map(
          (component: any) => ({
            id: uuidv4(),
            historyId: historyId,
            deviceId: component.deviceId,
            type: 'remove',
          }),
        );

        await this.historyComponentsRepository.save(removedComponentsToSave);
      }

      if (history.addedComponents?.length > 0) {
        const addedComponentsToSave = history.addedComponents.map(
          (component: any) => ({
            id: uuidv4(),
            historyId: historyId,
            deviceId: component,
            type: 'added',
          }),
        );

        await this.historyComponentsRepository.save(addedComponentsToSave);
      }
    }

    if (history.approvers && history.approvers.length > 0) {
      const approversToSave = history.approvers.map((approver: any) => ({
        id: uuidv4(),
        historyId: historyId,
        userId: approver,
      }));

      await this.historyApproversRepository.save(approversToSave);
    }

    return savedHistory;
  }

  async findDeviceHistory(deviceId: string): Promise<any[]> {
    const histories = await this.historiesRepository.find({
      where: { deviceId },
      relations: {
        user: true,
        components: {
          device: true,
        },
      },
      select: {
        components: {
          device: {
            location: true,
            manufacturer: true,
            serialNumber: true,
            assetName: true,
            group: true,
            subgroup: true,
            model: true,
          },
        },
        user: true,
        date: true,
        details: true,
        agent: true,
        justification: true,
        type: true,
        isUserFault: true,
        fixes: true,
        damages: true,
      },
    });

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

  async findUserHistory(userId: string): Promise<any[]> {
    const histories = await this.historiesRepository
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.device', 'device')
      .where('h.userId = :userId', { userId })
      .getMany();

    return histories;
  }
}
