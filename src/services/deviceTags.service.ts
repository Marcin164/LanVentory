import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DeviceTag } from 'src/entities/deviceTag.entity';
import { DeviceTagMap } from 'src/entities/deviceTagMap.entity';
import { uuidv4 } from 'src/helpers/uuidv4';

@Injectable()
export class DeviceTagsService {
  constructor(
    @InjectRepository(DeviceTag)
    private readonly tagsRepo: Repository<DeviceTag>,
    @InjectRepository(DeviceTagMap)
    private readonly mapRepo: Repository<DeviceTagMap>,
  ) {}

  async listTags() {
    return this.tagsRepo.find({ order: { label: 'ASC' } });
  }

  async createTag(input: {
    key: string;
    label: string;
    color?: string;
    description?: string;
  }) {
    if (!input.key?.trim() || !input.label?.trim()) {
      throw new BadRequestException('key and label are required');
    }
    const key = input.key.trim().toLowerCase();
    const existing = await this.tagsRepo.findOneBy({ key });
    if (existing) throw new BadRequestException('Tag key already exists');

    const row = this.tagsRepo.create({
      id: uuidv4(),
      key,
      label: input.label.trim(),
      color: input.color ?? '#2B9AE9',
      description: input.description ?? null,
    });
    return this.tagsRepo.save(row);
  }

  async deleteTag(id: string) {
    const existing = await this.tagsRepo.findOneBy({ id });
    if (!existing) throw new NotFoundException('Tag not found');
    await this.tagsRepo.delete({ id });
  }

  async tagsForDevice(deviceId: string) {
    const maps = await this.mapRepo.find({
      where: { deviceId },
      relations: ['tag'],
    });
    return maps.map((m) => m.tag);
  }

  async devicesWithTags(tagIds: string[]): Promise<string[]> {
    if (tagIds.length === 0) return [];
    const maps = await this.mapRepo.find({
      where: { tagId: In(tagIds) },
    });
    return Array.from(new Set(maps.map((m) => m.deviceId)));
  }

  async attach(
    deviceIds: string[],
    tagIds: string[],
    actor: string,
  ): Promise<number> {
    if (deviceIds.length === 0 || tagIds.length === 0) return 0;
    let created = 0;
    for (const deviceId of deviceIds) {
      for (const tagId of tagIds) {
        const existing = await this.mapRepo.findOne({
          where: { deviceId, tagId },
        });
        if (existing) continue;
        const row = this.mapRepo.create({
          id: uuidv4(),
          deviceId,
          tagId,
          createdBy: actor,
        });
        await this.mapRepo.save(row);
        created += 1;
      }
    }
    return created;
  }

  async detach(deviceIds: string[], tagIds: string[]): Promise<number> {
    if (deviceIds.length === 0 || tagIds.length === 0) return 0;
    const result = await this.mapRepo
      .createQueryBuilder()
      .delete()
      .from(DeviceTagMap)
      .where('deviceId IN (:...deviceIds) AND tagId IN (:...tagIds)', {
        deviceIds,
        tagIds,
      })
      .execute();
    return result.affected ?? 0;
  }
}
