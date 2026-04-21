import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/current-user.decorator';
import { FinanceService } from '../finance/finance.service';
import { KpiService } from '../kpi/kpi.service';
import { DemandsService } from '../demands/demands.service';

@Controller()
export class DashboardController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly kpiService: KpiService,
    private readonly demandsService: DemandsService,
  ) {}

  @Get('dashboard/warehouse')
  @Roles('warehouse', 'admin')
  async warehouseDashboard(@CurrentUser() user: AuthUser) {
    const [finance, kpi, demands] = await Promise.all([
      this.financeService.getDashboard(user),
      this.kpiService.getDashboard(user),
      this.demandsService.getDashboard(user),
    ]);

    return {
      success: true,
      data: {
        finance: finance.data,
        kpi: kpi.data,
        demands: demands.data,
        alerts: ['耗材采购成本较上周上涨 12%，建议检查供应商报价。'],
      },
    };
  }

  @Get('admin/dashboard')
  @Roles('admin')
  async adminDashboard() {
    const [finance, kpi, demands] = await Promise.all([
      this.financeService.getAdminDashboard(),
      this.kpiService.getAdminDashboard(),
      this.demandsService.getAdminDashboard(),
    ]);

    return {
      success: true,
      data: {
        pendingDemands: demands.data.pending,
        financeWarnings: finance.data.warnings,
        kpiWarnings: kpi.data.warnings,
        warehouseCount: finance.data.warehouseCount,
      },
    };
  }
}
