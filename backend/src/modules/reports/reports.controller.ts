import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/current-user.decorator';
import { ReportsService } from './reports.service';

@Controller()
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('reports/profit-loss/:warehouseId/:month')
  @Roles('warehouse', 'admin', 'finance')
  getProfitLoss(
    @Param('warehouseId') warehouseId: string,
    @Param('month') month: string,
  ) {
    return this.service.generateProfitLoss(warehouseId, month);
  }

  @Get('reports/balance-sheet/:warehouseId/:month')
  @Roles('warehouse', 'admin', 'finance')
  getBalanceSheet(
    @Param('warehouseId') warehouseId: string,
    @Param('month') month: string,
  ) {
    return this.service.generateBalanceSheet(warehouseId, month);
  }

  @Get('reports/reconciliation/:warehouseId/:month')
  @Roles('warehouse', 'admin', 'finance')
  runReconciliation(
    @Param('warehouseId') warehouseId: string,
    @Param('month') month: string,
  ) {
    return this.service.runReconciliationChecks(warehouseId, month);
  }

  @Get('reports/fund-summary/:warehouseId')
  @Roles('warehouse', 'admin', 'finance')
  getFundSummary(
    @Param('warehouseId') warehouseId: string,
    @Query('month') month?: string,
  ) {
    return this.service.getFundSummary(warehouseId, month);
  }

  @Get('reports/business-profit-analysis/:warehouseId')
  @Roles('warehouse', 'admin', 'finance')
  getBusinessProfitAnalysis(
    @Param('warehouseId') warehouseId: string,
    @Query('month') month?: string,
  ) {
    return this.service.getBusinessProfitAnalysis(warehouseId, month);
  }

  @Get('reports/ar-ap/:warehouseId')
  @Roles('warehouse', 'admin', 'finance')
  getARAPSummary(@Param('warehouseId') warehouseId: string) {
    return this.service.getARAPSummary(warehouseId);
  }

  @Get('reports/bank-ledger/:warehouseId/:accountId')
  @Roles('warehouse', 'admin', 'finance')
  getBankLedger(
    @Param('warehouseId') warehouseId: string,
    @Param('accountId') accountId: string,
    @Query('month') month?: string,
  ) {
    return this.service.getBankLedger(warehouseId, accountId, month);
  }

  @Post('reports/billing/:warehouseId/:month')
  @Roles('warehouse', 'admin')
  triggerBilling(
    @Param('warehouseId') warehouseId: string,
    @Param('month') month: string,
  ) {
    return this.service.triggerAutoBilling(warehouseId, month);
  }
}
