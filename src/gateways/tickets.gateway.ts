import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type Viewer = { userId: string; label: string };

@WebSocketGateway({
  cors: {
    origin: '*', // później ogranicz
  },
})
export class TicketsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  /**
   * Active viewers per ticket — keyed by socketId so a single user with
   * multiple tabs counts once per tab; consumers can dedupe by userId.
   */
  private viewersByTicket = new Map<string, Map<string, Viewer>>();

  private snapshotViewers(ticketId: string): Viewer[] {
    const inner = this.viewersByTicket.get(ticketId);
    if (!inner) return [];
    const seen = new Map<string, Viewer>();
    for (const v of inner.values()) {
      if (!seen.has(v.userId)) seen.set(v.userId, v);
    }
    return Array.from(seen.values());
  }

  private broadcastViewers(ticketId: string) {
    this.server
      .to(`ticket:${ticketId}`)
      .emit('ticket.viewers', this.snapshotViewers(ticketId));
  }

  @SubscribeMessage('ticket.join')
  handleJoinTicket(
    @MessageBody() body: string | { ticketId: string; userId?: string; label?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const ticketId = typeof body === 'string' ? body : body.ticketId;
    const userId =
      typeof body === 'string' ? '' : body.userId ?? '';
    const label =
      typeof body === 'string' ? '' : body.label ?? userId;

    client.join(`ticket:${ticketId}`);
    (client.data as any).ticketId = ticketId;
    (client.data as any).userId = userId;

    if (userId) {
      const inner =
        this.viewersByTicket.get(ticketId) ??
        new Map<string, Viewer>();
      inner.set(client.id, { userId, label });
      this.viewersByTicket.set(ticketId, inner);
      this.broadcastViewers(ticketId);
    }
  }

  @SubscribeMessage('ticket.leave')
  handleLeaveTicket(
    @MessageBody() body: string | { ticketId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const ticketId = typeof body === 'string' ? body : body.ticketId;
    client.leave(`ticket:${ticketId}`);
    const inner = this.viewersByTicket.get(ticketId);
    if (inner) {
      inner.delete(client.id);
      if (inner.size === 0) this.viewersByTicket.delete(ticketId);
      this.broadcastViewers(ticketId);
    }
  }

  handleDisconnect(client: Socket) {
    const ticketId = (client.data as any)?.ticketId;
    if (!ticketId) return;
    const inner = this.viewersByTicket.get(ticketId);
    if (!inner) return;
    if (inner.delete(client.id)) {
      if (inner.size === 0) this.viewersByTicket.delete(ticketId);
      this.broadcastViewers(ticketId);
    }
  }

  emitNewComment(ticketId: string, payload: any) {
    console.log('[WS] emit comment to ticket:', ticketId);
    this.server
      .to(`ticket:${ticketId}`)
      .emit('ticket.comment.created', payload);
  }

  emitTicketUpdated(ticketId: string, payload: any) {
    this.server.to(`ticket:${ticketId}`).emit('ticket.updated', payload);
  }

  emitTicketActivity(ticketId: string, payload: any) {
    this.server
      .to(`ticket:${ticketId}`)
      .emit('ticket.activity.created', payload);
  }
}
