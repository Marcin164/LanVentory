import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateTicketDto, GetTicketsQueryDto } from 'src/dto/tickets.dto';
import { Tickets } from 'src/entities/tickets.entity';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { TicketsService } from 'src/services/tickets.service';

@UseGuards(AuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async getTickets(@Query() query: GetTicketsQueryDto) {
    return this.ticketsService.getTickets(query);
  }

  @Get('/filters')
  async getFilters() {
    return this.ticketsService.getFilterOptions();
  }

  @Get('/mine')
  async getMyTickets(
    @Req() req: any,
    @Query('scope') scope: 'open' | 'closed' = 'open',
  ) {
    const userId = req?.user?.properties?.metadata?.id;
    return this.ticketsService.getMyTickets(userId, scope);
  }

  @Get('/categories')
  async getTicketCategories() {
    return this.ticketsService.getTicketCategories();
  }

  @Get('/agent-stats')
  async getAgentStats(@Req() req: any) {
    const userId = req?.user?.properties?.metadata?.id;
    return this.ticketsService.getAgentStats(userId);
  }

  @Roles(Role.Admin, Role.Helpdesk)
  @Patch('/categories')
  async updateTicketCategories(@Body() dto: any) {
    return this.ticketsService.updateTicketCategories(dto);
  }

  @Get('/by-requester/:userId')
  async getByRequester(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.ticketsService.getTicketsByRequester(
      userId,
      limit ? Number(limit) : 10,
    );
  }

  @Get('/:id/similar')
  async getSimilar(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.ticketsService.getSimilarResolvedTickets(
      id,
      limit ? Number(limit) : 5,
    );
  }

  @Get('/by-device/:deviceId')
  async getByDevice(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.ticketsService.getTicketsByDevice(
      deviceId,
      limit ? Number(limit) : 10,
    );
  }

  @Roles(Role.Admin, Role.Helpdesk)
  @Post(':id/link')
  async linkTicket(
    @Param('id') id: string,
    @Body() body: { parentTicketId: string | null },
    @Req() req: any,
  ) {
    const userId = req?.user?.properties?.metadata?.id;
    return this.ticketsService.linkTicket(id, body.parentTicketId, userId);
  }

  @Get(':id')
  async getTicket(@Param('id') id: string) {
    return this.ticketsService.getTicketById(id);
  }

  @Roles(Role.Admin, Role.Helpdesk)
  @Patch(':id')
  async updateTicket(
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    const userId = req?.user?.properties?.metadata?.id;
    return this.ticketsService.updateTicket(id, dto, userId);
  }

  @Post()
  async createTicket(@Body() dto: CreateTicketDto): Promise<Tickets> {
    return this.ticketsService.createTicket(dto);
  }

  @Post('/comment/:id/:requesterId')
  async createComment(
    @Param('id') id: string,
    @Param('requesterId') requesterId: string,
    @Body() dto: any,
  ): Promise<any> {
    return this.ticketsService.createComment(id, requesterId, dto);
  }

  @Post('/comment/:id/:requesterId/attachment')
  @UseInterceptors(FileInterceptor('file'))
  async createCommentWithAttachment(
    @Param('id') id: string,
    @Param('requesterId') requesterId: string,
    @UploadedFile() file: any,
    @Body() dto: any,
  ): Promise<any> {
    return this.ticketsService.createCommentWithAttachment(
      id,
      requesterId,
      dto,
      file,
    );
  }

  @Get('/attachment/:commentId')
  async downloadAttachment(
    @Param('commentId') commentId: string,
    @Res() res: Response,
  ) {
    const { comment, stream } =
      await this.ticketsService.getAttachmentStream(commentId);
    res.setHeader(
      'Content-Type',
      comment.attachmentMimetype || 'application/octet-stream',
    );
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(comment.attachmentName ?? 'attachment')}"`,
    );
    stream.pipe(res);
  }

  @Post('/approve/:ticketId/:requesterId/:approverId')
  async createApproval(
    @Param('ticketId') ticketId: string,
    @Param('requesterId') requesterId: string,
    @Param('approverId') approverId: string,
  ): Promise<any> {
    console.log('ticketId', ticketId);
    return this.ticketsService.createApproval(
      ticketId,
      requesterId,
      approverId,
    );
  }

  @Patch('/approve/:id')
  async updateApproval(
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: any,
  ): Promise<any> {
    const currentUserId = req?.user?.properties?.metadata?.id;
    return this.ticketsService.updateApproval(id, dto, currentUserId);
  }
}
