import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { AnalyticsService } from './analytics.service';

@WebSocketGateway({
  namespace: '/analytics/kpis',
  cors: { origin: '*', credentials: true },
})
export class AnalyticsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AnalyticsGateway.name);
  private interval: ReturnType<typeof setInterval> | null = null;

  @WebSocketServer() server!: Server;

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket gateway initialized');
    this.interval = setInterval(async () => {
      try {
        const kpis = await this.analyticsService.computeKpis();
        this.server.emit('kpi_update', kpis);
      } catch (err) {
        this.logger.error('Failed to compute KPIs', err);
      }
    }, 5000);
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token as string;
      if (!token) {
        client.emit('error', 'Token requis');
        client.disconnect();
        return;
      }
      const secret = this.configService.get<string>('JWT_SECRET')!;
      jwt.verify(token, secret);
      this.logger.log(`Client connected: ${client.id}`);
      const kpis = await this.analyticsService.computeKpis();
      client.emit('kpi_update', kpis);
    } catch {
      client.emit('error', 'Token invalide');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}
