import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { BillingService } from './billing.service';
import { JournalHooksService } from './journal-hooks.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [ReportsService, BillingService, JournalHooksService],
  exports: [ReportsService, BillingService, JournalHooksService],
})
export class ReportsModule {}
