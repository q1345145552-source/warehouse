import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { FinanceJobsService } from './finance.jobs.service';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, FinanceJobsService],
  exports: [FinanceService],
})
export class FinanceModule {}
