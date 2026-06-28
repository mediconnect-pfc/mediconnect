import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { AnalyticsService } from './analytics.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';

@WebSocketGateway({
  namespace: '/analytics/kpis',
  cors: { origin: '*', credentials: true },
})
export class AnalyticsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AnalyticsGateway.name);
  private interval: ReturnType<typeof setInterval> | null = null;
  private refreshing = false;

  @WebSocketServer() server!: Server;

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket gateway initialized');
    void this.refreshGlobalKpis();
    this.interval = setInterval(() => {
      void this.refreshGlobalKpis();
    }, 30000);
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || (client.handshake.query?.token as string);
      if (!token) {
        client.emit('error', 'Token requis');
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET')!;
      const payload = jwt.verify(token, secret) as AuthenticatedUser & { type?: string };

      this.logger.log(`Client connected: ${client.id}`);
      const kpis = await this.analyticsService.computeDashboardKpis(payload.establishmentId ?? null);
      client.emit('kpi_update', kpis);
    } catch {
      client.emit('error', 'Token invalide');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private async refreshGlobalKpis() {
    if (this.refreshing) return;
    this.refreshing = true;

    try {
      const kpis = await this.analyticsService.computeDashboardKpis();
      this.server.emit('kpi_update', kpis);
    } catch (err) {
      this.logger.error('Failed to compute KPIs', err);
    } finally {
      this.refreshing = false;
    }
  }
}
