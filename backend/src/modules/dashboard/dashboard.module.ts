import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { ServiceRevenueModule } from '../service-revenue/service-revenue.module';
import { RechargeModule } from '../recharge/recharge.module';
import { KpiModule } from '../kpi/kpi.module';
import { DemandsModule } from '../demands/demands.module';

@Module({
  imports: [ServiceRevenueModule, RechargeModule, KpiModule, DemandsModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
