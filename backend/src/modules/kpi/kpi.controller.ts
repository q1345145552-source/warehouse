import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/current-user.decorator';
import { KpiService } from './kpi.service';
import { SaveKpiEntryDto } from './dto/save-kpi-entry.dto';
import { PublishKpiRuleDto } from './dto/publish-kpi-rule.dto';
import { UpdateKpiRuleConfigDto } from './dto/update-kpi-rule-config.dto';

@Controller()
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Get('kpi/entries')
  @Roles('warehouse', 'admin')
  getEntries(@CurrentUser() user: AuthUser) {
    return this.kpiService.getEntries(user);
  }

  @Post('kpi/entries')
  @Roles('warehouse')
  saveEntry(@CurrentUser() user: AuthUser, @Body() dto: SaveKpiEntryDto) {
    return this.kpiService.saveEntry(dto, user);
  }

  @Post('kpi/entries/:id/submit')
  @Roles('warehouse')
  submitEntry(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.kpiService.submitEntry(id, user);
  }

  @Post('admin/kpi/entries/:id/approve')
  @Roles('admin')
  approveEntry(@Param('id') id: string) {
    return this.kpiService.approveEntry(id);
  }

  @Post('admin/kpi/entries/:id/reject')
  @Roles('admin')
  rejectEntry(@Param('id') id: string) {
    return this.kpiService.rejectEntry(id);
  }

  @Get('kpi/results')
  @Roles('warehouse', 'admin')
  getResults(@CurrentUser() user: AuthUser) {
    return this.kpiService.getResults(user);
  }

  @Get('kpi/results/:id/metrics')
  @Roles('warehouse', 'admin')
  getMetricScores(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.kpiService.getMetricScores(id, user);
  }

  @Get('kpi/results/:id/analysis')
  @Roles('warehouse', 'admin')
  getAnalysis(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.kpiService.getAnalysis(id, user);
  }

  @Get('kpi/rules')
  @Roles('warehouse', 'admin')
  getRules(@CurrentUser() user: AuthUser) {
    return this.kpiService.getRules(user);
  }

  @Get('kpi/rule-templates')
  @Roles('warehouse', 'admin')
  getRuleTemplates() {
    return this.kpiService.getRuleTemplates();
  }

  @Post('kpi/rules')
  @Roles('warehouse')
  createRule(@CurrentUser() user: AuthUser, @Body() body: { warehouseId?: string; ruleName: string; scopeType?: string }) {
    return this.kpiService.createRule(body, user);
  }

  @Post('kpi/rules/:id/apply-template')
  @Roles('warehouse')
  applyTemplate(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { templateKey: string }) {
    return this.kpiService.applyRuleTemplate(id, body.templateKey, user);
  }

  @Put('kpi/rules/:id/config')
  @Roles('warehouse')
  saveRuleConfig(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateKpiRuleConfigDto) {
    return this.kpiService.saveRuleConfig(id, dto, user);
  }

  @Post('kpi/rules/:id/publish')
  @Roles('warehouse')
  publishRule(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: PublishKpiRuleDto) {
    return this.kpiService.publishRule(id, dto, user);
  }

  @Get('kpi/rules/:id/versions/compare')
  @Roles('warehouse', 'admin')
  compareRuleVersions(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('fromVersionId') fromVersionId: string,
    @Query('toVersionId') toVersionId: string,
  ) {
    return this.kpiService.compareRuleVersions(id, fromVersionId, toVersionId, user);
  }

  @Post('kpi/rules/:id/versions/:targetVersionId/rollback')
  @Roles('warehouse', 'admin')
  rollbackRuleVersion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('targetVersionId') targetVersionId: string,
  ) {
    return this.kpiService.rollbackRuleVersion(id, targetVersionId, user);
  }
}
