import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AssignmentGroup } from 'src/entities/assignmentGroup.entity';
import { Users } from 'src/entities/users.entity';

@Injectable()
export class AssignmentGroupsService {
  constructor(
    @InjectRepository(AssignmentGroup)
    private groupsRepository: Repository<AssignmentGroup>,
    @InjectRepository(Users)
    private usersRepository: Repository<Users>,
  ) {}

  async findAll(): Promise<AssignmentGroup[]> {
    return this.groupsRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<AssignmentGroup> {
    const group = await this.groupsRepository.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Assignment group not found');
    return group;
  }

  async findByName(name: string): Promise<AssignmentGroup | null> {
    return this.groupsRepository.findOne({ where: { name } });
  }

  async findMembers(idOrName: string): Promise<Users[]> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrName,
      );
    const group = await this.groupsRepository.findOne({
      where: isUuid ? { id: idOrName } : { name: idOrName },
    });
    if (!group) throw new NotFoundException('Assignment group not found');
    return group.members ?? [];
  }

  async create(dto: { name: string; description?: string }) {
    if (!dto?.name?.trim()) {
      throw new BadRequestException('Name is required');
    }
    const existing = await this.groupsRepository.findOne({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new BadRequestException('Group with this name already exists');
    }
    const group = this.groupsRepository.create({
      name: dto.name.trim(),
      description: dto.description?.trim() || null!,
      members: [],
    });
    return this.groupsRepository.save(group);
  }

  async update(
    id: string,
    dto: { name?: string; description?: string },
  ): Promise<AssignmentGroup> {
    const group = await this.findOne(id);
    if (dto.name !== undefined) group.name = dto.name.trim();
    if (dto.description !== undefined)
      group.description = dto.description?.trim() || null!;
    return this.groupsRepository.save(group);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const group = await this.findOne(id);
    await this.groupsRepository.remove(group);
    return { success: true };
  }

  async setMembers(
    id: string,
    userIds: string[],
  ): Promise<AssignmentGroup> {
    const group = await this.findOne(id);
    const users = userIds?.length
      ? await this.usersRepository.findBy({ id: In(userIds) })
      : [];
    group.members = users;
    return this.groupsRepository.save(group);
  }

  async addMember(id: string, userId: string): Promise<AssignmentGroup> {
    const group = await this.findOne(id);
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    if (!group.members.some((m) => m.id === user.id)) {
      group.members.push(user);
    }
    return this.groupsRepository.save(group);
  }

  async removeMember(id: string, userId: string): Promise<AssignmentGroup> {
    const group = await this.findOne(id);
    group.members = group.members.filter((m) => m.id !== userId);
    return this.groupsRepository.save(group);
  }
}
