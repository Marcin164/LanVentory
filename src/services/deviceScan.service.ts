import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { DeviceScan } from 'src/entities/deviceScan.entity';
import { uuidv4 } from 'src/helpers/uuidv4';

type ScanPayload = {
  system?: any;
  hardware?: any;
  software?: any;
  network?: any;
  security?: any;
  peripherals?: any;
  users?: any;
  eventLogs?: any;
};

const canonicalJson = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return (
    '{' +
    keys
      .map(
        (k) =>
          JSON.stringify(k) +
          ':' +
          canonicalJson((value as Record<string, unknown>)[k]),
      )
      .join(',') +
    '}'
  );
};

export type ScanDiff = {
  from: { id: string; receivedAt: Date; snapshotSha256: string };
  to: { id: string; receivedAt: Date; snapshotSha256: string };
  /** Sections that changed at all (stringified JSON comparison). */
  changedSections: string[];
  /** Software-specific delta derived by name/version pair. */
  software: {
    added: Array<{ name: string; version: string | null }>;
    removed: Array<{ name: string; version: string | null }>;
    versionChanged: Array<{
      name: string;
      from: string | null;
      to: string | null;
    }>;
  };
  /** Per-section leaf value diffs (old / new). */
  fieldChanges: Array<{
    section: string;
    path: string;
    before: any;
    after: any;
  }>;
};

/** Pull each {name, version} pair out of an agent software blob. */
function collectSoftware(
  root: any,
): Map<string, { name: string; version: string | null }> {
  const map = new Map<string, { name: string; version: string | null }>();
  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    const nameRaw =
      node.name ?? node.displayName ?? node.DisplayName ?? node.productName;
    if (typeof nameRaw === 'string' && nameRaw.trim()) {
      const versionRaw =
        node.version ??
        node.Version ??
        node.displayVersion ??
        node.DisplayVersion;
      const name = nameRaw.trim();
      const version =
        typeof versionRaw === 'string' && versionRaw.trim()
          ? versionRaw.trim()
          : null;
      map.set(`${name.toLowerCase()}|${version ?? ''}`, { name, version });
    }
    for (const value of Object.values(node)) visit(value);
  };
  visit(root);
  return map;
}

/**
 * Flatten a jsonb section into `path -> value` leaf entries and then diff.
 * Paths use dot notation. Arrays contribute `[i]` segments. Kept cheap:
 * cap at 1500 paths per section so we don't explode on huge inventories.
 */
function flatten(
  node: any,
  prefix = '',
  out: Map<string, any> = new Map(),
  limit = 1500,
): Map<string, any> {
  if (out.size > limit) return out;
  if (node === null || node === undefined || typeof node !== 'object') {
    out.set(prefix, node ?? null);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out, limit));
    return out;
  }
  for (const key of Object.keys(node)) {
    flatten(node[key], prefix ? `${prefix}.${key}` : key, out, limit);
  }
  return out;
}

function diffFlattened(
  section: string,
  before: any,
  after: any,
): Array<{ section: string; path: string; before: any; after: any }> {
  const a = flatten(before);
  const b = flatten(after);
  const keys = new Set<string>([...a.keys(), ...b.keys()]);
  const out: Array<{ section: string; path: string; before: any; after: any }> = [];
  for (const k of keys) {
    const va = a.get(k);
    const vb = b.get(k);
    if (JSON.stringify(va) !== JSON.stringify(vb)) {
      out.push({ section, path: k, before: va, after: vb });
    }
  }
  return out;
}

@Injectable()
export class DeviceScanService {
  constructor(
    @InjectRepository(DeviceScan)
    private readonly repo: Repository<DeviceScan>,
  ) {}

  async record(deviceId: string, payload: ScanPayload): Promise<DeviceScan> {
    const sections = {
      system: payload.system ?? null,
      hardware: payload.hardware ?? null,
      software: payload.software ?? null,
      network: payload.network ?? null,
      security: payload.security ?? null,
      peripherals: payload.peripherals ?? null,
      users: payload.users ?? null,
      eventLogs: payload.eventLogs ?? null,
    };

    const snapshotSha256 = createHash('sha256')
      .update(canonicalJson(sections))
      .digest('hex');

    const scan = new DeviceScan();
    scan.id = uuidv4();
    scan.deviceId = deviceId;
    scan.receivedAt = new Date();
    scan.snapshotSha256 = snapshotSha256;
    scan.system = sections.system;
    scan.hardware = sections.hardware;
    scan.software = sections.software;
    scan.network = sections.network;
    scan.security = sections.security;
    scan.peripherals = sections.peripherals;
    scan.users = sections.users;
    scan.eventLogs = sections.eventLogs;
    return this.repo.save(scan);
  }

  async listForDevice(deviceId: string, limit = 50) {
    return this.repo
      .createQueryBuilder('s')
      .where('s.deviceId = :deviceId', { deviceId })
      .select([
        's.id',
        's.receivedAt',
        's.snapshotSha256',
      ])
      .orderBy('s.receivedAt', 'DESC')
      .limit(Math.min(limit, 200))
      .getMany();
  }

  async findById(scanId: string) {
    const row = await this.repo.findOneBy({ id: scanId });
    if (!row) throw new NotFoundException('Scan not found');
    return row;
  }

  async diffLatestTwo(deviceId: string): Promise<ScanDiff | null> {
    const latest = await this.repo.find({
      where: { deviceId },
      order: { receivedAt: 'DESC' as any },
      take: 2,
    });
    if (latest.length < 2) return null;
    return this.buildDiff(latest[1], latest[0]); // older -> newer
  }

  async diffPair(
    deviceId: string,
    fromId: string,
    toId: string,
  ): Promise<ScanDiff> {
    const from = await this.repo.findOneBy({ id: fromId, deviceId });
    const to = await this.repo.findOneBy({ id: toId, deviceId });
    if (!from || !to) throw new NotFoundException('Scan not found');
    return this.buildDiff(from, to);
  }

  private buildDiff(from: DeviceScan, to: DeviceScan): ScanDiff {
    const sectionsKeys = [
      'system',
      'hardware',
      'software',
      'network',
      'security',
      'peripherals',
      'users',
      'eventLogs',
    ] as const;

    const changedSections: string[] = [];
    const fieldChanges: ScanDiff['fieldChanges'] = [];

    for (const key of sectionsKeys) {
      const a = (from as any)[key];
      const b = (to as any)[key];
      if (canonicalJson(a) !== canonicalJson(b)) {
        changedSections.push(key);
        // Field-level diff capped per section to keep payload small.
        const delta = diffFlattened(key, a, b);
        fieldChanges.push(...delta.slice(0, 200));
      }
    }

    const beforeSw = collectSoftware(from.software);
    const afterSw = collectSoftware(to.software);

    const added: ScanDiff['software']['added'] = [];
    const removed: ScanDiff['software']['removed'] = [];
    for (const [k, v] of afterSw) if (!beforeSw.has(k)) added.push(v);
    for (const [k, v] of beforeSw) if (!afterSw.has(k)) removed.push(v);

    // Detect version bumps — same name, different version.
    const beforeByName = new Map<string, string | null>();
    for (const v of beforeSw.values())
      beforeByName.set(v.name.toLowerCase(), v.version);
    const afterByName = new Map<string, string | null>();
    for (const v of afterSw.values())
      afterByName.set(v.name.toLowerCase(), v.version);
    const versionChanged: ScanDiff['software']['versionChanged'] = [];
    for (const [name, afterVer] of afterByName) {
      const beforeVer = beforeByName.get(name);
      if (beforeVer !== undefined && beforeVer !== afterVer) {
        versionChanged.push({ name, from: beforeVer, to: afterVer });
      }
    }

    return {
      from: {
        id: from.id,
        receivedAt: from.receivedAt,
        snapshotSha256: from.snapshotSha256,
      },
      to: {
        id: to.id,
        receivedAt: to.receivedAt,
        snapshotSha256: to.snapshotSha256,
      },
      changedSections,
      software: { added, removed, versionChanged },
      fieldChanges,
    };
  }
}
