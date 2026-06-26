import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/auth/current-user.decorator';
import { SaveBankTransactionDto } from './dto/save-bank-transaction.dto';
import { QueryBankTransactionsDto } from './dto/query-bank-transactions.dto';

@Injectable()
export class BankAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccounts(user: AuthUser) {
    const where: any = {};
    if (user.role === 'warehouse' && user.warehouseId) {
      where.warehouseId = user.warehouseId;
    }

    const accounts = await this.prisma.bankAccount.findMany({
      where,
      include: {
        transactions: {
          orderBy: { transactionDate: 'desc' },
          take: 1,
        },
      },
    });

    // 计算每个账户的余额
    const data = accounts.map((acc) => {
      const latest = acc.transactions[0];
      return {
        ...acc,
        balanceThb: latest?.balanceAfterThb ?? 0,
        balanceCny: latest?.balanceAfterCny ?? 0,
      };
    });

    return { success: true, data };
  }

  async getTransactions(query: QueryBankTransactionsDto, user: AuthUser) {
    const where: any = {};

    if (query.bankAccountId) where.bankAccountId = query.bankAccountId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.month) where.month = query.month;
    if (query.startDate || query.endDate) {
      where.transactionDate = {};
      if (query.startDate) where.transactionDate.gte = new Date(query.startDate);
      if (query.endDate) where.transactionDate.lte = new Date(query.endDate);
    }

    if (user.role === 'warehouse' && user.warehouseId) {
      where.bankAccount = { warehouseId: user.warehouseId };
    }

    const data = await this.prisma.bankAccountTransaction.findMany({
      where,
      include: {
        bankAccount: { select: { accountName: true, accountType: true } },
        category: { select: { code: true, name: true } },
      },
      orderBy: { transactionDate: 'desc' },
    });

    return { success: true, data };
  }

  async getMonthlySummary(month: string, user: AuthUser) {
    const where: any = { month };
    if (user.role === 'warehouse' && user.warehouseId) {
      where.bankAccount = { warehouseId: user.warehouseId };
    }

    const data = await this.prisma.bankAccountTransaction.findMany({
      where,
      include: {
        bankAccount: { select: { id: true, accountName: true, accountType: true } },
        category: { select: { code: true, name: true } },
      },
    });

    // 按账户汇总
    const byAccount: Record<string, {
      name: string;
      type: string;
      incomeThb: number;
      incomeCny: number;
      expenseThb: number;
      expenseCny: number;
    }> = {};

    // 按科目汇总
    const byCategory: Record<string, { name: string; amount: number }> = {};

    for (const item of data) {
      const accId = item.bankAccountId;
      if (!byAccount[accId]) {
        byAccount[accId] = {
          name: item.bankAccount.accountName,
          type: item.bankAccount.accountType,
          incomeThb: 0,
          incomeCny: 0,
          expenseThb: 0,
          expenseCny: 0,
        };
      }
      byAccount[accId].incomeThb += Number(item.incomeThb);
      byAccount[accId].incomeCny += Number(item.incomeCny);
      byAccount[accId].expenseThb += Number(item.expenseThb);
      byAccount[accId].expenseCny += Number(item.expenseCny);

      if (item.categoryId && item.category) {
        const catKey = item.categoryId;
        if (!byCategory[catKey]) {
          byCategory[catKey] = { name: item.category.name, amount: 0 };
        }
        const rate = await this.getExchangeRate('CNY', 'THB', item.transactionDate.toISOString());
        byCategory[catKey].amount += Number(item.expenseThb) + Number(item.expenseCny) * rate;
      }
    }

    return { success: true, data: { month, byAccount, byCategory } };
  }

  async saveTransaction(dto: SaveBankTransactionDto, user: AuthUser) {
    const account = await this.prisma.bankAccount.findUnique({
      where: { id: dto.bankAccountId },
    });
    if (!account) return { success: false, message: '账户不存在' };

    if (user.role === 'warehouse' && user.warehouseId !== account.warehouseId) {
      throw new ForbiddenException('无权操作');
    }

    // 计算月份
    const date = new Date(dto.transactionDate);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // 获取当前余额
    const latest = await this.prisma.bankAccountTransaction.findFirst({
      where: { bankAccountId: dto.bankAccountId },
      orderBy: { transactionDate: 'desc' },
    });

    const currentThb = Number(latest?.balanceAfterThb ?? 0);
    const currentCny = Number(latest?.balanceAfterCny ?? 0);

    const incomeThb = dto.incomeThb ?? 0;
    const incomeCny = dto.incomeCny ?? 0;
    const expenseThb = dto.expenseThb ?? 0;
    const expenseCny = dto.expenseCny ?? 0;

    const newBalanceThb = Number((currentThb + incomeThb - expenseThb).toFixed(2));
    const newBalanceCny = Number((currentCny + incomeCny - expenseCny).toFixed(2));

    const created = await this.prisma.bankAccountTransaction.create({
      data: {
        bankAccountId: dto.bankAccountId,
        subAccount: dto.subAccount,
        transactionDate: date,
        month,
        categoryId: dto.categoryId,
        description: dto.description,
        incomeThb,
        incomeCny,
        expenseThb,
        expenseCny,
        balanceAfterThb: newBalanceThb,
        balanceAfterCny: newBalanceCny,
        remark: dto.remark,
      },
    });

    await this.log('bank_transaction', 'create', { id: created.id, accountId: dto.bankAccountId });
    return { success: true, message: '流水已记录', data: created };
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

  private async log(module: string, action: string, payload: Record<string, unknown>) {
    await this.prisma.operationLog.create({
      data: { module, action, operator: 'system', payload: JSON.stringify(payload) },
    });
  }
}
