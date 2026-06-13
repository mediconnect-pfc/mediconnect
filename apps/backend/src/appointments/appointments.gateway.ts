import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  },
})
export class AppointmentsGateway {
  @WebSocketServer()
  server: Server;

  emitUpdated(establishmentId: string) {
    this.server.emit('appointments:updated', { establishmentId });
  }
}
