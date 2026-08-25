import { Module } from '@nestjs/common';
import { EmailNotificationsService } from './email-notifications.service';
import { SmtpMailService } from './smtp-mail.service';

@Module({
  providers: [EmailNotificationsService, SmtpMailService],
})
export class EmailNotificationsModule {}
