import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/auth/current-user.decorator';
import { PublishFinanceRuleDto } from './dto/publish-finance-rule.dto';
import { ReviewFinanceAdjustmentDto } from './dto/review-finance-adjustment.dto';
import { SaveFinanceAdjustmentDto } from './dto/save-finance-adjustment.dto';
import { SaveExchangeRateDto } from './dto/save-exchange-rate.dto';
import { SaveFinanceRecordDto } from './dto/save-finance-record.dto';
import { SaveProjectDto } from './dto/save-project.dto';
import { UpdateFinanceRuleConfigDto } from './dto/update-finance-rule-config.dto';
import { FINANCE_MODULE_FIELD_CONFIG, type FinanceTargetModule } from './finance-module-data.schema';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(user: AuthUser) {
    const whereWarehouse = this.whereWarehouse(user);
    const records = await this.prisma.financeRecord.findMany({
      where: { ...whereWarehouse, status: 'approved' },
      select: { recordType: true, amount: true, amountCny: true },
    });
    const income = records.filter((r) => r.recordType === 'income').reduce((sum, r) => sum + this.getAmountInCny(r.amount, r.amountCny), 0);
    const expense = records.filter((r) => r.recordType === 'expense').reduce((sum, r) => sum + this.getAmountInCny(r.amount, r.amountCny), 0);
    const purchase = records.filter((r) => r.recordType === 'purchase').reduce((sum, r) => sum + this.getAmountInCny(r.amount, r.amountCny), 0);

    return {
      success: true,
      data: {
        monthlyIncome: income,
        monthlyExpense: expense,
        purchaseCost: purchase,
        netProfit: income - expense - purchase,
      },
    };
  }

  async getAdminDashboard() {
    const [warehouseCount, warnings] = await Promise.all([
      this.prisma.warehouse.count(),
      this.prisma.financeAnalysis.count({ where: { riskLevel: { in: ['medium', 'high'] } } }),
    ]);
    return { success: true, data: { warehouseCount, warnings } };
  }

  async getRecords(type: 'income' | 'expense' | 'purchase', user: AuthUser) {
    const data = await this.prisma.financeRecord.findMany({
      where: { ...this.whereWarehouse(user), recordType: type },
      include: { project: true },
      orderBy: { recordDate: 'desc' },
    });
    return { success: true, data };
  }

  async saveRecord(type: 'income' | 'expense' | 'purchase', dto: SaveFinanceRecordDto, user: AuthUser) {
    const warehouseId = this.resolveWarehouseId(user, dto.warehouseId);
    const currencyCode = this.normalizeCurrencyCode(dto.currencyCode);
    const fxRateToCny = await this.resolveFxRateToCny(currencyCode, dto.fxRateToCny, new Date(dto.recordDate));
    const amountCny = Number((dto.amount * fxRateToCny).toFixed(2));
    const moduleData = this.validateAndNormalizeModuleData(dto.targetModule, dto.moduleData);
    const data = {
      warehouseId,
      recordType: type,
      targetModule: dto.targetModule,
      moduleData,
      category: dto.category,
      amount: dto.amount,
      currencyCode,
      fxRateToCny,
      amountCny,
      recordDate: new Date(dto.recordDate),
      status: 'draft' as const,
      ...(dto.projectId ? { projectId: dto.projectId } : {}),
      ...(dto.counterparty ? { counterparty: dto.counterparty } : {}),
      ...(dto.costNature ? { costNature: dto.costNature } : {}),
      ...(dto.note ? { note: dto.note } : {}),
    };

    const created = await this.prisma.financeRecord.create({ data });
    await this.log('finance_record', 'create_draft', {
      id: created.id,
      recordType: type,
      targetModule: dto.targetModule,
      moduleDataKeys: Object.keys(moduleData),
      warehouseId,
      currencyCode,
      fxRateToCny,
      amountCny,
    });
    return { success: true, message: `${type} 记录已保存为草稿`, data: created };
  }

  async submitRecord(id: string, user: AuthUser) {
    const record = await this.prisma.financeRecord.findUnique({ where: { id } });
    if (!record) {
      return { success: false, message: '记录不存在' };
    }
    this.ensureWarehouseAccess(user, record.warehouseId);

    const updated = await this.prisma.financeRecord.update({
      where: { id },
      data: { status: 'submitted' },
    });
    await this.log('finance_record', 'submit', { id });
    return { success: true, message: '记录已提交审核', data: updated };
  }

  async approveRecord(id: string) {
    const record = await this.prisma.financeRecord.update({ where: { id }, data: { status: 'approved' } });
    await this.log('finance_record', 'approve', { id });
    return { success: true, message: '记录已审核通过', data: record };
  }

  async rejectRecord(id: string) {
    const record = await this.prisma.financeRecord.update({ where: { id }, data: { status: 'rejected' } });
    await this.log('finance_record', 'reject', { id });
    return { success: true, message: '记录已驳回', data: record };
  }

  async getProjects(user: AuthUser) {
    const data = await this.prisma.financeProject.findMany({ where: this.whereWarehouse(user), orderBy: { createdAt: 'desc' } });
    return { success: true, data };
  }

  async saveProject(dto: SaveProjectDto, user: AuthUser) {
    const warehouseId = this.resolveWarehouseId(user, dto.warehouseId);
    const data = await this.prisma.financeProject.create({
      data: {
        warehouseId,
        projectName: dto.projectName,
        ...(dto.projectCode ? { projectCode: dto.projectCode } : {}),
        ...(dto.customerName ? { customerName: dto.customerName } : {}),
        status: dto.status,
      },
    });
    await this.log('finance_project', 'create', { id: data.id });
    return { success: true, message: '项目已创建', data };
  }

  async updateProject(id: string, dto: SaveProjectDto, user: AuthUser) {
    const existing = await this.prisma.financeProject.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, message: '项目不存在' };
    }
    this.ensureWarehouseAccess(user, existing.warehouseId);

    const data = await this.prisma.financeProject.update({
      where: { id },
      data: {
        projectName: dto.projectName,
        ...(dto.projectCode ? { projectCode: dto.projectCode } : {}),
        ...(dto.customerName ? { customerName: dto.customerName } : {}),
        status: dto.status,
      },
    });
    await this.log('finance_project', 'update', { id });
    return { success: true, message: `项目 ${id} 已更新`, data };
  }

  async getProfitSnapshots(user: AuthUser) {
    const data = await this.prisma.profitSnapshot.findMany({
      where: this.whereWarehouse(user),
      include: { project: true },
      orderBy: { periodEndDate: 'desc' },
    });
    return { success: true, data };
  }

  async getProjectProfitBreakdown(user: AuthUser, startAt?: string, endAt?: string) {
    const dateRange =
      startAt || endAt
        ? {
            recordDate: {
              ...(startAt ? { gte: new Date(startAt) } : {}),
              ...(endAt ? { lte: new Date(endAt) } : {}),
            },
          }
        : {};

    const records = await this.prisma.financeRecord.findMany({
      where: {
        ...this.whereWarehouse(user),
        status: 'approved',
        projectId: { not: null },
        ...dateRange,
      },
      include: {
        project: true,
      },
      orderBy: { recordDate: 'desc' },
    });
    const adjustments = await this.prisma.financeAdjustment.findMany({
      where: {
        ...this.whereWarehouse(user),
        status: 'approved',
        ...(startAt || endAt
          ? {
              reviewedAt: {
                ...(startAt ? { gte: new Date(startAt) } : {}),
                ...(endAt ? { lte: new Date(endAt) } : {}),
              },
            }
          : {}),
      },
      include: { project: true },
    });

    const map = new Map<
      string,
      {
        projectId: string;
        projectName: string;
        income: number;
        directExpense: number;
        allocatedExpense: number;
        directPurchase: number;
        allocatedPurchase: number;
        expense: number;
        purchase: number;
        adjustment: number;
        netProfit: number;
      }
    >();

    for (const record of records) {
      if (!record.projectId) continue;
      const key = record.projectId;
      const current = map.get(key) ?? {
        projectId: key,
        projectName: record.project?.projectName ?? '未命名项目',
        income: 0,
        directExpense: 0,
        allocatedExpense: 0,
        directPurchase: 0,
        allocatedPurchase: 0,
        expense: 0,
        purchase: 0,
        adjustment: 0,
        netProfit: 0,
      };

      const amount = this.getAmountInCny(record.amount, record.amountCny);
      if (record.recordType === 'income') current.income += amount;
      if (record.recordType === 'expense') current.directExpense += amount;
      if (record.recordType === 'purchase') current.directPurchase += amount;
      current.expense = Number((current.directExpense + current.allocatedExpense).toFixed(2));
      current.purchase = Number((current.directPurchase + current.allocatedPurchase).toFixed(2));
      current.netProfit = Number((current.income - current.expense - current.purchase + current.adjustment).toFixed(2));
      map.set(key, current);
    }

    const allocationSnapshotWhere =
      startAt || endAt
        ? {
            periodStartDate: {
              ...(startAt ? { gte: new Date(startAt) } : {}),
              ...(endAt ? { lte: new Date(endAt) } : {}),
            },
          }
        : {};
    const warehouseSnapshotWhere = this.whereWarehouse(user);
    const allocationLines = await this.prisma.financeSnapshotAllocationLine.findMany({
      where: {
        snapshot: {
          ...warehouseSnapshotWhere,
          snapshotType: 'warehouse_monthly',
          ...allocationSnapshotWhere,
        },
      },
      include: {
        project: true,
      },
      take: 5000,
    });
    for (const line of allocationLines) {
      if (!line.projectId) continue;
      const key = line.projectId;
      const current = map.get(key) ?? {
        projectId: key,
        projectName: line.project?.projectName ?? '未命名项目',
        income: 0,
        directExpense: 0,
        allocatedExpense: 0,
        directPurchase: 0,
        allocatedPurchase: 0,
        expense: 0,
        purchase: 0,
        adjustment: 0,
        netProfit: 0,
      };
      const allocated = this.getAmountInCny(line.allocatedAmountCny, line.allocatedAmountCny);
      if (line.sourceType === 'expense') current.allocatedExpense += allocated;
      if (line.sourceType === 'purchase') current.allocatedPurchase += allocated;
      current.expense = Number((current.directExpense + current.allocatedExpense).toFixed(2));
      current.purchase = Number((current.directPurchase + current.allocatedPurchase).toFixed(2));
      current.netProfit = Number((current.income - current.expense - current.purchase + current.adjustment).toFixed(2));
      map.set(key, current);
    }

    for (const adjustment of adjustments) {
      const key = adjustment.projectId ?? `unassigned:${adjustment.warehouseId}`;
      const current = map.get(key) ?? {
        projectId: key,
        projectName: adjustment.project?.projectName ?? '未归属项目调整',
        income: 0,
        directExpense: 0,
        allocatedExpense: 0,
        directPurchase: 0,
        allocatedPurchase: 0,
        expense: 0,
        purchase: 0,
        adjustment: 0,
        netProfit: 0,
      };
      const signedAmountRaw = this.getAmountInCny(adjustment.amount, adjustment.amountCny);
      const signedAmount = adjustment.adjustmentType === 'increase' ? signedAmountRaw : -signedAmountRaw;
      current.adjustment += signedAmount;
      current.netProfit = Number((current.income - current.expense - current.purchase + current.adjustment).toFixed(2));
      map.set(key, current);
    }

    const data = Array.from(map.values()).sort((a, b) => b.netProfit - a.netProfit);
    return { success: true, data };
  }

  async getAllocationLines(user: AuthUser, month?: string, warehouseId?: string) {
    const reference = month && /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-01T00:00:00.000Z`) : new Date();
    const periodStartDate = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
    const periodEndDate = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const whereWarehouse = user.role === 'admin' && warehouseId ? { warehouseId } : this.whereWarehouse(user);
    const snapshots = await this.prisma.profitSnapshot.findMany({
      where: {
        ...whereWarehouse,
        snapshotType: 'warehouse_monthly',
        periodStartDate,
      },
      select: {
        id: true,
        warehouseId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: user.role === 'admin' && !warehouseId ? 50 : 1,
    });
    if (snapshots.length === 0) {
      return {
        success: true,
        data: {
          month: periodStartDate.toISOString().slice(0, 7),
          lines: [],
          summary: [],
        },
      };
    }

    const lines = await this.prisma.financeSnapshotAllocationLine.findMany({
      where: { snapshotId: { in: snapshots.map((item) => item.id) } },
      include: {
        project: {
          select: {
            id: true,
            projectName: true,
          },
        },
        snapshot: {
          select: {
            id: true,
            warehouseId: true,
          },
        },
        ruleDetail: {
          select: {
            id: true,
            targetType: true,
            method: true,
            priority: true,
            projectId: true,
            ratioValue: true,
            ruleVersionId: true,
            ruleVersion: {
              select: {
                ruleId: true,
              },
            },
          },
        },
      },
      orderBy: [{ sourceType: 'asc' }, { allocatedAmountCny: 'desc' }, { createdAt: 'desc' }],
      take: 1000,
    });

    const summaryMap = new Map<string, { projectId: string; projectName: string; expenseAllocated: number; purchaseAllocated: number; totalAllocated: number }>();
    for (const line of lines) {
      const projectId = line.projectId ?? 'unassigned';
      const projectName = line.project?.projectName ?? '未归属项目';
      const current = summaryMap.get(projectId) ?? {
        projectId,
        projectName,
        expenseAllocated: 0,
        purchaseAllocated: 0,
        totalAllocated: 0,
      };
      if (line.sourceType === 'expense') current.expenseAllocated += Number(line.allocatedAmountCny);
      if (line.sourceType === 'purchase') current.purchaseAllocated += Number(line.allocatedAmountCny);
      current.totalAllocated += Number(line.allocatedAmountCny);
      summaryMap.set(projectId, current);
    }
    const summary = Array.from(summaryMap.values())
      .map((item) => ({
        ...item,
        expenseAllocated: Number(item.expenseAllocated.toFixed(2)),
        purchaseAllocated: Number(item.purchaseAllocated.toFixed(2)),
        totalAllocated: Number(item.totalAllocated.toFixed(2)),
      }))
      .sort((a, b) => b.totalAllocated - a.totalAllocated);

    return {
      success: true,
      data: {
        month: periodStartDate.toISOString().slice(0, 7),
        lines: lines.map((item) => ({
          id: item.id,
          snapshotId: item.snapshotId,
          warehouseId: item.snapshot.warehouseId,
          projectId: item.projectId,
          projectName: item.project?.projectName ?? '未归属项目',
          sourceType: item.sourceType,
          method: item.method,
          ruleDetailId: item.ruleDetail?.id ?? null,
          ruleVersionId: item.ruleDetail?.ruleVersionId ?? null,
          ruleId: item.ruleDetail?.ruleVersion.ruleId ?? null,
          sourceDetailLabel: item.ruleDetail
            ? `${item.ruleDetail.method} | target=${item.ruleDetail.targetType} | priority=${item.ruleDetail.priority}`
            : 'system_default',
          sourceAmountCny: Number(item.sourceAmountCny),
          allocatedAmountCny: Number(item.allocatedAmountCny),
          ratioApplied: item.ratioApplied === null ? null : Number(item.ratioApplied),
          createdAt: item.createdAt,
        })),
        summary,
      },
    };
  }

  async getAdjustments(user: AuthUser, status?: string) {
    const data = await this.prisma.financeAdjustment.findMany({
      where: {
        ...this.whereWarehouse(user),
        ...(status ? { status } : {}),
      },
      include: {
        project: true,
        requestedBy: {
          select: { id: true, account: true, role: true },
        },
        reviewedBy: {
          select: { id: true, account: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data };
  }

  async createAdjustment(dto: SaveFinanceAdjustmentDto, user: AuthUser) {
    const warehouseId = this.resolveWarehouseId(user, dto.warehouseId);
    const currencyCode = this.normalizeCurrencyCode(dto.currencyCode);
    const fxRateToCny = await this.resolveFxRateToCny(currencyCode, dto.fxRateToCny, new Date());
    const amountCny = Number((dto.amount * fxRateToCny).toFixed(2));
    const data = await this.prisma.financeAdjustment.create({
      data: {
        warehouseId,
        projectId: dto.projectId ?? null,
        adjustmentType: dto.adjustmentType,
        amount: dto.amount,
        currencyCode,
        fxRateToCny,
        amountCny,
        reason: dto.reason,
        status: 'draft',
        requestedByUserId: user.sub,
      },
    });
    await this.log(
      'finance_adjustment',
      'create_draft',
      { id: data.id, warehouseId, projectId: dto.projectId ?? null, currencyCode, fxRateToCny, amountCny },
      user.account,
    );
    return { success: true, message: '调整申请已保存为草稿', data };
  }

  async getExchangeRates(baseCurrency?: string, quoteCurrency?: string, effectiveDate?: string) {
    const where = {
      ...(baseCurrency ? { baseCurrency: this.normalizeCurrencyCode(baseCurrency) } : {}),
      ...(quoteCurrency ? { quoteCurrency: this.normalizeCurrencyCode(quoteCurrency) } : {}),
      ...(effectiveDate ? { effectiveDate: { lte: new Date(effectiveDate) } } : {}),
    };
    const data = await this.prisma.exchangeRate.findMany({
      where,
      orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
    return { success: true, data };
  }

  async saveExchangeRate(dto: SaveExchangeRateDto, user: AuthUser) {
    const baseCurrency = this.normalizeCurrencyCode(dto.baseCurrency);
    const quoteCurrency = this.normalizeCurrencyCode(dto.quoteCurrency ?? 'CNY');
    const effectiveDate = new Date(dto.effectiveDate);
    const data = await this.prisma.exchangeRate.upsert({
      where: {
        baseCurrency_quoteCurrency_effectiveDate: {
          baseCurrency,
          quoteCurrency,
          effectiveDate,
        },
      },
      create: {
        baseCurrency,
        quoteCurrency,
        effectiveDate,
        rateValue: dto.rateValue,
      },
      update: {
        rateValue: dto.rateValue,
      },
    });
    await this.log(
      'exchange_rate',
      'upsert',
      { id: data.id, baseCurrency, quoteCurrency, rateValue: dto.rateValue, effectiveDate: effectiveDate.toISOString(), userId: user.sub },
      user.account,
    );
    return { success: true, message: '汇率已保存', data };
  }

  async submitAdjustment(id: string, user: AuthUser) {
    const adjustment = await this.prisma.financeAdjustment.findUnique({ where: { id } });
    if (!adjustment) return this.fail('调整申请不存在', 'ADJUSTMENT_NOT_FOUND');
    this.ensureWarehouseAccess(user, adjustment.warehouseId);

    const data = await this.prisma.financeAdjustment.update({
      where: { id },
      data: { status: 'submitted', submittedAt: new Date() },
    });
    await this.log('finance_adjustment', 'submit', { id, warehouseId: adjustment.warehouseId }, user.account);
    return { success: true, message: '调整申请已提交审核', data };
  }

  async approveAdjustment(id: string, dto: ReviewFinanceAdjustmentDto, user: AuthUser) {
    const adjustment = await this.prisma.financeAdjustment.findUnique({ where: { id } });
    if (!adjustment) return this.fail('调整申请不存在', 'ADJUSTMENT_NOT_FOUND');

    const data = await this.prisma.financeAdjustment.update({
      where: { id },
      data: {
        status: 'approved',
        reviewNote: dto.reviewNote ?? null,
        reviewedAt: new Date(),
        reviewedByUserId: user.sub,
      },
    });
    await this.log('finance_adjustment', 'approve', { id, warehouseId: adjustment.warehouseId, reviewerId: user.sub }, user.account);
    return { success: true, message: '调整申请已审核通过', data };
  }

  async rejectAdjustment(id: string, dto: ReviewFinanceAdjustmentDto, user: AuthUser) {
    const adjustment = await this.prisma.financeAdjustment.findUnique({ where: { id } });
    if (!adjustment) return this.fail('调整申请不存在', 'ADJUSTMENT_NOT_FOUND');

    const data = await this.prisma.financeAdjustment.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewNote: dto.reviewNote ?? null,
        reviewedAt: new Date(),
        reviewedByUserId: user.sub,
      },
    });
    await this.log('finance_adjustment', 'reject', { id, warehouseId: adjustment.warehouseId, reviewerId: user.sub }, user.account);
    return { success: true, message: '调整申请已驳回', data };
  }

  async recalculateMonthlySnapshots(reference = new Date()) {
    const periodStartDate = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const periodEndDate = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);

    const warehouses = await this.prisma.warehouse.findMany({ where: { status: 'enabled' } });
    let count = 0;

    for (const warehouse of warehouses) {
      const activeRule = await this.getActiveAllocationRuleConfig(warehouse.id);
      const sharedExpenseRate = Number(activeRule?.sharedExpenseRate ?? 1);
      const purchaseCostRate = Number(activeRule?.purchaseCostRate ?? 1);
      const includeAdjustmentsInSnapshot = Boolean(activeRule?.includeAdjustmentsInSnapshot ?? false);

      const records = await this.prisma.financeRecord.findMany({
        where: {
          warehouseId: warehouse.id,
          status: 'approved',
          recordDate: {
            gte: periodStartDate,
            lte: periodEndDate,
          },
        },
      });

      const projectMetrics = new Map<
        string,
        {
          projectId: string;
          income: number;
          directExpense: number;
          directPurchase: number;
          allocatedExpense: number;
          allocatedPurchase: number;
          adjustment: number;
        }
      >();
      const ensureProjectMetric = (projectId: string) => {
        const current = projectMetrics.get(projectId) ?? {
          projectId,
          income: 0,
          directExpense: 0,
          directPurchase: 0,
          allocatedExpense: 0,
          allocatedPurchase: 0,
          adjustment: 0,
        };
        projectMetrics.set(projectId, current);
        return current;
      };

      const expense = records.filter((r) => r.recordType === 'expense').reduce((sum, r) => sum + this.getAmountInCny(r.amount, r.amountCny), 0);
      const purchase = records.filter((r) => r.recordType === 'purchase').reduce((sum, r) => sum + this.getAmountInCny(r.amount, r.amountCny), 0);
      const incomeCny = records.filter((r) => r.recordType === 'income').reduce((sum, r) => sum + this.getAmountInCny(r.amount, r.amountCny), 0);
      const sharedExpensePool = records
        .filter((r) => r.recordType === 'expense' && !r.projectId)
        .reduce((sum, r) => sum + this.getAmountInCny(r.amount, r.amountCny), 0);
      const sharedPurchasePool = records
        .filter((r) => r.recordType === 'purchase' && !r.projectId)
        .reduce((sum, r) => sum + this.getAmountInCny(r.amount, r.amountCny), 0);

      for (const record of records) {
        if (!record.projectId) continue;
        const metric = ensureProjectMetric(record.projectId);
        const amount = this.getAmountInCny(record.amount, record.amountCny);
        if (record.recordType === 'income') metric.income += amount;
        if (record.recordType === 'expense') metric.directExpense += amount;
        if (record.recordType === 'purchase') metric.directPurchase += amount;
      }

      const allocationDetails = activeRule?.details ?? [];
      const expenseAllocation = this.allocateSharedAmount(sharedExpensePool, 'expense', allocationDetails, projectMetrics);
      const purchaseAllocation = this.allocateSharedAmount(sharedPurchasePool, 'purchase', allocationDetails, projectMetrics);
      for (const line of expenseAllocation.lines) {
        const metric = ensureProjectMetric(line.projectId);
        metric.allocatedExpense += line.allocatedAmountCny;
      }
      for (const line of purchaseAllocation.lines) {
        const metric = ensureProjectMetric(line.projectId);
        metric.allocatedPurchase += line.allocatedAmountCny;
      }

      const approvedAdjustments = includeAdjustmentsInSnapshot
        ? await this.prisma.financeAdjustment.findMany({
            where: {
              warehouseId: warehouse.id,
              status: 'approved',
              reviewedAt: {
                gte: periodStartDate,
                lte: periodEndDate,
              },
            },
            select: {
              projectId: true,
              adjustmentType: true,
              amount: true,
              amountCny: true,
            },
          })
        : [];
      const adjustmentAmount = approvedAdjustments.reduce((sum, item) => {
        const amount = this.getAmountInCny(item.amount, item.amountCny);
        return sum + (item.adjustmentType === 'increase' ? amount : -amount);
      }, 0);
      for (const adjustment of approvedAdjustments) {
        if (!adjustment.projectId) continue;
        const metric = ensureProjectMetric(adjustment.projectId);
        const amount = this.getAmountInCny(adjustment.amount, adjustment.amountCny);
        metric.adjustment += adjustment.adjustmentType === 'increase' ? amount : -amount;
      }
      const adjustedExpense = Number((expense * sharedExpenseRate).toFixed(2));
      const adjustedPurchase = Number((purchase * purchaseCostRate).toFixed(2));
      const netProfit = Number((incomeCny - adjustedExpense - adjustedPurchase + adjustmentAmount).toFixed(2));

      const key = `warehouse:${warehouse.id}:${periodStartDate.toISOString().slice(0, 7)}`;
      const snapshot = await this.prisma.profitSnapshot.upsert({
        where: { snapshotKey: key },
        update: {
          totalIncome: incomeCny,
          totalExpense: adjustedExpense,
          totalPurchaseCost: adjustedPurchase,
          netProfit,
          status: 'calculated',
          appliedRuleVersionId: activeRule?.id ?? null,
          appliedSharedExpenseRate: sharedExpenseRate,
          appliedPurchaseCostRate: purchaseCostRate,
          appliedAdjustmentAmount: Number(adjustmentAmount.toFixed(2)),
        },
        create: {
          snapshotKey: key,
          warehouseId: warehouse.id,
          snapshotType: 'warehouse_monthly',
          periodStartDate,
          periodEndDate,
          totalIncome: incomeCny,
          totalExpense: adjustedExpense,
          totalPurchaseCost: adjustedPurchase,
          netProfit,
          status: 'calculated',
          appliedRuleVersionId: activeRule?.id ?? null,
          appliedSharedExpenseRate: sharedExpenseRate,
          appliedPurchaseCostRate: purchaseCostRate,
          appliedAdjustmentAmount: Number(adjustmentAmount.toFixed(2)),
        },
      });

      await this.prisma.financeSnapshotAllocationLine.deleteMany({ where: { snapshotId: snapshot.id } });
      const allocationLines = [...expenseAllocation.lines, ...purchaseAllocation.lines].map((line) => ({
        snapshotId: snapshot.id,
        projectId: line.projectId,
        sourceType: line.sourceType,
        method: line.method,
        sourceAmountCny: line.sourceAmountCny,
        allocatedAmountCny: line.allocatedAmountCny,
        ratioApplied: line.ratioApplied ?? null,
        ruleDetailId: line.ruleDetailId ?? null,
      }));
      if (allocationLines.length > 0) {
        await this.prisma.financeSnapshotAllocationLine.createMany({ data: allocationLines });
      }

      const projectMetricsData = Array.from(projectMetrics.values());
      for (const metric of projectMetricsData) {
        const projectNetProfit = Number(
          (
            metric.income -
            (metric.directExpense + metric.allocatedExpense) -
            (metric.directPurchase + metric.allocatedPurchase) +
            metric.adjustment
          ).toFixed(2),
        );
        const projectKey = `project:${metric.projectId}:${periodStartDate.toISOString().slice(0, 7)}`;
        await this.prisma.profitSnapshot.upsert({
          where: { snapshotKey: projectKey },
          update: {
            totalIncome: Number(metric.income.toFixed(2)),
            totalExpense: Number((metric.directExpense + metric.allocatedExpense).toFixed(2)),
            totalPurchaseCost: Number((metric.directPurchase + metric.allocatedPurchase).toFixed(2)),
            netProfit: projectNetProfit,
            status: 'calculated',
            appliedRuleVersionId: activeRule?.id ?? null,
            appliedSharedExpenseRate: sharedExpenseRate,
            appliedPurchaseCostRate: purchaseCostRate,
            appliedAdjustmentAmount: Number(metric.adjustment.toFixed(2)),
          },
          create: {
            snapshotKey: projectKey,
            warehouseId: warehouse.id,
            projectId: metric.projectId,
            snapshotType: 'project_monthly',
            periodStartDate,
            periodEndDate,
            totalIncome: Number(metric.income.toFixed(2)),
            totalExpense: Number((metric.directExpense + metric.allocatedExpense).toFixed(2)),
            totalPurchaseCost: Number((metric.directPurchase + metric.allocatedPurchase).toFixed(2)),
            netProfit: projectNetProfit,
            status: 'calculated',
            appliedRuleVersionId: activeRule?.id ?? null,
            appliedSharedExpenseRate: sharedExpenseRate,
            appliedPurchaseCostRate: purchaseCostRate,
            appliedAdjustmentAmount: Number(metric.adjustment.toFixed(2)),
          },
        });
      }

      await this.prisma.partnerProfitResult.deleteMany({ where: { snapshotId: snapshot.id } });
      const partners = await this.prisma.partner.findMany({ where: { warehouseId: warehouse.id, status: 'active' } });
      if (partners.length > 0) {
        await this.prisma.partnerProfitResult.createMany({
          data: partners.map((partner) => {
            const ratio = Number(partner.ratio);
            const finalProfit = Number((netProfit * ratio).toFixed(2));
            return {
              snapshotId: snapshot.id,
              partnerId: partner.id,
              baseProfitAmount: netProfit,
              ratioValue: ratio,
              adjustmentAmount: 0,
              finalProfitAmount: finalProfit,
            };
          }),
        });
      }

      await this.prisma.financeAnalysis.create({
        data: {
          warehouseId: warehouse.id,
          analysisType: 'profit_trend',
          content: netProfit < 0 ? '本月净利润为负，请重点检查支出与采购成本。' : '本月净利润为正，建议持续优化采购与差错率。',
          riskLevel: netProfit < 0 ? 'high' : 'low',
        },
      });

      count += 1;
    }

    await this.log('profit_snapshot', 'recalculate_monthly', {
      count,
      period: periodStartDate.toISOString().slice(0, 7),
    });

    return { success: true, message: '利润快照已重新计算', data: { count } };
  }

  async getPartnerProfitResults(user: AuthUser) {
    const data = await this.prisma.partnerProfitResult.findMany({
      where: { snapshot: this.whereWarehouse(user) },
      include: { partner: true, snapshot: true },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data };
  }

  async getAnalysis(user: AuthUser) {
    const data = await this.prisma.financeAnalysis.findMany({
      where: user.role === 'admin' ? {} : { warehouseId: user.warehouseId ?? '' },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data };
  }

  async getAllocationRules(user: AuthUser) {
    const data = await this.prisma.financeAllocationRule.findMany({
      where: user.role === 'admin' ? {} : { warehouseId: user.warehouseId ?? '' },
      include: {
        versions: {
          include: {
            details: {
              orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data };
  }

  async createAllocationRule(input: { warehouseId?: string; ruleName: string; scopeType?: string }, user: AuthUser) {
    const warehouseId = this.resolveWarehouseId(user, input.warehouseId);
    const rule = await this.prisma.financeAllocationRule.create({
      data: {
        warehouseId,
        ruleName: input.ruleName,
        scopeType: input.scopeType ?? 'warehouse',
      },
    });

    const version = await this.prisma.financeAllocationRuleVersion.create({
      data: {
        ruleId: rule.id,
        versionName: 'v1.0',
        effectiveStartAt: new Date(),
        isActive: true,
      },
    });

    await this.prisma.financeAllocationRule.update({
      where: { id: rule.id },
      data: { currentVersionId: version.id },
    });
    await this.log(
      'finance_rule',
      'create',
      {
        ruleId: rule.id,
        warehouseId,
        versionId: version.id,
        versionName: version.versionName,
        userId: user.sub,
        userRole: user.role,
      },
      user.account,
    );
    return { success: true, message: '财务分摊规则已创建', data: { ...rule, currentVersionId: version.id } };
  }

  async saveAllocationRuleConfig(id: string, dto: UpdateFinanceRuleConfigDto, user: AuthUser) {
    const rule = await this.prisma.financeAllocationRule.findUnique({ where: { id } });
    if (!rule) return this.fail('规则不存在', 'RULE_NOT_FOUND');
    this.ensureWarehouseAccess(user, rule.warehouseId);

    const draft = await this.prisma.financeAllocationRuleVersion.create({
      data: {
        ruleId: id,
        versionName: `draft-${Date.now()}`,
        effectiveStartAt: new Date(),
        isActive: false,
        sharedExpenseRate: dto.sharedExpenseRate,
        purchaseCostRate: dto.purchaseCostRate,
        includeAdjustmentsInSnapshot: dto.includeAdjustmentsInSnapshot ?? false,
      },
    });
    if (dto.allocationDetails && dto.allocationDetails.length > 0) {
      await this.prisma.financeAllocationRuleDetail.createMany({
        data: dto.allocationDetails.map((item, index) => ({
          ruleVersionId: draft.id,
          targetType: item.targetType,
          method: item.method,
          projectId: item.projectId ?? null,
          ratioValue: item.ratioValue ?? null,
          priority: item.priority ?? index + 1,
          isEnabled: item.isEnabled ?? true,
        })),
      });
    }
    await this.log(
      'finance_rule',
      'save_config_draft',
      {
        ruleId: id,
        warehouseId: rule.warehouseId,
        versionId: draft.id,
        versionName: draft.versionName,
        sharedExpenseRate: dto.sharedExpenseRate,
        purchaseCostRate: dto.purchaseCostRate,
        includeAdjustmentsInSnapshot: dto.includeAdjustmentsInSnapshot ?? false,
        allocationDetailCount: dto.allocationDetails?.length ?? 0,
        userId: user.sub,
        userRole: user.role,
      },
      user.account,
    );
    return { success: true, message: '财务规则草稿已保存', data: draft };
  }

  async publishAllocationRule(id: string, dto: PublishFinanceRuleDto, user: AuthUser) {
    const rule = await this.prisma.financeAllocationRule.findUnique({ where: { id } });
    if (!rule) return this.fail('规则不存在', 'RULE_NOT_FOUND');
    this.ensureWarehouseAccess(user, rule.warehouseId);

    const duplicated = await this.prisma.financeAllocationRuleVersion.findFirst({
      where: {
        ruleId: id,
        versionName: dto.versionName,
      },
    });
    if (duplicated) {
      return this.fail('版本号已存在，请更换后重试', 'DUPLICATE_VERSION_NAME');
    }

    const draft = await this.prisma.financeAllocationRuleVersion.findFirst({
      where: { ruleId: id, isActive: false },
      orderBy: { createdAt: 'desc' },
    });
    const target =
      draft ??
      (await this.prisma.financeAllocationRuleVersion.create({
        data: {
          ruleId: id,
          versionName: dto.versionName,
          effectiveStartAt: new Date(dto.effectiveStartAt),
          isActive: false,
        },
      }));

    await this.prisma.financeAllocationRuleVersion.updateMany({
      where: { ruleId: id, isActive: true },
      data: { isActive: false },
    });
    const version = await this.prisma.financeAllocationRuleVersion.update({
      where: { id: target.id },
      data: {
        versionName: dto.versionName,
        effectiveStartAt: new Date(dto.effectiveStartAt),
        isActive: true,
      },
    });
    await this.prisma.financeAllocationRule.update({
      where: { id },
      data: { currentVersionId: version.id },
    });
    await this.log(
      'finance_rule',
      'publish',
      {
        ruleId: id,
        warehouseId: rule.warehouseId,
        versionId: version.id,
        versionName: version.versionName,
        effectiveStartAt: version.effectiveStartAt.toISOString(),
        userId: user.sub,
        userRole: user.role,
      },
      user.account,
    );
    return { success: true, message: '财务规则已发布', data: version };
  }

  async compareAllocationRuleVersions(id: string, fromVersionId: string, toVersionId: string, user: AuthUser) {
    const rule = await this.prisma.financeAllocationRule.findUnique({ where: { id } });
    if (!rule) return this.fail('规则不存在', 'RULE_NOT_FOUND');
    this.ensureWarehouseAccess(user, rule.warehouseId);

    const versions = await this.prisma.financeAllocationRuleVersion.findMany({
      where: {
        ruleId: id,
        id: { in: [fromVersionId, toVersionId] },
      },
      include: {
        details: true,
      },
    });
    if (versions.length !== 2) return this.fail('对比版本不存在', 'VERSION_NOT_FOUND');

    const from = versions.find((v) => v.id === fromVersionId)!;
    const to = versions.find((v) => v.id === toVersionId)!;
    const fields = ['sharedExpenseRate', 'purchaseCostRate', 'includeAdjustmentsInSnapshot'] as const;
    const changes: Array<{ key: string; from: number; to: number }> = fields
      .map((key) => ({
        key,
        from: Number(from[key]),
        to: Number(to[key]),
      }))
      .filter((item) => item.from !== item.to);

    const detailSummary = (items: Array<{ targetType: string; method: string; projectId: string | null; ratioValue: unknown; isEnabled: boolean }>) =>
      items
        .filter((item) => item.isEnabled)
        .map((item) => `${item.targetType}:${item.method}:${item.projectId ?? 'none'}:${Number(item.ratioValue ?? 0)}`)
        .sort();
    const fromDetails = detailSummary(from.details);
    const toDetails = detailSummary(to.details);
    const detailChanged = JSON.stringify(fromDetails) !== JSON.stringify(toDetails);
    if (detailChanged) {
      changes.push({
        key: 'allocationDetails',
        from: from.details.length,
        to: to.details.length,
      });
    }

    return { success: true, data: { fromVersionId, toVersionId, changes } };
  }

  async rollbackAllocationRuleVersion(id: string, targetVersionId: string, user: AuthUser) {
    const rule = await this.prisma.financeAllocationRule.findUnique({ where: { id } });
    if (!rule) return this.fail('规则不存在', 'RULE_NOT_FOUND');
    this.ensureWarehouseAccess(user, rule.warehouseId);

    const target = await this.prisma.financeAllocationRuleVersion.findFirst({
      where: {
        id: targetVersionId,
        ruleId: id,
      },
    });
    if (!target) return this.fail('目标版本不存在', 'VERSION_NOT_FOUND');

    await this.prisma.financeAllocationRuleVersion.updateMany({
      where: { ruleId: id, isActive: true },
      data: { isActive: false },
    });
    await this.prisma.financeAllocationRuleVersion.update({
      where: { id: target.id },
      data: { isActive: true },
    });
    await this.prisma.financeAllocationRule.update({
      where: { id },
      data: { currentVersionId: target.id },
    });
    await this.log(
      'finance_rule',
      'rollback',
      {
        ruleId: id,
        warehouseId: rule.warehouseId,
        targetVersionId: target.id,
        targetVersionName: target.versionName,
        userId: user.sub,
        userRole: user.role,
      },
      user.account,
    );
    return { success: true, message: '财务规则版本已回滚', data: target };
  }

  private whereWarehouse(user: AuthUser) {
    if (user.role === 'admin') return {};
    return { warehouseId: user.warehouseId ?? '' };
  }

  private async getActiveAllocationRuleConfig(warehouseId: string) {
    const rule = await this.prisma.financeAllocationRule.findFirst({
      where: {
        warehouseId,
        scopeType: 'warehouse',
      },
      include: {
        versions: {
          where: { isActive: true },
          include: {
            details: {
              where: { isEnabled: true },
              orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    return rule?.versions[0] ?? null;
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

  private fail(message: string, code: string) {
    return { success: false, message, code };
  }

  private allocateSharedAmount(
    sourceAmountCny: number,
    sourceType: 'expense' | 'purchase',
    details: Array<{
      id: string;
      targetType: string;
      method: string;
      projectId: string | null;
      ratioValue: unknown;
      priority: number;
      isEnabled: boolean;
    }>,
    projectMetrics: Map<string, { projectId: string; income: number }>,
  ): {
    lines: Array<{
      projectId: string;
      sourceType: string;
      method: string;
      sourceAmountCny: number;
      allocatedAmountCny: number;
      ratioApplied?: number;
      ruleDetailId?: string;
    }>;
  } {
    if (sourceAmountCny <= 0) return { lines: [] };
    const targetDetails = details
      .filter((item) => item.isEnabled && item.targetType === sourceType)
      .sort((a, b) => a.priority - b.priority);
    if (targetDetails.length === 0) return { lines: [] };

    let remaining = sourceAmountCny;
    const lines: Array<{
      projectId: string;
      sourceType: string;
      method: string;
      sourceAmountCny: number;
      allocatedAmountCny: number;
      ratioApplied?: number;
      ruleDetailId?: string;
    }> = [];

    const fixedDetails = targetDetails.filter((item) => item.method === 'fixed_ratio' && item.projectId);
    for (const detail of fixedDetails) {
      if (remaining <= 0) break;
      const ratio = Number(detail.ratioValue ?? 0);
      if (ratio <= 0) continue;
      const amount = Number((sourceAmountCny * ratio).toFixed(2));
      const allocated = Math.min(remaining, amount);
      if (allocated <= 0 || !detail.projectId) continue;
      lines.push({
        projectId: detail.projectId,
        sourceType,
        method: detail.method,
        sourceAmountCny,
        allocatedAmountCny: allocated,
        ratioApplied: ratio,
        ruleDetailId: detail.id,
      });
      remaining = Number((remaining - allocated).toFixed(2));
    }

    const incomeProportionDetail = targetDetails.find((item) => item.method === 'income_proportion');
    if (incomeProportionDetail && remaining > 0) {
      const incomes = Array.from(projectMetrics.values()).filter((item) => item.income > 0);
      const totalIncome = incomes.reduce((sum, item) => sum + Number(item.income), 0);
      if (totalIncome > 0) {
        for (const item of incomes) {
          const ratio = Number((item.income / totalIncome).toFixed(6));
          const allocated = Number((remaining * ratio).toFixed(2));
          if (allocated <= 0) continue;
          lines.push({
            projectId: item.projectId,
            sourceType,
            method: incomeProportionDetail.method,
            sourceAmountCny,
            allocatedAmountCny: allocated,
            ratioApplied: ratio,
            ruleDetailId: incomeProportionDetail.id,
          });
        }
      }
    }

    return { lines };
  }

  private normalizeCurrencyCode(input?: string | null) {
    return (input ?? 'CNY').trim().toUpperCase();
  }

  private validateAndNormalizeModuleData(targetModule: FinanceTargetModule, rawData?: Record<string, unknown>) {
    const fields = FINANCE_MODULE_FIELD_CONFIG[targetModule] ?? [];
    const data = rawData ?? {};
    const normalized: Record<string, string | number> = {};

    for (const field of fields) {
      const rawValue = data[field.key];
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        if (field.required) {
          throw new BadRequestException(`目标模块 ${targetModule} 缺少必填字段：${field.key}`);
        }
        continue;
      }

      if (field.type === 'number') {
        const asNumber = Number(rawValue);
        if (!Number.isFinite(asNumber)) {
          throw new BadRequestException(`目标模块 ${targetModule} 字段 ${field.key} 必须为数字`);
        }
        normalized[field.key] = asNumber;
        continue;
      }

      const asText = String(rawValue).trim();
      if (!asText && field.required) {
        throw new BadRequestException(`目标模块 ${targetModule} 字段 ${field.key} 不能为空`);
      }
      if (asText) {
        normalized[field.key] = asText;
      }
    }

    return normalized as Prisma.InputJsonValue;
  }

  private getAmountInCny(amount: unknown, amountCny?: unknown) {
    if (amountCny !== null && amountCny !== undefined) return Number(amountCny);
    return Number(amount ?? 0);
  }

  private async resolveFxRateToCny(currencyCode: string, inputFxRate: number | undefined, referenceDate: Date) {
    if (currencyCode === 'CNY') return 1;
    if (inputFxRate && inputFxRate > 0) return inputFxRate;

    const latestRate = await this.prisma.exchangeRate.findFirst({
      where: {
        baseCurrency: currencyCode,
        quoteCurrency: 'CNY',
        effectiveDate: { lte: referenceDate },
      },
      orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
    });
    if (!latestRate) {
      throw new ForbiddenException(`缺少币种 ${currencyCode} 到 CNY 的汇率，请先在管理端维护汇率`);
    }
    return Number(latestRate.rateValue);
  }

  private async log(module: string, action: string, payload: Record<string, unknown>, operator = 'system') {
    await this.prisma.operationLog.create({
      data: {
        module,
        action,
        operator,
        payload: JSON.stringify(payload),
      },
    });
  }
}
