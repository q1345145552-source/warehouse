import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { FinanceModule } from '../finance/finance.module';
import { KpiModule } from '../kpi/kpi.module';
import { DemandsModule } from '../demands/demands.module';

@Module({
  imports: [FinanceModule, KpiModule, DemandsModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
