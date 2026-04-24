import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Applications } from 'src/entities/applications.entity';
import { DevicesApplications } from 'src/entities/devicesApplications.entity';
import { uuidv4 } from 'src/helpers/uuidv4';

export type ObservedSoftware = {
  name: string;
  publisher: string | null;
  version: string | null;
  installDate?: string | null;
};

/**
 * Tolerant extractor. Agent payloads vary — we scan every array in the
 * `software` section looking for objects that at least carry a `name`.
 * Version / publisher / install date are best-effort.
 */
export function extractSoftwareList(software: unknown): ObservedSoftware[] {
  if (!software || typeof software !== 'object') return [];
  const seen = new Map<string, ObservedSoftware>();

  const recurse = (node: any) => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      for (const item of node) recurse(item);
      return;
    }
    if (typeof node !== 'object') return;

    const nameRaw =
      node.name ??
      node.displayName ??
      node.DisplayName ??
      node.productName ??
      node.product_name ??
      null;

    if (typeof nameRaw === 'string' && nameRaw.trim()) {
      const name = nameRaw.trim();
      const publisherRaw =
        node.publisher ??
        node.Publisher ??
        node.vendor ??
        node.Vendor ??
        node.manufacturer ??
        null;
      const versionRaw =
        node.version ??
        node.Version ??
        node.displayVersion ??
        node.DisplayVersion ??
        node.product_version ??
        null;
      const installDateRaw =
        node.installDate ??
        node.InstallDate ??
        node.install_date ??
        node.installedOn ??
        null;

      const publisher =
        typeof publisherRaw === 'string' && publisherRaw.trim()
          ? publisherRaw.trim()
          : null;
      const version =
        typeof versionRaw === 'string' && versionRaw.trim()
          ? versionRaw.trim()
          : null;
      const installDate =
        typeof installDateRaw === 'string' && installDateRaw.trim()
          ? installDateRaw.trim()
          : null;

      const key = `${name.toLowerCase()}|${(publisher ?? '').toLowerCase()}|${version ?? ''}`;
      if (!seen.has(key)) {
        seen.set(key, { name, publisher, version, installDate });
      }
    }

    for (const value of Object.values(node)) recurse(value);
  };

  recurse(software);
  return Array.from(seen.values());
}

@Injectable()
export class SoftwareInventoryService {
  private readonly logger = new Logger(SoftwareInventoryService.name);

  constructor(
    @InjectRepository(Applications)
    private readonly applicationsRepo: Repository<Applications>,
    @InjectRepository(DevicesApplications)
    private readonly installsRepo: Repository<DevicesApplications>,
  ) {}

  /**
   * Reconcile the software list observed in the latest scan against the
   * catalog and the device's install table. Returns counts for auditing.
   */
  async reconcileForDevice(
    deviceId: string,
    observed: ObservedSoftware[],
  ): Promise<{
    added: number;
    refreshed: number;
    uninstalled: number;
  }> {
    const now = new Date();
    let added = 0;
    let refreshed = 0;

    const catalogIdByKey = new Map<string, string>();

    for (const item of observed) {
      const app = await this.upsertCatalogEntry(item.name, item.publisher);
      const key = `${app.id}|${item.version ?? ''}`;
      catalogIdByKey.set(key, app.id);

      const existing = await this.installsRepo.findOne({
        where: {
          deviceId,
          applicationId: app.id,
          version: item.version ?? (IsNull() as any),
        },
      });

      if (existing) {
        existing.lastSeenAt = now;
        if (existing.uninstalledAt) {
          existing.uninstalledAt = null;
          existing.firstSeenAt = now;
          added += 1;
        } else {
          refreshed += 1;
        }
        if (item.installDate && !existing.installationDate) {
          existing.installationDate = item.installDate;
        }
        await this.installsRepo.save(existing);
      } else {
        const row = new DevicesApplications();
        row.id = uuidv4();
        row.deviceId = deviceId;
        row.applicationId = app.id;
        row.version = item.version ?? null;
        row.installationDate = item.installDate ?? null;
        row.modificationDate = null;
        row.firstSeenAt = now;
        row.lastSeenAt = now;
        row.uninstalledAt = null;
        await this.installsRepo.save(row);
        added += 1;
      }
    }

    // Mark installs that existed last time but are absent now.
    const currentlyInstalled = await this.installsRepo.find({
      where: { deviceId, uninstalledAt: IsNull() },
    });

    let uninstalled = 0;
    for (const install of currentlyInstalled) {
      const key = `${install.applicationId}|${install.version ?? ''}`;
      if (!catalogIdByKey.has(key)) {
        install.uninstalledAt = now;
        await this.installsRepo.save(install);
        uninstalled += 1;
      }
    }

    return { added, refreshed, uninstalled };
  }

  async forDevice(deviceId: string, includeUninstalled = false) {
    const qb = this.installsRepo
      .createQueryBuilder('da')
      .leftJoinAndSelect('da.application', 'app')
      .where('da.deviceId = :deviceId', { deviceId });
    if (!includeUninstalled) {
      qb.andWhere('da.uninstalledAt IS NULL');
    }
    return qb
      .orderBy('app.name', 'ASC')
      .addOrderBy('da.version', 'ASC')
      .getMany();
  }

  async devicesForApplication(applicationId: string) {
    return this.installsRepo.find({
      where: { applicationId, uninstalledAt: IsNull() as any },
      relations: ['device'],
      order: { lastSeenAt: 'DESC' as any },
    });
  }

  private async upsertCatalogEntry(
    name: string,
    publisher: string | null,
  ): Promise<Applications> {
    const nameKey = name.trim().toLowerCase();
    const publisherKey = (publisher ?? '').trim().toLowerCase();

    const existing = await this.applicationsRepo.findOne({
      where: { nameKey, publisherKey },
    });
    if (existing) return existing;

    const created = this.applicationsRepo.create({
      id: uuidv4(),
      name,
      nameKey,
      publisher,
      publisherKey,
      version: null,
      size: null,
    });
    return this.applicationsRepo.save(created);
  }
}
