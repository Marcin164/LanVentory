import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import PDFDocument from 'pdfkit';
import { Devices } from 'src/entities/devices.entity';
import { SoftwareInventoryService } from 'src/services/softwareInventory.service';
import { ComplianceService } from 'src/services/compliance.service';
import { CveService } from 'src/services/cve.service';

type RenderResult = { buffer: Buffer; sha256: string; filename: string };

function addKeyValueTable(
  doc: PDFKit.PDFDocument,
  pairs: Array<[string, any]>,
) {
  const labelWidth = 140;
  for (const [k, v] of pairs) {
    if (doc.y > doc.page.height - 60) doc.addPage();
    const text =
      v === null || v === undefined
        ? '—'
        : typeof v === 'object'
          ? JSON.stringify(v)
          : String(v);
    doc
      .fontSize(9)
      .fillColor('#8A8A8A')
      .text(k, 36, doc.y, { width: labelWidth, continued: true })
      .fillColor('black')
      .text(text);
    doc.moveDown(0.2);
  }
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  if (doc.y > doc.page.height - 80) doc.addPage();
  doc.moveDown(0.5);
  doc
    .fontSize(13)
    .fillColor('#2B9AE9')
    .text(title, { underline: false });
  doc
    .moveTo(36, doc.y + 2)
    .lineTo(doc.page.width - 36, doc.y + 2)
    .strokeColor('#E0E0E0')
    .stroke();
  doc.moveDown(0.4);
  doc.fontSize(9).fillColor('black');
}

@Injectable()
export class DeviceReportService {
  constructor(
    @InjectRepository(Devices)
    private readonly devicesRepo: Repository<Devices>,
    private readonly softwareInventory: SoftwareInventoryService,
    private readonly compliance: ComplianceService,
    private readonly cve: CveService,
  ) {}

  async render(deviceId: string, actor?: string): Promise<RenderResult> {
    const device = await this.devicesRepo.findOne({
      where: { id: deviceId },
      relations: ['user'],
    });
    if (!device) throw new NotFoundException('Device not found');

    const [software, complianceResults, cves] = await Promise.all([
      this.softwareInventory.forDevice(deviceId, false),
      this.compliance.resultsForDevice(deviceId),
      this.cve.forDevice(deviceId),
    ]);

    return new Promise<RenderResult>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 36 });
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const sha256 = createHash('sha256').update(buffer).digest('hex');
        const filename = `device-${device.id}-${Date.now()}.pdf`;
        resolve({ buffer, sha256, filename });
      });
      doc.on('error', reject);

      // Header
      doc
        .fontSize(18)
        .text(`Device technical report`, { align: 'left' });
      doc.moveDown(0.2);
      doc
        .fontSize(11)
        .fillColor('#3C3C3C')
        .text(device.assetName || device.serialNumber || device.id);
      doc.fillColor('#8A8A8A').fontSize(9);
      doc.text(`Generated: ${new Date().toISOString()}`);
      if (actor) doc.text(`By: ${actor}`);
      doc.fillColor('black');

      // Overview
      sectionHeader(doc, 'Overview');
      addKeyValueTable(doc, [
        ['ID', device.id],
        ['Asset name', device.assetName],
        ['Serial number', device.serialNumber],
        ['Manufacturer', device.manufacturer],
        ['Model', device.model],
        ['Location', device.location],
        ['Lifecycle', device.lifecycle],
        ['Lifecycle note', device.lifecycleNote],
        [
          'Assigned user',
          device.user
            ? `${device.user.name ?? ''} ${device.user.surname ?? ''} <${device.user.email ?? ''}>`
            : '—',
        ],
        ['Last scan', device.lastScanAt?.toISOString() ?? 'never'],
        ['Created', device.createdAt?.toISOString()],
      ]);

      // Procurement
      sectionHeader(doc, 'Procurement & warranty');
      addKeyValueTable(doc, [
        ['Vendor', device.vendor],
        ['Purchase order', device.purchaseOrder],
        ['Purchase date', device.purchaseDate],
        [
          'Purchase price',
          device.purchasePrice
            ? `${device.purchasePrice} ${device.purchaseCurrency ?? ''}`
            : null,
        ],
        ['Warranty start', device.warrantyStart],
        ['Warranty end', device.warrantyEnd],
        ['Retired at', device.retiredAt],
        ['Disposed at', device.disposedAt],
        ['Disposal method', device.disposalMethod],
      ]);

      // System
      if (device.system) {
        sectionHeader(doc, 'System');
        addKeyValueTable(
          doc,
          Object.entries(device.system).slice(0, 40).map(([k, v]) => [k, v]),
        );
      }

      // Hardware
      if (device.hardware) {
        sectionHeader(doc, 'Hardware');
        addKeyValueTable(
          doc,
          Object.entries(device.hardware).slice(0, 40).map(([k, v]) => [k, v]),
        );
      }

      // Security
      if (device.security) {
        sectionHeader(doc, 'Security');
        addKeyValueTable(
          doc,
          Object.entries(device.security).slice(0, 40).map(([k, v]) => [k, v]),
        );
      }

      // Network
      if (device.network) {
        sectionHeader(doc, 'Network');
        addKeyValueTable(
          doc,
          Object.entries(device.network).slice(0, 40).map(([k, v]) => [k, v]),
        );
      }

      // Compliance
      sectionHeader(doc, 'Compliance');
      if (complianceResults.length === 0) {
        doc.fontSize(9).text('No compliance evaluation available.');
      } else {
        for (const r of complianceResults) {
          if (doc.y > doc.page.height - 60) doc.addPage();
          doc
            .fontSize(9)
            .fillColor(r.passed ? '#30A712' : '#F3606E')
            .text(r.passed ? '[PASS] ' : '[FAIL] ', { continued: true })
            .fillColor('black')
            .text(
              `${r.rule?.name ?? r.ruleKey} (${r.severity})${r.message ? ` — ${r.message}` : ''}`,
            );
        }
      }

      // CVEs
      sectionHeader(doc, 'Known vulnerabilities (OSV.dev)');
      if (cves.length === 0) {
        doc.fontSize(9).text('No known CVEs matched to installed software.');
      } else {
        for (const c of cves.slice(0, 100)) {
          if (doc.y > doc.page.height - 60) doc.addPage();
          doc
            .fontSize(9)
            .fillColor('#F3606E')
            .text(`[${c.severity}] ${c.cveId}`, { continued: true })
            .fillColor('black')
            .text(
              ` — ${c.applicationName}${c.version ? ` v${c.version}` : ''}${c.summary ? `: ${c.summary.slice(0, 160)}` : ''}`,
            );
        }
      }

      // Software catalog
      sectionHeader(doc, `Installed software (${software.length})`);
      if (software.length === 0) {
        doc.fontSize(9).text('No software recorded.');
      } else {
        for (const s of software.slice(0, 200)) {
          if (doc.y > doc.page.height - 60) doc.addPage();
          doc
            .fontSize(9)
            .text(
              `• ${s.application?.name ?? '(unknown)'}${s.version ? ` v${s.version}` : ''}${
                s.application?.publisher ? ` — ${s.application.publisher}` : ''
              }`,
            );
        }
        if (software.length > 200) {
          doc.fontSize(9).fillColor('#8A8A8A').text(
            `…and ${software.length - 200} more (truncated)`,
          );
          doc.fillColor('black');
        }
      }

      // Footer on every page
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc
          .fontSize(8)
          .fillColor('#8A8A8A')
          .text(
            `Page ${i + 1} of ${range.count} · LanVentory device report · ${device.id}`,
            36,
            doc.page.height - 30,
            { align: 'center', width: doc.page.width - 72 },
          );
      }

      doc.end();
    });
  }
}
