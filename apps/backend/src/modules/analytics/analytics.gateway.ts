import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { AnalyticsService } from './analytics.service';

@WebSocketGateway({
  namespace: '/analytics/kpis',
  cors: { origin: '*', credentials: true },
})
export class AnalyticsGateway implements OnGatewayInit, OnGatewayConnection {
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
        const today = new Date();
        const startDate = today.toISOString().slice(0, 10);
        const endDate = startDate;
        const kpis = await this.analyticsService.computeKpis(startDate, endDate);
        this.server.emit('kpi_update', kpis);
      } catch (err) {
        this.logger.error('KPI computation failed', err);
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
      const today = new Date();
      const kpis = await this.analyticsService.computeKpis(
        today.toISOString().slice(0, 10),
        today.toISOString().slice(0, 10),
      );
      client.emit('kpi_update', kpis);
    } catch {
      client.emit('error', 'Token invalide');
      client.disconnect();
    }
  }
}
