import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // 利润表生成
  async generateProfitLoss(warehouseId: string, month: string) {
    // 1. 主营业务收入
    const revenues = await this.prisma.serviceRevenue.findMany({
      where: {
        serviceMonth: month,
        customer: { warehouseId },
      },
    });

    const revenueByType: Record<string, number> = {};
    let totalRevenue = 0;
    for (const r of revenues) {
      const amount = Number(r.amountThb);
      revenueByType[r.serviceType] = (revenueByType[r.serviceType] ?? 0) + amount;
      totalRevenue += amount;
    }

    // 2. 耗材成本
    const consumableItems = await this.prisma.consumableItem.findMany({
      where: { warehouseId },
    });
    const itemIds = consumableItems.map((i) => i.id);

    const outboundTransactions = itemIds.length > 0
      ? await this.prisma.consumableTransaction.findMany({
          where: { itemId: { in: itemIds }, month, type: 'outbound' },
        })
      : [];

    const totalCost = outboundTransactions.reduce(
      (sum, t) => sum + Number(t.totalAmount ?? 0),
      0,
    );

    // 3. 固定资产费用
    const assets = await this.prisma.fixedAsset.findMany({
      where: { warehouseId },
    });

    let totalFixedAsset = 0;
    for (const asset of assets) {
      if (!asset.purchaseDate) continue;
      const purchaseMonth = `${asset.purchaseDate.getFullYear()}-${String(asset.purchaseDate.getMonth() + 1).padStart(2, '0')}`;
      if (asset.depreciationMethod === 'immediate' && purchaseMonth === month) {
        totalFixedAsset += Number(asset.purchaseAmount);
      } else if (asset.depreciationMethod === 'monthly' && asset.monthlyDepreciation) {
        totalFixedAsset += Number(asset.monthlyDepreciation);
      }
    }

    // 4. 期间费用（从银行账户流水按科目汇总）
    const bankTransactions = await this.prisma.bankAccountTransaction.findMany({
      where: {
        month,
        bankAccount: { warehouseId },
        categoryId: { not: null },
      },
      include: { category: true },
    });

    const expenseByCategory: Record<string, { name: string; amount: number }> = {};
    let totalExpense = 0;

    for (const t of bankTransactions) {
      if (!t.category) continue;
      const catId = t.categoryId!;
      if (!expenseByCategory[catId]) {
        expenseByCategory[catId] = { name: t.category.name, amount: 0 };
      }
      const rate = await this.getExchangeRate('CNY', 'THB', t.transactionDate.toISOString());
      const amount = Number(t.expenseThb) + Number(t.expenseCny) * rate;
      expenseByCategory[catId].amount += amount;
      totalExpense += amount;
    }

    // 计算利润
    const operatingProfit = totalRevenue - totalCost - totalFixedAsset - totalExpense;
    const netProfit = operatingProfit;

    // 保存快照
    const snapshot = await this.prisma.monthlyProfitLoss.upsert({
      where: { warehouseId_month: { warehouseId, month } },
      create: {
        warehouseId,
        month,
        totalRevenue,
        totalCost,
        totalFixedAsset,
        totalExpense,
        operatingProfit,
        netProfit,
        revenueDetails: revenueByType,
        expenseDetails: expenseByCategory,
      },
      update: {
        totalRevenue,
        totalCost,
        totalFixedAsset,
        totalExpense,
        operatingProfit,
        netProfit,
        revenueDetails: revenueByType,
        expenseDetails: expenseByCategory,
      },
    });

    return {
      success: true,
      data: {
        month,
        totalRevenue,
        revenueByType,
        totalCost,
        totalFixedAsset,
        totalExpense,
        expenseByCategory,
        operatingProfit,
        netProfit,
      },
    };
  }

  // 资产负债表生成
  async generateBalanceSheet(warehouseId: string, month: string) {
    // 1. 货币资金 - 各银行账户余额
    const bankAccounts = await this.prisma.bankAccount.findMany({
      where: { warehouseId },
      include: {
        transactions: {
          where: { month: { lte: month } },
          orderBy: { transactionDate: 'desc' },
          take: 1,
        },
      },
    });

    let cashAndBank = 0;
    for (const acc of bankAccounts) {
      const latest = acc.transactions[0];
      if (latest) {
        cashAndBank += Number(latest.balanceAfterThb ?? 0);
      }
    }

    // 2. 其他应收款（押金等）- 暂时写死
    const otherReceivables = 2000; // 宿舍押金

    // 3. 存货（耗材库存金额）
    const consumableItems = await this.prisma.consumableItem.findMany({
      where: { warehouseId },
    });
    const itemIds = consumableItems.map((i) => i.id);

    let inventoryValue = 0;
    for (const itemId of itemIds) {
      const latest = await this.prisma.consumableTransaction.findFirst({
        where: { itemId, month: { lte: month } },
        orderBy: { transactionDate: 'desc' },
      });
      inventoryValue += Number(latest?.balanceValue ?? 0);
    }

    const currentAssets = cashAndBank + otherReceivables + inventoryValue;

    // 4. 固定资产
    const assets = await this.prisma.fixedAsset.findMany({ where: { warehouseId } });
    let fixedAssetsCost = 0;
    let accumulatedDep = 0;

    for (const asset of assets) {
      fixedAssetsCost += Number(asset.purchaseAmount);
      if (asset.depreciationMethod === 'immediate') {
        accumulatedDep += Number(asset.purchaseAmount);
      } else if (asset.depreciationMethod === 'monthly' && asset.monthlyDepreciation && asset.purchaseDate) {
        // 计算到该月的累计折旧
        const purchaseMonth = `${asset.purchaseDate.getFullYear()}-${String(asset.purchaseDate.getMonth() + 1).padStart(2, '0')}`;
        if (month >= purchaseMonth) {
          const months = this.monthDiff(purchaseMonth, month) + 1;
          const maxDep = Number(asset.purchaseAmount);
          accumulatedDep += Math.min(Number(asset.monthlyDepreciation) * months, maxDep);
        }
      }
    }

    const fixedAssetsNet = fixedAssetsCost - accumulatedDep;
    const totalAssets = currentAssets + fixedAssetsNet;

    // 5. 预收账款（客户充值余额）
    const customers = await this.prisma.customer.findMany({
      where: { warehouseId, status: 'active' },
    });

    let advanceReceived = 0;
    for (const customer of customers) {
      const latestRecharge = await this.prisma.rechargeTransaction.findFirst({
        where: { customerId: customer.id },
        orderBy: { transactionDate: 'desc' },
      });
      if (latestRecharge) {
        advanceReceived += Number(latestRecharge.balanceAfterThb ?? 0);
      }
    }

    const totalLiabilities = advanceReceived;

    // 6. 所有者权益
    // 实收资本 = 科目类别为 'equity' 的银行账户累计收入
    const capitalAccounts = await this.prisma.chartOfAccounts.findMany({
      where: { category: 'equity', isLeaf: true },
    });
    const capitalAccountIds = capitalAccounts.map((a) => a.id);

    let paidInCapital = 0;
    if (capitalAccountIds.length > 0) {
      const capitalTransactions = await this.prisma.bankAccountTransaction.findMany({
        where: {
          bankAccount: { warehouseId },
          categoryId: { in: capitalAccountIds },
        },
      });
      for (const t of capitalTransactions) {
        const rate = await this.getExchangeRate('CNY', 'THB', t.transactionDate.toISOString());
        paidInCapital += Number(t.incomeThb) + Number(t.incomeCny) * rate;
      }
    }

    // 累计净利润
    const profitSnapshots = await this.prisma.monthlyProfitLoss.findMany({
      where: { warehouseId, month: { lte: month } },
    });
    const retainedEarnings = profitSnapshots.reduce(
      (sum, s) => sum + Number(s.netProfit),
      0,
    );

    const totalEquity = paidInCapital + retainedEarnings;
    const totalLiabAndEquity = totalLiabilities + totalEquity;
    const isBalanced = Math.abs(totalAssets - totalLiabAndEquity) < 0.01;

    // 保存快照
    const snapshot = await this.prisma.monthlyBalanceSheet.upsert({
      where: { warehouseId_month: { warehouseId, month } },
      create: {
        warehouseId,
        month,
        cashAndBank,
        otherReceivables,
        inventory: inventoryValue,
        currentAssets,
        fixedAssetsCost,
        accumulatedDep,
        fixedAssetsNet,
        totalAssets,
        advanceReceived,
        totalLiabilities,
        paidInCapital,
        retainedEarnings,
        totalEquity,
        totalLiabAndEquity,
        isBalanced,
      },
      update: {
        cashAndBank,
        otherReceivables,
        inventory: inventoryValue,
        currentAssets,
        fixedAssetsCost,
        accumulatedDep,
        fixedAssetsNet,
        totalAssets,
        advanceReceived,
        totalLiabilities,
        paidInCapital,
        retainedEarnings,
        totalEquity,
        totalLiabAndEquity,
        isBalanced,
      },
    });

    return {
      success: true,
      data: {
        month,
        assets: { cashAndBank, otherReceivables, inventory: inventoryValue, currentAssets, fixedAssetsCost, accumulatedDep, fixedAssetsNet, totalAssets },
        liabilities: { advanceReceived, totalLiabilities },
        equity: { paidInCapital, retainedEarnings, totalEquity },
        totalLiabAndEquity,
        isBalanced,
      },
    };
  }

  // 勾稽校验
  async runReconciliationChecks(warehouseId: string, month: string) {
    const checks: Array<{
      checkType: string;
      checkName: string;
      expectedValue: number;
      actualValue: number;
      difference: number;
      isPassed: boolean;
      details: string;
    }> = [];

    // 校验1：充值明细账单扣款合计 = 主营业务收入合计
    const revenues = await this.prisma.serviceRevenue.findMany({
      where: { serviceMonth: month, customer: { warehouseId } },
    });
    const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amountThb), 0);

    const billingTransactions = await this.prisma.rechargeTransaction.findMany({
      where: {
        type: 'billing',
        transactionDate: {
          gte: new Date(`${month}-01`),
          lt: new Date(`${month}-31`),
        },
        customer: { warehouseId },
      },
    });
    let totalBilling = 0;
    for (const t of billingTransactions) {
      const rate = await this.getExchangeRate('CNY', 'THB', t.transactionDate.toISOString());
      totalBilling += Number(t.amountThb) + Number(t.amountCny) * rate;
    }

    checks.push({
      checkType: 'revenue_billing_match',
      checkName: '充值明细账单扣款 = 主营业务收入',
      expectedValue: totalRevenue,
      actualValue: totalBilling,
      difference: Math.abs(totalRevenue - totalBilling),
      isPassed: Math.abs(totalRevenue - totalBilling) < 0.01,
      details: `收入: ${totalRevenue}, 扣款: ${totalBilling}`,
    });

    // 校验2：利润表各月收入 = 主营业务收入表各月小计
    const plSnapshot = await this.prisma.monthlyProfitLoss.findFirst({
      where: { warehouseId, month },
    });

    checks.push({
      checkType: 'pl_revenue_match',
      checkName: '利润表收入 = 主营业务收入表小计',
      expectedValue: totalRevenue,
      actualValue: Number(plSnapshot?.totalRevenue ?? 0),
      difference: Math.abs(totalRevenue - Number(plSnapshot?.totalRevenue ?? 0)),
      isPassed: Math.abs(totalRevenue - Number(plSnapshot?.totalRevenue ?? 0)) < 0.01,
      details: `收入表: ${totalRevenue}, 利润表: ${plSnapshot?.totalRevenue ?? 0}`,
    });

    // 校验3：资产 = 负债 + 权益
    const bsSnapshot = await this.prisma.monthlyBalanceSheet.findFirst({
      where: { warehouseId, month },
    });

    if (bsSnapshot) {
      checks.push({
        checkType: 'balance_sheet_check',
        checkName: '资产 = 负债 + 权益',
        expectedValue: Number(bsSnapshot.totalAssets),
        actualValue: Number(bsSnapshot.totalLiabAndEquity),
        difference: Math.abs(Number(bsSnapshot.totalAssets) - Number(bsSnapshot.totalLiabAndEquity)),
        isPassed: bsSnapshot.isBalanced,
        details: `资产: ${bsSnapshot.totalAssets}, 负债+权益: ${bsSnapshot.totalLiabAndEquity}`,
      });
    }

    // 保存校验记录
    for (const check of checks) {
      await this.prisma.reconciliationCheck.create({
        data: {
          warehouseId,
          month,
          checkType: check.checkType,
          checkName: check.checkName,
          expectedValue: check.expectedValue,
          actualValue: check.actualValue,
          difference: check.difference,
          isPassed: check.isPassed,
          details: check.details,
        },
      });
    }

    const allPassed = checks.every((c) => c.isPassed);

    return {
      success: true,
      data: {
        month,
        allPassed,
        checks,
      },
    };
  }

  // 资金账户汇总
  async getFundSummary(warehouseId: string, month?: string) {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { warehouseId },
      include: {
        transactions: month
          ? { where: { month }, orderBy: { transactionDate: 'desc' } }
          : { orderBy: { transactionDate: 'desc' }, take: 1 },
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let totalBalance = 0;

    const accountDetails = accounts.map((acc) => {
      const latest = acc.transactions[0];
      const balance = Number(latest?.balanceAfterThb ?? 0);
      totalBalance += balance;
      return {
        id: acc.id,
        name: acc.accountName,
        type: acc.accountType,
        balanceThb: balance,
      };
    });

    return {
      success: true,
      data: {
        accounts: accountDetails,
        totalBalance,
      },
    };
  }

  private async getExchangeRate(
    baseCurrency: string,
    quoteCurrency: string,
    date: string,
  ): Promise<number> {
    const effectiveDate = new Date(date);
    const rate = await this.prisma.exchangeRate.findFirst({
      where: {
        baseCurrency,
        quoteCurrency,
        effectiveDate: { lte: effectiveDate },
      },
      orderBy: { effectiveDate: 'desc' },
    });
    return rate ? Number(rate.rateValue) : 4.5;
  }

  // 触发自动扣费
  async triggerAutoBilling(warehouseId: string, month: string) {
    const customers = await this.prisma.customer.findMany({
      where: { warehouseId, status: 'active' },
    });

    const results: Array<{
      customerId: string;
      customerName: string;
      billed: number;
      success: boolean;
      message: string;
    }> = [];

    for (const customer of customers) {
      // 获取该客户当月服务收入
      const revenues = await this.prisma.serviceRevenue.findMany({
        where: {
          customerId: customer.id,
          serviceMonth: month,
          status: 'confirmed',
        },
      });

      if (revenues.length === 0) {
        results.push({
          customerId: customer.id,
          customerName: customer.customerName,
          billed: 0,
          success: false,
          message: '当月无服务收入',
        });
        continue;
      }

      const totalThb = revenues.reduce((sum, r) => sum + Number(r.amountThb), 0);

      // 获取当前余额
      const latest = await this.prisma.rechargeTransaction.findFirst({
        where: { customerId: customer.id },
        orderBy: { transactionDate: 'desc' },
      });

      const currentThb = Number(latest?.balanceAfterThb ?? 0);
      const currentCny = Number(latest?.balanceAfterCny ?? 0);
      const rate = Number(customer.exchangeRate ?? 4.5);

      const newBalanceThb = Number((currentThb - totalThb).toFixed(2));
      const newBalanceCny = Number(
        (currentCny - Number((totalThb / rate).toFixed(2))).toFixed(2),
      );

      const services = revenues.map((r) => r.serviceType).join('、');
      await this.prisma.rechargeTransaction.create({
        data: {
          customerId: customer.id,
          transactionDate: new Date(`${month}-28`),
          type: 'billing',
          currency: 'THB',
          amountThb: totalThb,
          amountCny: Number((totalThb / rate).toFixed(2)),
          exchangeRate: rate,
          balanceAfterThb: newBalanceThb,
          balanceAfterCny: newBalanceCny,
          remark: `${month} 服务扣费：${services}`,
        },
      });

      results.push({
        customerId: customer.id,
        customerName: customer.customerName,
        billed: totalThb,
        success: true,
        message: `已扣费 ${totalThb} THB`,
      });
    }

    return {
      success: true,
      data: { month, results },
    };
  }

  private monthDiff(startMonth: string, endMonth: string): number {
    const [sy, sm] = startMonth.split('-').map(Number);
    const [ey, em] = endMonth.split('-').map(Number);
    return (ey - sy) * 12 + (em - sm);
  }

  // 经营利润分析（环比分析）
  async getBusinessProfitAnalysis(warehouseId: string, month?: string) {
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
    }

    // 当前月
    const currentPL = await this.generateProfitLoss(warehouseId, month);

    // 上月
    const [y, m] = month.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    let prevPL;
    try {
      prevPL = await this.prisma.monthlyProfitLoss.findFirst({
        where: { warehouseId, month: prevMonth },
      });
    } catch {
      prevPL = null;
    }

    const analysis: Array<{
      item: string;
      currentAmount: number;
      prevAmount: number;
      changeAmount: number;
      changeRate: string;
    }> = [];

    const items = [
      { key: 'totalRevenue', name: '主营业务收入' },
      { key: 'totalCost', name: '主营业务成本-耗材成本' },
      { key: 'totalFixedAsset', name: '固定资产' },
      { key: 'totalExpense', name: '期间费用合计' },
      { key: 'operatingProfit', name: '营业利润' },
      { key: 'netProfit', name: '净利润' },
    ];

    for (const item of items) {
      const currentAmount = (currentPL.data as any)[item.key] ?? 0;
      const prevAmount = prevPL ? Number((prevPL as any)[item.key] ?? 0) : 0;
      const changeAmount = currentAmount - prevAmount;

      let changeRate = '无可比';
      if (prevAmount !== 0) {
        changeRate = ((changeAmount / prevAmount) * 100).toFixed(2) + '%';
      } else if (changeAmount > 0) {
        changeRate = '新增';
      }

      analysis.push({
        item: item.name,
        currentAmount,
        prevAmount,
        changeAmount,
        changeRate,
      });
    }

    return {
      success: true,
      data: {
        currentMonth: month,
        prevMonth,
        analysis,
      },
    };
  }

  // 应收应付汇总
  async getARAPSummary(warehouseId: string) {
    // AR: 客户预存款余额
    const customers = await this.prisma.customer.findMany({
      where: { warehouseId, status: 'active' },
    });

    const receivables: Array<{
      customerId: string;
      customerName: string;
      balanceThb: number;
      balanceCny: number;
      type: string;
    }> = [];

    for (const customer of customers) {
      const latest = await this.prisma.rechargeTransaction.findFirst({
        where: { customerId: customer.id },
        orderBy: { transactionDate: 'desc' },
      });
      const balanceThb = Number(latest?.balanceAfterThb ?? 0);
      const balanceCny = Number(latest?.balanceAfterCny ?? 0);
      if (balanceThb > 0 || balanceCny > 0) {
        receivables.push({
          customerId: customer.id,
          customerName: customer.customerName,
          balanceThb,
          balanceCny,
          type: customer.customerType,
        });
      }
    }

    // AP: 暂按无应付处理（预充值模式下应付极少）
    const payables: Array<{
      name: string;
      amountThb: number;
      amountCny: number;
      description: string;
    }> = [];

    const totalAR = receivables.reduce((s, r) => s + r.balanceThb + r.balanceCny * 4.5, 0);
    const totalAP = payables.reduce((s, p) => s + p.amountThb + p.amountCny * 4.5, 0);

    return {
      success: true,
      data: {
        receivables,
        payables,
        totalAR,
        totalAP,
        netAR: totalAR - totalAP,
      },
    };
  }

  // 银行日记账
  async getBankLedger(warehouseId: string, accountId: string, month?: string) {
    const where: any = { bankAccountId: accountId };
    if (month) where.month = month;

    const account = await this.prisma.bankAccount.findUnique({
      where: { id: accountId },
    });
    if (!account || account.warehouseId !== warehouseId) {
      return { success: false, message: '账户不存在' };
    }

    const transactions = await this.prisma.bankAccountTransaction.findMany({
      where,
      include: {
        category: { select: { code: true, name: true } },
        bankAccount: { select: { accountName: true } },
      },
      orderBy: { transactionDate: 'asc' },
    });

    let totalIncomeThb = 0;
    let totalIncomeCny = 0;
    let totalExpenseThb = 0;
    let totalExpenseCny = 0;

    const items = transactions.map((t) => {
      totalIncomeThb += Number(t.incomeThb);
      totalIncomeCny += Number(t.incomeCny);
      totalExpenseThb += Number(t.expenseThb);
      totalExpenseCny += Number(t.expenseCny);

      return {
        id: t.id,
        transactionDate: t.transactionDate,
        month: t.month,
        description: t.description,
        categoryName: t.category?.name ?? '',
        incomeThb: Number(t.incomeThb),
        incomeCny: Number(t.incomeCny),
        expenseThb: Number(t.expenseThb),
        expenseCny: Number(t.expenseCny),
        balanceAfterThb: Number(t.balanceAfterThb ?? 0),
        balanceAfterCny: Number(t.balanceAfterCny ?? 0),
        remark: t.remark,
      };
    });

    return {
      success: true,
      data: {
        accountName: account.accountName,
        accountType: account.accountType,
        summary: {
          totalIncomeThb,
          totalIncomeCny,
          totalExpenseThb,
          totalExpenseCny,
        },
        transactions: items,
      },
    };
  }
}
