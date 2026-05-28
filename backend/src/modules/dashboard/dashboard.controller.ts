import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/current-user.decorator';
import { ServiceRevenueService } from '../service-revenue/service-revenue.service';
import { RechargeService } from '../recharge/recharge.service';
import { KpiService } from '../kpi/kpi.service';
import { DemandsService } from '../demands/demands.service';

@Controller()
export class DashboardController {
  constructor(
    private readonly revenueService: ServiceRevenueService,
    private readonly rechargeService: RechargeService,
    private readonly kpiService: KpiService,
    private readonly demandsService: DemandsService,
  ) {}

  @Get('dashboard/warehouse')
  @Roles('warehouse', 'admin')
  async warehouseDashboard(@CurrentUser() user: AuthUser) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [revenue, kpi, demands] = await Promise.all([
      this.revenueService.getMonthlySummary(currentMonth, user),
      this.kpiService.getDashboard(user),
      this.demandsService.getDashboard(user),
    ]);

    return {
      success: true,
      data: {
        finance: {
          monthlyIncome: revenue.data.totalRevenue,
          monthlyExpense: 0,
          purchaseCost: 0,
          netProfit: revenue.data.totalRevenue,
        },
        kpi: kpi.data,
        demands: demands.data,
        alerts: ['耗材采购成本较上周上涨 12%，建议检查供应商报价。'],
      },
    };
  }

  @Get('admin/dashboard')
  @Roles('admin')
  async adminDashboard() {
    const [kpi, demands] = await Promise.all([
      this.kpiService.getAdminDashboard(),
      this.demandsService.getAdminDashboard(),
    ]);

    return {
      success: true,
      data: {
        pendingDemands: demands.data.pending,
        financeWarnings: 0,
        kpiWarnings: kpi.data.warnings,
        warehouseCount: 1,
      },
    };
  }
}
