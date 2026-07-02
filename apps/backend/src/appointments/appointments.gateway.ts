import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { AppointmentStatus, InteractionType, UserRole } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { isAllowedCorsOrigin } from '../common/cors-origins';

interface JwtPayload {
  sub: string;
  type: 'user' | 'superadmin';
}

interface AppointmentPatientPayload {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface AppointmentRealtimePayload {
  appointmentId: string;
  establishmentId: string;
  status: AppointmentStatus;
  action: string;
  date: Date;
  doctorName: string;
  patient: AppointmentPatientPayload;
  todayCounts: {
    total: number;
    scheduled: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    noShow: number;
  };
  badge?: {
    label: string;
    variant: 'success' | 'danger' | 'info' | 'warning';
  };
  notification?: {
    title: string;
    message: string;
  };
}

export interface InteractionRealtimePayload {
  interactionId: string;
  establishmentId: string;
  patient: AppointmentPatientPayload;
  type: InteractionType;
  direction: string;
  transcript: string | null;
  intent?: string | null;
  createdAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (!origin || isAllowedCorsOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  },
})
export class AppointmentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AppointmentsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      if (payload.type !== 'user') {
        client.disconnect(true);
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, establishmentId: true, isActive: true },
      });

      if (!user?.isActive || !user.establishmentId) {
        client.disconnect(true);
        return;
      }

      client.data.user = user;
      await client.join(this.establishmentRoom(user.establishmentId));
      await client.join(this.roleRoom(user.establishmentId, user.role));
      await client.join(`user:${user.id}`);
    } catch (error) {
      this.logger.warn(
        `Socket authentication failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.user?.id;
    if (userId) this.logger.debug(`Socket disconnected for user ${userId}`);
  }

  emitUpdated(establishmentId: string) {
    this.server.emit('appointments:updated', { establishmentId });
  }

  emitAppointmentUpdated(payload: AppointmentRealtimePayload) {
    const room = this.establishmentRoom(payload.establishmentId);
    this.server.to(room).emit('appointment:updated', payload);
    this.server.emit('appointments:updated', {
      establishmentId: payload.establishmentId,
      appointmentId: payload.appointmentId,
      status: payload.status,
      todayCounts: payload.todayCounts,
    });
  }

  emitAppointmentCancelled(payload: AppointmentRealtimePayload) {
    this.server
      .to(this.roleRoom(payload.establishmentId, UserRole.RECEPTIONIST))
      .emit('appointment:cancelled', payload);
  }

  emitAppointmentConfirmed(payload: AppointmentRealtimePayload) {
    this.server.to(this.establishmentRoom(payload.establishmentId)).emit('appointment:confirmed', payload);
  }

  emitInteractionNew(payload: InteractionRealtimePayload) {
    this.server.to(this.establishmentRoom(payload.establishmentId)).emit('interaction:new', payload);
  }

  private establishmentRoom(establishmentId: string) {
    return `establishment:${establishmentId}`;
  }

  private roleRoom(establishmentId: string, role: string) {
    return `role:${establishmentId}:${role}`;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) return authToken;

    const authorization = client.handshake.headers.authorization;
    if (authorization?.startsWith('Bearer ')) return authorization.slice('Bearer '.length);

    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((part) => {
        const [key, ...value] = part.trim().split('=');
        return [key, decodeURIComponent(value.join('='))];
      }),
    );

    return cookies.token || null;
  }
}
