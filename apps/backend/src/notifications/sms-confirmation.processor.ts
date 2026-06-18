import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SmsDeliveryService, type SmsDeliveryJobData } from './sms-delivery.service';
import { SMS_CONFIRMATION_QUEUE } from './sms-confirmation.constants';

@Processor(SMS_CONFIRMATION_QUEUE)
export class SmsConfirmationProcessor extends WorkerHost {
  constructor(private readonly delivery: SmsDeliveryService) {
    super();
  }

  async process(job: Job<SmsDeliveryJobData>): Promise<void> {
    await this.delivery.processJob(job);
  }
}
