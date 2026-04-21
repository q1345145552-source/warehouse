import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/current-user.decorator';
import { FinanceService } from './finance.service';
import { PublishFinanceRuleDto } from './dto/publish-finance-rule.dto';
import { ReviewFinanceAdjustmentDto } from './dto/review-finance-adjustment.dto';
import { SaveFinanceRecordDto } from './dto/save-finance-record.dto';
import { SaveFinanceAdjustmentDto } from './dto/save-finance-adjustment.dto';
import { SaveExchangeRateDto } from './dto/save-exchange-rate.dto';
import { SaveProjectDto } from './dto/save-project.dto';
import { UpdateFinanceRuleConfigDto } from './dto/update-finance-rule-config.dto';

@Controller()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('finance/dashboard')
  @Roles('warehouse', 'admin')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.financeService.getDashboard(user);
  }

  @Get('finance/incomes')
  @Roles('warehouse', 'admin')
  getIncomes(@CurrentUser() user: AuthUser) {
    return this.financeService.getRecords('income', user);
  }

  @Post('finance/incomes')
  @Roles('warehouse')
  createIncome(@CurrentUser() user: AuthUser, @Body() dto: SaveFinanceRecordDto) {
    return this.financeService.saveRecord('income', dto, user);
  }

  @Post('finance/incomes/:id/submit')
  @Roles('warehouse')
  submitIncome(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.financeService.submitRecord(id, user);
  }

  @Get('finance/expenses')
  @Roles('warehouse', 'admin')
  getExpenses(@CurrentUser() user: AuthUser) {
    return this.financeService.getRecords('expense', user);
  }

  @Post('finance/expenses')
  @Roles('warehouse')
  createExpense(@CurrentUser() user: AuthUser, @Body() dto: SaveFinanceRecordDto) {
    return this.financeService.saveRecord('expense', dto, user);
  }

  @Post('finance/expenses/:id/submit')
  @Roles('warehouse')
  submitExpense(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.financeService.submitRecord(id, user);
  }

  @Get('finance/purchases')
  @Roles('warehouse', 'admin')
  getPurchases(@CurrentUser() user: AuthUser) {
    return this.financeService.getRecords('purchase', user);
  }

  @Post('finance/purchases')
  @Roles('warehouse')
  createPurchase(@CurrentUser() user: AuthUser, @Body() dto: SaveFinanceRecordDto) {
    return this.financeService.saveRecord('purchase', dto, user);
  }

  @Post('finance/purchases/:id/submit')
  @Roles('warehouse')
  submitPurchase(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.financeService.submitRecord(id, user);
  }

  @Post('admin/finance/records/:id/approve')
  @Roles('admin')
  approveRecord(@Param('id') id: string) {
    return this.financeService.approveRecord(id);
  }

  @Post('admin/finance/records/:id/reject')
  @Roles('admin')
  rejectRecord(@Param('id') id: string) {
    return this.financeService.rejectRecord(id);
  }

  @Get('finance/projects')
  @Roles('warehouse', 'admin')
  getProjects(@CurrentUser() user: AuthUser) {
    return this.financeService.getProjects(user);
  }

  @Post('finance/projects')
  @Roles('warehouse')
  saveProject(@CurrentUser() user: AuthUser, @Body() dto: SaveProjectDto) {
    return this.financeService.saveProject(dto, user);
  }

  @Put('finance/projects/:id')
  @Roles('warehouse')
  updateProject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SaveProjectDto) {
    return this.financeService.updateProject(id, dto, user);
  }

  @Get('finance/profit-snapshots')
  @Roles('warehouse', 'admin')
  getProfitSnapshots(@CurrentUser() user: AuthUser) {
    return this.financeService.getProfitSnapshots(user);
  }

  @Get('finance/project-profit')
  @Roles('warehouse', 'admin')
  getProjectProfit(
    @CurrentUser() user: AuthUser,
    @Query('startAt') startAt?: string,
    @Query('endAt') endAt?: string,
  ) {
    return this.financeService.getProjectProfitBreakdown(user, startAt, endAt);
  }

  @Get('finance/allocation-lines')
  @Roles('warehouse', 'admin')
  getAllocationLines(
    @CurrentUser() user: AuthUser,
    @Query('month') month?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.financeService.getAllocationLines(user, month, warehouseId);
  }

  @Get('finance/exchange-rates')
  @Roles('warehouse', 'admin')
  getExchangeRates(
    @Query('baseCurrency') baseCurrency?: string,
    @Query('quoteCurrency') quoteCurrency?: string,
    @Query('effectiveDate') effectiveDate?: string,
  ) {
    return this.financeService.getExchangeRates(baseCurrency, quoteCurrency, effectiveDate);
  }

  @Post('admin/finance/exchange-rates')
  @Roles('admin')
  saveExchangeRate(@CurrentUser() user: AuthUser, @Body() dto: SaveExchangeRateDto) {
    return this.financeService.saveExchangeRate(dto, user);
  }

  @Get('finance/adjustments')
  @Roles('warehouse', 'admin')
  getAdjustments(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.financeService.getAdjustments(user, status);
  }

  @Post('finance/adjustments')
  @Roles('warehouse')
  createAdjustment(@CurrentUser() user: AuthUser, @Body() dto: SaveFinanceAdjustmentDto) {
    return this.financeService.createAdjustment(dto, user);
  }

  @Post('finance/adjustments/:id/submit')
  @Roles('warehouse')
  submitAdjustment(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.financeService.submitAdjustment(id, user);
  }

  @Post('admin/finance/adjustments/:id/approve')
  @Roles('admin')
  approveAdjustment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReviewFinanceAdjustmentDto) {
    return this.financeService.approveAdjustment(id, dto, user);
  }

  @Post('admin/finance/adjustments/:id/reject')
  @Roles('admin')
  rejectAdjustment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReviewFinanceAdjustmentDto) {
    return this.financeService.rejectAdjustment(id, dto, user);
  }

  @Post('admin/finance/profit-snapshots/recalculate')
  @Roles('admin')
  recalculateProfitSnapshots() {
    return this.financeService.recalculateMonthlySnapshots();
  }

  @Get('finance/partner-profit-results')
  @Roles('warehouse', 'admin')
  getPartnerProfitResults(@CurrentUser() user: AuthUser) {
    return this.financeService.getPartnerProfitResults(user);
  }

  @Get('finance/analysis')
  @Roles('warehouse', 'admin')
  getAnalysis(@CurrentUser() user: AuthUser) {
    return this.financeService.getAnalysis(user);
  }

  @Get('finance/rules')
  @Roles('warehouse', 'admin')
  getAllocationRules(@CurrentUser() user: AuthUser) {
    return this.financeService.getAllocationRules(user);
  }

  @Post('finance/rules')
  @Roles('warehouse', 'admin')
  createAllocationRule(
    @CurrentUser() user: AuthUser,
    @Body() body: { warehouseId?: string; ruleName: string; scopeType?: string },
  ) {
    return this.financeService.createAllocationRule(body, user);
  }

  @Put('finance/rules/:id/config')
  @Roles('warehouse', 'admin')
  saveAllocationRuleConfig(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateFinanceRuleConfigDto) {
    return this.financeService.saveAllocationRuleConfig(id, dto, user);
  }

  @Post('finance/rules/:id/publish')
  @Roles('warehouse', 'admin')
  publishAllocationRule(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: PublishFinanceRuleDto) {
    return this.financeService.publishAllocationRule(id, dto, user);
  }

  @Get('finance/rules/:id/versions/compare')
  @Roles('warehouse', 'admin')
  compareAllocationRuleVersions(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('fromVersionId') fromVersionId: string,
    @Query('toVersionId') toVersionId: string,
  ) {
    return this.financeService.compareAllocationRuleVersions(id, fromVersionId, toVersionId, user);
  }

  @Post('finance/rules/:id/versions/:targetVersionId/rollback')
  @Roles('warehouse', 'admin')
  rollbackAllocationRuleVersion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('targetVersionId') targetVersionId: string,
  ) {
    return this.financeService.rollbackAllocationRuleVersion(id, targetVersionId, user);
  }
}
