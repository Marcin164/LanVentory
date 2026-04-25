import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketAutoTagRule } from 'src/entities/ticketAutoTagRule.entity';
import { uuidv4 } from 'src/helpers/uuidv4';

const SEED_RULES: Array<Omit<TicketAutoTagRule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>> = [
  {
    name: 'Network / VPN',
    keywords: 'vpn,network,wifi,wi-fi,internet,sieć,połączenie,ethernet,dns,connection',
    category: 'Network',
    priority: 100,
    enabled: true,
  },
  {
    name: 'Printer',
    keywords: 'printer,drukar,toner,scan,scanner,skaner',
    category: 'Printer',
    priority: 100,
    enabled: true,
  },
  {
    name: 'Email / Outlook',
    keywords: 'outlook,email,e-mail,mail,exchange,owa,smtp,imap,poczta',
    category: 'Email',
    priority: 100,
    enabled: true,
  },
  {
    name: 'Account / Password',
    keywords: 'password,hasło,login,locked,zablokowan,konto,2fa,mfa,resetowanie',
    category: 'Account',
    priority: 100,
    enabled: true,
  },
  {
    name: 'Hardware',
    keywords: 'monitor,keyboard,klawiatura,mouse,myszka,laptop,disk,dysk,ram,cpu',
    category: 'Hardware',
    priority: 90,
    enabled: true,
  },
];

@Injectable()
export class TicketAutoTagService {
  private readonly logger = new Logger(TicketAutoTagService.name);

  constructor(
    @InjectRepository(TicketAutoTagRule)
    private readonly repo: Repository<TicketAutoTagRule>,
  ) {}

  async seedDefaults(): Promise<number> {
    let inserted = 0;
    for (const r of SEED_RULES) {
      const existing = await this.repo.findOneBy({ name: r.name });
      if (existing) continue;
      const row = this.repo.create({ id: uuidv4(), ...r });
      await this.repo.save(row);
      inserted += 1;
    }
    return inserted;
  }

  /**
   * Suggest a category for an incoming ticket. Returns the matching rule's
   * category, or null. The rule with the highest priority that matches at
   * least one keyword wins; ties broken by name.
   */
  async suggestCategory(text: string): Promise<{
    category: string;
    rule: string;
    matchedKeyword: string;
  } | null> {
    const haystack = (text ?? '').toLowerCase();
    if (!haystack.trim()) return null;

    const rules = await this.repo.find({
      where: { enabled: true },
      order: { priority: 'DESC' as any, name: 'ASC' as any },
    });

    for (const r of rules) {
      const keywords = r.keywords
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
      const hit = keywords.find((k) => haystack.includes(k));
      if (hit) {
        return { category: r.category, rule: r.name, matchedKeyword: hit };
      }
    }
    return null;
  }

  async list() {
    return this.repo.find({ order: { priority: 'DESC' as any, name: 'ASC' as any } });
  }

  async upsert(input: Partial<TicketAutoTagRule> & { name: string }) {
    const existing = await this.repo.findOneBy({ name: input.name });
    if (existing) {
      Object.assign(existing, input);
      return this.repo.save(existing);
    }
    const row = this.repo.create({
      id: uuidv4(),
      enabled: true,
      priority: 100,
      ...input,
    } as TicketAutoTagRule);
    return this.repo.save(row);
  }

  async remove(id: string) {
    await this.repo.delete({ id });
  }
}
