import PDFDocument from 'pdfkit';
import { createHash } from 'crypto';

export interface PdfRow {
  [key: string]: any;
}

export interface PdfMetadata {
  generatedBy?: string;
  generatedAt?: Date;
  filters?: Record<string, any>;
}

export const renderReportPdf = (
  title: string,
  rows: PdfRow[],
  metadata: PdfMetadata = {},
): Promise<{ buffer: Buffer; sha256: string }> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 36 });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const sha256 = createHash('sha256').update(buffer).digest('hex');
      resolve({ buffer, sha256 });
    });
    doc.on('error', reject);

    const generatedAt = metadata.generatedAt ?? new Date();

    doc.fontSize(18).text(title, { align: 'left' });
    doc.moveDown(0.5);
    doc
      .fontSize(9)
      .fillColor('#535353')
      .text(`Generated: ${generatedAt.toISOString()}`);
    if (metadata.generatedBy) {
      doc.text(`By: ${metadata.generatedBy}`);
    }
    if (metadata.filters && Object.keys(metadata.filters).length) {
      doc.text(`Filters: ${JSON.stringify(metadata.filters)}`);
    }
    doc.fillColor('black');
    doc.moveDown();

    if (!rows.length) {
      doc.fontSize(11).text('(no rows)', { italics: true } as any);
    } else {
      const headers = Object.keys(rows[0]);
      const colWidth = (doc.page.width - 72) / headers.length;

      doc.fontSize(9).fillColor('#3C3C3C');
      headers.forEach((h, i) => {
        doc.text(h, 36 + i * colWidth, doc.y, {
          width: colWidth,
          continued: i < headers.length - 1,
        });
      });
      doc.moveDown(0.3);
      doc
        .moveTo(36, doc.y)
        .lineTo(doc.page.width - 36, doc.y)
        .stroke();
      doc.moveDown(0.2);

      doc.fillColor('black');
      for (const row of rows) {
        const startY = doc.y;
        if (startY > doc.page.height - 80) {
          doc.addPage();
        }
        headers.forEach((h, i) => {
          const value = row[h];
          const text =
            value == null
              ? ''
              : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);
          doc.text(text, 36 + i * colWidth, doc.y, {
            width: colWidth,
            continued: i < headers.length - 1,
          });
        });
        doc.moveDown(0.2);
      }
    }

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc
        .fontSize(8)
        .fillColor('#8A8A8A')
        .text(
          `Page ${i + 1} of ${range.count} — LanVentory compliance export`,
          36,
          doc.page.height - 30,
          { align: 'center', width: doc.page.width - 72 },
        );
    }

    doc.end();
  });
};
