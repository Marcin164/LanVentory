import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Devices } from 'src/entities/devices.entity';
import {
  ComplianceOperator,
  ComplianceRule,
  ComplianceSeverity,
} from 'src/entities/complianceRule.entity';
import { ComplianceResult } from 'src/entities/complianceResult.entity';
import { uuidv4 } from 'src/helpers/uuidv4';

export const BUILTIN_RULES: Array<
  Omit<
    ComplianceRule,
    'createdAt' | 'updatedAt' | 'builtin' | 'enabled'
  > & { enabled?: boolean }
> = [
  {
    key: 'bitlocker-enabled',
    name: 'BitLocker enabled on system drive',
    description: 'OS disk must be encrypted with BitLocker.',
    category: 'security',
    jsonPath: 'security.bitlocker.enabled',
    operator: 'eq',
    expected: true,
    severity: 'HIGH',
  },
  {
    key: 'firewall-on',
    name: 'Windows Firewall active',
    description: 'At least one firewall profile must report enabled.',
    category: 'security',
    jsonPath: 'security.firewall.enabled',
    operator: 'eq',
    expected: true,
    severity: 'HIGH',
  },
  {
    key: 'antivirus-running',
    name: 'Antivirus service running',
    description: 'An active AV product must be reported.',
    category: 'security',
    jsonPath: 'security.antivirus.running',
    operator: 'eq',
    expected: true,
    severity: 'HIGH',
  },
  {
    key: 'os-version-present',
    name: 'Operating system version reported',
    description: 'Agent must be able to collect an OS version.',
    category: 'hygiene',
    jsonPath: 'system.os_version',
    operator: 'exists',
    expected: null,
    severity: 'LOW',
  },
  {
    key: 'tpm-present',
    name: 'TPM module present',
    description: 'Device must expose a TPM 2.0 module.',
    category: 'security',
    jsonPath: 'security.tpm.present',
    operator: 'eq',
    expected: true,
    severity: 'MEDIUM',
  },
];

function readPath(obj: any, path: string): any {
  if (obj === null || obj === undefined) return undefined;
  const parts = path.split('.');
  let cur: any = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

function evaluate(
  operator: ComplianceOperator,
  actual: any,
  expected: any,
): { passed: boolean; message: string | null } {
  switch (operator) {
    case 'eq':
      return {
        passed: actual === expected,
        message: actual === expected ? null : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      };
    case 'ne':
      return {
        passed: actual !== expected,
        message: actual !== expected ? null : `unexpected value ${JSON.stringify(actual)}`,
      };
    case 'gte': {
      const ok =
        typeof actual === 'number' &&
        typeof expected === 'number' &&
        actual >= expected;
      return { passed: ok, message: ok ? null : `${actual} < ${expected}` };
    }
    case 'lte': {
      const ok =
        typeof actual === 'number' &&
        typeof expected === 'number' &&
        actual <= expected;
      return { passed: ok, message: ok ? null : `${actual} > ${expected}` };
    }
    case 'exists':
      return {
        passed: actual !== undefined && actual !== null,
        message: actual !== undefined && actual !== null ? null : 'value missing',
      };
    case 'notExists':
      return {
        passed: actual === undefined || actual === null,
        message: actual === undefined || actual === null ? null : 'value present but forbidden',
      };
    case 'contains': {
      const hay = String(actual ?? '');
      const needle = String(expected ?? '');
      return {
        passed: hay.includes(needle),
        message: hay.includes(needle)
          ? null
          : `"${hay}" does not contain "${needle}"`,
      };
    }
    case 'notContains': {
      const hay = String(actual ?? '');
      const needle = String(expected ?? '');
      return {
        passed: !hay.includes(needle),
        message: !hay.includes(needle)
          ? null
          : `"${hay}" contains forbidden "${needle}"`,
      };
    }
    default:
      return { passed: false, message: `unknown operator ${operator}` };
  }
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    @InjectRepository(ComplianceRule)
    private readonly rulesRepo: Repository<ComplianceRule>,
    @InjectRepository(ComplianceResult)
    private readonly resultsRepo: Repository<ComplianceResult>,
    @InjectRepository(Devices)
    private readonly devicesRepo: Repository<Devices>,
  ) {}

  async seedBuiltins(): Promise<number> {
    let inserted = 0;
    for (const r of BUILTIN_RULES) {
      const existing = await this.rulesRepo.findOneBy({ key: r.key });
      if (existing) continue;
      const row = this.rulesRepo.create({
        ...r,
        enabled: r.enabled ?? true,
        builtin: true,
      });
      await this.rulesRepo.save(row);
      inserted += 1;
    }
    return inserted;
  }

  async listRules() {
    return this.rulesRepo.find({ order: { category: 'ASC', key: 'ASC' } });
  }

  async upsertRule(input: Partial<ComplianceRule> & { key: string }) {
    const existing = await this.rulesRepo.findOneBy({ key: input.key });
    if (existing) {
      Object.assign(existing, input);
      return this.rulesRepo.save(existing);
    }
    const row = this.rulesRepo.create({
      ...input,
      builtin: false,
      enabled: input.enabled ?? true,
    } as ComplianceRule);
    return this.rulesRepo.save(row);
  }

  async deleteRule(key: string) {
    const existing = await this.rulesRepo.findOneBy({ key });
    if (!existing) return;
    if (existing.builtin) {
      throw new Error('Cannot delete built-in rule; disable it instead.');
    }
    await this.rulesRepo.delete({ key });
  }

  async evaluateDevice(deviceId: string): Promise<ComplianceResult[]> {
    const device = await this.devicesRepo.findOneBy({ id: deviceId });
    if (!device) return [];

    const rules = await this.rulesRepo.findBy({ enabled: true });
    const now = new Date();
    const out: ComplianceResult[] = [];

    for (const rule of rules) {
      const actual = readPath(device, rule.jsonPath);
      const { passed, message } = evaluate(rule.operator, actual, rule.expected);

      let row = await this.resultsRepo.findOne({
        where: { deviceId, ruleKey: rule.key },
      });
      if (!row) {
        row = new ComplianceResult();
        row.id = uuidv4();
        row.deviceId = deviceId;
        row.ruleKey = rule.key;
      }
      row.passed = passed;
      row.severity = rule.severity as ComplianceSeverity;
      row.actual = actual === undefined ? null : actual;
      row.message = message;
      row.evaluatedAt = now;
      await this.resultsRepo.save(row);
      out.push(row);
    }

    return out;
  }

  async resultsForDevice(deviceId: string) {
    return this.resultsRepo.find({
      where: { deviceId },
      relations: ['rule'],
      order: { severity: 'ASC', ruleKey: 'ASC' },
    });
  }

  async summary() {
    const [totalDevices, rows] = await Promise.all([
      this.devicesRepo.count(),
      this.resultsRepo
        .createQueryBuilder('r')
        .select('r.severity', 'severity')
        .addSelect('COUNT(*) FILTER (WHERE r.passed = false)', 'failing')
        .addSelect('COUNT(DISTINCT r."deviceId") FILTER (WHERE r.passed = false)', 'devices')
        .groupBy('r.severity')
        .getRawMany(),
    ]);

    const bySeverity: Record<string, { failing: number; devices: number }> = {};
    for (const row of rows) {
      bySeverity[row.severity] = {
        failing: Number(row.failing) || 0,
        devices: Number(row.devices) || 0,
      };
    }

    const compliantDevicesRow = await this.resultsRepo
      .createQueryBuilder('r')
      .select('COUNT(DISTINCT r."deviceId")', 'count')
      .where(
        `r."deviceId" NOT IN (
          SELECT DISTINCT "deviceId" FROM compliance_result WHERE passed = false
        )`,
      )
      .getRawOne();

    const compliantDevices = Number(compliantDevicesRow?.count) || 0;

    return {
      totalDevices,
      compliantDevices,
      compliancePct:
        totalDevices > 0
          ? Math.round((compliantDevices / totalDevices) * 100)
          : 0,
      bySeverity,
    };
  }
}
