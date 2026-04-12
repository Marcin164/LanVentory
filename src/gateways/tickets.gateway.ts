import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // później ogranicz
  },
})
export class TicketsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('ticket.join')
  handleJoinTicket(
    @MessageBody() ticketId: string,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('[WS] join ticket:', ticketId, client.id);
    client.join(`ticket:${ticketId}`);
  }

  @SubscribeMessage('ticket.leave')
  handleLeaveTicket(
    @MessageBody() ticketId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`ticket:${ticketId}`);
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
