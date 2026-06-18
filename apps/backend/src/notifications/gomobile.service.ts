import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

export interface GomobileSendResult {
  success: boolean;
  messageId?: string;
  smsLogId?: string;
  smsParts?: number;
  encoding?: string;
  creditCharged?: number;
  error?: string;
}

export interface GomobileCallRequestPayload {
  flowId: string;
  didId: string;
  phone: string;
  fullName: string;
  attributes: Record<string, string>;
  retry?: { type: string; delay?: number; maxRetries?: number };
}

export interface GomobileCallRequestResult {
  jobId: string;
  status: string;
}

export interface GomobileCallAttempt {
  callId?: string;
  outcome?: string;
  outcomeReason?: string;
  call?: {
    status?: string;
    durationMs?: number;
    answeredAt?: string;
    terminatedAt?: string;
  };
  flowExecution?: {
    finalVariables?: Record<string, unknown>;
  };
  events?: Array<{ type: string; timestamp?: string; data?: unknown }>;
}

export interface GomobileCallReport {
  jobId: string;
  status: string;
  finalOutcome?: string;
  attempts?: GomobileCallAttempt[];
}

export class GomobileApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly retryable: boolean,
    readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = 'GomobileApiError';
  }
}

@Injectable()
export class GomobileService {
  private readonly logger = new Logger(GomobileService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly flowIdH24: string;
  private readonly didId: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (this.config.get<string>('GOMOBILE_API_URL') ?? '').replace(/\/$/, '');
    this.apiKey = this.config.get<string>('GOMOBILE_API_KEY') ?? '';
    this.senderId = this.config.get<string>('GOMOBILE_SENDER_ID') ?? 'GoMobile';
    this.flowIdH24 = this.config.get<string>('GOMOBILE_FLOW_ID_H24') ?? '';
    this.didId = this.config.get<string>('GOMOBILE_DID_ID') ?? '';
  }

  isSmsConfigured(): boolean {
    return Boolean(this.baseUrl && this.apiKey && this.senderId);
  }

  isCallConfigured(): boolean {
    return Boolean(this.baseUrl && this.apiKey && this.flowIdH24 && this.didId);
  }

  /** @deprecated use isSmsConfigured */
  isConfigured(): boolean {
    return this.isSmsConfigured();
  }

  async sendSms(to: string, message: string): Promise<GomobileSendResult> {
    if (!this.isSmsConfigured()) {
      throw new GomobileApiError('GoMobile SMS is not configured', 0, false);
    }

    const { data, status } = await this.request<GomobileSendResult>('post', '/sms/send', {
      to,
      senderId: this.senderId,
      message,
    });

    if ((status === 201 || status === 200) && !data.success) {
      throw new GomobileApiError(data.error ?? 'SMS rejected by provider', status, false, data);
    }

    return data;
  }

  async triggerCallByPhone(
    payload: Omit<GomobileCallRequestPayload, 'flowId' | 'didId'>,
  ): Promise<GomobileCallRequestResult> {
    if (!this.isCallConfigured()) {
      throw new GomobileApiError('GoMobile call is not configured', 0, false);
    }

    const { data, status } = await this.request<GomobileCallRequestResult>(
      'post',
      '/call-requests/by-phone',
      {
        flowId: this.flowIdH24,
        didId: this.didId,
        retry: { type: 'none' },
        ...payload,
      },
      [202, 201, 200],
    );

    if (!data.jobId) {
      throw new GomobileApiError('GoMobile did not return jobId', status, false, data);
    }

    return data;
  }

  async cancelCall(jobId: string): Promise<void> {
    if (!this.isCallConfigured()) return;

    await this.request('delete', `/call-requests/${jobId}`, undefined, [204, 200, 404]);
  }

  async getCallReport(jobId: string): Promise<GomobileCallReport> {
    const { data } = await this.request<GomobileCallReport>('get', `/call-report/${jobId}`);
    return data;
  }

  async pollCallReport(
    jobId: string,
    opts: { intervalMs?: number; maxWaitMs?: number } = {},
  ): Promise<GomobileCallReport> {
    const intervalMs = opts.intervalMs ?? 10_000;
    const maxWaitMs = opts.maxWaitMs ?? 600_000;
    const terminal = new Set(['completed', 'failed']);
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
      const report = await this.getCallReport(jobId);
      if (terminal.has(report.status)) return report;
      await sleep(intervalMs);
    }

    throw new GomobileApiError(`Call report timeout for jobId=${jobId}`, 0, false);
  }

  private async request<T>(
    method: 'get' | 'post' | 'delete',
    path: string,
    body?: unknown,
    successStatuses: number[] = [200, 201, 202, 204],
  ): Promise<{ data: T; status: number }> {
    try {
      const response = await axios.request<T>({
        method,
        url: `${this.baseUrl}${path}`,
        data: body,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30_000,
        validateStatus: () => true,
      });

      if (successStatuses.includes(response.status)) {
        return { data: response.data, status: response.status };
      }

      throw this.mapHttpError(response.status, response.data);
    } catch (error) {
      if (error instanceof GomobileApiError) throw error;

      if (error instanceof AxiosError) {
        const status = error.response?.status ?? 0;
        throw this.mapHttpError(status, error.response?.data, error.message);
      }

      throw new GomobileApiError(
        error instanceof Error ? error.message : 'Unknown GoMobile error',
        0,
        true,
      );
    }
  }

  private mapHttpError(status: number, body?: unknown, fallback?: string): GomobileApiError {
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : fallback ?? `GoMobile API error (${status})`;

    const retryable = status === 429 || status >= 500 || status === 0;
    this.logger.warn(`GoMobile error ${status}: ${message}`);
    return new GomobileApiError(message, status, retryable, body);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
