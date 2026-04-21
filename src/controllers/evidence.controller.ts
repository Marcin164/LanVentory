import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import {
  EvidenceInclude,
  EvidencePackService,
} from 'src/services/evidencePack.service';

@UseGuards(AuthGuard)
@Roles(Role.Admin, Role.Compliance, Role.Auditor)
@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidencePackService) {}

  @Post('pack')
  async build(
    @Body()
    body: {
      from: string;
      to: string;
      include: EvidenceInclude[];
      reportTypes?: string[];
    },
    @Req() req: any,
    @Res() res: Response,
  ) {
    const actor = req?.user?.properties?.metadata?.id ?? req?.user?.id;
    const { stream, filename } = await this.evidenceService.build({
      ...body,
      actor,
    });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    stream.pipe(res);
  }
}
