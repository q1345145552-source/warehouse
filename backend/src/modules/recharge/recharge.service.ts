import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/auth/current-user.decorator';
import { SaveRechargeDto } from './dto/save-recharge.dto';
import { QueryRechargeDto } from './dto/query-recharge.dto';

@Injectable()
export class RechargeService {
  constructor(private readonly prisma: PrismaService) {}

  async getTransactions(query: QueryRechargeDto, user: AuthUser) {
    const where: any = {};

    if (query.customerId) where.customerId = query.customerId;
    if (query.type) where.type = query.type;
    if (query.startDate || query.endDate) {
      where.transactionDate = {};
      if (query.startDate) where.transactionDate.gte = new Date(query.startDate);
      if (query.endDate) where.transactionDate.lte = new Date(query.endDate);
    }

    // 仓库端只能看自己仓库的客户
    if (user.role === 'warehouse' && user.warehouseId) {
      where.customer = { warehouseId: user.warehouseId };
    }

    const data = await this.prisma.rechargeTransaction.findMany({
      where,
      include: { customer: { select: { customerId: true, customerName: true } } },
      orderBy: { transactionDate: 'desc' },
    });

    return { success: true, data };
  }

  async getCustomerBalance(customerId: string) {
    const latest = await this.prisma.rechargeTransaction.findFirst({
      where: { customerId },
      orderBy: { transactionDate: 'desc' },
    });

    return {
      success: true,
      data: {
        customerId,
        balanceThb: latest?.balanceAfterThb ?? 0,
        balanceCny: latest?.balanceAfterCny ?? 0,
      },
    };
  }

  async saveTransaction(dto: SaveRechargeDto, user: AuthUser) {
    // 获取客户信息
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) return { success: false, message: '客户不存在' };

    if (user.role === 'warehouse' && user.warehouseId !== customer.warehouseId) {
      throw new ForbiddenException('无权操作');
    }

    // 获取当前余额
    const latest = await this.prisma.rechargeTransaction.findFirst({
      where: { customerId: dto.customerId },
      orderBy: { transactionDate: 'desc' },
    });

    const currentThb = Number(latest?.balanceAfterThb ?? 0);
    const currentCny = Number(latest?.balanceAfterCny ?? 0);

    // 计算汇率
    const rate = dto.exchangeRate ?? Number(customer.exchangeRate ?? 4.5);

    let amountThb = 0;
    let amountCny = 0;

    if (dto.currency === 'THB') {
      amountThb = dto.amount;
    } else {
      amountCny = dto.amount;
      amountThb = Number((dto.amount * rate).toFixed(2));
    }

    let newBalanceThb = currentThb;
    let newBalanceCny = currentCny;

    if (dto.type === 'recharge') {
      newBalanceThb = Number((currentThb + amountThb).toFixed(2));
      newBalanceCny = Number((currentCny + amountCny).toFixed(2));
    } else {
      // billing - 账单扣款
      newBalanceThb = Number((currentThb - amountThb).toFixed(2));
      newBalanceCny = Number((currentCny - amountCny).toFixed(2));
    }

    const created = await this.prisma.rechargeTransaction.create({
      data: {
        customerId: dto.customerId,
        transactionDate: new Date(dto.transactionDate),
        type: dto.type,
        currency: dto.currency,
        amountThb,
        amountCny,
        exchangeRate: dto.currency === 'CNY' ? rate : null,
        balanceAfterThb: newBalanceThb,
        balanceAfterCny: newBalanceCny,
        remark: dto.remark,
        refInvoiceId: dto.refInvoiceId,
      },
    });

    await this.log('recharge', dto.type, { id: created.id, customerId: dto.customerId });
    return {
      success: true,
      message: dto.type === 'recharge' ? '充值成功' : '账单扣款成功',
      data: created,
    };
  }

  private async log(module: string, action: string, payload: Record<string, unknown>) {
    await this.prisma.operationLog.create({
      data: { module, action, operator: 'system', payload: JSON.stringify(payload) },
    });
  }
}
