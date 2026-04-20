import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Users } from 'src/entities/users.entity';
import { Devices } from 'src/entities/devices.entity';
import { Tickets } from 'src/entities/tickets.entity';
import { Histories } from 'src/entities/histories.entity';

export type SearchResultItem = {
  id: string;
  type: 'user' | 'device' | 'ticket' | 'history';
  title: string;
  subtitle?: string;
  url: string;
};

const LIMIT = 8;

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Users) private usersRepo: Repository<Users>,
    @InjectRepository(Devices) private devicesRepo: Repository<Devices>,
    @InjectRepository(Tickets) private ticketsRepo: Repository<Tickets>,
    @InjectRepository(Histories) private historiesRepo: Repository<Histories>,
  ) {}

  async searchAll(q: string): Promise<{
    users: SearchResultItem[];
    devices: SearchResultItem[];
    tickets: SearchResultItem[];
    histories: SearchResultItem[];
  }> {
    const term = (q || '').trim();
    if (!term) {
      return { users: [], devices: [], tickets: [], histories: [] };
    }
    const like = `%${term}%`;

    const [users, devices, tickets, histories] = await Promise.all([
      this.usersRepo.find({
        where: [
          { name: ILike(like) },
          { surname: ILike(like) },
          { email: ILike(like) },
          { username: ILike(like) },
        ],
        take: LIMIT,
      }),
      this.devicesRepo.find({
        where: [
          { assetName: ILike(like) },
          { serialNumber: ILike(like) },
          { model: ILike(like) },
          { manufacturer: ILike(like) },
          { location: ILike(like) },
        ],
        take: LIMIT,
      }),
      this.ticketsRepo.find({
        where: [
          { description: ILike(like) },
          { category: ILike(like) },
          ...(/^\d+$/.test(term) ? [{ number: parseInt(term, 10) }] : []),
        ],
        take: LIMIT,
        order: { createdAt: 'DESC' },
      }),
      this.historiesRepo.find({
        where: [
          { details: ILike(like) },
          { justification: ILike(like) },
          { ticket: ILike(like) },
        ],
        take: LIMIT,
      }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        type: 'user',
        title:
          `${u.name ?? ''} ${u.surname ?? ''}`.trim() || u.username || u.email,
        subtitle: u.email || u.username,
        url: `/admin/users/${u.id}`,
      })),
      devices: devices.map((d) => ({
        id: d.id,
        type: 'device',
        title: d.assetName || d.serialNumber || d.id,
        subtitle:
          [d.manufacturer, d.model].filter(Boolean).join(' ') || d.location,
        url: `/admin/devices/${d.id}/system`,
      })),
      tickets: tickets.map((t) => ({
        id: t.id,
        type: 'ticket',
        title: `#${t.number} ${t.category ?? ''}`.trim(),
        subtitle: (t.description || '').slice(0, 80),
        url: `/admin/helpdesk/${t.id}`,
      })),
      histories: histories.map((h) => ({
        id: h.id,
        type: 'history',
        title: h.details ? h.details.slice(0, 60) : `Wpis ${h.id}`,
        subtitle: [h.date, h.ticket].filter(Boolean).join(' • '),
        url: h.deviceId
          ? `/admin/devices/${h.deviceId}/history`
          : `/admin/helpdesk`,
      })),
    };
  }
}
