import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Devices, DeviceLifecycle } from 'src/entities/devices.entity';
import { ComplianceService } from 'src/services/compliance.service';
import { CveService } from 'src/services/cve.service';

const STALE_AGENT_DEFAULT_HOURS = 168; // 7 days

@Injectable()
export class FleetService {
  constructor(
    @InjectRepository(Devices)
    private readonly devicesRepo: Repository<Devices>,
    private readonly compliance: ComplianceService,
    private readonly cve: CveService,
  ) {}

  private inactiveLifecycles() {
    return [
      DeviceLifecycle.RETIRED,
      DeviceLifecycle.DISPOSED,
      DeviceLifecycle.LOST,
    ];
  }

  /**
   * Devices that haven't sent a scan within the threshold AND are still in
   * an active lifecycle state. Retired / disposed are excluded because they
   * are legitimately silent.
   */
  async staleAgents(hoursThreshold = STALE_AGENT_DEFAULT_HOURS) {
    const cutoff = new Date(Date.now() - hoursThreshold * 3600 * 1000);
    const qb = this.devicesRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.user', 'user')
      .where(
        '(d.lastScanAt IS NULL OR d.lastScanAt < :cutoff)',
        { cutoff },
      )
      .andWhere('d.lifecycle NOT IN (:...inactive)', {
        inactive: this.inactiveLifecycles(),
      })
      .orderBy('d.lastScanAt', 'ASC', 'NULLS FIRST');
    return qb.getMany();
  }

  async staleAgentsCount(hoursThreshold = STALE_AGENT_DEFAULT_HOURS) {
    const cutoff = new Date(Date.now() - hoursThreshold * 3600 * 1000);
    return this.devicesRepo
      .createQueryBuilder('d')
      .where('(d.lastScanAt IS NULL OR d.lastScanAt < :cutoff)', { cutoff })
      .andWhere('d.lifecycle NOT IN (:...inactive)', {
        inactive: this.inactiveLifecycles(),
      })
      .getCount();
  }

  async newDevices(days = 7) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    return this.devicesRepo.count({
      where: { createdAt: MoreThanOrEqual(since) },
    });
  }

  async lifecycleBreakdown() {
    const rows = await this.devicesRepo
      .createQueryBuilder('d')
      .select('d.lifecycle', 'lifecycle')
      .addSelect('COUNT(*)', 'count')
      .groupBy('d.lifecycle')
      .getRawMany();
    return rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.lifecycle ?? 'active'] = Number(r.count) || 0;
      return acc;
    }, {});
  }

  async overview() {
    const activeQb = this.devicesRepo
      .createQueryBuilder('d')
      .where('d.lifecycle NOT IN (:...inactive)', {
        inactive: this.inactiveLifecycles(),
      });

    const [
      totalDevices,
      activeDevices,
      staleCount,
      newInLastWeek,
      lifecycle,
      compliance,
      cves,
    ] = await Promise.all([
      this.devicesRepo.count(),
      activeQb.getCount(),
      this.staleAgentsCount(),
      this.newDevices(7),
      this.lifecycleBreakdown(),
      this.compliance.summary(),
      this.cve.summary(),
    ]);

    return {
      totalDevices,
      activeDevices,
      staleAgents: staleCount,
      staleAgentsThresholdHours: STALE_AGENT_DEFAULT_HOURS,
      newInLastWeek,
      lifecycle,
      compliance,
      cves,
      generatedAt: new Date(),
    };
  }
}
