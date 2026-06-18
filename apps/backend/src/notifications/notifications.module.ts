import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppointmentsEventsModule } from '../appointments/appointments-events.module';
import { GomobileService } from './gomobile.service';
import { SmsDeliveryService } from './sms-delivery.service';
import { SmsConfirmationService } from './sms-confirmation.service';
import { SmsConfirmationProcessor } from './sms-confirmation.processor';
import { SmsReminderService } from './sms-reminder.service';
import { SmsReminderProcessor } from './sms-reminder.processor';
import { CallReminderService } from './call-reminder.service';
import { CallReminderProcessor } from './call-reminder.processor';
import { SMS_CONFIRMATION_QUEUE } from './sms-confirmation.constants';
import { SMS_REMINDER_QUEUE } from './sms-reminder.constants';
import { CALL_REMINDER_QUEUE } from './call-reminder.constants';

@Module({
  imports: [
    AppointmentsEventsModule,
    BullModule.registerQueue({ name: SMS_CONFIRMATION_QUEUE }),
    BullModule.registerQueue({ name: SMS_REMINDER_QUEUE }),
    BullModule.registerQueue({ name: CALL_REMINDER_QUEUE }),
  ],
  providers: [
    GomobileService,
    SmsDeliveryService,
    SmsConfirmationService,
    SmsConfirmationProcessor,
    SmsReminderService,
    SmsReminderProcessor,
    CallReminderService,
    CallReminderProcessor,
  ],
  exports: [SmsConfirmationService, SmsReminderService, CallReminderService, GomobileService],
})
export class NotificationsModule {}
