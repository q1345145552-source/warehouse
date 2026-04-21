import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/auth/current-user.decorator';
import { PublishKpiRuleDto } from './dto/publish-kpi-rule.dto';
import { SaveKpiEntryDto } from './dto/save-kpi-entry.dto';
import { UpdateKpiRuleConfigDto } from './dto/update-kpi-rule-config.dto';

@Injectable()
export class KpiService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly ruleTemplates: Record<
    string,
    {
      key: string;
      name: string;
      description: string;
      config: Omit<
        UpdateKpiRuleConfigDto,
        never
      >;
    }
  > = {
    balanced: {
      key: 'balanced',
      name: '均衡模板',
      description: '适用于稳定运营仓库，业务量、差错、人效、负载均衡。',
      config: {
        businessCeiling: 35,
        businessDivisor: 10,
        errorCeiling: 30,
        errorPenalty: 1,
        efficiencyCeiling: 20,
        efficiencyDivisor: 1,
        loadCeiling: 15,
        loadMultiplier: 10,
        excellentMin: 90,
        goodMin: 80,
        passMin: 70,
        improveMin: 60,
      },
    },
    growth: {
      key: 'growth',
      name: '增长模板',
      description: '强调业务增长与人效，适合扩张阶段。',
      config: {
        businessCeiling: 40,
        businessDivisor: 9,
        errorCeiling: 25,
        errorPenalty: 1.2,
        efficiencyCeiling: 22,
        efficiencyDivisor: 0.9,
        loadCeiling: 13,
        loadMultiplier: 9,
        excellentMin: 92,
        goodMin: 82,
        passMin: 72,
        improveMin: 62,
      },
    },
    quality: {
      key: 'quality',
      name: '质量优先模板',
      description: '强调差错控制，适合高精度履约场景。',
      config: {
        businessCeiling: 30,
        businessDivisor: 10,
        errorCeiling: 40,
        errorPenalty: 1.6,
        efficiencyCeiling: 18,
        efficiencyDivisor: 1,
        loadCeiling: 12,
        loadMultiplier: 8,
        excellentMin: 92,
        goodMin: 84,
        passMin: 74,
        improveMin: 64,
      },
    },
  };

  async getDashboard(user: AuthUser) {
    const latest = await this.prisma.kpiResult.findFirst({
      where: user.role === 'admin' ? {} : { warehouseId: user.warehouseId ?? '' },
      orderBy: { createdAt: 'desc' },
    });
    return {
      success: true,
      data: {
        score: latest ? Number(latest.totalScore) : 0,
        grade: latest?.grade ?? '待评估',
      },
    };
  }

  async getAdminDashboard() {
    const warnings = await this.prisma.kpiResult.count({ where: { grade: { in: ['需改善', '预警'] } } });
    return { success: true, data: { warnings } };
  }

  async getEntries(user: AuthUser) {
    const data = await this.prisma.kpiEntry.findMany({
      where: user.role === 'admin' ? {} : { warehouseId: user.warehouseId ?? '' },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data };
  }

  async saveEntry(dto: SaveKpiEntryDto, user: AuthUser) {
    const warehouseId = this.resolveWarehouseId(user, dto.warehouseId);
    const data = await this.prisma.kpiEntry.create({
      data: {
        warehouseId,
        staffCode: dto.staffCode,
        targetType: dto.targetType,
        cycleType: dto.cycleType,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        orderCount: dto.orderCount,
        warehouseArea: dto.warehouseArea,
        staffCount: dto.staffCount,
        errorCount: dto.errorCount,
        inboundCount: dto.inboundCount,
        note: dto.note,
        status: 'draft',
      },
    });

    await this.log('kpi_entry', 'create_draft', { id: data.id });
    return { success: true, message: 'KPI 数据已保存草稿', data };
  }

  async submitEntry(id: string, user: AuthUser) {
    const entry = await this.prisma.kpiEntry.findUnique({ where: { id } });
    if (!entry) return { success: false, message: 'KPI记录不存在' };
    this.ensureWarehouseAccess(user, entry.warehouseId);

    const data = await this.prisma.kpiEntry.update({ where: { id }, data: { status: 'submitted' } });
    await this.log('kpi_entry', 'submit', { id });
    return { success: true, message: 'KPI 数据已提交', data };
  }

  async approveEntry(id: string) {
    const entry = await this.prisma.kpiEntry.update({ where: { id }, data: { status: 'approved' } });
    const activeConfig = await this.getActiveRuleConfig(entry.warehouseId);
    const scoring = this.calculateScore(entry, activeConfig);
    const grade = this.mapGrade(scoring.total, activeConfig);

    const result = await this.prisma.kpiResult.create({
      data: {
        warehouseId: entry.warehouseId,
        staffCode: entry.staffCode,
        cycleType: entry.cycleType,
        startDate: entry.startDate,
        endDate: entry.endDate,
        totalScore: scoring.total,
        grade,
      },
    });

    await this.prisma.kpiMetricScore.createMany({
      data: [
        { resultId: result.id, metricCode: 'business_volume', scoreCeiling: scoring.businessCeiling, actualScore: scoring.business },
        { resultId: result.id, metricCode: 'error_control', scoreCeiling: scoring.errorCeiling, actualScore: scoring.error },
        { resultId: result.id, metricCode: 'efficiency', scoreCeiling: scoring.efficiencyCeiling, actualScore: scoring.efficiency },
        { resultId: result.id, metricCode: 'load_ratio', scoreCeiling: scoring.loadCeiling, actualScore: scoring.load },
      ],
    });

    await this.prisma.kpiAnalysis.create({
      data: {
        resultId: result.id,
        analysisType: 'trend',
        content: grade === '预警' ? '发错率或负载异常，建议立即复核作业流程。' : '指标整体稳定，可继续关注采购与差错控制。',
        riskLevel: grade === '预警' ? 'high' : 'low',
      },
    });

    await this.log('kpi_entry', 'approve', { id, resultId: result.id });
    return { success: true, message: 'KPI 数据审核通过并已计算结果', data: result };
  }

  async rejectEntry(id: string) {
    const data = await this.prisma.kpiEntry.update({ where: { id }, data: { status: 'rejected' } });
    await this.log('kpi_entry', 'reject', { id });
    return { success: true, message: 'KPI 数据已驳回', data };
  }

  async getResults(user: AuthUser) {
    const data = await this.prisma.kpiResult.findMany({
      where: user.role === 'admin' ? {} : { warehouseId: user.warehouseId ?? '' },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data };
  }

  async getMetricScores(id: string, user: AuthUser) {
    const result = await this.prisma.kpiResult.findUnique({ where: { id } });
    if (!result) return { success: false, message: 'KPI结果不存在' };
    this.ensureWarehouseAccess(user, result.warehouseId);

    const data = await this.prisma.kpiMetricScore.findMany({ where: { resultId: id } });
    return { success: true, data };
  }

  async getAnalysis(id: string, user: AuthUser) {
    const result = await this.prisma.kpiResult.findUnique({ where: { id } });
    if (!result) return { success: false, message: 'KPI结果不存在' };
    this.ensureWarehouseAccess(user, result.warehouseId);

    const data = await this.prisma.kpiAnalysis.findMany({ where: { resultId: id } });
    return { success: true, data };
  }

  async getRules(user: AuthUser) {
    const data = await this.prisma.kpiRule.findMany({
      where: user.role === 'admin' ? {} : { warehouseId: user.warehouseId ?? '' },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data };
  }

  async getRuleTemplates() {
    return {
      success: true,
      data: Object.values(this.ruleTemplates).map((item) => ({
        key: item.key,
        name: item.name,
        description: item.description,
        config: item.config,
      })),
    };
  }

  async createRule(input: { warehouseId?: string; ruleName: string; scopeType?: string }, user: AuthUser) {
    const warehouseId = this.resolveWarehouseId(user, input.warehouseId);
    const rule = await this.prisma.kpiRule.create({
      data: {
        warehouseId,
        ruleName: input.ruleName,
        scopeType: input.scopeType ?? 'warehouse',
      },
    });

    const version = await this.prisma.kpiRuleVersion.create({
      data: {
        ruleId: rule.id,
        versionName: 'v1.0',
        effectiveStartAt: new Date(),
        isActive: true,
      },
    });

    await this.prisma.kpiRule.update({ where: { id: rule.id }, data: { currentVersionId: version.id } });
    await this.log('kpi_rule', 'create', { id: rule.id, versionId: version.id });
    return { success: true, message: 'KPI 规则已创建', data: { ...rule, currentVersionId: version.id } };
  }

  async saveRuleConfig(id: string, dto: UpdateKpiRuleConfigDto, user: AuthUser) {
    const rule = await this.prisma.kpiRule.findUnique({ where: { id } });
    if (!rule) return { success: false, message: '规则不存在' };
    this.ensureWarehouseAccess(user, rule.warehouseId);

    const draft = await this.prisma.kpiRuleVersion.create({
      data: {
        ruleId: id,
        versionName: `draft-${Date.now()}`,
        effectiveStartAt: new Date(),
        isActive: false,
        businessCeiling: dto.businessCeiling,
        businessDivisor: dto.businessDivisor,
        errorCeiling: dto.errorCeiling,
        errorPenalty: dto.errorPenalty,
        efficiencyCeiling: dto.efficiencyCeiling,
        efficiencyDivisor: dto.efficiencyDivisor,
        loadCeiling: dto.loadCeiling,
        loadMultiplier: dto.loadMultiplier,
        excellentMin: dto.excellentMin,
        goodMin: dto.goodMin,
        passMin: dto.passMin,
        improveMin: dto.improveMin,
      },
    });

    await this.log('kpi_rule', 'save_config_draft', { id, versionId: draft.id });
    return { success: true, message: '规则配置草稿已保存', data: draft };
  }

  async applyRuleTemplate(id: string, templateKey: string, user: AuthUser) {
    const rule = await this.prisma.kpiRule.findUnique({ where: { id } });
    if (!rule) return { success: false, message: '规则不存在' };
    this.ensureWarehouseAccess(user, rule.warehouseId);

    const template = this.ruleTemplates[templateKey];
    if (!template) return { success: false, message: '模板不存在' };

    const draft = await this.prisma.kpiRuleVersion.create({
      data: {
        ruleId: id,
        versionName: `draft-template-${template.key}-${Date.now()}`,
        effectiveStartAt: new Date(),
        isActive: false,
        ...template.config,
      },
    });
    await this.log('kpi_rule', 'apply_template', { id, versionId: draft.id, templateKey });
    return { success: true, message: `模板 ${template.name} 已应用到草稿`, data: draft };
  }

  async publishRule(id: string, dto: PublishKpiRuleDto, user: AuthUser) {
    const rule = await this.prisma.kpiRule.findUnique({ where: { id } });
    if (!rule) return { success: false, message: '规则不存在' };
    this.ensureWarehouseAccess(user, rule.warehouseId);

    const draft = await this.prisma.kpiRuleVersion.findFirst({
      where: { ruleId: id, isActive: false },
      orderBy: { createdAt: 'desc' },
    });

    const target =
      draft ??
      (await this.prisma.kpiRuleVersion.create({
        data: {
          ruleId: id,
          versionName: dto.versionName,
          effectiveStartAt: new Date(dto.effectiveStartAt),
          isActive: false,
        },
      }));

    await this.prisma.kpiRuleVersion.updateMany({ where: { ruleId: id, isActive: true }, data: { isActive: false } });
    const version = await this.prisma.kpiRuleVersion.update({
      where: { id: target.id },
      data: {
        versionName: dto.versionName,
        effectiveStartAt: new Date(dto.effectiveStartAt),
        isActive: true,
      },
    });

    await this.prisma.kpiRule.update({ where: { id }, data: { currentVersionId: version.id } });
    await this.log('kpi_rule', 'publish', { id, versionId: version.id });
    return { success: true, message: `规则 ${id} 已发布新版本`, data: version };
  }

  async compareRuleVersions(id: string, fromVersionId: string, toVersionId: string, user: AuthUser) {
    const rule = await this.prisma.kpiRule.findUnique({ where: { id } });
    if (!rule) return { success: false, message: '规则不存在' };
    this.ensureWarehouseAccess(user, rule.warehouseId);

    const versions = await this.prisma.kpiRuleVersion.findMany({
      where: {
        ruleId: id,
        id: { in: [fromVersionId, toVersionId] },
      },
    });
    if (versions.length !== 2) {
      return { success: false, message: '对比版本不存在' };
    }

    const from = versions.find((v) => v.id === fromVersionId)!;
    const to = versions.find((v) => v.id === toVersionId)!;
    const keys = [
      'businessCeiling',
      'businessDivisor',
      'errorCeiling',
      'errorPenalty',
      'efficiencyCeiling',
      'efficiencyDivisor',
      'loadCeiling',
      'loadMultiplier',
      'excellentMin',
      'goodMin',
      'passMin',
      'improveMin',
    ] as const;

    const changes = keys
      .map((key) => ({
        key,
        from: Number(from[key]),
        to: Number(to[key]),
      }))
      .filter((item) => item.from !== item.to);

    return {
      success: true,
      data: {
        fromVersionId,
        toVersionId,
        changes,
      },
    };
  }

  async rollbackRuleVersion(id: string, targetVersionId: string, user: AuthUser) {
    const rule = await this.prisma.kpiRule.findUnique({ where: { id } });
    if (!rule) return { success: false, message: '规则不存在' };
    this.ensureWarehouseAccess(user, rule.warehouseId);

    const target = await this.prisma.kpiRuleVersion.findFirst({
      where: {
        id: targetVersionId,
        ruleId: id,
      },
    });
    if (!target) return { success: false, message: '目标版本不存在' };

    await this.prisma.kpiRuleVersion.updateMany({ where: { ruleId: id, isActive: true }, data: { isActive: false } });
    await this.prisma.kpiRuleVersion.update({
      where: { id: target.id },
      data: {
        isActive: true,
      },
    });
    await this.prisma.kpiRule.update({
      where: { id },
      data: {
        currentVersionId: target.id,
      },
    });
    await this.log('kpi_rule', 'rollback', { id, targetVersionId: target.id });
    return { success: true, message: '规则版本已回滚', data: target };
  }

  private async getActiveRuleConfig(warehouseId: string) {
    const rule = await this.prisma.kpiRule.findFirst({
      where: { warehouseId, scopeType: 'warehouse' },
      include: {
        versions: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return rule?.versions[0] ?? null;
  }

  private calculateScore(
    entry: {
      orderCount: number;
      errorCount: number;
      inboundCount: number;
      staffCount: number;
      warehouseArea: unknown;
    },
    config:
      | {
          businessCeiling: unknown;
          businessDivisor: unknown;
          errorCeiling: unknown;
          errorPenalty: unknown;
          efficiencyCeiling: unknown;
          efficiencyDivisor: unknown;
          loadCeiling: unknown;
          loadMultiplier: unknown;
        }
      | null,
  ) {
    const businessCeiling = Number(config?.businessCeiling ?? 35);
    const businessDivisor = Number(config?.businessDivisor ?? 10);
    const errorCeiling = Number(config?.errorCeiling ?? 30);
    const errorPenalty = Number(config?.errorPenalty ?? 1);
    const efficiencyCeiling = Number(config?.efficiencyCeiling ?? 20);
    const efficiencyDivisor = Number(config?.efficiencyDivisor ?? 1);
    const loadCeiling = Number(config?.loadCeiling ?? 15);
    const loadMultiplier = Number(config?.loadMultiplier ?? 10);

    const business = Math.min(entry.orderCount / Math.max(businessDivisor, 0.01), businessCeiling);
    const error = Math.max(errorCeiling - entry.errorCount * errorPenalty, 0);
    const efficiency = Math.min(entry.inboundCount / Math.max(entry.staffCount, 1) / Math.max(efficiencyDivisor, 0.01), efficiencyCeiling);
    const load = Math.min((entry.inboundCount / Math.max(Number(entry.warehouseArea), 1)) * loadMultiplier, loadCeiling);

    return {
      businessCeiling,
      errorCeiling,
      efficiencyCeiling,
      loadCeiling,
      business: Number(business.toFixed(2)),
      error: Number(error.toFixed(2)),
      efficiency: Number(efficiency.toFixed(2)),
      load: Number(load.toFixed(2)),
      total: Number((business + error + efficiency + load).toFixed(2)),
    };
  }

  private mapGrade(
    score: number,
    config:
      | {
          excellentMin: unknown;
          goodMin: unknown;
          passMin: unknown;
          improveMin: unknown;
        }
      | null,
  ) {
    const excellentMin = Number(config?.excellentMin ?? 90);
    const goodMin = Number(config?.goodMin ?? 80);
    const passMin = Number(config?.passMin ?? 70);
    const improveMin = Number(config?.improveMin ?? 60);

    if (score >= excellentMin) return '优秀';
    if (score >= goodMin) return '良好';
    if (score >= passMin) return '合格';
    if (score >= improveMin) return '需改善';
    return '预警';
  }

  private resolveWarehouseId(user: AuthUser, inputWarehouseId?: string | null) {
    if (user.role === 'warehouse') {
      if (!user.warehouseId) throw new ForbiddenException('仓库账号未绑定仓库');
      return user.warehouseId;
    }
    if (!inputWarehouseId) throw new ForbiddenException('管理员操作需指定仓库ID');
    return inputWarehouseId;
  }

  private ensureWarehouseAccess(user: AuthUser, warehouseId: string) {
    if (user.role === 'admin') return;
    if (user.warehouseId !== warehouseId) {
      throw new ForbiddenException('无权限操作其他仓库数据');
    }
  }

  private async log(module: string, action: string, payload: Record<string, unknown>) {
    await this.prisma.operationLog.create({
      data: {
        module,
        action,
        operator: 'system',
        payload: JSON.stringify(payload),
      },
    });
  }
}
