import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { uuidv4 } from 'src/helpers/uuidv4';
import { Histories } from 'src/entities/histories.entity';
import { HistoryApprovers } from 'src/entities/historyApprovers.entity';
import { HistoryDevices } from 'src/entities/historyDevices.entity';

@Injectable()
export class HistoriesService {
  constructor(
    @InjectRepository(Histories)
    private historiesRepository: Repository<Histories>,

    @InjectRepository(HistoryApprovers)
    private historyApproversRepository: Repository<HistoryApprovers>,

    @InjectRepository(HistoryDevices)
    private historyDevicesRepository: Repository<HistoryDevices>,
  ) {}

  async findAll(): Promise<Histories[]> {
    return this.historiesRepository.find();
  }

  async create(history: any): Promise<any> {
    return await this.historiesRepository.save({
      id: uuidv4(),
      userId: history?.userId,
      justification: history?.justification || '',
      ticket: history?.ticket || '',
      details: history?.details || '',
      date: history?.date || '',
    });
  }

  async findDeviceOwners(deviceId: string): Promise<Histories[]> {
    const deviceLinks = await this.historyDevicesRepository.find({
      where: { deviceId },
    });

    if (!deviceLinks.length) return [];

    const historyIds = deviceLinks.map((link) => link.historyId);

    return this.historiesRepository.find({
      where: {
        id: In(historyIds),
      },
    });
  }
}
