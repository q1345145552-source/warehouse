import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 日记账自动分录服务
 * 当关键财务事件发生时，自动生成 JournalEntry + JournalEntryLine
 *
 * 借贷规则（Excel逻辑）：
 * - 客户充值：         借 银行存款  贷 预收账款
 * - 月末扣费：         借 预收账款  贷 主营业务收入
 * - 银行费用支出：      借 费用科目  贷 银行存款
 * - 老板注资：         借 银行存款  贷 实收资本
 * - 固定资产采购：      借 固定资产  贷 银行存款
 * - 耗材采购入库：      借 存货      贷 银行存款
 */
@Injectable()
export class JournalHooksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查找或创建日记账分录头
   */
  private async ensureJournalEntry(entryNo: string, entryDate: Date, month: string, description: string) {
    const existing = await this.prisma.journalEntry.findUnique({
      where: { entryNo },
    });
    if (existing) return existing;

    return this.prisma.journalEntry.create({
      data: {
        entryNo,
        entryDate,
        month,
        description,
        debitTotal: 0,
        creditTotal: 0,
        status: 'posted',
      },
    });
  }

  /**
   * 客户充值 → 借 银行存款 / 贷 预收账款
   */
  async recordRecharge(
    bankAccountId: string,
    amountThb: number,
    amountCny: number,
    transactionDate: Date,
    description: string,
  ) {
    const month = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
    const entryNo = `RC-${transactionDate.toISOString().slice(0, 10)}-${Date.now()}`;

    const entry = await this.ensureJournalEntry(entryNo, transactionDate, month, `客户充值：${description}`);

    // 查找科目
    const bankAccount = await this.prisma.chartOfAccounts.findFirst({
      where: { code: '1001' },
    }); // 银行存款
    const advanceReceived = await this.prisma.chartOfAccounts.findFirst({
      where: { code: '2201' },
    }); // 预收账款

    if (!bankAccount || !advanceReceived) return;

    const totalAmount = amountThb + amountCny * 4.5;

    // 借：银行存款
    await this.prisma.journalEntryLine.create({
      data: {
        entryId: entry.id,
        accountId: bankAccount.id,
        debitAmount: totalAmount,
        creditAmount: 0,
        description: `客户充值 THB${amountThb} CNY${amountCny}`,
      },
    });

    // 贷：预收账款
    await this.prisma.journalEntryLine.create({
      data: {
        entryId: entry.id,
        accountId: advanceReceived.id,
        debitAmount: 0,
        creditAmount: totalAmount,
        description: `客户充值 THB${amountThb} CNY${amountCny}`,
      },
    });

    // 更新分录头金额
    await this.prisma.journalEntry.update({
      where: { id: entry.id },
      data: { debitTotal: totalAmount, creditTotal: totalAmount },
    });
  }

  /**
   * 银行费用支出 → 借 费用科目 / 贷 银行存款
   */
  async recordBankExpense(
    bankAccountId: string,
    categoryId: string,
    amountThb: number,
    amountCny: number,
    transactionDate: Date,
    description: string,
  ) {
    const month = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
    const entryNo = `BE-${transactionDate.toISOString().slice(0, 10)}-${Date.now()}`;

    const entry = await this.ensureJournalEntry(entryNo, transactionDate, month, `费用支出：${description}`);

    const bankAccount = await this.prisma.chartOfAccounts.findFirst({
      where: { code: '1001' },
    });

    if (!bankAccount) return;

    const totalAmount = amountThb + amountCny * 4.5;

    // 借：费用科目
    await this.prisma.journalEntryLine.create({
      data: {
        entryId: entry.id,
        accountId: categoryId,
        debitAmount: totalAmount,
        creditAmount: 0,
        description,
      },
    });

    // 贷：银行存款
    await this.prisma.journalEntryLine.create({
      data: {
        entryId: entry.id,
        accountId: bankAccount.id,
        debitAmount: 0,
        creditAmount: totalAmount,
        description,
      },
    });

    await this.prisma.journalEntry.update({
      where: { id: entry.id },
      data: { debitTotal: totalAmount, creditTotal: totalAmount },
    });
  }

  /**
   * 固定资产采购 → 借 固定资产 / 贷 银行存款
   */
  async recordFixedAssetPurchase(
    bankAccountId: string,
    amountThb: number,
    transactionDate: Date,
    description: string,
  ) {
    const month = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
    const entryNo = `FA-${transactionDate.toISOString().slice(0, 10)}-${Date.now()}`;

    const entry = await this.ensureJournalEntry(entryNo, transactionDate, month, `固定资产采购：${description}`);

    const fixedAsset = await this.prisma.chartOfAccounts.findFirst({
      where: { code: '1601' },
    });
    const bankAccount = await this.prisma.chartOfAccounts.findFirst({
      where: { code: '1001' },
    });

    if (!fixedAsset || !bankAccount) return;

    // 借：固定资产
    await this.prisma.journalEntryLine.create({
      data: {
        entryId: entry.id,
        accountId: fixedAsset.id,
        debitAmount: amountThb,
        creditAmount: 0,
        description,
      },
    });

    // 贷：银行存款
    await this.prisma.journalEntryLine.create({
      data: {
        entryId: entry.id,
        accountId: bankAccount.id,
        debitAmount: 0,
        creditAmount: amountThb,
        description,
      },
    });

    await this.prisma.journalEntry.update({
      where: { id: entry.id },
      data: { debitTotal: amountThb, creditTotal: amountThb },
    });
  }
}
