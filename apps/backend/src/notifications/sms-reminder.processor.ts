import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SmsDeliveryService, type SmsDeliveryJobData } from './sms-delivery.service';
import { SMS_REMINDER_QUEUE } from './sms-reminder.constants';

@Processor(SMS_REMINDER_QUEUE)
export class SmsReminderProcessor extends WorkerHost {
  constructor(
    private readonly delivery: SmsDeliveryService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<SmsDeliveryJobData>): Promise<void> {
    const { appointmentId } = job.data;

    await this.delivery.processJob(job, {
      beforeSend: async () => {
        const appointment = await this.prisma.appointment.findUnique({
          where: { id: appointmentId },
          select: { status: true },
        });

        if (!appointment) return false;

        return (
          appointment.status === AppointmentStatus.SCHEDULED ||
          appointment.status === AppointmentStatus.CONFIRMED
        );
      },
    });
  }
}
